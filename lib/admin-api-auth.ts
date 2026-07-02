/**
 * Admin / commissioner gate for league management API routes.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

export type AdminActor = {
  userId: string
  role: string
}

type LeagueAdminProfile = {
  id: string
  role: string | null
  discord_roles: unknown
}

/** Discord guild roles that grant league admin API access (matches draft-board-analysis). */
export function hasDiscordLeagueAdminRole(discordRoles: unknown): boolean {
  if (!Array.isArray(discordRoles)) return false
  return discordRoles.some((entry) => {
    if (!entry || typeof entry !== "object") return false
    const name = (entry as { name?: string }).name
    return name === "Admin" || name === "Commissioner"
  })
}

export function profileGrantsLeagueAdminAccess(profile: {
  role?: string | null
  discord_roles?: unknown
}): boolean {
  const role = profile.role ?? "spectator"
  if (role === "admin" || role === "commissioner") return true
  return hasDiscordLeagueAdminRole(profile.discord_roles)
}

/**
 * Returns whether the user may access league admin APIs (profile role, admin_users, or Discord Admin/Commissioner).
 */
export async function resolveLeagueAdminAccess(
  userId: string
): Promise<
  | { allowed: true; userId: string; role: string }
  | { allowed: false; error: string; status: number }
> {
  const service = createServiceRoleClient()

  const { data: profile, error } = await service
    .from("profiles")
    .select("id, role, discord_roles")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    return { allowed: false, error: "Profile not found", status: 404 }
  }

  const typed = profile as LeagueAdminProfile
  const role = typed.role ?? "spectator"

  if (profileGrantsLeagueAdminAccess(typed)) {
    return { allowed: true, userId, role }
  }

  const { data: adminUser } = await service
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (adminUser) {
    return { allowed: true, userId, role }
  }

  return {
    allowed: false,
    error: "Forbidden — admin or commissioner access required",
    status: 403,
  }
}

export async function requireAdminOrCommissioner(
  userId: string
): Promise<AdminActor | { error: string; status: number }> {
  const access = await resolveLeagueAdminAccess(userId)
  if (!access.allowed) {
    return { error: access.error, status: access.status }
  }
  return { userId: access.userId, role: access.role }
}
