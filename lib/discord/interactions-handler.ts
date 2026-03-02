/**
 * Handles Discord APPLICATION_COMMAND interactions by calling app APIs and
 * building the response. Used by the Next.js interactions route so commands
 * are processed in-process (no Supabase round-trip), staying under Discord’s 3s limit.
 */

import { getWhoamiData } from "@/lib/discord/whoami-data"
import { getDraftStatusData } from "@/lib/discord/draft-status-data"

const MESSAGE_FLAG_EPHEMERAL = 64

interface DiscordOption {
  name: string
  type: number
  value?: string | number
  focused?: boolean
}

export interface InteractionPayload {
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

async function callApp(
  baseUrl: string,
  botKey: string,
  method: "GET" | "POST",
  path: string,
  body?: object
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botKey}`,
      "X-Discord-Bot-Key": botKey,
      "X-API-Key": botKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error || res.statusText }
  }
  return { ok: true, data }
}

function buildContent(cmd: string, data: unknown, error?: string): string {
  if (error) return `❌ ${error}`
  const d = data as Record<string, unknown>

  switch (cmd) {
    case "whoami": {
      if (!d?.found || !d?.coach)
        return (
          "❌ Your Discord account is not linked to a coach profile. " +
          "Ask an admin to link your Discord in the app (User Management → Link Discord) and assign you as a coach. " +
          "If you’re already a coach, ask your commissioner to re-link your Discord or re-assign you."
        )
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
      if (!coach?.linked)
        return (
          "❌ Your Discord account is not linked to a coach. " +
          "Ask an admin to link your Discord (User Management → Link Discord) and assign you as a coach."
        )
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
    case "calc": {
      if (!d?.success) return `❌ ${(d as { error?: string }).error ?? "Calculation failed."}`
      const pct = (d.percent as number[]) ?? []
      const dmg = (d.damage as number[]) ?? []
      const minP = pct[0] ?? 0
      const maxP = pct[pct.length - 1] ?? 0
      const minD = dmg[0] ?? 0
      const maxD = dmg[dmg.length - 1] ?? 0
      return (
        `⚡ **Damage:** ${minD}-${maxD}\n` +
        `📊 **HP %:** ${minP.toFixed(1)}%-${maxP.toFixed(1)}%\n` +
        (d.desc ? `📝 ${d.desc}` : "")
      )
    }
    case "free-agency-submit": {
      if (!d?.ok && !d?.success) return `❌ ${(d as { error?: string }).error ?? "Submit failed."}`
      return (d?.message as string) ?? "✅ Transaction submitted and scheduled for 12:00 AM Monday EST."
    }
    case "free-agency-status": {
      if (!d?.success || !d?.status) return `❌ ${(d as { error?: string }).error ?? "Failed to fetch status."}`
      const s = d.status as { roster?: unknown[]; budget?: { spent_points?: number; total_points?: number; remaining_points?: number }; transaction_count?: number }
      const roster = s?.roster ?? []
      const budget = s?.budget ?? {}
      const txCount = s?.transaction_count ?? 0
      return (
        `📊 **Roster:** ${roster.length}/10\n` +
        `💰 **Budget:** ${budget.spent_points ?? 0}/${budget.total_points ?? 0} (${budget.remaining_points ?? 0} remaining)\n` +
        `📋 **Transactions:** ${txCount}/10`
      )
    }
    default:
      return typeof d?.message === "string" ? d.message : "✅ Done."
  }
}

const INTERACTION_RESPONSE_AUTOCOMPLETE = 8

/**
 * Handle an APPLICATION_COMMAND by calling app APIs and returning the Discord response.
 * Uses in-process fetch to app routes so we stay under Discord’s 3s limit.
 */
export async function handleApplicationCommand(
  payload: InteractionPayload,
  baseUrl: string,
  botKey: string
): Promise<
  | { type: 4; data: { content: string; flags: number } }
  | { type: 8; data: { choices: Array<{ name: string; value: string }> } }
> {
  const cmd = payload.data?.name?.toLowerCase() ?? ""
  const options = payload.data?.options ?? []
  const userId = payload.member?.user?.id ?? payload.user?.id ?? ""
  const guildId = payload.guild_id ?? ""

  if (hasFocusedOption(options)) {
    const focused = options.find((o) => o.focused)
    const query = (focused?.value && String(focused.value).trim()) || ""
    const focusedName = focused?.name ?? ""

    if (focusedName === "move" && cmd === "calc") {
      const commonMoves = [
        "Thunderbolt", "Flamethrower", "Ice Beam", "Earthquake", "Close Combat",
        "Shadow Ball", "Psychic", "Surf", "Hyper Beam", "Thunder", "Fire Blast",
        "Blizzard", "Hydro Pump", "Solar Beam", "Energy Ball", "Dark Pulse",
        "Dragon Pulse", "Focus Blast", "Aura Sphere", "Giga Impact",
      ]
      const filtered = query.length < 2
        ? commonMoves.slice(0, 10)
        : commonMoves.filter((m) => m.toLowerCase().includes(query.toLowerCase())).slice(0, 25)
      const choices = filtered.map((m) => ({ name: m.slice(0, 100), value: m }))
      return { type: INTERACTION_RESPONSE_AUTOCOMPLETE, data: { choices } }
    }

    if (query.length < 2) {
      return { type: INTERACTION_RESPONSE_AUTOCOMPLETE, data: { choices: [] } }
    }

    const useNameAsValue = cmd === "calc" || cmd === "free-agency-submit"
    const seasonId = getOptString(options, "season_id") ?? ""
    const path = `/api/discord/pokemon/search?query=${encodeURIComponent(query)}${seasonId ? `&season_id=${encodeURIComponent(seasonId)}` : ""}${guildId ? `&guild_id=${encodeURIComponent(guildId)}` : ""}&limit=25&discord_user_id=${encodeURIComponent(userId)}`
    const result = await callApp(baseUrl, botKey, "GET", path)
    const results = (result.data as { results?: Array<{ id: string; name: string; display?: string }> })?.results ?? []
    const choices = results.slice(0, 25).map((r) => ({
      name: (r.display || r.name).slice(0, 100),
      value: useNameAsValue ? (r.display || r.name) : r.id,
    }))
    return { type: INTERACTION_RESPONSE_AUTOCOMPLETE, data: { choices } }
  }

  let content = "❌ Unknown command or error."

  switch (cmd) {
    case "whoami": {
      const seasonId = getOptString(options, "season_id")
      const result = await getWhoamiData(userId, seasonId ?? undefined)
      content = buildContent("whoami", result.ok ? result : null, result.error)
      break
    }
    case "draftstatus": {
      const seasonId = getOptString(options, "season_id") ?? null
      const result = await getDraftStatusData(userId, guildId || null, seasonId)
      content = buildContent("draftstatus", result.ok ? result : null, result.error)
      break
    }
    case "getseason": {
      if (!guildId) {
        content = "❌ This command must be used in a server (not DMs)."
        break
      }
      const result = await callApp(
        baseUrl,
        botKey,
        "GET",
        `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
      )
      content = buildContent("getseason", result.data, result.error)
      break
    }
    case "setseason": {
      if (!guildId) {
        content = "❌ This command must be used in a server (not DMs)."
        break
      }
      const seasonInput = getOptString(options, "season_id")?.trim() ?? ""
      const seasonId = seasonInput.toLowerCase() === "clear" ? null : seasonInput
      const result = await callApp(baseUrl, botKey, "POST", "/api/discord/guild/config", {
        guild_id: guildId,
        default_season_id: seasonId,
        admin_role_ids: [],
      })
      content = buildContent("setseason", result.data, result.error)
      break
    }
    case "pick": {
      const pokemonId = getOptString(options, "pokemon")
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(
          baseUrl,
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
      const result = await callApp(baseUrl, botKey, "POST", "/api/discord/draft/pick", body)
      content = buildContent("pick", result.data, result.error)
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
          baseUrl,
          botKey,
          "GET",
          `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`
        )
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      const path = `/api/discord/pokemon/search?query=${encodeURIComponent(query)}&limit=10${seasonId ? `&season_id=${encodeURIComponent(seasonId)}` : ""}${guildId ? `&guild_id=${encodeURIComponent(guildId)}` : ""}&discord_user_id=${encodeURIComponent(userId)}`
      const result = await callApp(baseUrl, botKey, "GET", path)
      content = buildContent("search", result.data, result.error)
      break
    }
    case "coverage": {
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(
          baseUrl,
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
        baseUrl,
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
      const channelId = getOptString(options, "channel") || ""
      const checksStr = getOptString(options, "checks")
      const checks = checksStr ? checksStr.split(",").map((s) => s.trim()).filter(Boolean) : undefined
      const covRes = await callApp(baseUrl, botKey, "POST", "/api/discord/notify/coverage", {
        season_id: seasonId,
        team_id: teamId,
        channel_id: channelId,
        checks,
      })
      content = buildContent("coverage", covRes.data, covRes.error) || "✅ Coverage sent."
      break
    }
    case "calc": {
      const attacker = getOptString(options, "attacker")
      const defender = getOptString(options, "defender")
      const move = getOptString(options, "move")
      const gen = getOpt(options, "generation") ?? 9
      if (!attacker || !defender || !move) {
        content = "❌ Provide attacker, defender, and move."
        break
      }
      const result = await callApp(baseUrl, botKey, "POST", "/api/calc", {
        gen: Number(gen),
        attackingPokemon: attacker,
        defendingPokemon: defender,
        moveName: move,
        attackingPokemonOptions: {},
        defendingPokemonOptions: {},
      })
      content = buildContent("calc", result.data, result.error)
      break
    }
    case "free-agency-submit": {
      const transactionType = getOptString(options, "type")
      const addName = getOptString(options, "add")
      const dropName = getOptString(options, "drop")
      if (!transactionType) {
        content = "❌ Provide transaction type (replacement, addition, or drop_only)."
        break
      }
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(baseUrl, botKey, "GET", `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`)
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      if (!seasonId) {
        const curRes = await callApp(baseUrl, botKey, "GET", "/api/discord/season/current")
        const cur = curRes.data as { season_id?: string }
        seasonId = cur?.season_id
      }
      if (!seasonId) {
        content = "❌ No season configured. Use /setseason or pass season_id."
        break
      }
      const body: Record<string, unknown> = {
        discord_user_id: userId,
        season_id: seasonId,
        transaction_type,
        guild_id: guildId || undefined,
      }
      if (addName) body.add_pokemon_name = addName
      if (dropName) body.drop_pokemon_name = dropName
      const result = await callApp(baseUrl, botKey, "POST", "/api/discord/free-agency/submit", body)
      content = buildContent("free-agency-submit", result.data, result.error)
      break
    }
    case "free-agency-status": {
      let seasonId = getOptString(options, "season_id")
      if (!seasonId && guildId) {
        const cfgRes = await callApp(baseUrl, botKey, "GET", `/api/discord/guild/config?guild_id=${encodeURIComponent(guildId)}`)
        const cfg = cfgRes.data as { default_season_id?: string }
        seasonId = cfg?.default_season_id
      }
      if (!seasonId) {
        const curRes = await callApp(baseUrl, botKey, "GET", "/api/discord/season/current")
        const cur = curRes.data as { season_id?: string }
        seasonId = cur?.season_id
      }
      if (!seasonId) {
        content = "❌ No season configured. Use /setseason or pass season_id."
        break
      }
      const path = `/api/discord/free-agency/team-status?discord_user_id=${encodeURIComponent(userId)}&season_id=${encodeURIComponent(seasonId)}${guildId ? `&guild_id=${encodeURIComponent(guildId)}` : ""}`
      const result = await callApp(baseUrl, botKey, "GET", path)
      content = buildContent("free-agency-status", result.data, result.error)
      break
    }
    default:
      content = `❌ Command \`/${cmd}\` is not implemented.`
  }

  return {
    type: 4,
    data: { content: content.slice(0, 2000), flags: MESSAGE_FLAG_EPHEMERAL },
  }
}
