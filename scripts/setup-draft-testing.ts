/**
 * Setup script for testing the draft system
 * Creates test users, assigns them to teams, and ensures draft session is ready
 */

import { createServiceRoleClient } from "../lib/supabase/service"

async function setupDraftTesting() {
  console.log("🔧 Setting up draft system for testing...\n")
  
  const supabase = createServiceRoleClient()
  
  // Step 1: Get or create test users
  console.log("📝 Step 1: Setting up test users...")
  
  const testUsers = [
    { email: "test-coach-1@example.com", password: "test123456", name: "Test Coach 1" },
    { email: "test-coach-2@example.com", password: "test123456", name: "Test Coach 2" },
    { email: "test-coach-3@example.com", password: "test123456", name: "Test Coach 3" },
  ]
  
  const userIds: string[] = []
  
  for (const user of testUsers) {
    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(user.email)
    
    if (existingUser?.user) {
      console.log(`   ✅ User exists: ${user.email}`)
      userIds.push(existingUser.user.id)
    } else {
      // Create user
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      })
      
      if (error) {
        console.error(`   ❌ Failed to create user ${user.email}:`, error)
      } else {
        console.log(`   ✅ Created user: ${user.email}`)
        userIds.push(newUser.user.id)
      }
    }
  }
  
  if (userIds.length === 0) {
    console.error("❌ No users available for testing")
    return
  }
  
  // Step 2: Assign users to teams
  console.log("\n👥 Step 2: Assigning users to teams...")
  
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .order("name")
    .limit(3)
  
  if (!teams || teams.length === 0) {
    console.error("❌ No teams found. Please create teams first.")
    return
  }
  
  for (let i = 0; i < Math.min(teams.length, userIds.length); i++) {
    const team = teams[i]
    const userId = userIds[i]
    
    const { error } = await supabase
      .from("teams")
      .update({ coach_id: userId })
      .eq("id", team.id)
    
    if (error) {
      console.error(`   ❌ Failed to assign user to ${team.name}:`, error)
    } else {
      console.log(`   ✅ Assigned ${testUsers[i].email} to ${team.name}`)
    }
  }
  
  // Step 3: Verify draft session
  console.log("\n🎲 Step 3: Checking draft session...")
  
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single()
  
  if (!season) {
    console.error("❌ No current season found")
    return
  }
  
  const { data: session } = await supabase
    .from("draft_sessions")
    .select("*")
    .eq("season_id", season.id)
    .eq("status", "active")
    .single()
  
  if (session) {
    console.log(`   ✅ Active draft session found:`)
    console.log(`      Session ID: ${session.id}`)
    console.log(`      Current Pick: #${session.current_pick_number}`)
    console.log(`      Current Round: ${session.current_round}`)
    console.log(`      Draft Type: ${session.draft_type}`)
  } else {
    console.log("   ⚠️  No active draft session found")
    console.log("   💡 Create one using the DraftSystem.createSession() method")
  }
  
  // Step 4: Verify budgets
  console.log("\n💰 Step 4: Checking budgets...")
  
  const { data: budgets } = await supabase
    .from("draft_budgets")
    .select("team_id, total_points, spent_points, remaining_points")
    .eq("season_id", season.id)
  
  if (budgets && budgets.length > 0) {
    console.log(`   ✅ Found ${budgets.length} team budgets`)
    budgets.forEach(b => {
      console.log(`      Team ${b.team_id.slice(0, 8)}...: ${b.spent_points}/${b.total_points}pts`)
    })
  } else {
    console.log("   ⚠️  No budgets found - they will be created automatically")
  }
  
  // Step 5: Summary
  console.log("\n✅ Setup complete!\n")
  console.log("📋 Test Accounts:")
  testUsers.forEach((user, i) => {
    if (i < userIds.length) {
      console.log(`   ${i + 1}. ${user.email} / ${user.password}`)
      console.log(`      → Team: ${teams?.[i]?.name || "Not assigned"}`)
    }
  })
  
  console.log("\n🧪 To test:")
  console.log("   1. Log in with one of the test accounts")
  console.log("   2. Navigate to http://localhost:3000/draft")
  console.log("   3. Make a pick if it's your turn")
  console.log("   4. Open another browser window and log in as a different team")
  console.log("   5. Watch real-time updates!")
}

setupDraftTesting()
  .then(() => {
    console.log("\n✅ Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
