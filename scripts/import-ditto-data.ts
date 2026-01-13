/**
 * Import Ditto Cloned Data to Supabase
 * 
 * Imports data cloned by ditto from tools/ditto/data into pokeapi_resources table.
 * This provides comprehensive coverage after the baseline api-data import.
 * 
 * Usage:
 *   pnpm tsx scripts/import-ditto-data.ts [--endpoint=pokemon] [--limit=100]
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
// Ditto stores data in data/api/v2/ structure
const DITTO_DATA_DIR = path.join(__dirname, "..", "tools", "ditto", "data", "api", "v2")
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

  // Construct URL (ditto URLs are relative, we'll use a placeholder)
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
  const endpointDir = path.join(DITTO_DATA_DIR, endpoint)
  
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

  // Get all JSON files recursively
  // Ditto stores data in index.json files within numbered directories
  const files: string[] = []
  function collectFiles(dir: string, basePath: string = "") {
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const relativePath = path.join(basePath, entry)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        collectFiles(fullPath, relativePath)
      } else if (entry.endsWith(".json")) {
        // Ditto uses index.json files - include them
        // Skip only the top-level index.json (list endpoint)
        if (entry === "index.json") {
          // Check if this is a resource file (has numeric parent directory) vs list endpoint
          const parentDir = path.basename(path.dirname(fullPath))
          // If parent is numeric or not the endpoint name, it's a resource file
          if (!isNaN(parseInt(parentDir)) || parentDir !== endpoint) {
            files.push(fullPath)
          }
        } else {
          files.push(fullPath)
        }
      }
    }
  }

  collectFiles(endpointDir)
  const limitedFiles = limit ? files.slice(0, limit) : files

  console.log(`📦 Processing ${limitedFiles.length} files for endpoint: ${endpoint}`)

  const stats: ImportStats = {
    endpoint,
    total: limitedFiles.length,
    inserted: 0,
    updated: 0,
    errors: 0,
    skipped: 0,
  }

  // Process in batches
  // Use Map to ensure uniqueness by resource_key within batch
  const seenKeys = new Set<string>()
  
  for (let i = 0; i < limitedFiles.length; i += BATCH_SIZE) {
    const batch = limitedFiles.slice(i, i + BATCH_SIZE)
    const batchData: any[] = []
    const batchKeys = new Map<string, number>() // Track keys in this batch

    for (const filePath of batch) {
      try {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const data = JSON.parse(fileContent)

        // Skip list endpoints
        if (Array.isArray(data.results)) {
          stats.skipped++
          continue
        }

        const { key, name, url } = extractResourceInfo(endpoint, data, filePath)
        const resourceKey = key.toString()
        const uniqueKey = `${endpoint}:${resourceKey}`

        // Skip if already in this batch (duplicate)
        if (batchKeys.has(uniqueKey)) {
          stats.skipped++
          continue
        }

        batchKeys.set(uniqueKey, 1)
        seenKeys.add(uniqueKey)

        batchData.push({
          resource_type: endpoint,
          resource_key: resourceKey,
          name,
          url,
          data,
          schema_version: 1,
        })
      } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error)
        stats.errors++
      }
    }

    // Bulk upsert
    if (batchData.length > 0) {
      try {
        const { error } = await supabase
          .from("pokeapi_resources")
          .upsert(batchData, {
            onConflict: "resource_type,resource_key",
            ignoreDuplicates: false,
          })

        if (error) {
          console.error(`❌ Batch upsert error:`, error)
          stats.errors += batchData.length
        } else {
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
  console.log("📥 Import Ditto Cloned Data to Supabase")
  console.log("=".repeat(70))
  console.log("")

  // Check if ditto data directory exists
  if (!fs.existsSync(DITTO_DATA_DIR)) {
    console.error(`❌ Ditto data directory not found: ${DITTO_DATA_DIR}`)
    console.error("")
    console.error("Please run ditto clone first:")
    console.error("  cd tools/ditto")
    console.error("  poetry run ditto clone --src-url http://localhost/api/v2 --dest-dir ./data")
    console.error("")
    process.exit(1)
  }

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
      .readdirSync(DITTO_DATA_DIR)
      .filter((f) => {
        const fullPath = path.join(DITTO_DATA_DIR, f)
        return fs.statSync(fullPath).isDirectory()
      })
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
  console.log("1. Build projections: pnpm tsx scripts/build-pokepedia-projections.ts")
  console.log("2. Mirror sprites: pnpm tsx scripts/mirror-sprites-to-storage.ts")
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
