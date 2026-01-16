/**
 * Discord Bot /free-agency-status Command Handler
 * Shows team's free agency status (roster, budget, transaction count)
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from "discord.js"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const freeAgencyStatusCommand = {
  data: new SlashCommandBuilder()
    .setName("free-agency-status")
    .setDescription("View your team's free agency status"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const userId = interaction.user.id

    try {
      const supabase = createServiceRoleClient()
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, team_id, role")
        .eq("discord_id", userId)
        .single()

      if (!profile || profile.role !== "coach" || !profile.team_id) {
        return interaction.editReply({
          content: "❌ You must be a coach with an assigned team to view free agency status.",
        })
      }

      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season) {
        return interaction.editReply({
          content: "❌ No active season found.",
        })
      }

      // Call API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const response = await fetch(
        `${apiUrl}/api/free-agency/team-status?team_id=${profile.team_id}&season_id=${season.id}`
      )

      const result = await response.json()

      if (!result.success || !result.status) {
        return interaction.editReply({
          content: "❌ Failed to fetch team status.",
        })
      }

      const status = result.status

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📊 Free Agency Status")
        .addFields(
          {
            name: "Roster Size",
            value: `${status.roster.length}/10`,
            inline: true,
          },
          {
            name: "Budget",
            value: `${status.budget.spent_points}/${status.budget.total_points} (${status.budget.remaining_points} remaining)`,
            inline: true,
          },
          {
            name: "Transactions Used",
            value: `${status.transaction_count}/10`,
            inline: true,
          }
        )
        .setTimestamp()

      // Add roster preview
      if (status.roster.length > 0) {
        const rosterPreview = status.roster
          .slice(0, 10)
          .map((p: any) => `${p.pokemon_name} (${p.point_value}pts)`)
          .join("\n")

        embed.addFields({
          name: "Current Roster",
          value: rosterPreview.length > 1024 ? rosterPreview.slice(0, 1020) + "..." : rosterPreview,
          inline: false,
        })
      }

      return interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[Discord /free-agency-status] Error:", error)

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ Error")
        .setDescription(error.message || "Failed to fetch status")

      return interaction.editReply({ embeds: [errorEmbed] })
    }
  },
}
