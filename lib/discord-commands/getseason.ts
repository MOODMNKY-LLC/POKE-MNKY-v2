/**
 * Phase 6.5: /getseason Command
 * Show current guild default season
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js"
import { appGet, getGuildDefaultSeasonId } from "@/lib/discord/api-client"

type GuildConfigResponse = {
  ok: boolean
  guild_id: string
  default_season_id: string | null
  default_season: {
    id: string
    name: string
  } | null
  configured: boolean
}

export const getseasonCommand = {
  data: new SlashCommandBuilder()
    .setName("getseason")
    .setDescription("Show the default season for this Discord server"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    if (!interaction.guildId) {
      return interaction.editReply("❌ This command must be used in a server (not DMs).")
    }

    try {
      const response = await appGet<GuildConfigResponse>(
        `/api/discord/guild/config?guild_id=${encodeURIComponent(interaction.guildId)}`
      )

      if (!response.ok) {
        throw new Error("Failed to get guild config")
      }

      if (!response.configured || !response.default_season_id) {
        return interaction.editReply({
          content: "⚠️ No default season configured for this server.\nUse `/setseason <season_uuid>` to set one.",
        })
      }

      const embed = new EmbedBuilder()
        .setTitle("📅 Default Season Configuration")
        .setColor(0x0099ff)
        .addFields(
          {
            name: "Season Name",
            value: response.default_season?.name || "Unknown",
            inline: true,
          },
          {
            name: "Season ID",
            value: response.default_season_id,
            inline: false,
          }
        )
        .setFooter({ text: "Use /setseason to change this" })

      return interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[GetSeason Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to get default season: ${error.message || String(error)}`,
      })
    }
  },
}
