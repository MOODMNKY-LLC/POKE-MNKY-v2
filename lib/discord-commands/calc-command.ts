/**
 * Discord Bot /calc Command Handler
 * Calculates damage between Pokémon
 */

import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js"
import { createServiceRoleClient } from "@/lib/supabase/service"

export const calcCommand = {
  data: new SlashCommandBuilder()
    .setName("calc")
    .setDescription("Calculate damage between Pokémon")
    .addStringOption((option) =>
      option
        .setName("attacker")
        .setDescription("Attacking Pokémon name")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("defender")
        .setDescription("Defending Pokémon name")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("move")
        .setDescription("Move name")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("generation")
        .setDescription("Generation (default: 9)")
        .setRequired(false)
        .addChoices(
          { name: "Gen 9 (SV)", value: 9 },
          { name: "Gen 8 (SwSh)", value: 8 },
          { name: "Gen 7 (SM/USUM)", value: 7 }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    const attacker = interaction.options.getString("attacker")!
    const defender = interaction.options.getString("defender")!
    const move = interaction.options.getString("move")!
    const generation = interaction.options.getInteger("generation") || 9

    try {
      // Call our API endpoint
      const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const response = await fetch(`${apiUrl}/api/calc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gen: generation,
          attackingPokemon: attacker,
          defendingPokemon: defender,
          moveName: move,
          attackingPokemonOptions: {},
          defendingPokemonOptions: {},
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to calculate damage")
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Calculation failed")
      }

      const minPercent = result.percent[0]
      const maxPercent = result.percent[result.percent.length - 1]
      const minDamage = result.damage[0]
      const maxDamage = result.damage[result.damage.length - 1]

      // Determine effectiveness color
      let color = 0x808080 // Gray (weak)
      if (maxPercent >= 100) {
        color = 0xff0000 // Red (OHKO)
      } else if (maxPercent >= 75) {
        color = 0xff8800 // Orange (very effective)
      } else if (maxPercent >= 50) {
        color = 0xffaa00 // Yellow (effective)
      } else if (maxPercent >= 25) {
        color = 0x4488ff // Blue (moderate)
      }

      const calcUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const embed = new EmbedBuilder()
        .setTitle("⚡ Damage Calculation")
        .setDescription(`**${attacker}** using **${move}** vs **${defender}**`)
        .addFields(
          {
            name: "Damage Range",
            value: `${minDamage} - ${maxDamage}`,
            inline: true,
          },
          {
            name: "HP Percentage",
            value: `${minPercent.toFixed(1)}% - ${maxPercent.toFixed(1)}%`,
            inline: true,
          },
          {
            name: "Summary",
            value: result.desc || `${minPercent.toFixed(1)}% - ${maxPercent.toFixed(1)}%`,
            inline: false,
          }
        )
        .setColor(color)
        .setFooter({
          text: `Generation ${generation} | Full calculator: ${calcUrl}/calc`,
        })
        .setURL(`${calcUrl}/calc`)
        .setTimestamp()

      // Add OHKO indicator
      if (maxPercent >= 100) {
        embed.addFields({
          name: "⚠️ OHKO Possible",
          value: "This move can OHKO the defender!",
          inline: false,
        })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error: any) {
      console.error("[Discord /calc] Error:", error)

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Calculation Error")
        .setDescription(error.message || "Failed to calculate damage")
        .setColor(0xff0000)
        .addFields({
          name: "💡 Tip",
          value: `Try using the full calculator: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/calc`,
          inline: false,
        })

      await interaction.editReply({ embeds: [errorEmbed] })
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true)
    const query = focused.value.toLowerCase()

    try {
      if (focused.name === "attacker" || focused.name === "defender") {
        // Fetch from Pokemon database
        const supabase = createServiceRoleClient()
        const { data: pokemon } = await supabase
          .from("pokemon")
          .select("name")
          .ilike("name", `%${query}%`)
          .limit(25)
          .order("name", { ascending: true })

        if (pokemon && pokemon.length > 0) {
          return interaction.respond(
            pokemon.map((p) => ({
              name: p.name,
              value: p.name,
            }))
          )
        }

        // Fallback to common Pokemon if database query fails
        const commonPokemon = [
          "Pikachu",
          "Charizard",
          "Blastoise",
          "Venusaur",
          "Garchomp",
          "Dragonite",
          "Tyranitar",
          "Metagross",
          "Gengar",
          "Lucario",
          "Gyarados",
          "Snorlax",
          "Machamp",
          "Alakazam",
          "Arcanine",
        ]

        const filtered = commonPokemon
          .filter((p) => p.toLowerCase().includes(query))
          .slice(0, 25)
          .map((p) => ({ name: p, value: p }))

        return interaction.respond(filtered)
      } else if (focused.name === "move") {
        // Common moves - could be enhanced with a moves database
        const commonMoves = [
          "Thunderbolt",
          "Flamethrower",
          "Ice Beam",
          "Earthquake",
          "Close Combat",
          "Shadow Ball",
          "Psychic",
          "Surf",
          "Hyper Beam",
          "Giga Impact",
          "Thunder",
          "Fire Blast",
          "Blizzard",
          "Hydro Pump",
          "Solar Beam",
          "Energy Ball",
          "Dark Pulse",
          "Dragon Pulse",
          "Focus Blast",
          "Aura Sphere",
        ]

        const filtered = commonMoves
          .filter((m) => m.toLowerCase().includes(query))
          .slice(0, 25)
          .map((m) => ({ name: m, value: m }))

        return interaction.respond(filtered)
      }

      return interaction.respond([])
    } catch (error) {
      console.error("[Discord /calc autocomplete] Error:", error)
      return interaction.respond([])
    }
  },
}
