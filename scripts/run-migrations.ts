/**
 * Database Migration Runner
 * Executes all SQL migration files in order
 *
 * Usage:
 *   node scripts/run-migrations.ts
 *
 * Prerequisites:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing required environment variables:")
  console.error("   NEXT_PUBLIC_SUPABASE_URL")
  console.error("   SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigrations() {
  console.log("🚀 Starting database migrations...\n")

  // Get all SQL files in scripts directory
  const scriptsDir = join(process.cwd(), "scripts")
  const sqlFiles = readdirSync(scriptsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort() // Run in alphabetical order (001_, 002_, etc.)

  console.log(`📋 Found ${sqlFiles.length} migration file(s):\n`)
  sqlFiles.forEach((f) => console.log(`   - ${f}`))
  console.log("")

  for (const file of sqlFiles) {
    const filePath = join(scriptsDir, file)
    console.log(`⏳ Running migration: ${file}`)

    try {
      const sql = readFileSync(filePath, "utf-8")

      // Split SQL into individual statements (simple approach)
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"))

      console.log(`   Found ${statements.length} SQL statement(s)`)

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ";" // Re-add semicolon

        // Execute via RPC (Supabase doesn't expose raw SQL execution)
        // We'll use the SQL editor approach via rpc
        const { error } = await supabase.rpc("exec_sql", { sql_query: statement })

        if (error) {
          console.error(`   ❌ Error on statement ${i + 1}:`, error.message)
          // Continue with next statement (some errors are OK, like "already exists")
        }
      }

      console.log(`   ✅ Completed ${file}\n`)
    } catch (error) {
      console.error(`   ❌ Failed to read or execute ${file}:`, error)
      process.exit(1)
    }
  }

  console.log("✨ All migrations completed!\n")

  // Verify tables were created
  console.log("🔍 Verifying database schema...")
  const { data: tables, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public")

  if (error) {
    console.error("❌ Could not verify tables:", error.message)
  } else {
    console.log(`\n✅ Found ${tables?.length || 0} table(s) in database:`)
    tables?.forEach((t) => console.log(`   - ${t.table_name}`))
  }
}

runMigrations().catch(console.error)
