/**
 * Diagnostic script to check Discord role sync status
 * Helps determine if "skipped" means "already synced" or "missing data"
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"
import { syncAllDiscordRolesToApp } from "../lib/discord-role-sync"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

async function diagnoseSync() {
  console.log("🔍 Discord Role Sync Diagnostic\n")

  const supabase = createServiceRoleClient()

  // 1. Check profiles with Discord IDs
  console.log("1️⃣ Checking profiles with Discord IDs...")
  const { data: profilesWithDiscord, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, discord_id, role")
    .not("discord_id", "is", null)

  if (profilesError) {
    console.error("❌ Error fetching profiles:", profilesError)
    return
  }

  console.log(`   Found ${profilesWithDiscord?.length || 0} profiles with Discord IDs`)
  console.log("\n   Profiles breakdown by role:")
  const roleCounts = profilesWithDiscord?.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(roleCounts || {}).forEach(([role, count]) => {
    console.log(`   - ${role}: ${count}`)
  })

  // 2. Check total profiles
  console.log("\n2️⃣ Checking total profiles...")
  const { count: totalProfiles } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })

  console.log(`   Total profiles: ${totalProfiles}`)
  console.log(
    `   Profiles without Discord ID: ${(totalProfiles || 0) - (profilesWithDiscord?.length || 0)}`,
  )

  // 3. Run a test sync with detailed logging
  console.log("\n3️⃣ Running test sync to see detailed results...")
  console.log("   (This will show which users are skipped and why)\n")

  // Temporarily enhance logging
  const originalLog = console.log
  const detailedLogs: string[] = []

  console.log = (...args: any[]) => {
    const message = args.join(" ")
    if (message.includes("Discord Sync") || message.includes("not found")) {
      detailedLogs.push(message)
    }
    originalLog(...args)
  }

  try {
    const result = await syncAllDiscordRolesToApp()
    console.log("\n4️⃣ Sync Results:")
    console.log(`   ✅ Updated: ${result.results.updated}`)
    console.log(`   ⏭️  Skipped: ${result.results.skipped}`)
    console.log(`   ❌ Errors: ${result.results.errors}`)

    if (result.results.skipped > 0) {
      console.log("\n   ⚠️  Skipped users could mean:")
      console.log("      - Roles already match (good!)")
      console.log("      - Discord members don't have matching profiles (problem)")
      console.log("\n   Check the logs above for 'not found' messages")
    }

    // Show sample profiles
    if (profilesWithDiscord && profilesWithDiscord.length > 0) {
      console.log("\n5️⃣ Sample profiles with Discord IDs:")
      profilesWithDiscord.slice(0, 5).forEach((p) => {
        console.log(
          `   - ${p.display_name || p.id}: Discord ${p.discord_id}, Role: ${p.role}`,
        )
      })
      if (profilesWithDiscord.length > 5) {
        console.log(`   ... and ${profilesWithDiscord.length - 5} more`)
      }
    }
  } catch (error: any) {
    console.error("❌ Error during sync:", error.message)
  } finally {
    console.log = originalLog
  }

  console.log("\n✅ Diagnostic complete!")
}

diagnoseSync()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })
