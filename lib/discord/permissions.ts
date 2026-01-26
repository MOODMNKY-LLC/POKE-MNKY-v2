/**
 * Phase 6: Discord Bot Permission Utilities
 * Helper functions for checking Discord permissions
 */

import { ChatInputCommandInteraction, PermissionsBitField } from "discord.js"
import { appGet } from "./api-client"

type GuildConfigResponse = {
  ok: boolean
  config: {
    admin_role_ids: string[]
  } | null
}

/**
 * Check if user can manage draft configuration (admin or configured role)
 */
export async function canManageDraftConfig(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  if (!interaction.guildId) return false

  // Check Discord Administrator permission
  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null)
  if (member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return true
  }

  // Check role-based permissions
  try {
    const response = await appGet<GuildConfigResponse>(
      `/api/discord/guild/config?guild_id=${encodeURIComponent(interaction.guildId)}`
    )

    const allowedRoleIds = response.config?.admin_role_ids || []
    if (allowedRoleIds.length === 0) {
      return false // No roles configured, only admins allowed
    }

    // Check if user has any of the allowed roles
    return member?.roles.cache.some((role) => allowedRoleIds.includes(role.id)) ?? false
  } catch (error) {
    console.error("[Discord Permissions] Failed to check permissions:", error)
    return false
  }
}
