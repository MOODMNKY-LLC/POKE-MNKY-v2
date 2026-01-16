/**
 * Discord Bot /free-agency-submit Command Handler
 * Submits free agency transactions via Discord
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js"
import { FreeAgencySystem } from "@/lib/free-agency"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const freeAgencySubmitCommand = {
  data: new SlashCommandBuilder()
    .setName("free-agency-submit")
    .setDescription("Submit a free agency transaction")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Transaction type")
        .setRequired(true)
        .addChoices(
          { name: "Replacement (Drop + Add)", value: "replacement" },
          { name: "Addition Only", value: "addition" },
          { name: "Drop Only", value: "drop_only" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("add")
        .setDescription("Pokemon to add")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("drop")
        .setDescription("Pokemon to drop")
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const userId = interaction.user.id
    const transactionType = interaction.options.getString("type")!
    const addPokemonName = interaction.options.getString("add")
    const dropPokemonName = interaction.options.getString("drop")

    try {
      // Get user's Discord ID and find their profile
      const supabase = createServiceRoleClient()
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, team_id, role")
        .eq("discord_id", userId)
        .single()

      if (!profile || profile.role !== "coach" || !profile.team_id) {
        return interaction.editReply({
          content: "❌ You must be a coach with an assigned team to submit transactions.",
        })
      }

      // Get current season
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

      // Resolve Pokemon names to IDs
      let addedPokemonId: string | null = null
      let droppedPokemonId: string | null = null

      if (addPokemonName) {
        const { data: pokemon } = await supabase
          .from("pokemon")
          .select("id")
          .ilike("name", addPokemonName.toLowerCase())
          .single()

        if (!pokemon) {
          return interaction.editReply({
            content: `❌ Pokemon "${addPokemonName}" not found.`,
          })
        }
        addedPokemonId = pokemon.id
      }

      if (dropPokemonName) {
        // Check if Pokemon is on user's roster
        const { data: roster } = await supabase
          .from("team_rosters")
          .select("pokemon_id, pokemon:pokemon_id(name)")
          .eq("team_id", profile.team_id)
          .single()

        // Find the specific Pokemon in roster
        const { data: allRoster } = await supabase
          .from("team_rosters")
          .select("pokemon_id, pokemon:pokemon_id(name)")
          .eq("team_id", profile.team_id)

        const rosterPokemon = (allRoster || []).find(
          (r: any) => r.pokemon?.name?.toLowerCase() === dropPokemonName.toLowerCase()
        )

        if (!rosterPokemon) {
          return interaction.editReply({
            content: `❌ "${dropPokemonName}" is not on your roster.`,
          })
        }
        droppedPokemonId = rosterPokemon.pokemon_id
      }

      // Call API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const response = await fetch(`${apiUrl}/api/free-agency/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: In production, you'd need to pass auth token
          // For now, the API will handle auth via Supabase
        },
        body: JSON.stringify({
          team_id: profile.team_id,
          season_id: season.id,
          transaction_type: transactionType,
          added_pokemon_id: addedPokemonId,
          dropped_pokemon_id: droppedPokemonId,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("❌ Transaction Failed")
          .setDescription(result.error || "Unknown error")
          .addFields(
            ...(result.validation?.errors?.map((err: string) => ({
              name: "Validation Error",
              value: err,
            })) || [])
          )

        return interaction.editReply({ embeds: [errorEmbed] })
      }

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("✅ Transaction Submitted")
        .setDescription("Your free agency transaction has been submitted and is pending approval.")
        .addFields(
          {
            name: "Transaction Type",
            value: transactionType,
            inline: true,
          },
          {
            name: "Status",
            value: "Pending",
            inline: true,
          }
        )
        .setTimestamp()

      if (dropPokemonName) {
        successEmbed.addFields({
          name: "Dropping",
          value: dropPokemonName,
          inline: true,
        })
      }

      if (addPokemonName) {
        successEmbed.addFields({
          name: "Adding",
          value: addPokemonName,
          inline: true,
        })
      }

      return interaction.editReply({ embeds: [successEmbed] })
    } catch (error: any) {
      console.error("[Discord /free-agency-submit] Error:", error)

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("❌ Error")
        .setDescription(error.message || "Failed to submit transaction")

      return interaction.editReply({ embeds: [errorEmbed] })
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true)
    const userId = interaction.user.id

    try {
      const supabase = createServiceRoleClient()
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("discord_id", userId)
        .single()

      if (!profile?.team_id) {
        return interaction.respond([])
      }

      const { data: season } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_current", true)
        .single()

      if (!season) {
        return interaction.respond([])
      }

      if (focused.name === "add") {
        // Autocomplete available Pokemon
        const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const response = await fetch(
          `${apiUrl}/api/free-agency/available?season_id=${season.id}&search=${encodeURIComponent(focused.value)}&limit=25`
        )
        const result = await response.json()

        if (result.success && result.pokemon) {
          return interaction.respond(
            result.pokemon.map((p: any) => ({
              name: `${p.pokemon_name} (${p.point_value}pts)`,
              value: p.pokemon_name,
            }))
          )
        }
      } else if (focused.name === "drop") {
        // Autocomplete roster Pokemon
        const { data: roster } = await supabase
          .from("team_rosters")
          .select("pokemon:pokemon_id(name), draft_points")
          .eq("team_id", profile.team_id)

        const filtered = (roster || [])
          .filter((r: any) =>
            r.pokemon?.name?.toLowerCase().includes(focused.value.toLowerCase())
          )
          .slice(0, 25)
          .map((r: any) => ({
            name: `${r.pokemon?.name} (${r.draft_points}pts)`,
            value: r.pokemon?.name,
          }))

        return interaction.respond(filtered)
      }

      return interaction.respond([])
    } catch (error) {
      console.error("[Discord /free-agency-submit autocomplete] Error:", error)
      return interaction.respond([])
    }
  },
}
