/**
 * Script to check and fix admin role for a user
 * Usage: tsx scripts/check-and-fix-admin-role.ts [discord_username]
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

async function checkAndFixAdminRole(discordUsername?: string) {
  const supabase = createServiceRoleClient()
  
  console.log("🔍 Checking admin role...\n")
  
  // Find user by Discord username or get all admins
  let profile
  
  if (discordUsername) {
    console.log(`   Looking for user: ${discordUsername}`)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, discord_username, role, discord_id")
      .or(`discord_username.ilike.%${discordUsername}%,username.ilike.%${discordUsername}%,display_name.ilike.%${discordUsername}%`)
      .limit(5)
    
    if (error) {
      console.error("   ❌ Error finding user:", error.message)
      process.exit(1)
    }
    
    if (!data || data.length === 0) {
      console.error(`   ❌ User not found: ${discordUsername}`)
      process.exit(1)
    }
    
    if (data.length > 1) {
      console.log(`   ⚠️  Multiple users found:`)
      data.forEach((u, i) => {
        console.log(`      ${i + 1}. ${u.display_name || u.username} (${u.discord_username}) - Role: ${u.role}`)
      })
      profile = data[0]
      console.log(`   Using first result: ${profile.display_name || profile.username}\n`)
    } else {
      profile = data[0]
    }
  } else {
    // Get all users with admin role
    console.log("   Finding all admin users...")
    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, discord_username, role, discord_id")
      .eq("role", "admin")
    
    if (error) {
      console.error("   ❌ Error finding admins:", error.message)
      process.exit(1)
    }
    
    if (!admins || admins.length === 0) {
      console.log("   ⚠️  No admin users found!")
      console.log("   Listing all users...")
      
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, username, display_name, discord_username, role")
        .order("created_at", { ascending: false })
        .limit(10)
      
      if (allUsers) {
        console.log("\n   Recent users:")
        allUsers.forEach((u, i) => {
          console.log(`      ${i + 1}. ${u.display_name || u.username || 'Unnamed'} (${u.discord_username || 'no discord'}) - Role: ${u.role}`)
        })
      }
      
      process.exit(0)
    }
    
    console.log(`   ✅ Found ${admins.length} admin user(s):\n`)
    admins.forEach((admin, i) => {
      console.log(`      ${i + 1}. ${admin.display_name || admin.username || 'Unnamed'}`)
      console.log(`         Discord: ${admin.discord_username || 'N/A'}`)
      console.log(`         Role: ${admin.role}`)
      console.log(`         ID: ${admin.id}\n`)
    })
    
    process.exit(0)
  }
  
  console.log("   User Profile:")
  console.log(`      ID: ${profile.id}`)
  console.log(`      Display Name: ${profile.display_name || 'N/A'}`)
  console.log(`      Username: ${profile.username || 'N/A'}`)
  console.log(`      Discord Username: ${profile.discord_username || 'N/A'}`)
  console.log(`      Discord ID: ${profile.discord_id || 'N/A'}`)
  console.log(`      Current Role: ${profile.role}\n`)
  
  if (profile.role === "admin") {
    console.log("   ✅ User already has admin role!")
    process.exit(0)
  }
  
  // Ask to update role
  console.log(`   ⚠️  User does NOT have admin role. Current role: ${profile.role}`)
  console.log(`   🔧 Updating role to 'admin'...\n`)
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profile.id)
  
  if (updateError) {
    console.error("   ❌ Failed to update role:", updateError.message)
    process.exit(1)
  }
  
  console.log("   ✅ Successfully updated role to 'admin'!")
  
  // Verify update
  const { data: updatedProfile } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", profile.id)
    .single()
  
  console.log(`   ✅ Verified: ${updatedProfile?.display_name} now has role: ${updatedProfile?.role}`)
}

// Get Discord username from command line args
const discordUsername = process.argv[2]

checkAndFixAdminRole(discordUsername)
  .then(() => {
    console.log("\n✨ Done!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
