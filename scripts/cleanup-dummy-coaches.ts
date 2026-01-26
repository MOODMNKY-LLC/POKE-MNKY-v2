/**
 * Cleanup script to remove all dummy/test coaches from the database
 * Removes test users created by seed scripts and test setup scripts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"

// Load environment variables from .env.local, fallback to .env
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const TEST_COACH_EMAILS = [
  // From seed_demo_coaches.js
  "coach2@example.com",
  "coach3@example.com",
  "coach4@example.com",
  // From create_test_user.js
  "coach1@example.com",
  // From setup-draft-testing.ts
  "test-coach-1@example.com",
  "test-coach-2@example.com",
  "test-coach-3@example.com",
  // From RLS testing
  "test-coach@example.com",
]

async function cleanupDummyCoaches() {
  console.log("🧹 Cleaning up dummy/test coaches...\n")
  
  const supabase = createServiceRoleClient()
  
  // Get all users first (more efficient than querying one by one)
  console.log("   📋 Fetching all users...")
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error(`   ❌ Failed to list users:`, listError.message)
    process.exit(1)
  }
  
  // Create a map of email -> user ID for quick lookup
  const emailToUserId = new Map<string, string>()
  if (usersData?.users) {
    for (const user of usersData.users) {
      if (user.email) {
        emailToUserId.set(user.email.toLowerCase(), user.id)
      }
    }
  }
  
  let deletedCount = 0
  let errorCount = 0
  
  for (const email of TEST_COACH_EMAILS) {
    try {
      // Find user ID from the map
      const userId = emailToUserId.get(email.toLowerCase())
      
      if (!userId) {
        console.log(`   ⏭️  User not found: ${email}`)
        continue
      }
      
      // Get profile to check team assignment
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, team_id, role")
        .eq("id", userId)
        .single()
      
      if (profile?.team_id) {
        // Remove team assignment (set team_id to null)
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ team_id: null })
          .eq("id", userId)
        
        if (updateError) {
          console.error(`   ⚠️  Failed to remove team assignment for ${email}:`, updateError.message)
        } else {
          console.log(`   ✅ Removed team assignment for ${email}`)
        }
        
        // Also remove coach_id from teams table if this user was assigned as coach
        const { error: teamUpdateError } = await supabase
          .from("teams")
          .update({ coach_id: null })
          .eq("coach_id", userId)
        
        if (teamUpdateError) {
          console.error(`   ⚠️  Failed to remove coach_id from teams for ${email}:`, teamUpdateError.message)
        }
      }
      
      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId)
      
      if (profileError) {
        console.error(`   ⚠️  Failed to delete profile for ${email}:`, profileError.message)
      }
      
      // Delete auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
      
      if (deleteError) {
        console.error(`   ❌ Failed to delete user ${email}:`, deleteError.message)
        errorCount++
      } else {
        console.log(`   ✅ Deleted: ${email}`)
        deletedCount++
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing ${email}:`, error.message)
      errorCount++
    }
  }
  
  console.log("\n" + "=".repeat(60))
  console.log(`✅ Cleanup complete!`)
  console.log(`   Deleted: ${deletedCount} users`)
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount}`)
  }
  console.log("=".repeat(60))
}

// Run cleanup
cleanupDummyCoaches()
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Cleanup failed:", error)
    process.exit(1)
  })
