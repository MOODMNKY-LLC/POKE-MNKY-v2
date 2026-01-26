/**
 * Phase 6.2: /search Command
 * Pokemon search command with autocomplete
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js"
import { appGet, getGuildDefaultSeasonId } from "@/lib/discord/api-client"

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

export const searchCommand = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for Pokemon in the draft pool")
    .addStringOption((opt) =>
      opt
        .setName("query")
        .setDescription("Pokemon name to search")
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
      opt.setName("limit").setDescription("Max results (default: 10, max: 25)").setRequired(false)
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true)
    if (focused.name !== "query") {
      return interaction.respond([])
    }

    const query = focused.value
    if (!query || query.length < 2) {
      return interaction.respond([])
    }

    try {
      const seasonArg = interaction.options.getString("season_id")
      const guildId = interaction.guildId
      const seasonId =
        seasonArg || (guildId ? await getGuildDefaultSeasonId(guildId) : null)

      if (!seasonId) {
        return interaction.respond([])
      }

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
        value: p.name,
      }))

      return interaction.respond(choices)
    } catch (error) {
      console.error("[Search Command] Autocomplete error:", error)
      return interaction.respond([])
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const query = interaction.options.getString("query")!
    const seasonArg = interaction.options.getString("season_id")
    const limit = Math.min(interaction.options.getInteger("limit") || 10, 25)

    try {
      const guildId = interaction.guildId
      const seasonId =
        seasonArg || (guildId ? await getGuildDefaultSeasonId(guildId) : null)

      if (!seasonId) {
        return interaction.editReply(
          "❌ No season configured. Ask an admin to run `/setseason <season_uuid>` or provide a `season_id`."
        )
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/discord/pokemon/search`)
      url.searchParams.set("query", query)
      url.searchParams.set("season_id", seasonId)
      url.searchParams.set("guild_id", guildId || "")
      url.searchParams.set("discord_user_id", interaction.user.id)
      url.searchParams.set("limit", limit.toString())
      url.searchParams.set("exclude_owned", "true")

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.DISCORD_BOT_API_KEY}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || "Failed to search Pokemon")
      }

      const data: PokemonSearchResult = await response.json()

      if (data.results.length === 0) {
        return interaction.editReply(`❌ No Pokemon found matching "${query}"`)
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Search Results: "${query}"`)
        .setDescription(
          data.results
            .slice(0, limit)
            .map((p) => `**${p.name}** (${p.draft_points} pts) [${p.types.join("/")}]`)
            .join("\n")
        )
        .setFooter({ text: `Found ${data.results.length} result(s)` })
        .setColor(0x0099ff)

      return interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[Search Command] Error:", error)
      return interaction.editReply({
        content: `❌ Failed to search: ${error.message || String(error)}`,
      })
    }
  },
}
