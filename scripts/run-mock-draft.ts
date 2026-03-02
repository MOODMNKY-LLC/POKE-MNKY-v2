/**
 * Run an automated mock draft: get or create session for Mock Draft Demo season,
 * then make picks in order until the draft is complete or max picks reached.
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/run-mock-draft.ts [maxPicks]
 * Example: pnpm exec tsx --env-file=.env.local scripts/run-mock-draft.ts 9
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"
import { DraftSystem } from "../lib/draft-system"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const MOCK_SEASON_NAME = "Mock Draft Demo"

async function sendDiscordMessage(text: string) {
  const url = process.env.MOCK_DRAFT_DISCORD_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    })
  } catch (e) {
    console.warn("Discord webhook failed:", e)
  }
}

async function runMockDraft() {
  const maxPicks = parseInt(process.argv[2] ?? "0", 10) || 0
  console.log("Run Mock Draft (max picks:", maxPicks || "all", ")\n")

  const supabase = createServiceRoleClient()
  const draftSystem = new DraftSystem()

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", MOCK_SEASON_NAME)
    .maybeSingle()

  if (!season) {
    console.error("Mock season not found. Run scripts/seed-mock-draft.ts first.")
    process.exit(1)
  }

  const seasonId = season.id
  let session = await draftSystem.getActiveSession(seasonId)

  if (!session) {
    const { data: teams } = await supabase
      .from("teams")
      .select("id")
      .eq("season_id", seasonId)
    const teamIds = (teams ?? []).map((t) => t.id)
    if (teamIds.length < 2) {
      console.error("Need at least 2 teams for mock season. Run seed-mock-draft.ts.")
      process.exit(1)
    }
    session = await draftSystem.createSession(seasonId, teamIds, {
      draftType: "snake",
      pickTimeLimit: 45,
      autoDraftEnabled: false,
    })
    console.log("Created draft session:", session.id)
    await sendDiscordMessage(`Mock draft started. Session ${session.id}.`)
  } else {
    console.log("Using existing session:", session.id)
  }

  const sessionId = session.id
  let pickCount = 0

  while (true) {
    if (session.status === "completed") {
      console.log("Draft already completed.")
      break
    }
    if (maxPicks > 0 && pickCount >= maxPicks) {
      console.log("Reached max picks:", maxPicks)
      break
    }

    const turn = await draftSystem.getCurrentTurn(sessionId)
    if (!turn) {
      console.log("No current turn (draft may be complete).")
      break
    }

    const { data: budget } = await supabase
      .from("draft_budgets")
      .select("remaining_points")
      .eq("team_id", turn.teamId)
      .eq("season_id", seasonId)
      .single()

    const remaining = budget?.remaining_points ?? 0
    if (remaining <= 0) {
      console.log("Team has no budget left; stopping.")
      break
    }

    const { data: available } = await supabase
      .from("draft_pool")
      .select("pokemon_name, point_value")
      .eq("season_id", seasonId)
      .or("status.eq.available,status.is.null")
      .lte("point_value", remaining)
      .order("point_value", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!available) {
      console.log("No available Pokémon within budget; stopping.")
      break
    }

    const result = await draftSystem.makePick(sessionId, turn.teamId, available.pokemon_name)
    if (!result.success) {
      console.error("Pick failed:", result.error)
      break
    }

    pickCount++
    const { data: team } = await supabase
      .from("teams")
      .select("name")
      .eq("id", turn.teamId)
      .single()
    const teamName = team?.name ?? turn.teamId
    console.log(`Pick #${result.pick?.pick_number ?? pickCount}: ${teamName} drafted ${available.pokemon_name} (${available.point_value} pts)`)
    await sendDiscordMessage(
      `Mock draft: Pick #${result.pick?.pick_number ?? pickCount} – ${teamName} drafted **${available.pokemon_name}** (${available.point_value} pts).`
    )

    const { data: updated } = await supabase
      .from("draft_sessions")
      .select("status")
      .eq("id", sessionId)
      .single()
    session = { ...session, status: updated?.status ?? session.status }
  }

  console.log("\nMock draft run finished. Picks made:", pickCount)
  await sendDiscordMessage(`Mock draft run finished. Picks made: ${pickCount}.`)
}

runMockDraft().catch((err) => {
  console.error(err)
  process.exit(1)
})
