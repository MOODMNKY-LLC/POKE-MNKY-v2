/**
 * Admin Utilities for Draft Pool Management
 * 
 * Helper functions for admin role checking and validation.
 * These can be used in API routes to enforce admin-only access.
 */

import { createServerClient } from "@/lib/supabase/server"
import { isAdmin as rbacIsAdmin, UserRole, hasAnyRole } from "@/lib/rbac"

/**
 * Check if the current user is an admin
 * 
 * Uses the existing RBAC system to check user role.
 * 
 * @returns Promise<boolean> - True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    // Use existing RBAC system
    return await rbacIsAdmin(supabase, user.id)
  } catch (error) {
    console.error("[Admin Utils] Error checking admin status:", error)
    return false
  }
}

/**
 * Require admin access - throws error if user is not admin
 * 
 * @throws Error if user is not admin
 */
export async function requireAdmin(): Promise<void> {
  const isUserAdmin = await isAdmin()
  if (!isUserAdmin) {
    throw new Error("Admin access required")
  }
}

/**
 * Check if user has permission to manage draft pool
 * 
 * Allows both admins and commissioners to manage draft pool.
 * 
 * @returns Promise<boolean> - True if user can manage draft pool
 */
export async function canManageDraftPool(): Promise<boolean> {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    // Allow admins and commissioners to manage draft pool
    return await hasAnyRole(supabase, user.id, [UserRole.ADMIN, UserRole.COMMISSIONER])
  } catch (error) {
    console.error("[Admin Utils] Error checking draft pool permissions:", error)
    return false
  }
}
