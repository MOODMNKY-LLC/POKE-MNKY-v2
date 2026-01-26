/**
 * Verification Script: Coach Assignment & Team Linking
 * 
 * Verifies that coach-to-team relationships are properly configured
 * 
 * Usage: npx tsx scripts/verify-coach-assignments.ts
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

interface VerificationResult {
  check: string
  passed: boolean
  message: string
  details?: any
}

async function verifyCoachAssignments() {
  const supabase = createServiceRoleClient()
  const results: VerificationResult[] = []

  console.log("🔍 Verifying Coach Assignment Configuration...\n")

  // Check 1: Current season exists
  console.log("1. Checking current season...")
  const { data: season, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name, is_current")
    .eq("is_current", true)
    .single()

  if (seasonError || !season) {
    results.push({
      check: "Current Season",
      passed: false,
      message: "No current season found. Coaches cannot be auto-assigned.",
      details: { error: seasonError?.message },
    })
    console.log("   ❌ FAILED: No current season")
  } else {
    results.push({
      check: "Current Season",
      passed: true,
      message: `Current season: ${season.name}`,
      details: { seasonId: season.id, seasonName: season.name },
    })
    console.log(`   ✅ PASSED: ${season.name} (${season.id})`)
  }

  // Check 2: Teams exist
  console.log("\n2. Checking teams...")
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, coach_id, season_id")
    .eq("season_id", season?.id || "")

  if (teamsError) {
    results.push({
      check: "Teams Exist",
      passed: false,
      message: `Error fetching teams: ${teamsError.message}`,
    })
    console.log(`   ❌ FAILED: ${teamsError.message}`)
  } else {
    const totalTeams = teams?.length || 0
    const assignedTeams = teams?.filter((t) => t.coach_id !== null).length || 0
    const unassignedTeams = totalTeams - assignedTeams

    results.push({
      check: "Teams Exist",
      passed: true,
      message: `${totalTeams} teams found (${assignedTeams} assigned, ${unassignedTeams} unassigned)`,
      details: { total: totalTeams, assigned: assignedTeams, unassigned: unassignedTeams },
    })
    console.log(`   ✅ PASSED: ${totalTeams} teams (${assignedTeams} assigned, ${unassignedTeams} unassigned)`)
  }

  // Check 3: Coaches exist
  console.log("\n3. Checking coaches...")
  const { data: coaches, error: coachesError } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, team_id")
    .eq("role", "coach")

  if (coachesError) {
    results.push({
      check: "Coaches Exist",
      passed: false,
      message: `Error fetching coaches: ${coachesError.message}`,
    })
    console.log(`   ❌ FAILED: ${coachesError.message}`)
  } else {
    const totalCoaches = coaches?.length || 0
    const assignedCoaches = coaches?.filter((c) => c.team_id !== null).length || 0
    const unassignedCoaches = totalCoaches - assignedCoaches

    results.push({
      check: "Coaches Exist",
      passed: true,
      message: `${totalCoaches} coaches found (${assignedCoaches} assigned, ${unassignedCoaches} unassigned)`,
      details: { total: totalCoaches, assigned: assignedCoaches, unassigned: unassignedCoaches },
    })
    console.log(`   ✅ PASSED: ${totalCoaches} coaches (${assignedCoaches} assigned, ${unassignedCoaches} unassigned)`)
  }

  // Check 4: Database function exists
  console.log("\n4. Checking database function...")
  const { data: functionTest, error: functionError } = await supabase.rpc("assign_coach_to_team", {
    p_user_id: "00000000-0000-0000-0000-000000000000" as any, // Invalid UUID to test function exists
    p_team_id: null,
  })

  if (functionError) {
    if (functionError.message?.includes("not found") || functionError.code === "42883") {
      results.push({
        check: "Database Function",
        passed: false,
        message: "assign_coach_to_team() function not found",
        details: { error: functionError.message },
      })
      console.log("   ❌ FAILED: Function not found")
    } else {
      // Function exists but failed (expected with invalid UUID)
      results.push({
        check: "Database Function",
        passed: true,
        message: "Function exists (test call failed as expected)",
      })
      console.log("   ✅ PASSED: Function exists")
    }
  } else {
    results.push({
      check: "Database Function",
      passed: true,
      message: "Function exists and is callable",
    })
    console.log("   ✅ PASSED: Function exists")
  }

  // Check 5: Relationship integrity
  console.log("\n5. Checking relationship integrity...")
  if (coaches && teams) {
    const integrityIssues: string[] = []

    // Check: profiles.team_id should match teams.id
    for (const coach of coaches.filter((c) => c.team_id)) {
      const team = teams.find((t) => t.id === coach.team_id)
      if (!team) {
        integrityIssues.push(`Coach ${coach.display_name || coach.username} has invalid team_id: ${coach.team_id}`)
      }
    }

    // Check: teams.coach_id should match coaches.id
    for (const team of teams.filter((t) => t.coach_id)) {
      const { data: coach } = await supabase
        .from("coaches")
        .select("id, user_id")
        .eq("id", team.coach_id)
        .single()

      if (!coach) {
        integrityIssues.push(`Team ${team.name} has invalid coach_id: ${team.coach_id}`)
      } else {
        // Verify coach's user_id has matching team_id
        const coachProfile = coaches.find((c) => c.id === coach.user_id)
        if (coachProfile && coachProfile.team_id !== team.id) {
          integrityIssues.push(
            `Team ${team.name} coach mismatch: team.coach_id → coaches.id → coaches.user_id → profiles.team_id doesn't match`
          )
        }
      }
    }

    if (integrityIssues.length > 0) {
      results.push({
        check: "Relationship Integrity",
        passed: false,
        message: `${integrityIssues.length} integrity issue(s) found`,
        details: { issues: integrityIssues },
      })
      console.log(`   ❌ FAILED: ${integrityIssues.length} issue(s)`)
      integrityIssues.forEach((issue) => console.log(`      - ${issue}`))
    } else {
      results.push({
        check: "Relationship Integrity",
        passed: true,
        message: "All relationships are valid",
      })
      console.log("   ✅ PASSED: All relationships valid")
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 VERIFICATION SUMMARY")
  console.log("=".repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  results.forEach((result) => {
    const icon = result.passed ? "✅" : "❌"
    console.log(`${icon} ${result.check}: ${result.message}`)
  })

  console.log("\n" + "=".repeat(60))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log("=".repeat(60))

  if (failed === 0) {
    console.log("\n🎉 All checks passed! Coach assignment is properly configured.")
  } else {
    console.log("\n⚠️  Some checks failed. Please review the issues above.")
  }

  return results
}

// Run if executed directly
if (require.main === module) {
  verifyCoachAssignments()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error("Error:", error)
      process.exit(1)
    })
}

export { verifyCoachAssignments }
