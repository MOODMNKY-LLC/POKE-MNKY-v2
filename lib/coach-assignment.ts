/**
 * Coach Assignment Helper Functions
 * Handles assigning users to teams when they become coaches
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

export interface AssignCoachResult {
  success: boolean
  coachId?: string
  teamId?: string
  message: string
}

/**
 * Assign a coach to a team
 * Creates coach entry if needed, assigns to team
 */
export async function assignCoachToTeam(
  userId: string,
  teamId?: string
): Promise<AssignCoachResult> {
  const supabase = createServiceRoleClient()

  try {
    // Call database function
    const { data: coachId, error } = await supabase.rpc("assign_coach_to_team", {
      p_user_id: userId,
      p_team_id: teamId || null,
    })

    if (error) {
      console.error("[Coach Assignment] Error:", error)
      return {
        success: false,
        message: error.message || "Failed to assign coach to team",
      }
    }

    // Get team_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", userId)
      .single()

    return {
      success: true,
      coachId: coachId as string,
      teamId: profile?.team_id as string | undefined,
      message: "Coach assigned to team successfully",
    }
  } catch (error: any) {
    console.error("[Coach Assignment] Exception:", error)
    return {
      success: false,
      message: error.message || "Failed to assign coach to team",
    }
  }
}

/**
 * Get coach's team information
 */
export async function getCoachTeam(userId: string) {
  const supabase = createServiceRoleClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", userId)
    .single()

  if (!profile?.team_id) {
    return null
  }

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", profile.team_id)
    .single()

  return team
}
