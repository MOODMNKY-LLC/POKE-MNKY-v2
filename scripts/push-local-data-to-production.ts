/**
 * Push Local Database Data to Production
 * 
 * This script pushes all data from local Supabase to production Supabase.
 * It handles all tables and provides progress monitoring.
 * 
 * Usage:
 *   pnpm tsx scripts/push-local-data-to-production.ts
 */

import { createClient } from "@supabase/supabase-js"
import { Client } from "pg"
import * as dotenv from "dotenv"
import * as path from "path"

// Load environment variables
// For production push, we need production credentials
// Check for explicit production credentials in command line args or .env file
const args = process.argv.slice(2)
const prodUrlArg = args.find(arg => arg.startsWith("--prod-url="))?.split("=")[1]
const prodKeyArg = args.find(arg => arg.startsWith("--prod-key="))?.split("=")[1]

// For production push, prioritize .env (production) over .env.local
// Load .env.local first (for any non-production values we might need)
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false })

// Then load .env (production) which will override .env.local values
const envPath = path.join(process.cwd(), ".env")
if (require("fs").existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
}

// Override with command line args if provided (highest priority)
if (prodUrlArg) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = prodUrlArg
  console.log(`Using production URL from argument`)
}
if (prodKeyArg) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = prodKeyArg
  console.log(`Using production key from argument`)
}

interface TableInfo {
  name: string
  rowCount: number
  synced: number
  errors: number
}

async function main() {
  console.log("=".repeat(70))
  console.log("🚀 Push Local Data to Production")
  console.log("=".repeat(70))
  console.log("")

  // Initialize clients
  // Local Supabase (always use localhost)
  const localUrl = "http://127.0.0.1:54321"
  const localKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

  // Production Supabase (from environment)
  // Check multiple possible env var names
  const prodUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase.co") ? process.env.NEXT_PUBLIC_SUPABASE_URL :
    process.env.SUPABASE_URL?.includes("supabase.co") ? process.env.SUPABASE_URL :
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.SUPABASE_URL || 
    ""
  
  const prodKey = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    ""
  
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || ""

  console.log("Environment check:")
  console.log(`  NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}`)
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? "✅ Set" : "❌ Missing"}`)
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set (length: " + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ")" : "❌ Missing"}`)
  console.log(`  SUPABASE_DB_PASSWORD: ${dbPassword ? "✅ Set" : "❌ Missing"}`)
  console.log(`  Detected prod URL: ${prodUrl || "None"}`)
  console.log("")

  if (!prodUrl) {
    console.error("❌ Missing production Supabase URL")
    console.error("")
    console.error("Required: NEXT_PUBLIC_SUPABASE_URL=https://{project-ref}.supabase.co")
    console.error("")
    console.error("Options:")
    console.error("  1. Add to .env file, or")
    console.error("  2. Pass via --prod-url=https://chmrszrwlfeqovwxyrmt.supabase.co")
    console.error("")
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
    console.error("Current value:", envUrl || "Not set")
    if (envUrl && !envUrl.includes("supabase.co")) {
      console.error("⚠️  URL is not a production URL (must contain 'supabase.co')")
    }
    process.exit(1)
  }

  if (!dbPassword) {
    console.error("❌ Missing production database password")
    console.error("")
    console.error("Required: SUPABASE_DB_PASSWORD=<your-database-password>")
    console.error("")
    console.error("Get your database password from:")
    console.error("  https://supabase.com/dashboard/project/chmrszrwlfeqovwxyrmt/settings/database")
    console.error("")
    process.exit(1)
  }

  console.log("📡 Connecting to databases...")
  console.log(`   Local: ${localUrl}`)
  console.log(`   Production: ${prodUrl.split("//")[1]?.split(".")[0] || "unknown"}`)
  console.log("")

  // Local: Use REST API (works fine)
  const localClient = createClient(localUrl, localKey)
  
  // Test local connection
  const { data: localTest } = await localClient.from("pokepedia_pokemon").select("id").limit(1)
  console.log("✅ Local Supabase connection established")
  
  // Production: Try PostgreSQL direct connection first, fallback to REST API
  const projectRef = prodUrl.split("//")[1]?.split(".")[0] || ""
  let usePgDirect = false
  let prodPgClient: Client | null = null
  let prodClient: ReturnType<typeof createClient> | null = null
  
  // Try PostgreSQL connection
  try {
    console.log("   Attempting PostgreSQL direct connection...")
    prodPgClient = new Client({
      host: "aws-1-us-east-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
      user: `postgres.${projectRef}`,
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })
    
    await prodPgClient.connect()
    console.log("✅ PostgreSQL direct connection established (using pg library)")
    usePgDirect = true
  } catch (pgError: any) {
    console.log(`   ⚠️  PostgreSQL connection failed: ${pgError.message}`)
    console.log("   Falling back to REST API...")
    
    // Fallback to REST API
    prodClient = createClient(prodUrl, prodKey)
    const { error: testError } = await prodClient.from("pokepedia_pokemon").select("id").limit(1)
    if (testError) {
      console.error(`   ❌ REST API also failed: ${testError.message}`)
      throw new Error("Both PostgreSQL and REST API connections failed")
    }
    console.log("✅ REST API connection established (fallback)")
  }
  
  console.log("")

  // Define tables to sync (excluding system tables)
  const tablesToSync = [
    "pokeapi_resources",
    "pokepedia_pokemon",
    "pokepedia_assets",
    "pokemon",
    "pokemon_species",
    "pokemon_types",
    "pokemon_abilities",
    "pokemon_stats",
    "types",
    "abilities",
    "moves",
    "items",
    "generations",
    "teams",
    "team_rosters",
    "draft_sessions",
    "draft_pool",
    "sync_jobs",
    "league_config",
    "google_sheets_config",
  ]

  const results: TableInfo[] = []
  let totalRows = 0
  let totalSynced = 0
  let totalErrors = 0

  console.log("📊 Starting data sync...")
  console.log("")

  for (const tableName of tablesToSync) {
    try {
      console.log(`📦 Syncing ${tableName}...`)

      // Get count from local
      const { count: localCount } = await localClient
        .from(tableName)
        .select("*", { count: "exact", head: true })

      if (!localCount || localCount === 0) {
        console.log(`   ⏭️  Skipping (empty)`)
        results.push({ name: tableName, rowCount: 0, synced: 0, errors: 0 })
        continue
      }

      // Fetch all data from local (paginated)
      const batchSize = 1000
      let offset = 0
      let synced = 0
      let errors = 0

      while (offset < localCount) {
        const { data: localData, error: fetchError } = await localClient
          .from(tableName)
          .select("*")
          .range(offset, offset + batchSize - 1)

        if (fetchError) {
          console.error(`   ❌ Error fetching: ${fetchError.message}`)
          errors += localCount - offset
          break
        }

        if (!localData || localData.length === 0) {
          break
        }

        // Upsert to production
        const conflictColumn = tableName === "sync_jobs" ? "job_id" : "id"
        
        try {
          if (usePgDirect && prodPgClient) {
            // Use PostgreSQL direct connection (faster)
            if (localData.length > 0) {
              const columns = Object.keys(localData[0])
              
              // Process in smaller batches for PostgreSQL to avoid parameter limits
              const pgBatchSize = 100
              for (let batchStart = 0; batchStart < localData.length; batchStart += pgBatchSize) {
                const batch = localData.slice(batchStart, batchStart + pgBatchSize)
                const placeholders = batch.map((_, i) => 
                  `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ")})`
                ).join(", ")
                
                const values = batch.flatMap(row => columns.map(col => {
                  const val = row[col]
                  // Handle JSONB and arrays
                  if (val === null) return null
                  if (typeof val === "object" && !Array.isArray(val)) return JSON.stringify(val)
                  if (Array.isArray(val)) return JSON.stringify(val)
                  return val
                }))
                
                const setClause = columns
                  .filter(col => col !== conflictColumn)
                  .map(col => `${col} = EXCLUDED.${col}`)
                  .join(", ")
                
                const query = `
                  INSERT INTO public.${tableName} (${columns.map(c => `"${c}"`).join(", ")})
                  VALUES ${placeholders}
                  ON CONFLICT ("${conflictColumn}") DO UPDATE SET ${setClause}
                `
                
                await prodPgClient.query(query, values)
                synced += batch.length
                process.stdout.write(`   ⏳ ${synced}/${localCount} rows synced\r`)
              }
            }
          } else if (prodClient) {
            // Fallback to REST API
            const { error: upsertError } = await prodClient
              .from(tableName)
              .upsert(localData, { onConflict: conflictColumn })

            if (upsertError) {
              throw new Error(upsertError.message)
            }
            synced += localData.length
            process.stdout.write(`   ⏳ ${synced}/${localCount} rows synced\r`)
          } else {
            throw new Error("No production connection available")
          }
        } catch (upsertError: any) {
          console.error(`   ❌ Error upserting: ${upsertError.message}`)
          errors += localData.length
        }

        offset += batchSize
      }

      console.log(`   ✅ ${synced}/${localCount} rows synced${errors > 0 ? ` (${errors} errors)` : ""}`)
      
      results.push({ name: tableName, rowCount: localCount, synced, errors })
      totalRows += localCount
      totalSynced += synced
      totalErrors += errors

    } catch (error: any) {
      console.error(`   ❌ Failed: ${error.message}`)
      results.push({ name: tableName, rowCount: 0, synced: 0, errors: 1 })
      totalErrors++
    }
  }

  console.log("")
  console.log("=".repeat(70))
  console.log("📊 Sync Summary")
  console.log("=".repeat(70))
  console.log("")

  // Detailed results
  console.log("Table Results:")
  for (const result of results) {
    if (result.rowCount > 0) {
      const status = result.errors > 0 ? "⚠️" : "✅"
      console.log(`  ${status} ${result.name.padEnd(30)} ${result.synced.toString().padStart(6)}/${result.rowCount.toString().padStart(6)} rows`)
    }
  }

  console.log("")
  console.log("Totals:")
  console.log(`  📦 Tables processed: ${results.length}`)
  console.log(`  📊 Total rows: ${totalRows.toLocaleString()}`)
  console.log(`  ✅ Rows synced: ${totalSynced.toLocaleString()}`)
  console.log(`  ❌ Errors: ${totalErrors}`)

  console.log("")
  console.log("=".repeat(70))
  
  if (totalErrors === 0) {
    console.log("✅ Data sync completed successfully!")
  } else {
    console.log(`⚠️  Data sync completed with ${totalErrors} error(s)`)
  }
  
  console.log("=".repeat(70))
  console.log("")
  
  // Close PostgreSQL connection if used
  if (prodPgClient) {
    await prodPgClient.end()
    console.log("✅ Database connection closed")
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
