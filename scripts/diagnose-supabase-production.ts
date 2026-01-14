/**
 * Diagnose Supabase Production Instance Health
 * 
 * Checks:
 * - Database connectivity
 * - Storage capacity and usage
 * - PostgREST schema cache status
 * - Table accessibility
 * - RLS policies
 * 
 * Usage:
 *   pnpm tsx scripts/diagnose-supabase-production.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { config } from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables (production)
const envPath = path.join(__dirname, "..", ".env")
if (fs.existsSync(envPath)) {
  config({ path: envPath })
}

interface DiagnosticResult {
  check: string
  status: "✅" | "⚠️" | "❌"
  message: string
  details?: any
}

async function checkDatabaseConnectivity(supabase: any): Promise<DiagnosticResult> {
  try {
    const { data, error } = await supabase.from("profiles").select("count").limit(1)
    if (error) {
      return {
        check: "Database Connectivity",
        status: "❌",
        message: `Failed to connect: ${error.message}`,
        details: error,
      }
    }
    return {
      check: "Database Connectivity",
      status: "✅",
      message: "Successfully connected to database",
    }
  } catch (error: any) {
    return {
      check: "Database Connectivity",
      status: "❌",
      message: `Connection error: ${error.message}`,
      details: error,
    }
  }
}

async function checkTableAccessibility(supabase: any): Promise<DiagnosticResult[]> {
  const tables = ["pokemon_cache", "pokemon_comprehensive", "pokepedia_pokemon", "profiles"]
  const results: DiagnosticResult[] = []

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select("*").limit(1)
      if (error) {
        const errorCode = (error as any).code || ""
        const errorMessage = error.message || JSON.stringify(error)
        
        let status: "✅" | "⚠️" | "❌" = "❌"
        let message = errorMessage

        if (errorCode === "PGRST116" || errorMessage.includes("0 rows")) {
          status = "✅"
          message = "Table accessible (empty)"
        } else if (errorMessage.includes("406") || errorMessage.includes("Not Acceptable")) {
          status = "⚠️"
          message = "PostgREST schema cache issue - table may exist but cache is stale"
        } else if (errorMessage.includes("permission denied") || errorMessage.includes("RLS")) {
          status = "⚠️"
          message = "RLS policy may be blocking access"
        }

        results.push({
          check: `Table: ${table}`,
          status,
          message,
          details: { code: errorCode, error },
        })
      } else {
        results.push({
          check: `Table: ${table}`,
          status: "✅",
          message: `Accessible (${data?.length || 0} rows in sample)`,
        })
      }
    } catch (error: any) {
      results.push({
        check: `Table: ${table}`,
        status: "❌",
        message: `Error: ${error.message}`,
        details: error,
      })
    }
  }

  return results
}

async function checkStorageCapacity(supabase: any): Promise<DiagnosticResult> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      return {
        check: "Storage Capacity",
        status: "❌",
        message: `Failed to list buckets: ${error.message}`,
        details: error,
      }
    }

    let totalFiles = 0
    let totalSize = 0
    const bucketDetails: any[] = []

    for (const bucket of buckets || []) {
      try {
        // Try to list files (may fail if bucket is large)
        const { data: files, error: listError } = await supabase.storage
          .from(bucket.name)
          .list("", { limit: 1000 })

        if (!listError && files) {
          const bucketSize = files.reduce((sum: number, file: any) => {
            return sum + (file.metadata?.size || file.size || 0)
          }, 0)

          totalFiles += files.length
          totalSize += bucketSize

          bucketDetails.push({
            name: bucket.name,
            fileCount: files.length,
            size: bucketSize,
            public: bucket.public,
          })
        } else {
          bucketDetails.push({
            name: bucket.name,
            fileCount: "unknown",
            size: "unknown",
            public: bucket.public,
            error: listError?.message,
          })
        }
      } catch (err: any) {
        bucketDetails.push({
          name: bucket.name,
          error: err.message,
        })
      }
    }

    return {
      check: "Storage Capacity",
      status: "✅",
      message: `Found ${buckets?.length || 0} buckets, ${totalFiles} files, ${formatBytes(totalSize)} total`,
      details: {
        buckets: bucketDetails,
        totalFiles,
        totalSize,
      },
    }
  } catch (error: any) {
    return {
      check: "Storage Capacity",
      status: "❌",
      message: `Error checking storage: ${error.message}`,
      details: error,
    }
  }
}

async function checkPostgRESTSchemaCache(supabase: any): Promise<DiagnosticResult> {
  // Try to query a table that should exist
  // If we get 406, it's a schema cache issue
  try {
    const { error } = await supabase.from("pokemon_cache").select("pokemon_id").limit(1)
    
    if (error) {
      const errorMessage = error.message || JSON.stringify(error)
      if (errorMessage.includes("406") || errorMessage.includes("Not Acceptable")) {
        return {
          check: "PostgREST Schema Cache",
          status: "⚠️",
          message: "Schema cache appears stale (406 errors detected)",
          details: {
            error,
            recommendation: "PostgREST may need to be restarted or schema cache refreshed",
          },
        }
      }
    }

    return {
      check: "PostgREST Schema Cache",
      status: "✅",
      message: "Schema cache appears healthy",
    }
  } catch (error: any) {
    return {
      check: "PostgREST Schema Cache",
      status: "❌",
      message: `Error checking schema cache: ${error.message}`,
      details: error,
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

async function main() {
  console.log("=".repeat(70))
  console.log("🔍 Supabase Production Instance Diagnostics")
  console.log("=".repeat(70))
  console.log("")

  // Initialize Supabase client (production)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
    process.exit(1)
  }

  console.log(`📡 Supabase URL: ${supabaseUrl}`)
  console.log(`🔑 Using: ${supabaseKey.substring(0, 20)}...`)
  console.log("")

  const supabase = createClient(supabaseUrl, supabaseKey)

  const results: DiagnosticResult[] = []

  // Run diagnostics
  console.log("Running diagnostics...")
  console.log("")

  results.push(await checkDatabaseConnectivity(supabase))
  results.push(await checkPostgRESTSchemaCache(supabase))
  results.push(await checkStorageCapacity(supabase))
  results.push(...(await checkTableAccessibility(supabase)))

  // Display results
  console.log("=".repeat(70))
  console.log("📊 Diagnostic Results")
  console.log("=".repeat(70))
  console.log("")

  for (const result of results) {
    console.log(`${result.status} ${result.check}`)
    console.log(`   ${result.message}`)
    if (result.details && typeof result.details === "object") {
      if (result.details.error) {
        console.log(`   Error Code: ${result.details.code || "N/A"}`)
      }
      if (result.details.recommendation) {
        console.log(`   💡 Recommendation: ${result.details.recommendation}`)
      }
      if (result.details.buckets) {
        console.log(`   Buckets:`)
        result.details.buckets.forEach((bucket: any) => {
          console.log(`     - ${bucket.name}: ${bucket.fileCount} files, ${bucket.size !== "unknown" ? formatBytes(bucket.size) : "unknown size"}`)
        })
      }
    }
    console.log("")
  }

  // Summary
  const critical = results.filter((r) => r.status === "❌").length
  const warnings = results.filter((r) => r.status === "⚠️").length
  const healthy = results.filter((r) => r.status === "✅").length

  console.log("=".repeat(70))
  console.log("📈 Summary")
  console.log("=".repeat(70))
  console.log(`✅ Healthy: ${healthy}`)
  console.log(`⚠️  Warnings: ${warnings}`)
  console.log(`❌ Critical: ${critical}`)
  console.log("")

  if (critical > 0) {
    console.log("❌ Critical issues detected! Production instance may be unhealthy.")
    process.exit(1)
  } else if (warnings > 0) {
    console.log("⚠️  Warnings detected. Review recommendations above.")
    process.exit(0)
  } else {
    console.log("✅ All checks passed! Production instance appears healthy.")
    process.exit(0)
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
