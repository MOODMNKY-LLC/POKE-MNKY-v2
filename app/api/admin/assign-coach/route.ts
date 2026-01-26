import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service"
import { assignCoachToTeam } from "@/lib/coach-assignment"
import { getCurrentUserProfile } from "@/lib/rbac"

/**
 * POST /api/admin/assign-coach
 * Manually assign a coach to a team
 * 
 * Body: {
 *   userId: string,
 *   teamId?: string (optional - if not provided, assigns to first available team)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client for admin operations to bypass RLS
    // This ensures we can always check the user's role correctly
    const serviceSupabase = createServiceRoleClient()
    
    // Get profile using service role client (bypasses RLS)
    console.log("[Admin Assign Coach] Fetching profile for user:", user.id)
    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, role, display_name, username, discord_username, team_id")
      .eq("id", user.id)
      .single()
    
    console.log("[Admin Assign Coach] Profile query result:", {
      hasProfile: !!profile,
      profileError: profileError?.message,
      profileData: profile ? {
        id: profile.id,
        role: profile.role,
        roleType: typeof profile.role,
        displayName: profile.display_name
      } : null
    })
    
    if (profileError) {
      console.error("[Admin Assign Coach] Profile query error:", {
        userId: user.id,
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      })
      return NextResponse.json({ 
        error: "Profile not found",
        debug: {
          userId: user.id,
          error: profileError.message,
          code: profileError.code
        }
      }, { status: 404 })
    }
    
    if (!profile) {
      console.error("[Admin Assign Coach] Profile is null for user:", user.id)
      return NextResponse.json({ 
        error: "Profile not found",
        debug: {
          userId: user.id,
          message: "Profile query returned null"
        }
      }, { status: 404 })
    }

    console.log("[Admin Assign Coach] Profile retrieved successfully:", {
      userId: user.id,
      profileId: profile.id,
      role: profile.role,
      roleType: typeof profile.role,
      roleEqualsAdmin: profile.role === "admin",
      roleEqualsCommissioner: profile.role === "commissioner",
      displayName: profile.display_name,
      discordUsername: profile.discord_username
    })

    // Check admin/commissioner permissions
    const isAdmin = profile.role === "admin"
    const isCommissioner = profile.role === "commissioner"
    
    console.log("[Admin Assign Coach] Permission check:", {
      userId: user.id,
      role: profile.role,
      isAdmin,
      isCommissioner,
      hasPermission: isAdmin || isCommissioner
    })
    
    if (!isAdmin && !isCommissioner) {
      console.error("[Admin Assign Coach] Insufficient permissions:", {
        userId: user.id,
        currentRole: profile.role,
        roleType: typeof profile.role,
        requiredRoles: ["admin", "commissioner"],
        roleComparison: {
          equalsAdmin: profile.role === "admin",
          equalsCommissioner: profile.role === "commissioner",
          strictEqualsAdmin: profile.role === "admin",
          strictEqualsCommissioner: profile.role === "commissioner"
        }
      })
      return NextResponse.json(
        { 
          error: "Forbidden - Admin or Commissioner access required",
          debug: {
            userId: user.id,
            currentRole: profile.role,
            roleType: typeof profile.role,
            requiredRoles: ["admin", "commissioner"]
          }
        },
        { status: 403 }
      )
    }
    
    console.log("[Admin Assign Coach] Permission check passed, proceeding with assignment")

    const body = await request.json()
    const { userId, teamId } = body

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      )
    }

    // Verify user exists and has coach role (use service role client)
    const { data: targetProfile, error: targetProfileError } = await serviceSupabase
      .from("profiles")
      .select("id, role, username, display_name")
      .eq("id", userId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // If user doesn't have coach role, update it (use service role client)
    if (targetProfile.role !== "coach") {
      const { error: roleError } = await serviceSupabase
        .from("profiles")
        .update({ role: "coach" })
        .eq("id", userId)

      if (roleError) {
        return NextResponse.json(
          { error: `Failed to update role: ${roleError.message}` },
          { status: 500 }
        )
      }
    }

    // Assign coach to team
    const result = await assignCoachToTeam(userId, teamId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }

    // Get updated team info (use service role client)
    const { data: team } = teamId
      ? await serviceSupabase
          .from("teams")
          .select("id, name, coach_id")
          .eq("id", teamId)
          .single()
      : result.teamId
        ? await serviceSupabase
            .from("teams")
            .select("id, name, coach_id")
            .eq("id", result.teamId)
            .single()
        : { data: null }

    // Log activity (use service role client)
    await serviceSupabase.from("user_activity_log").insert({
      user_id: profile.id,
      action: "admin_assigned_coach",
      resource_type: "coach",
      resource_id: userId,
      metadata: {
        assigned_user: userId,
        assigned_team: result.teamId,
        team_name: team?.name,
        assigned_by: profile.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      coachId: result.coachId,
      teamId: result.teamId,
      team: team,
    })
  } catch (error: any) {
    console.error("[Admin Assign Coach] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
