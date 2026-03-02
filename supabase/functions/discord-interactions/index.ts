/**
 * Discord Interactions Endpoint (Supabase Edge Function)
 *
 * Receives POSTs from Discord (Interactions Endpoint URL). Verifies Ed25519 signature,
 * responds to PING with PONG, and routes APPLICATION_COMMAND to the Next.js app APIs.
 *
 * Secrets: DISCORD_PUBLIC_KEY, DISCORD_BOT_API_KEY, APP_BASE_URL
 */

import { verifyDiscordRequest } from "../_shared/discord-verify.ts"

const INTERACTION_TYPE_PING = 1
const INTERACTION_TYPE_APPLICATION_COMMAND = 2
const INTERACTION_RESPONSE_PONG = 1
const INTERACTION_RESPONSE_CHANNEL_MESSAGE = 4
const INTERACTION_RESPONSE_AUTOCOMPLETE = 8
const MESSAGE_FLAG_EPHEMERAL = 64

interface DiscordOption {
  name: string
  type: number
  value?: string | number
  focused?: boolean
}

interface InteractionPayload {
  type: number
  data?: {
    id: string
    name: string
    type?: number
    options?: DiscordOption[]
  }
  member?: { user: { id: string; username: string } }
  user?: { id: string; username: string }
  guild_id?: string
}

function getOpt(options: DiscordOption[] | undefined, name: string): string | number | undefined {
  if (!options) return undefined
  const o = options.find((x) => x.name === name)
  return o?.value
}

function getOptString(options: DiscordOption[] | undefined, name: string): string | undefined {
  const v = getOpt(options, name)
  return v !== undefined ? String(v) : undefined
}

function hasFocusedOption(options: DiscordOption[] | undefined): boolean {
  return options?.some((o) => o.focused === true) ?? false
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function callApp(
  baseUrl: string,
  botKey: string,
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<{ ok: boolean; data?: unknown; error?: string; content?: string }> {
  const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${botKey}`,
    "Content-Type": "application/json",
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: data?.error || data?.message || res.statusText }
  }
  return { ok: true, data, content: data?.message }
}

function buildContentFromAppResponse(cmd: string, data: unknown, error?: string): string {
  if (error) return `❌ ${error}`

  const d = data as Record<string, unknown>

  switch (cmd) {
    case "whoami": {
      if (!d?.found || !d?.coach) return "❌ Your Discord account is not linked to a coach profile."
      const coach = d.coach as Record<string, unknown>
      const teams = (d.teams as Array<Record<string, unknown>>) ?? []
      const seasonTeam = d.season_team as Record<string, unknown> | null
      let out = `👤 **${coach.coach_name}**\n`
      if (teams.length) out += `Teams: ${teams.map((t) => t.team_name).join(", ")}\n`
      if (seasonTeam?.team_name) out += `Season team: ${seasonTeam.team_name}`
      return out || "✅ Coach profile found."
    }
    case "draftstatus": {
      const season = d?.season as Record<string, unknown> | undefined
      const team = d?.team as Record<string, unknown> | undefined
      const coach = d?.coach as Record<string, unknown> | undefined
      if (!coach?.linked) return "❌ Your Discord account is not linked to a coach."
      if (!team) return `✅ Season: ${season?.name ?? "—"}\nNo team in this season.`
      const budget = team.budget as Record<string, number> | undefined
      return (
        `✅ **${team.team_name}**\n` +
        `Season: ${season?.name ?? "—"}\n` +
        `Budget: ${budget?.points_used ?? 0}/${budget?.budget_total ?? 0} pts\n` +
        `Slots: ${budget?.slots_used ?? 0}/${budget?.slots_total ?? 0}`
      )
    }
    case "getseason": {
      if (!d?.configured || !d?.default_season_id)
        return "⚠️ No default season configured. Use `/setseason <season_uuid>` to set one."
      const def = d.default_season as Record<string, unknown> | undefined
      return `📅 Default season: **${def?.name ?? d.default_season_id}**`
    }
    case "setseason": {
      const def = d?.default_season as Record<string, unknown> | undefined
      if (d?.default_season_id) return `✅ Default season set to: **${def?.name ?? d.default_season_id}**`
      return "✅ Default season cleared."
    }
    case "pick": {
      if (!d?.ok) return `❌ ${(d as { error?: string }).error ?? "Pick failed."}`
      const teamBudget = d.team_budget as Record<string, number> | undefined
      return (
        `✅ Pick recorded.\n` +
        `Budget remaining: ${teamBudget?.budget_remaining ?? 0} pts, ` +
        `Slots: ${teamBudget?.slots_remaining ?? 0}`
      )
    }
    case "search": {
      const results = (d?.results as Array<Record<string, unknown>>) ?? []
      if (!results.length) return "No Pokémon found."
      return results
        .slice(0, 10)
        .map((r) => `${r.display ?? r.name} (${r.draft_points ?? 0} pts)`)
        .join("\n")
    }
    case "coverage": {
      return (d?.message as string) ?? "✅ Coverage analysis complete."
    }
    default:
      return typeof d?.message === "string" ? d.message : "✅ Done."
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY")
  const botKey = Deno.env.get("DISCORD_BOT_API_KEY")
  const appBaseUrl = Deno.env.get("APP_BASE_URL") || Deno.env.get("NEXT_PUBLIC_APP_URL") || ""

  if (!publicKey || !botKey || !appBaseUrl) {
    console.error("Missing DISCORD_PUBLIC_KEY, DISCORD_BOT_API_KEY, or APP_BASE_URL")
    return jsonResponse({ error: "Server configuration error" }, 500)
  }

  const signature = req.headers.get("x-signature-ed25519")
  const timestamp = req.headers.get("x-signature-timestamp")
  const rawBody = await req.text()

  if (!verifyDiscordRequest(rawBody, signature, timestamp, publicKey)) {
    return new Response("Bad request signature.", { status: 401 })
  }

  let payload: InteractionPayload
  try {
    payload = JSON.parse(rawBody) as InteractionPayload
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400)
  }

  // PING
  if (payload.type === INTERACTION_TYPE_PING) {
    return jsonResponse({ type: INTERACTION_RESPONSE_PONG })
  }

  // APPLICATION_COMMAND
  if (payload.type !== INTERACTION_TYPE_APPLICATION_COMMAND || !payload.data) {
    return jsonResponse({ error: "Unknown type" }, 400)
  }

  const cmd = payload.data.name?.toLowerCase()
  const options = payload.data.options ?? []
  const userId = payload.member?.user?.id ?? payload.user?.id ?? ""
  const guildId = payload.guild_id ?? ""

  // Autocomplete (e.g. pick pokemon, search query)
  if (hasFocusedOption(options)) {
    const focused = options.find((o) => o.focused)
    const query = (focused?.value && String(focused.value).trim()) || ""
    if (query.length < 2) {
      return jsonResponse({ type: INTERACTION_RESPONSE_AUTOCOMPLETE, data: { choices: [] } })
    }
    const seasonId = getOptString(options, "season_id") ?? ""
    const guildParam = guildId ? `&guild_id=${encodeURIComponent(guildId)}` : ""
    const seasonParam = seasonId ? `&season_id=${encodeURIComponent(seasonId)}` : ""
    const path = `/api/discord/pokemon/search?query=${encodeURIComponent(query)}${seasonParam}${guildParam}&limit=25&discord_user_id=${encodeURIComponent(userId)}`
    const result = await callApp(appBaseUrl, botKey, "GET", path)
    const results = (result.data as { results?: Array<{ id: string; name: string; display?: string }> })?.results ?? []
    const choices = results.slice(0, 25).map((r) => ({
      name: (r.display || r.name).slice(0, 100),
      value: r.id,
    }))
    return jsonResponse({ type: INTERACTION_RESPONSE_AUTOCOMPLETE, data: { choices } })
  }

  // Route by command name
  let content = "❌ Unknown command or error."

  switch (cmd) {
    case "whoami": {
      const seasonId = getOptString(options, "season_id")
      let path = `/api/discord/coach/whoami?discord_user_id=${encodeURIComponent(userId)}`
      if (seasonId) path += `&season_id=${encodeURIComponent(seasonId)}`
      const result = await callApp(appBaseUrl, botKey, "GET", path)
      content = buildContentFromAppResponse("whoami", result.data, result.error)
      break
    }
    case "draftstatus": {
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(
          appBaseUrl,
          botKey,
          "GET",
          `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
        )
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      const path = `/api/discord/draft/status?discord_user_id=${encodeURIComponent(userId)}&guild_id=${encodeURIComponent(guildId)}${seasonId ? `&season_id=${encodeURIComponent(seasonId)}` : ""}`
      const result = await callApp(appBaseUrl, botKey, "GET", path)
      content = buildContentFromAppResponse("draftstatus", result.data, result.error)
      break
    }
    case "getseason": {
      if (!guildId) {
        content = "❌ This command must be used in a server (not DMs)."
        break
      }
      const result = await callApp(
        appBaseUrl,
        botKey,
        "GET",
        `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
      )
      content = buildContentFromAppResponse("getseason", result.data, result.error)
      break
    }
    case "setseason": {
      if (!guildId) {
        content = "❌ This command must be used in a server (not DMs)."
        break
      }
      const seasonInput = getOptString(options, "season_id")?.trim() ?? ""
      const seasonId = seasonInput.toLowerCase() === "clear" ? null : seasonInput
      const result = await callApp(appBaseUrl, botKey, "POST", "/api/discord/guild/config", {
        guild_id: guildId,
        default_season_id: seasonId,
        admin_role_ids: [],
      })
      content = buildContentFromAppResponse("setseason", result.data, result.error)
      break
    }
    case "pick": {
      const pokemonId = getOptString(options, "pokemon")
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(
          appBaseUrl,
          botKey,
          "GET",
          `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
        )
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      if (!pokemonId || !seasonId) {
        content = "❌ Missing pokemon or season. Set a server default with /setseason or pass season_id."
        break
      }
      const body: Record<string, unknown> = {
        discord_user_id: userId,
        pokemon_id: pokemonId,
        season_id: seasonId,
      }
      const draftRound = getOpt(options, "draft_round")
      const pickNumber = getOpt(options, "pick_number")
      const notes = getOptString(options, "notes")
      if (draftRound !== undefined) body.draft_round = Number(draftRound)
      if (pickNumber !== undefined) body.pick_number = Number(pickNumber)
      if (notes) body.notes = notes
      const result = await callApp(appBaseUrl, botKey, "POST", "/api/discord/draft/pick", body)
      content = buildContentFromAppResponse("pick", result.data, result.error)
      break
    }
    case "search": {
      const query = getOptString(options, "query")
      if (!query?.trim()) {
        content = "❌ Provide a search query."
        break
      }
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(
          appBaseUrl,
          botKey,
          "GET",
          `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
        )
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      const path = `/api/discord/pokemon/search?query=${encodeURIComponent(query)}&limit=10${seasonId ? `&season_id=${encodeURIComponent(seasonId)}` : ""}${guildId ? `&guild_id=${encodeURIComponent(guildId)}` : ""}&discord_user_id=${encodeURIComponent(userId)}`
      const result = await callApp(appBaseUrl, botKey, "GET", path)
      content = buildContentFromAppResponse("search", result.data, result.error)
      break
    }
    case "coverage": {
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(
          appBaseUrl,
          botKey,
          "GET",
          `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
        )
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      if (!seasonId) {
        content = "❌ No season configured. Use /setseason or pass season_id."
        break
      }
      const statusRes = await callApp(
        appBaseUrl,
        botKey,
        "GET",
        `/api/discord/draft/status?discord_user_id=${encodeURIComponent(userId)}&season_id=${encodeURIComponent(seasonId)}&guild_id=${encodeURIComponent(guildId)}`
      )
      const statusData = statusRes.data as { team?: { id: string }; ok?: boolean }
      const teamId = statusData?.team?.id
      if (!statusRes.ok || !teamId) {
        content = statusRes.error ?? "❌ Could not resolve your team for this season."
        break
      }
      const channelId = getOptString(options, "channel") || "" // Discord channel ID from option
      const checksStr = getOptString(options, "checks")
      const checks = checksStr ? checksStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined
      const covRes = await callApp(appBaseUrl, botKey, "POST", "/api/discord/notify/coverage", {
        season_id: seasonId,
        team_id: teamId,
        channel_id: channelId,
        checks,
      })
      content = buildContentFromAppResponse("coverage", covRes.data, covRes.error) || covRes.content || "✅ Coverage sent."
      break
    }
    default:
      content = `❌ Command \`/${cmd}\` is not implemented in this endpoint.`
  }

  return jsonResponse({
    type: INTERACTION_RESPONSE_CHANNEL_MESSAGE,
    data: { content: content.slice(0, 2000), flags: MESSAGE_FLAG_EPHEMERAL },
  })
})
