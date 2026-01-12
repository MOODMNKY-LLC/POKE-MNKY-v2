import type { SupabaseClient } from "@supabase/supabase-js"

// User roles enum
export enum UserRole {
  ADMIN = "admin",
  COMMISSIONER = "commissioner",
  COACH = "coach",
  VIEWER = "viewer",
}

// Permission strings
export const Permissions = {
  // Admin permissions
  ALL: "*",

  // Commissioner permissions
  MANAGE_LEAGUE: "manage:league",
  MANAGE_TEAMS: "manage:teams",
  MANAGE_MATCHES: "manage:matches",
  MANAGE_TRADES: "manage:trades",
  VIEW_ANALYTICS: "view:analytics",

  // Coach permissions
  MANAGE_OWN_TEAM: "manage:own_team",
  SUBMIT_RESULTS: "submit:results",
  PROPOSE_TRADES: "propose:trades",
  VIEW_LEAGUE: "view:league",

  // Viewer permissions
  VIEW_STANDINGS: "view:standings",
  VIEW_SCHEDULE: "view:schedule",
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
  const hasAccess = await hasPermission(supabase, userId)

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
