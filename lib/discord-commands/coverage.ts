/**
 * Phase 6.6: /coverage Command
 * Roster coverage analysis command
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js"
import { appPost, getGuildDefaultSeasonId } from "@/lib/discord/api-client"

type CoverageResponse = {
  ok: boolean
  channel_id: string
  message: string
  analysis: {
    overall_coverage: number
    gaps: string[]
    checks: Array<{
      check: string
      covered: boolean
      pokemon_count: number
    }>
  }
}

export const coverageCommand = {
  data: new SlashCommandBuilder()
    .setName("coverage")
    .setDescription("Analyze your team's roster coverage")
    .addStringOption((opt) =>
      opt
        .setName("season_id")
        .setDescription("Season UUID (optional if server default is set)")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("checks")
        .setDescription("Comma-separated checks (default: all)")
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to post report (default: current channel)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const seasonArg = interaction.options.getString("season_id")
    const checksInput = interaction.options.getString("checks")
    const targetChannel = interaction.options.getChannel("channel")

    try {
      const guildId = interaction.guildId
      const seasonId =
        seasonArg || (guildId ? await getGuildDefaultSeasonId(guildId) : null)

      if (!seasonId) {
        return interaction.editReply(
          "❌ No season configured. Ask an admin to run `/setseason <season_uuid>` or provide a `season_id`."
        )
      }

      // Get user's team for this season
      const statusUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/discord/draft/status`)
      statusUrl.searchParams.set("season_id", seasonId)
      statusUrl.searchParams.set("discord_user_id", interaction.user.id)
      if (guildId) {
        statusUrl.searchParams.set("guild_id", guildId)
      }

      const statusResponse = await fetch(statusUrl.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.DISCORD_BOT_API_KEY}`,
        },
      })

      if (!statusResponse.ok) {
        throw new Error("Failed to get team information")
      }

      const statusData = await statusResponse.json()

      if (!statusData.coach?.linked || !statusData.team) {
        return interaction.editReply({
          content: "❌ You must be linked to a coach profile and have a team in this season.",
        })
      }

      // Parse checks
      const allChecks = [
        "hazard_removal",
        "hazard_setting",
        "cleric",
        "speed_control",
        "recovery",
        "phasing",
        "screens",
      ]
      const checks = checksInput
        ? checksInput.split(",").map((c) => c.trim())
        : allChecks

      // Validate checks
      const validChecks = checks.filter((c) => allChecks.includes(c))
      if (validChecks.length === 0) {
        return interaction.editReply({
          content: `❌ Invalid checks. Valid options: ${allChecks.join(", ")}`,
        })
      }

      // Call coverage API
      const channelId = targetChannel?.id || interaction.channelId
      const coverageResponse = await appPost<CoverageResponse>("/api/discord/notify/coverage", {
        season_id: seasonId,
        team_id: statusData.team.id,
        channel_id: channelId,
        checks: validChecks,
        mention_role: null,
      })

      if (!coverageResponse.ok) {
        throw new Error("Failed to analyze coverage")
      }

      // Post message to channel
      const channel = targetChannel || interaction.channel
      if (channel && channel.isTextBased()) {
        await channel.send(coverageResponse.message)
        return interaction.editReply({
          content: `✅ Coverage analysis posted to ${channel.toString()}`,
        })
      } else {
        // Fallback: return message in ephemeral reply
        return interaction.editReply({
          content: coverageResponse.message,
        })
      }
    } catch (error: any) {
      console.error("[Coverage Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to analyze coverage: ${error.message || String(error)}`,
      })
    }
  },
}
