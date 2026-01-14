/**
 * Check Supabase Storage Capacity
 * 
 * Uses Management API to check actual storage usage
 * 
 * Usage:
 *   pnpm tsx scripts/check-supabase-storage-capacity.ts
 */

import createClient from "openapi-fetch"
import type { paths } from "@/lib/management-api-schema"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { config } from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const envPath = path.join(__dirname, "..", ".env")
if (fs.existsSync(envPath)) {
  config({ path: envPath })
}

const managementClient = createClient<paths>({
  baseUrl: "https://api.supabase.com",
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_MANAGEMENT_API_TOKEN}`,
  },
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

async function main() {
  console.log("=".repeat(70))
  console.log("📊 Supabase Storage Capacity Check")
  console.log("=".repeat(70))
  console.log("")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const projectRef = supabaseUrl.split("//")[1]?.split(".")[0] || ""

  if (!projectRef) {
    console.error("❌ Could not extract project ref from SUPABASE_URL")
    process.exit(1)
  }

  if (!process.env.SUPABASE_MANAGEMENT_API_TOKEN) {
    console.error("❌ SUPABASE_MANAGEMENT_API_TOKEN not set")
    console.error("   Get it from: https://supabase.com/dashboard/account/tokens")
    process.exit(1)
  }

  console.log(`📡 Project Ref: ${projectRef}`)
  console.log("")

  try {
    // Get project info (includes storage usage)
    const { data: project, error: projectError } = await managementClient.GET(
      "/v1/projects/{ref}",
      {
        params: { path: { ref: projectRef } },
      }
    )

    if (projectError) {
      console.error("❌ Failed to fetch project info:", projectError)
      process.exit(1)
    }

    const projectData = project as any

    console.log("=".repeat(70))
    console.log("📦 Project Information")
    console.log("=".repeat(70))
    console.log(`Name: ${projectData.name || "N/A"}`)
    console.log(`Region: ${projectData.region || "N/A"}`)
    console.log(`Status: ${projectData.status || "N/A"}`)
    console.log("")

    // Check storage buckets via Storage API
    console.log("=".repeat(70))
    console.log("🗄️  Storage Buckets")
    console.log("=".repeat(70))

    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    const supabase = createSupabaseClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error("❌ Failed to list buckets:", bucketsError.message)
    } else {
      console.log(`Found ${buckets?.length || 0} buckets:`)
      console.log("")

      if (!buckets || buckets.length === 0) {
        console.log("⚠️  No buckets found!")
        console.log("   This might indicate:")
        console.log("   - Buckets were deleted")
        console.log("   - Service role key doesn't have permissions")
        console.log("   - Storage is disabled")
      } else {
        for (const bucket of buckets) {
          console.log(`📦 ${bucket.name}`)
          console.log(`   Public: ${bucket.public ? "Yes" : "No"}`)
          console.log(`   Created: ${bucket.created_at || "N/A"}`)
          console.log("")

          // Try to get file count (may be slow for large buckets)
          try {
            const { data: files, error: listError } = await supabase.storage
              .from(bucket.name)
              .list("", { limit: 1000 })

            if (!listError && files) {
              const totalSize = files.reduce((sum: number, file: any) => {
                return sum + (file.metadata?.size || file.size || 0)
              }, 0)

              console.log(`   Files: ${files.length} (showing first 1000)`)
              console.log(`   Size: ${formatBytes(totalSize)}`)
            } else {
              console.log(`   Files: Error listing (${listError?.message || "unknown"})`)
            }
          } catch (err: any) {
            console.log(`   Files: Error - ${err.message}`)
          }
          console.log("")
        }
      }
    }

    // Check database size
    console.log("=".repeat(70))
    console.log("💾 Database Size")
    console.log("=".repeat(70))

    const { data: dbSize, error: dbError } = await supabase.rpc("pg_database_size", {
      database_name: "postgres",
    })

    if (dbError) {
      console.log("⚠️  Could not get database size (function may not exist)")
    } else {
      console.log(`Database Size: ${formatBytes(dbSize || 0)}`)
    }

    console.log("")
    console.log("=".repeat(70))
    console.log("💡 Recommendations")
    console.log("=".repeat(70))
    console.log("")
    console.log("If storage shows as full in dashboard but buckets are empty:")
    console.log("1. Check Supabase Dashboard → Storage → Buckets")
    console.log("2. Verify bucket permissions")
    console.log("3. Check if there are orphaned files not showing in API")
    console.log("4. Contact Supabase support if issue persists")
    console.log("")
    console.log("If getting 406 errors:")
    console.log("1. PostgREST schema cache may be stale")
    console.log("2. Try restarting PostgREST (requires Supabase support)")
    console.log("3. Or wait for automatic cache refresh (can take minutes)")
    console.log("")

  } catch (error: any) {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
