/**
 * Phase 6.3: Enhanced /draftstatus Command
 * Draft status command with guild default season support
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js"
import { appGet, getGuildDefaultSeasonId } from "@/lib/discord/api-client"

type DraftStatusResponse = {
  ok: boolean
  season: {
    id: string
    name: string
    draft_open_at: string | null
    draft_close_at: string | null
    draft_window_status: "not_configured" | "not_open" | "open" | "closed"
  }
  coach: {
    id?: string
    coach_name?: string
    discord_user_id: string
    linked: boolean
  }
  team: {
    id: string
    team_name: string
    budget: {
      points_used: number
      budget_total: number
      budget_remaining: number
      slots_used: number
      slots_total: number
      slots_remaining: number
    }
  } | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set"
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

function getWindowStatusEmoji(status: string): string {
  switch (status) {
    case "open":
      return "✅"
    case "closed":
      return "❌"
    case "not_open":
      return "⏳"
    case "not_configured":
      return "⚠️"
    default:
      return "❓"
  }
}

export const draftstatusCommand = {
  data: new SlashCommandBuilder()
    .setName("draftstatus")
    .setDescription("Check draft status for your team")
    .addStringOption((opt) =>
      opt
        .setName("season_id")
        .setDescription("Season UUID (optional if server default is set)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const seasonArg = interaction.options.getString("season_id")

    try {
      const guildId = interaction.guildId
      const seasonId =
        seasonArg || (guildId ? await getGuildDefaultSeasonId(guildId) : null)

      if (!seasonId) {
        return interaction.editReply(
          "❌ No season configured. Ask an admin to run `/setseason <season_uuid>` or provide a `season_id`."
        )
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/discord/draft/status`)
      url.searchParams.set("season_id", seasonId)
      url.searchParams.set("discord_user_id", interaction.user.id)
      if (guildId) {
        url.searchParams.set("guild_id", guildId)
      }

      const data = await appGet<DraftStatusResponse>(url.toString())

      const embed = new EmbedBuilder()
        .setTitle(`📊 Draft Status: ${data.season.name || data.season.id}`)
        .setColor(0x0099ff)
        .addFields(
          {
            name: "Draft Window",
            value: `${getWindowStatusEmoji(data.season.draft_window_status)} ${data.season.draft_window_status.toUpperCase()}`,
            inline: false,
          },
          {
            name: "Draft Opens",
            value: formatDate(data.season.draft_open_at),
            inline: true,
          },
          {
            name: "Draft Closes",
            value: formatDate(data.season.draft_close_at),
            inline: true,
          }
        )

      if (!data.coach.linked) {
        embed.addFields({
          name: "⚠️ Account Not Linked",
          value: "Your Discord account is not linked to a coach profile.",
          inline: false,
        })
        return interaction.editReply({ embeds: [embed] })
      }

      embed.addFields({
        name: "Coach",
        value: data.coach.coach_name || "Unknown",
        inline: true,
      })

      if (!data.team) {
        embed.addFields({
          name: "⚠️ No Team",
          value: "You don't have a team in this season.",
          inline: false,
        })
        return interaction.editReply({ embeds: [embed] })
      }

      embed
        .addFields(
          {
            name: "Team",
            value: data.team.team_name,
            inline: true,
          },
          {
            name: "Points Used",
            value: `${data.team.budget.points_used}/${data.team.budget.budget_total}`,
            inline: true,
          },
          {
            name: "Points Remaining",
            value: `${data.team.budget.budget_remaining}`,
            inline: true,
          },
          {
            name: "Slots Used",
            value: `${data.team.budget.slots_used}/${data.team.budget.slots_total}`,
            inline: true,
          },
          {
            name: "Slots Remaining",
            value: `${data.team.budget.slots_remaining}`,
            inline: true,
          }
        )
        .setFooter({ text: `Season ID: ${data.season.id}` })

      return interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[DraftStatus Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to get draft status: ${error.message || String(error)}`,
      })
    }
  },
}
