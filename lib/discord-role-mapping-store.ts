import type { SupabaseClient } from "@supabase/supabase-js"
import {
  APP_TO_DISCORD_ROLE_MAP,
  DISCORD_TO_APP_ROLE_MAP,
} from "@/lib/discord-role-mappings"
import type { UserRole } from "@/lib/rbac"

export type DiscordRoleMappingRow = {
  id: string
  discord_role_id: string
  discord_role_name: string
  app_role: UserRole
  priority: number
}

export type LoadedRoleMaps = {
  discordToApp: Record<string, UserRole>
  appToDiscord: Record<UserRole, string[]>
  rows: DiscordRoleMappingRow[]
}

/**
 * Load DB mappings merged over static defaults (DB entries override by role name).
 */
export async function loadDiscordRoleMaps(
  supabase: SupabaseClient
): Promise<LoadedRoleMaps> {
  const discordToApp: Record<string, UserRole> = {
    ...DISCORD_TO_APP_ROLE_MAP,
  }
  const appToDiscord: Record<UserRole, string[]> = {
    admin: [...(APP_TO_DISCORD_ROLE_MAP.admin ?? [])],
    commissioner: [...(APP_TO_DISCORD_ROLE_MAP.commissioner ?? [])],
    coach: [...(APP_TO_DISCORD_ROLE_MAP.coach ?? [])],
    spectator: [...(APP_TO_DISCORD_ROLE_MAP.spectator ?? [])],
  }

  const { data: rows, error } = await supabase
    .from("discord_role_mappings")
    .select("id, discord_role_id, discord_role_name, app_role, priority")
    .order("priority", { ascending: false })

  if (error) {
    console.warn("[discord-role-mapping-store] DB load failed, using static maps:", error.message)
    return { discordToApp, appToDiscord, rows: [] }
  }

  for (const row of rows ?? []) {
    const appRole = row.app_role as UserRole
    discordToApp[row.discord_role_name] = appRole

    const existing = appToDiscord[appRole] ?? []
    if (!existing.includes(row.discord_role_name)) {
      appToDiscord[appRole] = [...existing, row.discord_role_name]
    }
  }

  return {
    discordToApp,
    appToDiscord,
    rows: (rows ?? []) as DiscordRoleMappingRow[],
  }
}
