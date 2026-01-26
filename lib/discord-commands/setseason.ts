/**
 * Phase 6.5: /setseason Command
 * Set guild default season (admin only)
 */

import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { appPost } from "@/lib/discord/api-client"
import { canManageDraftConfig } from "@/lib/discord/permissions"

type SetSeasonResponse = {
  ok: boolean
  guild_id: string
  default_season_id: string | null
  default_season: {
    id: string
    name: string
  } | null
}

export const setseasonCommand = {
  data: new SlashCommandBuilder()
    .setName("setseason")
    .setDescription("Set the default season for this Discord server (admins only)")
    .addStringOption((opt) =>
      opt
        .setName("season_id")
        .setDescription("Season UUID (or 'clear' to remove default)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    if (!interaction.guildId) {
      return interaction.editReply("❌ This command must be used in a server (not DMs).")
    }

    // Check permissions
    const hasPermission = await canManageDraftConfig(interaction)
    if (!hasPermission) {
      return interaction.editReply(
        "❌ You do not have permission to change draft configuration for this server."
      )
    }

    const seasonInput = interaction.options.getString("season_id", true).trim()
    const seasonId = seasonInput.toLowerCase() === "clear" ? null : seasonInput

    try {
      const response = await appPost<SetSeasonResponse>("/api/discord/guild/config", {
        guild_id: interaction.guildId,
        default_season_id: seasonId,
        admin_role_ids: [], // Keep existing admin roles
      })

      if (!response.ok) {
        throw new Error("Failed to set default season")
      }

      if (seasonId) {
        return interaction.editReply(
          `✅ Default season set to: **${response.default_season?.name || seasonId}**\nSeason ID: ${seasonId}`
        )
      } else {
        return interaction.editReply("✅ Default season cleared.")
      }
    } catch (error: any) {
      console.error("[SetSeason Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to set default season: ${error.message || String(error)}`,
      })
    }
  },
}
