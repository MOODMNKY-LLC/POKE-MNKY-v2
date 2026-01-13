/**
 * Import PokeAPI API Data to Supabase
 * 
 * Imports static JSON data from resources/api-data into pokeapi_resources table.
 * This provides a fast baseline dataset before running ditto clone.
 * 
 * Usage:
 *   pnpm tsx scripts/import-api-data.ts [--endpoint=pokemon] [--limit=100]
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const API_DATA_DIR = path.join(__dirname, "..", "resources", "api-data", "data", "api", "v2")
const BATCH_SIZE = 100 // Insert in batches for performance

interface ImportStats {
  endpoint: string
  total: number
  inserted: number
  updated: number
  errors: number
  skipped: number
}

/**
 * Extract resource key and name from JSON data
 */
function extractResourceInfo(
  endpoint: string,
  data: any,
  filePath: string
): { key: string; name: string | null; url: string } {
  // Extract ID from filename or data
  const fileName = path.basename(filePath, ".json")
  const key = data.id?.toString() || data.name || fileName

  // Extract name
  const name = data.name || null

  // Construct URL (api-data URLs are relative, we'll use a placeholder)
  const url = `https://pokeapi.co/api/v2/${endpoint}/${key}/`

  return { key, name, url }
}

/**
 * Import a single endpoint directory
 */
async function importEndpoint(
  supabase: any,
  endpoint: string,
  limit?: number
): Promise<ImportStats> {
  const endpointDir = path.join(API_DATA_DIR, endpoint)
  
  if (!fs.existsSync(endpointDir)) {
    console.log(`⚠️  Endpoint directory not found: ${endpointDir}`)
    return {
      endpoint,
      total: 0,
      inserted: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
    }
  }

  // Get all JSON files (including subdirectories for pokemon endpoint)
  const files: string[] = []
  
  // Check if endpoint has subdirectories (like pokemon/1/, pokemon/2/, etc.)
  const entries = fs.readdirSync(endpointDir)
  const hasSubdirs = entries.some((e) => {
    const fullPath = path.join(endpointDir, e)
    return fs.statSync(fullPath).isDirectory()
  })
  
  if (hasSubdirs) {
    // For endpoints with subdirectories (pokemon, moves, etc.)
    for (const entry of entries) {
      const fullPath = path.join(endpointDir, entry)
      if (fs.statSync(fullPath).isDirectory()) {
        const indexFile = path.join(fullPath, "index.json")
        if (fs.existsSync(indexFile)) {
          files.push(indexFile)
        }
      }
    }
  } else {
    // For flat endpoints
    files.push(...entries.filter((f) => f.endsWith(".json")))
  }
  
  const limitedFiles = files.slice(0, limit)

  console.log(`📦 Processing ${files.length} files for endpoint: ${endpoint}`)

  const stats: ImportStats = {
    endpoint,
    total: files.length,
    inserted: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
  }

  // Process in batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE)
    const batchData: any[] = []

    for (const file of batch) {
      try {
        // file is already a full path if from subdirectories, otherwise relative
        const filePath = path.isAbsolute(file) ? file : path.join(endpointDir, file)
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const data = JSON.parse(fileContent)

        // Skip index.json files (list endpoints)
        if (file === "index.json" || Array.isArray(data.results)) {
          stats.skipped++
          continue
        }

        const { key, name, url } = extractResourceInfo(endpoint, data, file)

        batchData.push({
          resource_type: endpoint,
          resource_key: key.toString(),
          name,
          url,
          data,
          schema_version: 1,
        })
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error)
        stats.errors++
      }
    }

    // Bulk upsert
    if (batchData.length > 0) {
      try {
        const { data: inserted, error } = await supabase
          .from("pokeapi_resources")
          .upsert(batchData, {
            onConflict: "resource_type,resource_key",
            ignoreDuplicates: false,
          })

        if (error) {
          console.error(`❌ Batch upsert error:`, error)
          stats.errors += batchData.length
        } else {
          // Count new vs updated (approximate)
          stats.inserted += batchData.length
          console.log(`   ✅ Processed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchData.length} resources`)
        }
      } catch (error) {
        console.error(`❌ Batch error:`, error)
        stats.errors += batchData.length
      }
    }
  }

  return stats
}

async function main() {
  console.log("=".repeat(70))
  console.log("📥 Import PokeAPI API Data to Supabase")
  console.log("=".repeat(70))
  console.log("")

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Parse command line arguments
  const args = process.argv.slice(2)
  const endpointArg = args.find((a) => a.startsWith("--endpoint="))
  const limitArg = args.find((a) => a.startsWith("--limit="))

  const targetEndpoint = endpointArg?.split("=")[1]
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined

  // Get list of endpoints
  let endpoints: string[] = []
  if (targetEndpoint) {
    endpoints = [targetEndpoint]
  } else {
    // Import all endpoints
    endpoints = fs
      .readdirSync(API_DATA_DIR)
      .filter((f) => fs.statSync(path.join(API_DATA_DIR, f)).isDirectory())
  }

  console.log(`📋 Endpoints to import: ${endpoints.length}`)
  if (limit) {
    console.log(`📋 Limit per endpoint: ${limit}`)
  }
  console.log("")

  const allStats: ImportStats[] = []

  // Import each endpoint
  for (const endpoint of endpoints) {
    const stats = await importEndpoint(supabase, endpoint, limit)
    allStats.push(stats)

    console.log(`   ${endpoint}: ${stats.inserted} inserted, ${stats.errors} errors, ${stats.skipped} skipped`)
    console.log("")
  }

  // Summary
  console.log("=".repeat(70))
  console.log("📊 Import Summary")
  console.log("=".repeat(70))
  const totalInserted = allStats.reduce((sum, s) => sum + s.inserted, 0)
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0)
  const totalSkipped = allStats.reduce((sum, s) => sum + s.skipped, 0)
  const totalFiles = allStats.reduce((sum, s) => sum + s.total, 0)

  console.log(`Total files processed: ${totalFiles}`)
  console.log(`Total inserted/updated: ${totalInserted}`)
  console.log(`Total skipped: ${totalSkipped}`)
  console.log(`Total errors: ${totalErrors}`)
  console.log("")
  console.log("✅ Import complete!")
  console.log("")
  console.log("Next steps:")
  console.log("1. Run ditto clone for comprehensive data")
  console.log("2. Build projections: pnpm tsx scripts/build-pokepedia-projections.ts")
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
