/**
 * Phase 6.4: /whoami Command
 * Coach profile lookup command
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js"
import { appGet, getGuildDefaultSeasonId } from "@/lib/discord/api-client"

type WhoAmIResponse = {
  ok: boolean
  coach: {
    id: string
    coach_name: string
    discord_user_id: string
    showdown_username: string | null
    active: boolean
  } | null
  teams: Array<{
    id: string
    team_name: string
    franchise_key: string | null
    seasons: Array<{
      id: string
      name: string
    }>
  }>
  season_team: {
    id: string
    team_name: string
    franchise_key: string | null
    season: {
      id: string
      name: string
    }
  } | null
  found: boolean
}

export const whoamiCommand = {
  data: new SlashCommandBuilder()
    .setName("whoami")
    .setDescription("Show your linked coach profile and teams")
    .addStringOption((opt) =>
      opt
        .setName("season_id")
        .setDescription("Optional season UUID to resolve your season team")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const seasonArg = interaction.options.getString("season_id")

    try {
      // Resolve season ID (optional - command works without it)
      let seasonId = seasonArg || null
      if (!seasonId && interaction.guildId) {
        seasonId = await getGuildDefaultSeasonId(interaction.guildId)
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/discord/coach/whoami`)
      url.searchParams.set("discord_user_id", interaction.user.id)
      if (seasonId) {
        url.searchParams.set("season_id", seasonId)
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.DISCORD_BOT_API_KEY}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || "Failed to get coach profile")
      }

      const data: WhoAmIResponse = await response.json()

      if (!data.found || !data.coach) {
        return interaction.editReply({
          content: "❌ Your Discord account is not linked to a coach profile.",
        })
      }

      const embed = new EmbedBuilder()
        .setTitle(`👤 Coach Profile: ${data.coach.coach_name}`)
        .setColor(0x0099ff)
        .addFields(
          {
            name: "Coach ID",
            value: data.coach.id,
            inline: true,
          },
          {
            name: "Showdown Username",
            value: data.coach.showdown_username || "Not set",
            inline: true,
          },
          {
            name: "Status",
            value: data.coach.active ? "✅ Active" : "❌ Inactive",
            inline: true,
          }
        )

      if (data.teams.length > 0) {
        const teamsList = data.teams
          .map((t) => {
            const seasons = t.seasons.map((s) => s.name).join(", ") || "No seasons"
            return `**${t.team_name}** (${t.id})\n  Seasons: ${seasons}`
          })
          .join("\n\n")

        embed.addFields({
          name: `Teams (${data.teams.length})`,
          value: teamsList || "No teams",
          inline: false,
        })
      } else {
        embed.addFields({
          name: "Teams",
          value: "No teams found",
          inline: false,
        })
      }

      if (data.season_team && seasonId) {
        embed.addFields({
          name: "Season Team",
          value: `**${data.season_team.team_name}** (${data.season_team.id})\nSeason: ${data.season_team.season.name}`,
          inline: false,
        })
      } else if (seasonId) {
        embed.addFields({
          name: "Season Team",
          value: "No team found for this season",
          inline: false,
        })
      }

      return interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[WhoAmI Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to get profile: ${error.message || String(error)}`,
      })
    }
  },
}
