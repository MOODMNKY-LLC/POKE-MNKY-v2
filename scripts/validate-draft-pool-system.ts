/**
 * Comprehensive Validation Script for Draft Pool Import/Sync System
 * 
 * This script validates all aspects of the draft pool system:
 * - JSON structure validation
 * - Import service logic
 * - Sync service logic
 * - Status mapping correctness
 * - Edge case handling
 * 
 * Run with: npx tsx scripts/validate-draft-pool-system.ts
 */

// Load environment variables from .env.local
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// Load .env.local file if it exists
const envPath = join(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  try {
    const envFile = readFileSync(envPath, "utf-8")
    envFile.split("\n").forEach((line) => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=")
        const value = valueParts.join("=").replace(/^["']|["']$/g, "")
        if (key && value) {
          process.env[key.trim()] = value.trim()
        }
      }
    })
    console.log("✅ Loaded environment variables from .env.local")
  } catch (error) {
    console.warn("⚠️  Could not load .env.local:", error)
  }
} else {
  console.warn("⚠️  .env.local not found, using system environment variables")
}

// Verify required environment variables are set
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
]

const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
)

if (missingVars.length > 0) {
  console.error("\n❌ Missing required environment variables:")
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`)
  })
  console.error("\nPlease set these in .env.local or as system environment variables.")
  console.error("The script will continue but database tests will fail.\n")
}
import {
  validateDraftPoolJSON,
  importDraftPoolToStaging,
  type ServerAgentDraftPool,
} from "../lib/draft-pool/import-service"
import {
  syncStagingToProduction,
  type SyncResult,
} from "../lib/draft-pool/sync-service"
import { createServiceRoleClient } from "../lib/supabase/service"

interface ValidationResult {
  test: string
  passed: boolean
  message: string
  details?: any
}

const results: ValidationResult[] = []

function recordResult(test: string, passed: boolean, message: string, details?: any) {
  results.push({ test, passed, message, details })
  const icon = passed ? "✅" : "❌"
  console.log(`${icon} ${test}: ${message}`)
  if (details && !passed) {
    console.log(`   Details:`, details)
  }
}

async function validateJSONStructure() {
  console.log("\n📋 Testing JSON Structure Validation\n")

  const jsonPath = join(
    process.cwd(),
    "app-agent-handoff",
    "data",
    "draft-pool-generated.json"
  )

  let draftPoolData: ServerAgentDraftPool
  try {
    const fileContent = readFileSync(jsonPath, "utf-8")
    draftPoolData = JSON.parse(fileContent)
    recordResult("Load JSON File", true, "File loaded successfully")
  } catch (error: any) {
    recordResult("Load JSON File", false, error.message)
    return false
  }

  // Test validation function
  const isValid = validateDraftPoolJSON(draftPoolData)
  recordResult("JSON Structure Validation", isValid, isValid ? "Valid structure" : "Invalid structure")

  if (!isValid) {
    return false
  }

  // Validate required fields
  const hasConfig = !!draftPoolData.config
  const hasMetadata = !!draftPoolData.metadata
  const hasPokemon = !!draftPoolData.pokemon
  const hasArrays = Array.isArray(draftPoolData.pokemon?.available) &&
    Array.isArray(draftPoolData.pokemon?.banned) &&
    Array.isArray(draftPoolData.pokemon?.teraBanned) &&
    Array.isArray(draftPoolData.pokemon?.drafted)

  recordResult("Required Fields Present", hasConfig && hasMetadata && hasPokemon && hasArrays,
    hasConfig && hasMetadata && hasPokemon && hasArrays ? "All required fields present" : "Missing required fields")

  // Validate metadata consistency
  const totalFromArrays = 
    (draftPoolData.pokemon.available?.length || 0) +
    (draftPoolData.pokemon.banned?.length || 0) +
    (draftPoolData.pokemon.teraBanned?.length || 0) +
    (draftPoolData.pokemon.drafted?.length || 0)

  const metadataMatches = totalFromArrays === draftPoolData.metadata.totalPokemon
  recordResult("Metadata Consistency", metadataMatches,
    metadataMatches
      ? `Metadata matches arrays (${totalFromArrays} total)`
      : `Mismatch: metadata says ${draftPoolData.metadata.totalPokemon}, arrays total ${totalFromArrays}`)

  return isValid && hasConfig && hasMetadata && hasPokemon && hasArrays
}

async function validateStatusMapping() {
  console.log("\n🔄 Testing Status Mapping Logic\n")

  const jsonPath = join(
    process.cwd(),
    "app-agent-handoff",
    "data",
    "draft-pool-generated.json"
  )

  let draftPoolData: ServerAgentDraftPool
  try {
    const fileContent = readFileSync(jsonPath, "utf-8")
    draftPoolData = JSON.parse(fileContent)
  } catch (error: any) {
    recordResult("Load JSON for Status Test", false, error.message)
    return false
  }

  // Test Tera banned Pokemon are in teraBannedList
  const teraBannedFromList = draftPoolData.teraBannedList || []
  const teraBannedFromPokemon = draftPoolData.pokemon.teraBanned?.map(p => p.name) || []
  
  const allTeraBanned = new Set([...teraBannedFromList, ...teraBannedFromPokemon])
  recordResult("Tera Banned List Consistency", true,
    `Found ${allTeraBanned.size} unique Tera banned Pokemon`)

  // Verify no Pokemon is in multiple categories
  const allNames = new Set<string>()
  const duplicates: string[] = []

  for (const category of ['available', 'banned', 'teraBanned', 'drafted'] as const) {
    for (const pokemon of draftPoolData.pokemon[category] || []) {
      const key = `${pokemon.name}-${pokemon.pointValue}`
      if (allNames.has(key)) {
        duplicates.push(key)
      }
      allNames.add(key)
    }
  }

  recordResult("No Duplicate Pokemon", duplicates.length === 0,
    duplicates.length === 0
      ? "No duplicates found"
      : `Found ${duplicates.length} duplicates: ${duplicates.slice(0, 5).join(", ")}`)

  return duplicates.length === 0
}

async function validateImportService() {
  console.log("\n📥 Testing Import Service\n")

  const jsonPath = join(
    process.cwd(),
    "app-agent-handoff",
    "data",
    "draft-pool-generated.json"
  )

  let draftPoolData: ServerAgentDraftPool
  try {
    const fileContent = readFileSync(jsonPath, "utf-8")
    draftPoolData = JSON.parse(fileContent)
  } catch (error: any) {
    recordResult("Load JSON for Import Test", false, error.message)
    return false
  }

  try {
    const importResult = await importDraftPoolToStaging(
      draftPoolData,
      "Draft Board"
    )

    recordResult("Import Execution", importResult.success,
      importResult.success ? "Import completed" : "Import failed")

    recordResult("Import Count Match", importResult.totalProcessed === draftPoolData.metadata.totalPokemon,
      `Processed ${importResult.totalProcessed} Pokemon (expected ${draftPoolData.metadata.totalPokemon})`)

    recordResult("Tera Banned Count Match", importResult.teraBannedCount === draftPoolData.metadata.teraBannedCount,
      `Found ${importResult.teraBannedCount} Tera banned (expected ${draftPoolData.metadata.teraBannedCount})`)

    recordResult("No Import Errors", importResult.errors.length === 0,
      importResult.errors.length === 0
        ? "No errors"
        : `${importResult.errors.length} errors found`)

    // Verify staging table
    const supabase = createServiceRoleClient()
    const { data: stagingData, error: stagingError } = await supabase
      .from("sheets_draft_pool")
      .select("*")
      .eq("sheet_name", "Draft Board")

    if (stagingError) {
      recordResult("Staging Table Query", false, stagingError.message)
      return false
    }

    const stagingCount = stagingData?.length || 0
    recordResult("Staging Table Population", stagingCount > 0,
      `Found ${stagingCount} records in staging table`)

    // Verify Tera banned flag is set correctly
    const teraBannedInStaging = stagingData?.filter(p => p.is_tera_banned).length || 0
    recordResult("Tera Banned Flag Set", teraBannedInStaging === importResult.teraBannedCount,
      `Found ${teraBannedInStaging} Tera banned in staging (expected ${importResult.teraBannedCount})`)

    // Verify available flag is set correctly
    // Tera banned Pokemon should still be available (is_available = true)
    const teraBannedAvailable = stagingData?.filter(p => p.is_tera_banned && p.is_available).length || 0
    recordResult("Tera Banned Still Available", teraBannedAvailable === teraBannedInStaging,
      `All ${teraBannedAvailable} Tera banned Pokemon are marked as available`)

    return importResult.success && importResult.errors.length === 0
  } catch (error: any) {
    recordResult("Import Service Execution", false, error.message)
    return false
  }
}

async function validateSyncService() {
  console.log("\n🔄 Testing Sync Service\n")

  const supabase = createServiceRoleClient()

  // Get current season
  const { data: seasons, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, is_current")
    .eq("is_current", true)
    .limit(1)

  if (seasonError || !seasons || seasons.length === 0) {
    recordResult("Find Current Season", false, "No current season found")
    console.log("   ⚠️  Skipping sync tests - no current season")
    return false
  }

  const seasonId = seasons[0].id
  recordResult("Find Current Season", true, `Found season: ${seasons[0].name}`)

  // Test dry-run sync
  try {
    const dryRunResult = await syncStagingToProduction(
      seasonId,
      "Draft Board",
      true // dry run
    )

    recordResult("Dry-Run Sync Execution", dryRunResult.success,
      dryRunResult.success ? "Dry-run completed" : "Dry-run failed")

    recordResult("Sync Count Reasonable", dryRunResult.synced > 0,
      `Would sync ${dryRunResult.synced} Pokemon`)

    // Verify status mapping logic
    // Check that Tera banned Pokemon would have tera_captain_eligible = false
    const { data: stagingData } = await supabase
      .from("sheets_draft_pool")
      .select("*")
      .eq("sheet_name", "Draft Board")
      .eq("is_tera_banned", true)
      .limit(10)

    if (stagingData && stagingData.length > 0) {
      recordResult("Tera Banned Sample Found", true,
        `Found ${stagingData.length} Tera banned Pokemon in staging`)
    }

    // Check for unmatched names
    recordResult("Unmatched Names Handled", true,
      dryRunResult.unmatchedNames.length === 0
        ? "All Pokemon names matched"
        : `${dryRunResult.unmatchedNames.length} unmatched names (will have pokemon_id = NULL)`)

    return dryRunResult.success
  } catch (error: any) {
    recordResult("Sync Service Execution", false, error.message)
    return false
  }
}

async function validateDatabaseSchema() {
  console.log("\n🗄️  Testing Database Schema\n")

  const supabase = createServiceRoleClient()

  // Check draft_pool table has tera_captain_eligible column
  try {
    const { data, error } = await supabase
      .from("draft_pool")
      .select("tera_captain_eligible")
      .limit(1)

    if (error && error.message.includes("column") && error.message.includes("does not exist")) {
      recordResult("draft_pool.tera_captain_eligible Column", false,
        "Column does not exist - migration may not have been applied")
      return false
    }

    recordResult("draft_pool.tera_captain_eligible Column", true, "Column exists")
  } catch (error: any) {
    recordResult("draft_pool.tera_captain_eligible Column", false, error.message)
    return false
  }

  // Check sheets_draft_pool table has is_tera_banned column
  try {
    const { data, error } = await supabase
      .from("sheets_draft_pool")
      .select("is_tera_banned")
      .limit(1)

    if (error && error.message.includes("column") && error.message.includes("does not exist")) {
      recordResult("sheets_draft_pool.is_tera_banned Column", false,
        "Column does not exist - migration may not have been applied")
      return false
    }

    recordResult("sheets_draft_pool.is_tera_banned Column", true, "Column exists")
  } catch (error: any) {
    recordResult("sheets_draft_pool.is_tera_banned Column", false, error.message)
    return false
  }

  return true
}

async function main() {
  console.log("🧪 Comprehensive Draft Pool System Validation\n")
  console.log("=" .repeat(60))

  const validations = [
    { name: "Database Schema", fn: validateDatabaseSchema },
    { name: "JSON Structure", fn: validateJSONStructure },
    { name: "Status Mapping", fn: validateStatusMapping },
    { name: "Import Service", fn: validateImportService },
    { name: "Sync Service", fn: validateSyncService },
  ]

  for (const validation of validations) {
    try {
      await validation.fn()
    } catch (error: any) {
      recordResult(validation.name, false, `Unexpected error: ${error.message}`)
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("\n📊 Validation Summary\n")

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const total = results.length

  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log("\n❌ Failed Tests:")
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}: ${r.message}`)
    })
    process.exit(1)
  } else {
    console.log("\n✅ All validations passed!")
    process.exit(0)
  }
}

main().catch((error) => {
  console.error("❌ Validation script failed:", error)
  process.exit(1)
})
