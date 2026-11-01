import { NextResponse } from "next/server"
import { resolveLeagueAdminAccess, unauthorizedJson } from "@/lib/admin-api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service"

type CoachEmbed = { user_id?: string | null } | { user_id?: string | null }[] | null

function coachUserId(coaches: CoachEmbed): string | null {
  if (!coaches) return null
  if (Array.isArray(coaches)) return coaches[0]?.user_id ?? null
  return coaches.user_id ?? null
}

/**
 * League admins may act for any team. Otherwise the caller must be that team's coach.
 * Returns a 401/403/404 response when the write must be rejected.
 */
export async function teamWriteDeniedResponse(
  userId: string,
  teamId: string
): Promise<NextResponse | null> {
  const admin = await resolveLeagueAdminAccess(userId)
  if (admin.allowed) return null

  const service = createServiceRoleClient()
  const { data: team, error } = await service
    .from("teams")
    .select("id, coaches(user_id)")
    .eq("id", teamId)
    .maybeSingle()

  if (error || !team) {
    return unauthorizedJson("Team not found", 404)
  }

  if (coachUserId(team.coaches as CoachEmbed) === userId) return null
  return unauthorizedJson("Forbidden", 403)
}
