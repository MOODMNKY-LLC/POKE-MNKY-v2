/**
 * Verify the current user's profile and role
 * This helps debug permission issues
 * 
 * Run: npm run verify:user-profile
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "@/lib/supabase/service"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

async function verifyCurrentUserProfile() {
  console.log("🔍 Verifying user profiles...\n")

  const supabase = createServiceRoleClient()

  try {
    // Get all users
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error("❌ Failed to list users:", listError.message)
      process.exit(1)
    }

    console.log(`📋 Found ${usersData?.users?.length || 0} users\n`)

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, role, display_name, username, discord_username, discord_id")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("❌ Failed to fetch profiles:", profilesError.message)
      process.exit(1)
    }

    console.log(`📋 Found ${profiles?.length || 0} profiles\n`)

    // Match users with profiles
    const userMap = new Map<string, any>()
    if (usersData?.users) {
      for (const user of usersData.users) {
        userMap.set(user.id, user)
      }
    }

    console.log("👥 User Profiles:\n")
    console.log("=" .repeat(80))

    for (const profile of profiles || []) {
      const user = userMap.get(profile.id)
      const email = user?.email || "N/A"
      const isAdmin = profile.role === "admin"
      const isCommissioner = profile.role === "commissioner"
      const hasAdminAccess = isAdmin || isCommissioner

      console.log(`\n📧 Email: ${email}`)
      console.log(`   ID: ${profile.id}`)
      console.log(`   Display Name: ${profile.display_name || "N/A"}`)
      console.log(`   Username: ${profile.username || "N/A"}`)
      console.log(`   Discord: ${profile.discord_username || "N/A"}`)
      console.log(`   Role: ${profile.role || "NULL"} (${typeof profile.role})`)
      console.log(`   ✅ Admin: ${isAdmin}`)
      console.log(`   ✅ Commissioner: ${isCommissioner}`)
      console.log(`   ✅ Has Admin Access: ${hasAdminAccess}`)
      
      if (profile.role === null || profile.role === undefined) {
        console.log(`   ⚠️  WARNING: Role is null/undefined!`)
      }
      
      if (profile.role && profile.role !== "admin" && profile.role !== "commissioner" && profile.role !== "coach" && profile.role !== "viewer") {
        console.log(`   ⚠️  WARNING: Unknown role value: "${profile.role}"`)
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("\n📊 Summary:")
    console.log(`   Total Users: ${usersData?.users?.length || 0}`)
    console.log(`   Total Profiles: ${profiles?.length || 0}`)
    console.log(`   Admin Users: ${profiles?.filter(p => p.role === "admin").length || 0}`)
    console.log(`   Commissioner Users: ${profiles?.filter(p => p.role === "commissioner").length || 0}`)
    console.log(`   Coach Users: ${profiles?.filter(p => p.role === "coach").length || 0}`)
    console.log(`   Users with NULL role: ${profiles?.filter(p => !p.role).length || 0}`)

    // Check for mood_mnky specifically
    const moodMnkyProfile = profiles?.find(
      p => p.display_name === "mood_mnky" || 
           p.username === "mood_mnky" || 
           p.discord_username === "mood_mnky"
    )

    if (moodMnkyProfile) {
      console.log("\n🎯 mood_mnky Profile:")
      console.log("   " + "=".repeat(60))
      console.log(`   ID: ${moodMnkyProfile.id}`)
      console.log(`   Role: ${moodMnkyProfile.role || "NULL"} (${typeof moodMnkyProfile.role})`)
      console.log(`   Display Name: ${moodMnkyProfile.display_name}`)
      console.log(`   Username: ${moodMnkyProfile.username || "N/A"}`)
      console.log(`   Discord: ${moodMnkyProfile.discord_username || "N/A"}`)
      console.log(`   Is Admin: ${moodMnkyProfile.role === "admin"}`)
    } else {
      console.log("\n⚠️  mood_mnky profile not found!")
    }

  } catch (error: any) {
    console.error("❌ Verification failed:", error)
    process.exit(1)
  }
}

// Run verification
verifyCurrentUserProfile()
  .then(() => {
    console.log("\n✅ Verification completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Verification failed:", error)
    process.exit(1)
  })
