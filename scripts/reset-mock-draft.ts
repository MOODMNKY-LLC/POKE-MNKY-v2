/**
 * Reset Mock Draft state: cancel active session, set all draft_pool rows for
 * mock season back to available, reset draft_budgets spent to 0.
 * Run after seed-mock-draft to get a fresh mock draft.
 *
 * Usage: pnpm exec tsx --env-file=.env.local scripts/reset-mock-draft.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createServiceRoleClient } from "../lib/supabase/service"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const MOCK_SEASON_NAME = "Mock Draft Demo"

async function resetMockDraft() {
  console.log("Resetting Mock Draft state...\n")
  const supabase = createServiceRoleClient()

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("name", MOCK_SEASON_NAME)
    .maybeSingle()

  if (!season) {
    console.log("Mock season not found; nothing to reset.")
    return
  }

  const seasonId = season.id

  const { data: sessions } = await supabase
    .from("draft_sessions")
    .select("id")
    .eq("season_id", seasonId)
    .in("status", ["active", "paused"])

  if (sessions?.length) {
    await supabase
      .from("draft_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("season_id", seasonId)
      .in("status", ["active", "paused"])
    console.log("Cancelled", sessions.length, "active/paused session(s).")
  }

  await supabase
    .from("draft_pool")
    .update({
      status: "available",
      drafted_by_team_id: null,
      drafted_at: null,
      draft_round: null,
      draft_pick_number: null,
      updated_at: new Date().toISOString(),
    })
    .eq("season_id", seasonId)
    .eq("status", "drafted")

  console.log("Reset draft_pool (drafted → available) for mock season.")

  const { data: budgets } = await supabase
    .from("draft_budgets")
    .select("id")
    .eq("season_id", seasonId)

  if (budgets?.length) {
    await supabase
      .from("draft_budgets")
      .update({
        spent_points: 0,
        remaining_points: 120,
        updated_at: new Date().toISOString(),
      })
      .eq("season_id", seasonId)
    console.log("Reset", budgets.length, "draft budget(s) to 0 spent.")
  }

  console.log("\nMock draft reset complete. Run seed-mock-draft.ts then run-mock-draft.ts for a fresh run.")
}

resetMockDraft().catch((err) => {
  console.error(err)
  process.exit(1)
})
