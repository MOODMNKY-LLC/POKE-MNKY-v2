/**
 * Test Script for Draft Pool Import/Sync
 * 
 * This script validates the draft pool import and sync workflow.
 * Run with: npx tsx scripts/test-draft-pool-import.ts
 * 
 * Prerequisites:
 * - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 * - Have draft-pool-generated.json file available
 */

import { readFileSync } from "fs"
import { join } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"
import {
  importDraftPoolToStaging,
  validateDraftPoolJSON,
  type ServerAgentDraftPool,
} from "../lib/draft-pool/import-service"
import {
  syncStagingToProduction,
  type SyncResult,
} from "../lib/draft-pool/sync-service"

async function main() {
  console.log("🧪 Testing Draft Pool Import/Sync Workflow\n")

  // Step 1: Load JSON file
  console.log("📄 Step 1: Loading JSON file...")
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
    console.log("✅ JSON file loaded successfully")
  } catch (error: any) {
    console.error("❌ Failed to load JSON file:", error.message)
    process.exit(1)
  }

  // Step 2: Validate JSON structure
  console.log("\n🔍 Step 2: Validating JSON structure...")
  if (!validateDraftPoolJSON(draftPoolData)) {
    console.error("❌ Invalid JSON structure")
    process.exit(1)
  }
  console.log("✅ JSON structure is valid")
  console.log(`   - Total Pokemon: ${draftPoolData.metadata.totalPokemon}`)
  console.log(`   - Available: ${draftPoolData.metadata.availableCount}`)
  console.log(`   - Banned: ${draftPoolData.metadata.bannedCount}`)
  console.log(`   - Tera Banned: ${draftPoolData.metadata.teraBannedCount}`)
  console.log(`   - Drafted: ${draftPoolData.metadata.draftedCount}`)

  // Step 3: Test import to staging
  console.log("\n📥 Step 3: Testing import to staging table...")
  try {
    const importResult = await importDraftPoolToStaging(
      draftPoolData,
      "Draft Board"
    )

    if (importResult.success) {
      console.log("✅ Import successful")
      console.log(`   - Imported: ${importResult.imported}`)
      console.log(`   - Tera Banned: ${importResult.teraBannedCount}`)
      console.log(`   - Errors: ${importResult.errors.length}`)
      if (importResult.errors.length > 0) {
        console.log("   - Error details:")
        importResult.errors.slice(0, 5).forEach((err) => {
          console.log(`     • ${err.pokemon}: ${err.error}`)
        })
      }
    } else {
      console.error("❌ Import failed")
      importResult.errors.forEach((err) => {
        console.error(`   - ${err.pokemon}: ${err.error}`)
      })
      process.exit(1)
    }
  } catch (error: any) {
    console.error("❌ Import error:", error.message)
    process.exit(1)
  }

  // Step 4: Verify staging data
  console.log("\n🔍 Step 4: Verifying staging data...")
  const supabase = createServiceRoleClient()
  const { data: stagingData, error: stagingError } = await supabase
    .from("sheets_draft_pool")
    .select("*")
    .eq("sheet_name", "Draft Board")

  if (stagingError) {
    console.error("❌ Failed to fetch staging data:", stagingError.message)
    process.exit(1)
  }

  if (!stagingData || stagingData.length === 0) {
    console.error("❌ No data in staging table")
    process.exit(1)
  }

  console.log("✅ Staging data verified")
  console.log(`   - Total records: ${stagingData.length}`)
  const availableCount = stagingData.filter((p) => p.is_available).length
  const teraBannedCount = stagingData.filter((p) => p.is_tera_banned).length
  console.log(`   - Available: ${availableCount}`)
  console.log(`   - Tera Banned: ${teraBannedCount}`)

  // Step 5: Get current season for sync test
  console.log("\n🔍 Step 5: Finding current season...")
  const { data: seasons, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, is_current")
    .eq("is_current", true)
    .limit(1)

  if (seasonError || !seasons || seasons.length === 0) {
    console.warn("⚠️  No current season found - skipping sync test")
    console.log("   You can manually test sync via the admin UI")
    console.log("\n✅ Import test completed successfully!")
    process.exit(0)
  }

  const seasonId = seasons[0].id
  console.log(`✅ Found season: ${seasons[0].name} (${seasonId})`)

  // Step 6: Test dry-run sync
  console.log("\n🔄 Step 6: Testing dry-run sync...")
  try {
    const dryRunResult = await syncStagingToProduction(
      seasonId,
      "Draft Board",
      true // dry run
    )

    if (dryRunResult.success) {
      console.log("✅ Dry-run sync successful")
      console.log(`   - Would sync: ${dryRunResult.synced}`)
      console.log(`   - Would skip: ${dryRunResult.skipped}`)
      console.log(`   - Conflicts: ${dryRunResult.conflicts.length}`)
      console.log(`   - Unmatched: ${dryRunResult.unmatchedNames.length}`)

      if (dryRunResult.conflicts.length > 0) {
        console.log("   - Conflict details:")
        dryRunResult.conflicts.slice(0, 5).forEach((conflict) => {
          console.log(`     • ${conflict.pokemon}: ${conflict.reason}`)
        })
      }

      if (dryRunResult.unmatchedNames.length > 0) {
        console.log("   - Unmatched Pokemon:")
        dryRunResult.unmatchedNames.slice(0, 10).forEach((name) => {
          console.log(`     • ${name}`)
        })
        if (dryRunResult.unmatchedNames.length > 10) {
          console.log(`     ... and ${dryRunResult.unmatchedNames.length - 10} more`)
        }
      }
    } else {
      console.error("❌ Dry-run sync failed")
      process.exit(1)
    }
  } catch (error: any) {
    console.error("❌ Dry-run sync error:", error.message)
    process.exit(1)
  }

  console.log("\n✅ All tests completed successfully!")
  console.log("\n📝 Next steps:")
  console.log("   1. Review staging data in admin UI")
  console.log("   2. Use dry-run sync in admin UI to preview changes")
  console.log("   3. Perform actual sync when ready")
}

// Run the test
main().catch((error) => {
  console.error("❌ Test failed:", error)
  process.exit(1)
})
