/**
 * Admin / commissioner gate for league management API routes.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"

export type AdminActor = {
  userId: string
  role: string
}

export async function requireAdminOrCommissioner(
  userId: string
): Promise<AdminActor | { error: string; status: number }> {
  const service = createServiceRoleClient()

  const { data: profile, error } = await service
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single()

  if (error || !profile) {
    return { error: "Profile not found", status: 404 }
  }

  const role = profile.role ?? "spectator"
  if (role !== "admin" && role !== "commissioner") {
    const { data: adminUser } = await service
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (!adminUser) {
      return { error: "Forbidden — admin or commissioner access required", status: 403 }
    }
  }

  return { userId, role }
}
