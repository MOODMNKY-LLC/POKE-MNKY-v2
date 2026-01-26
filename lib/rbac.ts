import type { SupabaseClient } from "@supabase/supabase-js"

// User roles enum
export enum UserRole {
  ADMIN = "admin",
  COMMISSIONER = "commissioner",
  COACH = "coach",
  SPECTATOR = "spectator",
}

// Permission strings
export const Permissions = {
  // Admin permissions
  ALL: "*",

  // System permissions
  MANAGE_USERS: "manage:users",
  MANAGE_ROLES: "manage:roles",
  MANAGE_SYSTEM: "manage:system",
  MANAGE_INTEGRATIONS: "manage:integrations",
  MANAGE_PLATFORM_KIT: "manage:platform_kit",

  // Commissioner permissions
  MANAGE_LEAGUE: "manage:league",
  MANAGE_SEASONS: "manage:seasons",
  MANAGE_CONFERENCES: "manage:conferences",
  MANAGE_DIVISIONS: "manage:divisions",
  MANAGE_TEAMS: "manage:teams",
  MANAGE_COACHES: "manage:coaches",
  MANAGE_MATCHES: "manage:matches",
  MANAGE_MATCHWEEKS: "manage:matchweeks",
  MANAGE_TRADES: "manage:trades",
  MANAGE_DRAFT: "manage:draft",
  MANAGE_FREE_AGENCY: "manage:free_agency",
  APPROVE_RESULTS: "approve:results",
  APPROVE_TRADES: "approve:trades",
  VIEW_ANALYTICS: "view:analytics",
  VIEW_ALL_TEAMS: "view:all_teams",
  VIEW_ALL_COACHES: "view:all_coaches",

  // Coach permissions
  MANAGE_OWN_TEAM: "manage:own_team",
  MANAGE_OWN_ROSTER: "manage:own_roster",
  SUBMIT_RESULTS: "submit:results",
  PROPOSE_TRADES: "propose:trades",
  CREATE_BATTLES: "create:battles",
  USE_AI_FEATURES: "use:ai_features",
  VIEW_LEAGUE: "view:league",
  VIEW_STANDINGS: "view:standings",
  VIEW_SCHEDULE: "view:schedule",
  VIEW_OWN_TEAM: "view:own_team",

  // Spectator permissions
  VIEW_TEAMS: "view:teams",
  VIEW_MATCHES: "view:matches",
  VIEW_TRADES: "view:trades",
  VIEW_POKEMON: "view:pokemon",
  VIEW_PUBLIC_DATA: "view:public_data",
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

// Profile type
export interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  permissions: Permission[]
  team_id: string | null
  discord_id: string | null
  discord_username: string | null
  discord_avatar: string | null
  is_active: boolean
  email_verified: boolean
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  last_seen_at: string | null
  showdown_username: string | null
  showdown_account_synced: boolean | null
  showdown_account_synced_at: string | null
}

/**
 * Get the current user's profile
 */
export async function getCurrentUserProfile(supabase: SupabaseClient): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return data as UserProfile
}

/**
 * Get a user's role
 */
export async function getUserRole(supabase: SupabaseClient, userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single()

  if (error) {
    console.error("Error fetching user role:", error)
    return null
  }

  return data?.role as UserRole | null
}

/**
 * Check if user has a specific role
 */
export async function hasRole(supabase: SupabaseClient, userId: string, role: UserRole): Promise<boolean> {
  const userRole = await getUserRole(supabase, userId)
  return userRole === role
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(supabase: SupabaseClient, userId: string, roles: UserRole[]): Promise<boolean> {
  const userRole = await getUserRole(supabase, userId)
  return userRole !== null && roles.includes(userRole)
}

/**
 * Check if user has a role or a higher role in the hierarchy
 * Hierarchy: admin > commissioner > coach > spectator
 */
export async function hasRoleOrHigher(
  supabase: SupabaseClient,
  userId: string,
  requiredRole: UserRole,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_role_or_higher", {
    user_id: userId,
    required_role: requiredRole,
  })

  if (error) {
    console.error("Error checking role hierarchy:", error)
    return false
  }

  return data === true
}

/**
 * Require user to have a specific role (throws error if not)
 */
export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  allowedRoles: UserRole[],
): Promise<UserRole> {
  const role = await getUserRole(supabase, userId)

  if (!role || !allowedRoles.includes(role)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowedRoles.join(", ")}`)
  }

  return role
}

/**
 * Require user to have a role or higher role (throws error if not)
 * Hierarchy: admin > commissioner > coach > spectator
 */
export async function requireRoleOrHigher(
  supabase: SupabaseClient,
  userId: string,
  requiredRole: UserRole,
): Promise<UserRole> {
  const hasAccess = await hasRoleOrHigher(supabase, userId, requiredRole)
  
  if (!hasAccess) {
    const role = await getUserRole(supabase, userId)
    throw new Error(
      `Insufficient permissions. Required role: ${requiredRole} or higher. Current role: ${role || "none"}`
    )
  }

  const role = await getUserRole(supabase, userId)
  return role as UserRole
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  supabase: SupabaseClient,
  userId: string,
  permission: Permission,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_permission", {
    user_id: userId,
    required_permission: permission,
  })

  if (error) {
    console.error("Error checking permission:", error)
    return false
  }

  return data === true
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(supabase: SupabaseClient, userId: string): Promise<Permission[]> {
  const { data, error } = await supabase.rpc("get_user_permissions", {
    user_id: userId,
  })

  if (error) {
    console.error("Error fetching permissions:", error)
    return []
  }

  return (data as Permission[]) || []
}

/**
 * Require user to have a specific permission (throws error if not)
 */
export async function requirePermission(
  supabase: SupabaseClient,
  userId: string,
  permission: Permission,
): Promise<void> {
  const hasAccess = await hasPermission(supabase, userId, permission)

  if (!hasAccess) {
    throw new Error(`Insufficient permissions. Required: ${permission}`)
  }
}

/**
 * Check if user is an admin
 */
export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  return hasRole(supabase, userId, UserRole.ADMIN)
}

/**
 * Check if user can manage a specific team
 */
export async function canManageTeam(supabase: SupabaseClient, userId: string, teamId: string): Promise<boolean> {
  // Admins and commissioners can manage any team
  if (await hasAnyRole(supabase, userId, [UserRole.ADMIN, UserRole.COMMISSIONER])) {
    return true
  }

  // Coaches can only manage their own team
  const { data } = await supabase.from("profiles").select("team_id, role").eq("id", userId).single()

  return data?.role === UserRole.COACH && data?.team_id === teamId
}

/**
 * Log user activity
 */
export async function logActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  metadata?: {
    resource_type?: string
    resource_id?: string
    ip_address?: string
    user_agent?: string
    [key: string]: any
  },
): Promise<void> {
  await supabase.from("user_activity_log").insert({
    user_id: userId,
    action,
    resource_type: metadata?.resource_type,
    resource_id: metadata?.resource_id,
    metadata: metadata || {},
    ip_address: metadata?.ip_address,
    user_agent: metadata?.user_agent,
  })
}

/**
 * Update user's last seen timestamp
 */
export async function updateLastSeen(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId)
}
