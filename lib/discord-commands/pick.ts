/**
 * Phase 6.1: Enhanced /pick Command
 * Draft pick command with autocomplete and guild default season support
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js"
import { appGet, appPost, getGuildDefaultSeasonId } from "@/lib/discord/api-client"

type PokemonSearchResult = {
  ok: boolean
  results: Array<{
    id: string
    name: string
    slug: string
    draft_points: number
    types: string[]
    display: string
  }>
  query: string
  season_id: string | null
}

type DraftPickResponse = {
  ok: boolean
  team_id: string
  draft_pick_id: string
  points_snapshot: number
  team_budget: {
    points_used: number
    budget_remaining: number
    slots_used: number
    slots_remaining: number
  }
}

export const pickCommand = {
  data: new SlashCommandBuilder()
    .setName("pick")
    .setDescription("Submit a draft pick")
    .addStringOption((opt) =>
      opt
        .setName("pokemon")
        .setDescription("Pokemon to draft (type to search)")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("season_id")
        .setDescription("Season UUID (optional if server default is set)")
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("draft_round").setDescription("Draft round number").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("pick_number").setDescription("Pick number").setRequired(false)
    )
    .addStringOption((opt) => opt.setName("notes").setDescription("Optional notes").setRequired(false)),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true)
    if (focused.name !== "pokemon") {
      return interaction.respond([])
    }

    const query = focused.value
    if (!query || query.length < 2) {
      return interaction.respond([])
    }

    try {
      // Resolve season ID
      const seasonArg = interaction.options.getString("season_id")
      const guildId = interaction.guildId
      const seasonId =
        seasonArg || (guildId ? await getGuildDefaultSeasonId(guildId) : null)

      if (!seasonId) {
        // No season configured, return empty
        return interaction.respond([])
      }

      // Call Pokemon search API
      const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/discord/pokemon/search`)
      url.searchParams.set("query", query)
      url.searchParams.set("season_id", seasonId)
      url.searchParams.set("guild_id", guildId || "")
      url.searchParams.set("discord_user_id", interaction.user.id)
      url.searchParams.set("limit", "25")
      url.searchParams.set("exclude_owned", "true")

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.DISCORD_BOT_API_KEY}`,
        },
      })

      if (!response.ok) {
        return interaction.respond([])
      }

      const data: PokemonSearchResult = await response.json()

      const choices = data.results.slice(0, 25).map((p) => ({
        name: p.display,
        value: p.id,
      }))

      return interaction.respond(choices)
    } catch (error) {
      console.error("[Pick Command] Autocomplete error:", error)
      return interaction.respond([])
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const pokemonId = interaction.options.getString("pokemon")!
    const seasonArg = interaction.options.getString("season_id")
    const draftRound = interaction.options.getInteger("draft_round")
    const pickNumber = interaction.options.getInteger("pick_number")
    const notes = interaction.options.getString("notes")

    try {
      // Resolve season ID
      const guildId = interaction.guildId
      const seasonId =
        seasonArg || (guildId ? await getGuildDefaultSeasonId(guildId) : null)

      if (!seasonId) {
        return interaction.editReply(
          "❌ No season configured. Ask an admin to run `/setseason <season_uuid>` or provide a `season_id`."
        )
      }

      // Submit draft pick
      const response = await appPost<DraftPickResponse>("/api/discord/draft/pick", {
        season_id: seasonId,
        discord_user_id: interaction.user.id,
        pokemon_id: pokemonId,
        draft_round: draftRound || null,
        pick_number: pickNumber || null,
        notes: notes || null,
      })

      if (!response.ok) {
        throw new Error("Failed to submit draft pick")
      }

      const embed = new EmbedBuilder()
        .setTitle("✅ Draft Pick Submitted")
        .setColor(0x00ff00)
        .addFields(
          {
            name: "Points Used",
            value: `${response.team_budget.points_used}`,
            inline: true,
          },
          {
            name: "Budget Remaining",
            value: `${response.team_budget.budget_remaining}`,
            inline: true,
          },
          {
            name: "Slots Used",
            value: `${response.team_budget.slots_used}`,
            inline: true,
          },
          {
            name: "Slots Remaining",
            value: `${response.team_budget.slots_remaining}`,
            inline: true,
          }
        )
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[Pick Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to submit draft pick: ${error.message || String(error)}`,
      })
    }
  },
}
