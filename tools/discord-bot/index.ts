// Discord bot integration for league operations
// NOTE: This bot runs as a separate service, not in Next.js runtime
// Deploy to a long-running Node process or serverless function with webhook support

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from "discord.js"
import { createClient } from "@supabase/supabase-js"

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN || ""
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || ""
// Support multiple guild IDs (comma-separated) or single guild ID
const DISCORD_GUILD_IDS = process.env.DISCORD_GUILD_IDS || process.env.DISCORD_GUILD_ID || ""
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "" // Keep for backward compatibility
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""
const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || "https://aab-showdown.moodmnky.com"
const SHOWDOWN_API_KEY = process.env.SHOWDOWN_API_KEY || ""
const SHOWDOWN_PUBLIC_URL = process.env.SHOWDOWN_PUBLIC_URL || "https://aab-play.moodmnky.com"
const DAMAGE_CALC_URL = process.env.DAMAGE_CALC_URL || "http://damage-calc:5000"
const DAMAGE_CALC_PUBLIC_URL = process.env.DAMAGE_CALC_PUBLIC_URL || "https://aab-calc.moodmnky.com"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Create Supabase client helper
function createSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase credentials not configured")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

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

  // Showdown battle commands
  new SlashCommandBuilder()
    .setName("battle")
    .setDescription("Create a Showdown battle room")
    .addStringOption((option) =>
      option.setName("format").setDescription("Battle format").setRequired(true).addChoices(
        { name: "Gen 9 Average at Best", value: "gen9avgatbest" },
        { name: "Gen 9 Random Battle", value: "gen9randombattle" },
        { name: "Gen 9 OU", value: "gen9ou" },
      ),
    )
    .addUserOption((option) =>
      option.setName("opponent").setDescription("Opponent user (optional)").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("room-id").setDescription("Custom room ID (optional)").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("validate-team")
    .setDescription("Validate a Showdown team export against your roster")
    .addStringOption((option) =>
      option.setName("team").setDescription("Paste your Showdown team export").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("showdown-link")
    .setDescription("Link your Discord account to Showdown account")
    .addStringOption((option) =>
      option.setName("showdown-username").setDescription("Your Showdown username").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("api-docs")
    .setDescription("View PokéAPI documentation and reference")
    .addStringOption((option) =>
      option
        .setName("endpoint")
        .setDescription("Specific API endpoint to view (optional)")
        .setRequired(false)
        .setAutocomplete(true),
    ),

  // Free Agency commands
  new SlashCommandBuilder()
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
          { name: "Drop Only", value: "drop_only" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("add")
        .setDescription("Pokemon to add")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("drop")
        .setDescription("Pokemon to drop")
        .setRequired(false)
        .setAutocomplete(true),
    ),

  new SlashCommandBuilder()
    .setName("free-agency-status")
    .setDescription("View your team's free agency status"),

  new SlashCommandBuilder()
    .setName("free-agency-available")
    .setDescription("Browse available Pokemon for free agency")
    .addStringOption((option) =>
      option.setName("search").setDescription("Search Pokemon name").setRequired(false),
    )
    .addIntegerOption((option) =>
      option.setName("min_points").setDescription("Minimum points").setRequired(false),
    )
    .addIntegerOption((option) =>
      option.setName("max_points").setDescription("Maximum points").setRequired(false),
    ),
].map((command) => command.toJSON())

// Register commands
export async function registerDiscordCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN)

  try {
    console.log("[v0] Registering Discord slash commands...")

    // Support multiple guild IDs (comma-separated)
    const guildIds = DISCORD_GUILD_IDS
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)

    if (guildIds.length === 0 && DISCORD_GUILD_ID) {
      // Fallback to single guild ID for backward compatibility
      guildIds.push(DISCORD_GUILD_ID)
    }

    if (guildIds.length === 0) {
      console.warn("[v0] No guild IDs provided. Commands will not be registered.")
      return
    }

    // Register commands for each guild
    for (const guildId of guildIds) {
      try {
        await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId), {
          body: commands,
        })
        console.log(`[v0] ✅ Commands registered for guild: ${guildId}`)
      } catch (error: any) {
        console.error(`[v0] ❌ Error registering commands for guild ${guildId}:`, error.message || error)
      }
    }

    console.log(`[v0] Discord commands registered successfully for ${guildIds.length} server(s)!`)
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
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const { commandName } = interaction
      
      if (commandName === "api-docs") {
        const focusedValue = interaction.options.getFocused()
        // Common PokéAPI endpoints for autocomplete
        const endpoints = [
          { name: "Pokémon", value: "pokemon" },
          { name: "Moves", value: "moves" },
          { name: "Abilities", value: "abilities" },
          { name: "Types", value: "types" },
          { name: "Items", value: "items" },
          { name: "Berries", value: "berries" },
          { name: "Locations", value: "locations" },
          { name: "Games", value: "games" },
          { name: "Contests", value: "contests" },
          { name: "Encounters", value: "encounters" },
          { name: "Evolution", value: "evolution" },
          { name: "Machines", value: "machines" },
        ]
        
        const filtered = endpoints
          .filter((endpoint) => endpoint.name.toLowerCase().includes(focusedValue.toLowerCase()))
          .slice(0, 25)
        
        await interaction.respond(filtered.map((endpoint) => ({ name: endpoint.name, value: endpoint.value })))
      }
      return
    }

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
        case "battle":
          await handleBattleCommand(interaction)
          break
        case "validate-team":
          await handleValidateTeamCommand(interaction)
          break
        case "showdown-link":
          await handleShowdownLinkCommand(interaction)
          break
        case "api-docs":
          await handleApiDocsCommand(interaction)
          break
        case "free-agency-submit":
          await handleFreeAgencySubmitCommand(interaction)
          break
        case "free-agency-status":
          await handleFreeAgencyStatusCommand(interaction)
          break
        case "free-agency-available":
          await handleFreeAgencyAvailableCommand(interaction)
          break
        case "calc":
          await handleCalcCommand(interaction)
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
    const response = await fetch(`${APP_URL}/api/matches?week=${week}`)
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
    const response = await fetch(`${APP_URL}/api/ai/parse-result`, {
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
    const response = await fetch(`${APP_URL}/api/standings`)
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
    const response = await fetch(`${APP_URL}/api/ai/weekly-recap`, {
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
    const response = await fetch(`${APP_URL}/api/pokemon/${pokemonName}`)
    const data = await response.json()

    if (data.error) {
      await interaction.editReply(`Pokémon "${pokemonName}" not found`)
      return
    }

    const pokemon = data
    const typesList = pokemon.types.join(", ")
    const statTotal = Object.values(pokemon.base_stats).reduce((a: any, b: any) => a + b, 0)

    await interaction.editReply(
      `**${pokemon.name.toUpperCase()}**\nTypes: ${typesList}\nTier: ${pokemon.tier}\nDraft Cost: ${pokemon.draft_cost} points\nBase Stat Total: ${statTotal}\n\nView full details: ${APP_URL}/pokedex?pokemon=${pokemon.name}`,
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
    // Get user's team using new endpoint
    const teamResponse = await fetch(
      `${APP_URL}/api/discord/team?discord_id=${discordId}`,
    )

    if (!teamResponse.ok) {
      const errorData = await teamResponse.json().catch(() => ({}))
      if (teamResponse.status === 404) {
        await interaction.editReply("❌ You don't have a team assigned. Please contact an admin.")
        return
      }
      throw new Error(errorData.error || `HTTP ${teamResponse.status}`)
    }

    const teamData = await teamResponse.json()

    if (!teamData.team_id) {
      await interaction.editReply("❌ You don't have a team assigned. Please contact an admin.")
      return
    }

    // Get active season
    const seasonResponse = await fetch(`${APP_URL}/api/seasons/current`)
    const seasonData = await seasonResponse.json()

    if (!seasonData.season?.id) {
      await interaction.editReply("❌ No active season found")
      return
    }

    // Make draft pick via API
    const draftResponse = await fetch(`${APP_URL}/api/draft/pick`, {
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
    const response = await fetch(`${APP_URL}/api/draft/status`)
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
    const response = await fetch(`${APP_URL}/api/draft/available?limit=20`)
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
      `${APP_URL}/api/discord/team?discord_id=${discordId}`,
    )
    const teamData = await teamResponse.json()

    if (!teamData.team_id) {
      await interaction.editReply("❌ You don't have a team assigned")
      return
    }

    // Get team status
    const statusResponse = await fetch(
      `${APP_URL}/api/draft/team-status?team_id=${teamData.team_id}`,
    )
    const status = await statusResponse.json()

    const picksList = status.picks
      .map((p: any, idx: number) => `${idx + 1}. ${p.pokemon_name} (${p.point_value}pts) - Round ${p.round}`)
      .join("\n")

    const teamName = teamData.team_name || "Your Team"
    await interaction.editReply(
      `👥 **${teamName}**\n\n**Budget**: ${status.budget.spent}/${status.budget.total}pts (${status.budget.remaining} remaining)\n\n**Picks**:\n${picksList || "No picks yet"}`,
    )
  } catch (error) {
    await interaction.editReply("❌ Failed to fetch team status")
  }
}

// Battle command handler
async function handleBattleCommand(interaction: any) {
  const format = interaction.options.getString("format")
  const opponent = interaction.options.getUser("opponent")
  const roomId = interaction.options.getString("room-id")
  const challenger = interaction.user

  await interaction.deferReply()

  try {
    // Get team names if available
    let team1Name = challenger.displayName || challenger.username
    let team2Name = opponent ? (opponent.displayName || opponent.username) : "Challenger"

    // Create battle room via Showdown API
    const response = await fetch(`${SHOWDOWN_SERVER_URL}/api/create-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SHOWDOWN_API_KEY}`,
      },
      body: JSON.stringify({
        format,
        roomId: roomId || undefined,
        team1: team1Name,
        team2: team2Name,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data.success || !data.room_url) {
      throw new Error(data.error || "Failed to create battle room")
    }

    const battleMessage = opponent
      ? `⚔️ **Battle Created!**\n\n**${team1Name}** vs **${team2Name}**\n**Format**: ${format}\n\n🔗 Join: ${data.room_url}`
      : `⚔️ **Battle Room Created!**\n\n**Format**: ${format}\n**Challenger**: ${team1Name}\n\n🔗 Join: ${data.room_url}`

    await interaction.editReply(battleMessage)
  } catch (error: any) {
    console.error("Battle command error:", error)
    await interaction.editReply(`❌ **Failed to create battle room**: ${error.message || "Unknown error"}`)
  }
}

// Validate team command handler
async function handleValidateTeamCommand(interaction: any) {
  const teamText = interaction.options.getString("team")
  const discordId = interaction.user.id

  await interaction.deferReply()

  try {
    // Call app API to validate team
    const response = await fetch(`${APP_URL}/api/showdown/validate-team`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SHOWDOWN_API_KEY}`,
      },
      body: JSON.stringify({
        team: teamText,
        discord_id: discordId,
      }),
    })

    const data = await response.json()

    if (data.valid) {
      await interaction.editReply(
        `✅ **Team Valid!**\n\nYour team is valid and complies with league rules.`,
      )
    } else {
      const errorsList = data.errors?.map((e: string) => `• ${e}`).join("\n") || "Unknown validation errors"
      await interaction.editReply(`❌ **Team Invalid**\n\n**Errors:**\n${errorsList}`)
    }
  } catch (error: any) {
    console.error("Validate team error:", error)
    // Fallback: Basic validation without app API
    if (teamText.includes("Ability:") || teamText.includes("Moves:")) {
      await interaction.editReply(
        `⚠️ **Team Format Detected**\n\nTeam appears to be valid Showdown format. Full validation requires app API connection.\n\n**Note**: This is a basic check. Full validation checks:\n• Pokémon are on your drafted roster\n• League rules compliance (items, moves, tera types)`,
      )
    } else {
      await interaction.editReply(
        `❌ **Invalid Team Format**\n\nPlease paste a valid Showdown team export.`,
      )
    }
  }
}

// API docs command handler
async function handleApiDocsCommand(interaction: any) {
  const endpoint = interaction.options.getString("endpoint") || null
  const docsUrl = "https://pokeapi-docs.moodmnky.com"
  
  await interaction.deferReply()

  try {
    let message = `📚 **PokéAPI Documentation**\n\n`
    
    if (endpoint) {
      // If specific endpoint requested, link to that section
      const endpointPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
      message += `**Endpoint**: \`${endpointPath}\`\n`
      message += `**Documentation**: ${docsUrl}/docs/v2${endpointPath}\n\n`
    } else {
      // General documentation link
      message += `**Complete API Reference**: ${docsUrl}\n`
      message += `**API Documentation**: ${docsUrl}/docs/v2\n\n`
    }
    
    message += `**Quick Links**:\n`
    message += `• [API Overview](${docsUrl}/docs/v2)\n`
    message += `• [Pokémon Endpoints](${docsUrl}/docs/v2#pokemon-section)\n`
    message += `• [Moves Endpoints](${docsUrl}/docs/v2#moves-section)\n`
    message += `• [Abilities Endpoints](${docsUrl}/docs/v2#abilities-section)\n`
    message += `• [Types Endpoints](${docsUrl}/docs/v2#types-section)\n\n`
    message += `💡 **Tip**: Use \`/api-docs endpoint:<name>\` to view specific endpoint documentation`

    await interaction.editReply(message)
  } catch (error) {
    console.error("[v0] Error handling api-docs command:", error)
    await interaction.editReply({
      content: `❌ Failed to fetch API documentation.\n\n**Documentation URL**: ${docsUrl}`,
    })
  }
}

// Showdown link command handler
async function handleShowdownLinkCommand(interaction: any) {
  const showdownUsername = interaction.options.getString("showdown-username")
  const discordId = interaction.user.id

  await interaction.deferReply()

  try {
    // Call app API to link accounts (Discord bot endpoint)
    // Password is auto-generated by the app endpoint
    const response = await fetch(`${APP_URL}/api/showdown/sync-account-discord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        discord_id: discordId,
        showdown_username: showdownUsername,
      }),
    })

    // Handle 404 (endpoint doesn't exist yet)
    if (response.status === 404) {
      // Try to parse error message from response
      let errorMessage = "Endpoint not available"
      try {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error) {
          // If it's a "User not found" error, that's different from endpoint not existing
          if (errorData.error.includes("User not found")) {
            await interaction.editReply(
              `⚠️ **Account Not Found**\n\n` +
              `**Discord**: ${interaction.user.tag}\n` +
              `**Showdown**: ${showdownUsername}\n\n` +
              `**Error**: ${errorData.error}\n\n` +
              `Please link your Discord account in the app first, then try again.`,
            )
            return
          }
          errorMessage = errorData.error
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      await interaction.editReply(
        `⚠️ **Endpoint Not Available Yet**\n\n` +
        `The account linking feature is being set up.\n\n` +
        `**Discord**: ${interaction.user.tag}\n` +
        `**Showdown**: ${showdownUsername}\n\n` +
        `**Note**: This feature will be available soon.`,
      )
      return
    }

    if (!response.ok) {
      let errorData = {}
      let errorMessage = `HTTP ${response.status}`
      
      try {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } else {
          // If not JSON, try to get text
          const text = await response.text()
          errorMessage = text || errorMessage
        }
      } catch (parseError) {
        // If parsing fails, use status code
        errorMessage = `HTTP ${response.status}`
      }
      
      // Handle Supabase-style errors
      if (errorData.code === "not-found" || errorMessage.includes("resource does not exist")) {
        await interaction.editReply(
          `⚠️ **Service Not Ready**\n\n` +
          `The account linking service is not yet configured.\n\n` +
          `**Discord**: ${interaction.user.tag}\n` +
          `**Showdown**: ${showdownUsername}\n\n` +
          `**Error**: ${errorMessage}\n\n` +
          `Please contact an administrator or try again later.`,
        )
        return
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()

    // Use the cleaned username from the API response (what was actually used for account creation)
    // This ensures we show the exact username that Showdown will recognize
    const actualShowdownUsername = data.showdown_username || showdownUsername
    const password = data.password || "Password not returned from server"

    await interaction.editReply(
      `✅ **Account Linked!**\n\n` +
      `**Discord**: ${interaction.user.tag}\n` +
      `**Showdown**: ${actualShowdownUsername}\n` +
      `**Password**: ||${password}||\n\n` +
      `💡 **Note**: You can change your password anytime by logging into Showdown and going to Settings → Password.\n\n` +
      `You can now use unified authentication.`,
    )
  } catch (error: any) {
    console.error("Showdown link error:", error)
    // For errors, still show the requested username (even if it wasn't used)
    await interaction.editReply(
      `❌ **Error Linking Account**\n\n` +
      `**Discord**: ${interaction.user.tag}\n` +
      `**Showdown**: ${showdownUsername}\n\n` +
      `**Error**: ${error.message || "Unknown error"}\n\n` +
      `Please try again later or contact support.`,
    )
  }
}

// Free Agency command handlers
async function handleFreeAgencySubmitAutocomplete(interaction: any) {
  const focused = interaction.options.getFocused(true)
  const userId = interaction.user.id

  try {
    const supabase = createSupabaseClient()

    // Get user's team
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("discord_id", userId)
      .single()

    if (!profile?.team_id) {
      return interaction.respond([])
    }

    // Get current season
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.respond([])
    }

    if (focused.name === "add") {
      // Autocomplete available Pokemon from draft pool
      const { data: available } = await supabase
        .from("draft_pool")
        .select("pokemon_name, point_value")
        .eq("is_available", true)
        .ilike("pokemon_name", `%${focused.value}%`)
        .limit(25)

      if (!available || available.length === 0) {
        return interaction.respond([])
      }

      return interaction.respond(
        available.map((p: any) => ({
          name: `${p.pokemon_name} (${p.point_value}pts)`,
          value: p.pokemon_name,
        })),
      )
    } else if (focused.name === "drop") {
      // Autocomplete roster Pokemon
      const { data: roster } = await supabase
        .from("team_rosters")
        .select("pokemon:pokemon_id(name), draft_points")
        .eq("team_id", profile.team_id)

      if (!roster || roster.length === 0) {
        return interaction.respond([])
      }

      const filtered = roster
        .filter((r: any) =>
          r.pokemon?.name?.toLowerCase().includes(focused.value.toLowerCase()),
        )
        .slice(0, 25)

      return interaction.respond(
        filtered.map((r: any) => ({
          name: `${r.pokemon.name} (${r.draft_points}pts)`,
          value: r.pokemon.name,
        })),
      )
    }

    return interaction.respond([])
  } catch (error) {
    console.error("[v0] Free agency autocomplete error:", error)
    return interaction.respond([])
  }
}

async function handleFreeAgencySubmitCommand(interaction: any) {
  await interaction.deferReply({ ephemeral: true })

  const userId = interaction.user.id
  const transactionType = interaction.options.getString("type")!
  const addPokemonName = interaction.options.getString("add")
  const dropPokemonName = interaction.options.getString("drop")

  try {
    // Try API endpoint first
    const response = await fetch(`${APP_URL}/api/free-agency/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discord_id: userId,
        type: transactionType,
        add_pokemon: addPokemonName,
        drop_pokemon: dropPokemonName,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        const embed = new EmbedBuilder()
          .setColor(0x00ff00)
          .setTitle("✅ Transaction Submitted")
          .setDescription("Your free agency transaction has been submitted and is pending approval.")
          .addFields(
            { name: "Transaction Type", value: transactionType, inline: true },
            { name: "Status", value: "Pending", inline: true },
          )
          .setTimestamp()

        if (dropPokemonName) {
          embed.addFields({ name: "Dropping", value: dropPokemonName, inline: true })
        }
        if (addPokemonName) {
          embed.addFields({ name: "Adding", value: addPokemonName, inline: true })
        }

        return interaction.editReply({ embeds: [embed] })
      } else {
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle("❌ Transaction Failed")
          .setDescription(data.error || "Unknown error")

        return interaction.editReply({ embeds: [errorEmbed] })
      }
    }

    // Fallback: Direct Supabase implementation
    const supabase = createSupabaseClient()

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

    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.editReply({ content: "❌ No active season found." })
    }

    // For now, return a message that API endpoint needs to be implemented
    return interaction.editReply({
      content:
        "⚠️ Free agency submission is being set up. Please use the web interface for now.",
    })
  } catch (error: any) {
    console.error("[v0] Free agency submit error:", error)
    return interaction.editReply({
      content: `❌ Error: ${error.message || "Failed to submit transaction"}`,
    })
  }
}

async function handleFreeAgencyStatusCommand(interaction: any) {
  await interaction.deferReply({ ephemeral: true })

  const userId = interaction.user.id

  try {
    // Try API endpoint first
    const response = await fetch(`${APP_URL}/api/free-agency/status?discord_id=${userId}`)

    if (response.ok) {
      const data = await response.json()
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("📊 Free Agency Status")
        .addFields(
          { name: "Roster Size", value: `${data.rosterSize || 0}/10`, inline: true },
          {
            name: "Budget",
            value: `${data.budget?.spent || 0}/120 (${data.budget?.remaining || 0} remaining)`,
            inline: true,
          },
          {
            name: "Transactions",
            value: `${data.transactionCount || 0}/10 (${data.remainingTransactions || 0} remaining)`,
            inline: true,
          },
        )
        .setTimestamp()

      if (data.roster && data.roster.length > 0) {
        const rosterList = data.roster
          .map((p: any) => `${p.pokemon_name} (${p.point_value}pts)`)
          .join("\n")
        embed.addFields({ name: "Current Roster", value: rosterList })
      }

      return interaction.editReply({ embeds: [embed] })
    }

    // Fallback message
    return interaction.editReply({
      content: "⚠️ Free agency status is being set up. Please use the web interface for now.",
    })
  } catch (error: any) {
    console.error("[v0] Free agency status error:", error)
    return interaction.editReply({
      content: `❌ Error: ${error.message || "Failed to fetch status"}`,
    })
  }
}

async function handleFreeAgencyAvailableCommand(interaction: any) {
  await interaction.deferReply({ ephemeral: true })

  const search = interaction.options.getString("search")
  const minPoints = interaction.options.getInteger("min_points")
  const maxPoints = interaction.options.getInteger("max_points")

  try {
    const supabase = createSupabaseClient()

    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single()

    if (!season) {
      return interaction.editReply({ content: "❌ No active season found." })
    }

    let query = supabase
      .from("draft_pool")
      .select("pokemon_name, point_value")
      .eq("is_available", true)
      .limit(25)

    if (search) {
      query = query.ilike("pokemon_name", `%${search}%`)
    }
    if (minPoints) {
      query = query.gte("point_value", minPoints)
    }
    if (maxPoints) {
      query = query.lte("point_value", maxPoints)
    }

    const { data: available } = await query

    if (!available || available.length === 0) {
      return interaction.editReply({
        content: "❌ No Pokemon available matching your filters.",
      })
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("🆓 Available Pokemon")
      .setDescription(
        available
          .map((p: any) => `**${p.pokemon_name}** - ${p.point_value}pts`)
          .join("\n"),
      )
      .setFooter({ text: `Showing ${available.length} Pokemon` })
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })
  } catch (error: any) {
    console.error("[v0] Free agency available error:", error)
    return interaction.editReply({
      content: `❌ Error: ${error.message || "Failed to fetch available Pokemon"}`,
    })
  }
}

// Damage Calculator command handlers
async function handleCalcAutocomplete(interaction: any) {
  const focused = interaction.options.getFocused(true)
  const focusedValue = focused.value.toLowerCase()

  try {
    const supabase = createSupabaseClient()

    if (focused.name === "attacker" || focused.name === "defender") {
      // Autocomplete Pokemon names from draft pool
      const { data: pokemon } = await supabase
        .from("draft_pool")
        .select("pokemon_name")
        .ilike("pokemon_name", `%${focusedValue}%`)
        .limit(25)

      if (!pokemon || pokemon.length === 0) {
        return interaction.respond([])
      }

      return interaction.respond(
        pokemon.map((p: any) => ({
          name: p.pokemon_name,
          value: p.pokemon_name,
        })),
      )
    } else if (focused.name === "move") {
      // Common moves for autocomplete (can be expanded with actual move data)
      const commonMoves = [
        "Earthquake",
        "Ice Beam",
        "Thunderbolt",
        "Flamethrower",
        "Surf",
        "Close Combat",
        "Moonblast",
        "Shadow Ball",
        "Psychic",
        "Dark Pulse",
        "Dragon Pulse",
        "Energy Ball",
        "Sludge Bomb",
        "Focus Blast",
        "Aura Sphere",
        "Scald",
        "Volt Switch",
        "U-turn",
        "Knock Off",
        "Stealth Rock",
        "Toxic",
        "Will-O-Wisp",
        "Thunder Wave",
        "Swords Dance",
        "Dragon Dance",
        "Calm Mind",
        "Nasty Plot",
      ]

      const filtered = commonMoves
        .filter((move) => move.toLowerCase().includes(focusedValue))
        .slice(0, 25)

      return interaction.respond(
        filtered.map((move) => ({
          name: move,
          value: move,
        })),
      )
    }

    return interaction.respond([])
  } catch (error) {
    console.error("[v0] Calc autocomplete error:", error)
    return interaction.respond([])
  }
}

async function handleCalcCommand(interaction: any) {
  await interaction.deferReply()

  const attacker = interaction.options.getString("attacker")
  const defender = interaction.options.getString("defender")
  const move = interaction.options.getString("move")
  const generation = interaction.options.getInteger("generation") || 9

  try {
    // Try Next.js API endpoint first (if available)
    let response: Response | null = null
    try {
      response = await fetch(`${APP_URL}/api/calc`, {
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
    } catch (apiError) {
      // API endpoint not available, will fall back to calculator link
    }

    // If Next.js API not available, try direct damage-calc API (if enabled)
    if (!response || !response.ok) {
      try {
        response = await fetch(`${DAMAGE_CALC_URL}/calculate`, {
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
      } catch (calcError) {
        // Damage calc API not available, will fall back to calculator link
      }
    }

    if (response && response.ok) {
      const result = await response.json()

      // Format damage range
      const damageRange =
        result.damage && result.damage.length === 2
          ? `${result.damage[0]} - ${result.damage[1]}`
          : result.damage?.join(" - ") || "N/A"

      // Format percentage range
      const percentRange =
        result.percent && result.percent.length === 2
          ? `${result.percent[0]}% - ${result.percent[1]}%`
          : result.percent?.join("% - ") || "N/A"

      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("⚔️ Damage Calculation")
        .setDescription(`**${attacker}** using **${move}** vs **${defender}**`)
        .addFields(
          { name: "Damage", value: damageRange, inline: true },
          { name: "Percentage", value: percentRange, inline: true },
          { name: "Generation", value: `Gen ${generation}`, inline: true },
        )
        .addFields({
          name: "Full Calculator",
          value: `[Open detailed calculator](${DAMAGE_CALC_PUBLIC_URL})`,
          inline: false,
        })
        .setFooter({ text: "For detailed analysis, use the full calculator" })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })
    } else {
      // If API fails, provide link to calculator
      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setTitle("⚔️ Damage Calculator")
        .setDescription(
          `**${attacker}** vs **${defender}** using **${move}**\n\n` +
            `Use the full calculator for detailed damage calculations:`,
        )
        .addFields({
          name: "Calculator Link",
          value: `[Open Calculator](${DAMAGE_CALC_PUBLIC_URL})`,
        })
        .setFooter({ text: "API endpoint temporarily unavailable" })
        .setTimestamp()

      return interaction.editReply({ embeds: [embed] })
    }
  } catch (error: any) {
    console.error("[v0] Calc command error:", error)

    // Fallback: Link to calculator
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("⚔️ Damage Calculator")
      .setDescription(
        `**${attacker}** vs **${defender}** using **${move}**\n\n` +
          `Use the full calculator for detailed damage calculations:`,
      )
      .addFields({
        name: "Calculator Link",
        value: `[Open Calculator](${DAMAGE_CALC_PUBLIC_URL})`,
      })
      .setTimestamp()

    return interaction.editReply({ embeds: [embed] })
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
