// Discord bot integration for league operations
// NOTE: This bot runs as a separate service, not in Next.js runtime
// Deploy to a long-running Node process or serverless function with webhook support

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || ""
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || ""
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || ""

// Discord slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("matchups")
    .setDescription("View matchups for a specific week")
    .addIntegerOption((option) => option.setName("week").setDescription("Week number").setRequired(true)),

  new SlashCommandBuilder()
    .setName("submit")
    .setDescription("Submit a match result")
    .addStringOption((option) =>
      option.setName("result").setDescription("Result text (e.g., 'Team A beat Team B 6-4')").setRequired(true),
    ),

  new SlashCommandBuilder().setName("standings").setDescription("View current league standings"),

  new SlashCommandBuilder()
    .setName("recap")
    .setDescription("Generate AI-powered weekly recap")
    .addIntegerOption((option) => option.setName("week").setDescription("Week number").setRequired(true)),

  new SlashCommandBuilder()
    .setName("pokemon")
    .setDescription("Look up Pokémon information")
    .addStringOption((option) => option.setName("name").setDescription("Pokémon name").setRequired(true)),

  // Draft commands
  new SlashCommandBuilder()
    .setName("draft")
    .setDescription("Draft a Pokémon")
    .addStringOption((option) =>
      option.setName("pokemon").setDescription("Pokémon name to draft").setRequired(true).setAutocomplete(true),
    ),

  new SlashCommandBuilder().setName("draft-status").setDescription("View current draft status"),

  new SlashCommandBuilder().setName("draft-available").setDescription("View available Pokémon to draft"),

  new SlashCommandBuilder()
    .setName("draft-my-team")
    .setDescription("View your team's draft picks and budget"),
].map((command) => command.toJSON())

// Register commands
export async function registerDiscordCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN)

  try {
    console.log("[v0] Registering Discord slash commands...")

    await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), {
      body: commands,
    })

    console.log("[v0] Discord commands registered successfully!")
  } catch (error) {
    console.error("[v0] Error registering Discord commands:", error)
  }
}

// Discord bot client
export function createDiscordBot() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  })

  client.on("ready", () => {
    console.log(`[v0] Discord bot logged in as ${client.user?.tag}`)
  })

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    const { commandName } = interaction

    try {
      switch (commandName) {
        case "matchups":
          await handleMatchupsCommand(interaction)
          break
        case "submit":
          await handleSubmitCommand(interaction)
          break
        case "standings":
          await handleStandingsCommand(interaction)
          break
        case "recap":
          await handleRecapCommand(interaction)
          break
        case "pokemon":
          await handlePokemonCommand(interaction)
          break
        case "draft":
          await handleDraftCommand(interaction)
          break
        case "draft-status":
          await handleDraftStatusCommand(interaction)
          break
        case "draft-available":
          await handleDraftAvailableCommand(interaction)
          break
        case "draft-my-team":
          await handleDraftMyTeamCommand(interaction)
          break
        default:
          await interaction.reply("Unknown command")
      }
    } catch (error) {
      console.error(`[v0] Error handling ${commandName}:`, error)
      await interaction.reply({ content: "An error occurred", ephemeral: true })
    }
  })

  return client
}

// Command handlers
async function handleMatchupsCommand(interaction: any) {
  const week = interaction.options.getInteger("week")
  await interaction.deferReply()

  try {
    // Call your API to fetch matchups
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/matches?week=${week}`)
    const data = await response.json()

    if (!data.matches || data.matches.length === 0) {
      await interaction.editReply(`No matchups found for Week ${week}`)
      return
    }

    const matchupsList = data.matches
      .map(
        (m: any, idx: number) =>
          `${idx + 1}. **${m.team1.name}** vs **${m.team2.name}**${m.scheduled_time ? ` - ${new Date(m.scheduled_time).toLocaleDateString()}` : ""}`,
      )
      .join("\n")

    await interaction.editReply(`**Week ${week} Matchups**\n\n${matchupsList}`)
  } catch (error) {
    await interaction.editReply("Failed to fetch matchups")
  }
}

async function handleSubmitCommand(interaction: any) {
  const resultText = interaction.options.getString("result")
  await interaction.deferReply()

  try {
    // Call AI parse API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/parse-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: resultText }),
    })

    const data = await response.json()

    if (data.status === "success") {
      await interaction.editReply(
        `✅ **Result Submitted**\nWeek ${data.parsed.week}: **${data.parsed.winner}** wins (${data.parsed.differential} KO differential)`,
      )
    } else if (data.status === "needs_review") {
      await interaction.editReply(`⚠️ **Needs Review**\n${data.message}\n\nPlease submit manually via the website.`)
    } else {
      await interaction.editReply(`❌ **Error**: ${data.message || "Failed to parse result"}`)
    }
  } catch (error) {
    await interaction.editReply("Failed to submit result. Please use the website.")
  }
}

async function handleStandingsCommand(interaction: any) {
  await interaction.deferReply()

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/standings`)
    const data = await response.json()

    if (!data.standings || data.standings.length === 0) {
      await interaction.editReply("No standings available")
      return
    }

    const standingsList = data.standings
      .slice(0, 10)
      .map(
        (team: any, idx: number) =>
          `${idx + 1}. **${team.name}** - ${team.wins}-${team.losses} (${team.differential >= 0 ? "+" : ""}${team.differential})`,
      )
      .join("\n")

    await interaction.editReply(`**League Standings**\n\n${standingsList}`)
  } catch (error) {
    await interaction.editReply("Failed to fetch standings")
  }
}

async function handleRecapCommand(interaction: any) {
  const week = interaction.options.getInteger("week")
  await interaction.deferReply()

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/weekly-recap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_number: week }),
    })

    const data = await response.json()

    if (data.recap) {
      await interaction.editReply(`**Week ${week} Recap**\n\n${data.recap}`)
    } else {
      await interaction.editReply("Failed to generate recap")
    }
  } catch (error) {
    await interaction.editReply("Failed to generate recap")
  }
}

async function handlePokemonCommand(interaction: any) {
  const pokemonName = interaction.options.getString("name")
  await interaction.deferReply()

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/pokemon/${pokemonName}`)
    const data = await response.json()

    if (data.error) {
      await interaction.editReply(`Pokémon "${pokemonName}" not found`)
      return
    }

    const pokemon = data
    const typesList = pokemon.types.join(", ")
    const statTotal = Object.values(pokemon.base_stats).reduce((a: any, b: any) => a + b, 0)

    await interaction.editReply(
      `**${pokemon.name.toUpperCase()}**\nTypes: ${typesList}\nTier: ${pokemon.tier}\nDraft Cost: ${pokemon.draft_cost} points\nBase Stat Total: ${statTotal}\n\nView full details: ${process.env.NEXT_PUBLIC_APP_URL}/pokedex?pokemon=${pokemon.name}`,
    )
  } catch (error) {
    await interaction.editReply("Failed to fetch Pokémon data")
  }
}

// Draft command handlers
async function handleDraftCommand(interaction: any) {
  const pokemonName = interaction.options.getString("pokemon")
  const discordId = interaction.user.id

  await interaction.deferReply()

  try {
    // Get user's team
    const teamResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/team?discord_id=${discordId}`,
    )
    const teamData = await teamResponse.json()

    if (!teamData.team_id) {
      await interaction.editReply("❌ You don't have a team assigned. Please contact an admin.")
      return
    }

    // Get active season
    const seasonResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/seasons/current`)
    const seasonData = await seasonResponse.json()

    if (!seasonData.season?.id) {
      await interaction.editReply("❌ No active season found")
      return
    }

    // Make draft pick via API
    const draftResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/draft/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pokemon_name: pokemonName,
        team_id: teamData.team_id,
        season_id: seasonData.season.id,
      }),
    })

    const draftResult = await draftResponse.json()

    if (draftResult.success) {
      await interaction.editReply(
        `✅ **Draft Pick Confirmed!**\n**${pokemonName}** (${draftResult.pick.point_value}pts) drafted in Round ${draftResult.pick.round}, Pick #${draftResult.pick.pick_number}`,
      )
    } else {
      await interaction.editReply(`❌ **Draft Failed**\n${draftResult.error || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Draft command error:", error)
    await interaction.editReply("❌ Failed to process draft pick. Please try again.")
  }
}

async function handleDraftStatusCommand(interaction: any) {
  await interaction.deferReply()

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/draft/status`)
    const data = await response.json()

    if (!data.session) {
      await interaction.editReply("❌ No active draft session")
      return
    }

    const session = data.session
    const currentTeam = data.currentTeam

    await interaction.editReply(
      `📊 **Draft Status**\n\n**Round**: ${session.current_round}/${session.total_rounds}\n**Pick**: #${session.current_pick_number}\n**Current Team**: ${currentTeam?.name || "Unknown"}\n**Status**: ${session.status}\n\n**Next**: ${data.nextTeam?.name || "TBD"}`,
    )
  } catch (error) {
    await interaction.editReply("❌ Failed to fetch draft status")
  }
}

async function handleDraftAvailableCommand(interaction: any) {
  await interaction.deferReply()

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/draft/available?limit=20`)
    const data = await response.json()

    if (!data.pokemon || data.pokemon.length === 0) {
      await interaction.editReply("❌ No available Pokémon found")
      return
    }

    // Group by point value
    const byPoints = new Map<number, string[]>()
    for (const p of data.pokemon) {
      if (!byPoints.has(p.point_value)) {
        byPoints.set(p.point_value, [])
      }
      byPoints.get(p.point_value)!.push(p.pokemon_name)
    }

    const lines: string[] = ["📋 **Available Pokémon**\n"]
    for (const [points, names] of Array.from(byPoints.entries()).sort((a, b) => b[0] - a[0])) {
      lines.push(`**${points}pts**: ${names.slice(0, 5).join(", ")}${names.length > 5 ? ` +${names.length - 5} more` : ""}`)
    }

    await interaction.editReply(lines.join("\n"))
  } catch (error) {
    await interaction.editReply("❌ Failed to fetch available Pokémon")
  }
}

async function handleDraftMyTeamCommand(interaction: any) {
  const discordId = interaction.user.id
  await interaction.deferReply()

  try {
    // Get user's team
    const teamResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/discord/team?discord_id=${discordId}`,
    )
    const teamData = await teamResponse.json()

    if (!teamData.team_id) {
      await interaction.editReply("❌ You don't have a team assigned")
      return
    }

    // Get team status
    const statusResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/draft/team-status?team_id=${teamData.team_id}`,
    )
    const status = await statusResponse.json()

    const picksList = status.picks
      .map((p: any, idx: number) => `${idx + 1}. ${p.pokemon_name} (${p.point_value}pts) - Round ${p.round}`)
      .join("\n")

    await interaction.editReply(
      `👥 **Your Team**\n\n**Budget**: ${status.budget.spent}/${status.budget.total}pts (${status.budget.remaining} remaining)\n\n**Picks**:\n${picksList || "No picks yet"}`,
    )
  } catch (error) {
    await interaction.editReply("❌ Failed to fetch team status")
  }
}

// Webhook utilities for posting to Discord channels
export async function postToDiscordWebhook(webhookUrl: string, content: string) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  } catch (error) {
    console.error("[v0] Discord webhook error:", error)
  }
}
