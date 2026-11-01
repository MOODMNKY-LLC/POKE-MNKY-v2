import type { SupabaseClient } from "@supabase/supabase-js"
import { embeddedString, firstEmbedded } from "@/lib/embedded-record"
import type { FreeAgencyTransaction, TransactionType } from "@/lib/free-agency"

/** Sheet importer actions stored on transaction_audit. */
export const SHEET_FREE_AGENCY_ACTIONS = [
  "free_agency_add",
  "free_agency_add_drop",
  "drop",
  "free_agency_transaction",
] as const

export type SheetFreeAgencyAction = (typeof SHEET_FREE_AGENCY_ACTIONS)[number]

export type PublicFreeAgencyMove = {
  id: string
  season_id: string
  team_id: string
  team_name: string | null
  action: string
  added_name: string | null
  dropped_name: string | null
  effective_week: number | null
  created_at: string
}

type RelationError = { code?: string; message?: string } | null | undefined

export function isMissingRelation(error: RelationError): boolean {
  if (!error) return false
  if (error.code === "42P01" || error.code === "PGRST205") return true
  return /does not exist|could not find the table|could not find the relation/i.test(error.message ?? "")
}

export function transactionTypeForMove(add: string | null, drop: string | null): TransactionType {
  if (add && drop) return "replacement"
  if (drop) return "drop_only"
  return "addition"
}

export function readMoveNames(payload: unknown): {
  add: string | null
  drop: string | null
  effectiveWeek: number | null
} {
  const row = firstEmbedded(payload)
  const weekRaw = row?.effective_week_inferred
  const effectiveWeek =
    typeof weekRaw === "number" && Number.isInteger(weekRaw)
      ? weekRaw
      : typeof weekRaw === "string" && /^[0-9]+$/.test(weekRaw)
        ? Number(weekRaw)
        : null
  return {
    add: embeddedString(row, "add"),
    drop: embeddedString(row, "drop"),
    effectiveWeek,
  }
}

export function mapAuditRow(row: {
  id: string
  season_id: string
  team_id: string
  action: string
  payload: unknown
  created_at: string
  team?: unknown
}): FreeAgencyTransaction {
  const names = readMoveNames(row.payload)
  const teamName = embeddedString(firstEmbedded(row.team), "name")
  return {
    id: row.id,
    team_id: row.team_id,
    season_id: row.season_id,
    transaction_type: transactionTypeForMove(names.add, names.drop),
    added_pokemon_id: null,
    dropped_pokemon_id: null,
    added_points: 0,
    dropped_points: 0,
    status: "processed",
    processed_at: row.created_at,
    created_at: row.created_at,
    created_by: null,
    added_pokemon_name: names.add,
    dropped_pokemon_name: names.drop,
    team_name: teamName,
    effective_week: names.effectiveWeek,
  }
}

export function toPublicMove(row: {
  id: string
  season_id: string
  team_id: string
  action: string
  payload?: unknown
  created_at: string
  team_name?: string | null
  team?: unknown
  added_name?: string | null
  dropped_name?: string | null
  effective_week?: number | null
}): PublicFreeAgencyMove {
  const names = row.payload ? readMoveNames(row.payload) : { add: null, drop: null, effectiveWeek: null }
  return {
    id: row.id,
    season_id: row.season_id,
    team_id: row.team_id,
    team_name: row.team_name ?? embeddedString(firstEmbedded(row.team), "name"),
    action: row.action,
    added_name: row.added_name ?? names.add,
    dropped_name: row.dropped_name ?? names.drop,
    effective_week: row.effective_week ?? names.effectiveWeek,
    created_at: row.created_at,
  }
}

/**
 * Public free-agency rows for a season. Prefers the column-limited view.
 * Falls back to an explicit transaction_audit select that never asks for
 * actor_discord_id or actor_user_id.
 */
export async function listPublicFreeAgency(
  supabase: SupabaseClient,
  seasonId: string,
  teamId?: string,
): Promise<PublicFreeAgencyMove[]> {
  let viewQuery = supabase
    .from("v_public_free_agency")
    .select(
      "id, season_id, team_id, team_name, action, added_name, dropped_name, effective_week, created_at",
    )
    .eq("season_id", seasonId)
    .order("created_at", { ascending: false })
  if (teamId) viewQuery = viewQuery.eq("team_id", teamId)

  const view = await viewQuery
  if (!view.error) {
    return (view.data ?? []).map((row) => toPublicMove(row))
  }
  if (!isMissingRelation(view.error)) {
    console.error("[free-agency] public view error:", view.error.message)
    return []
  }

  let auditQuery = supabase
    .from("transaction_audit")
    .select("id, season_id, team_id, action, payload, created_at, team:team_id(name)")
    .eq("season_id", seasonId)
    .in("action", [...SHEET_FREE_AGENCY_ACTIONS])
    .order("created_at", { ascending: false })
  if (teamId) auditQuery = auditQuery.eq("team_id", teamId)

  const audit = await auditQuery
  if (audit.error) {
    console.error("[free-agency] transaction_audit error:", audit.error.message)
    return []
  }
  return (audit.data ?? []).map((row) => toPublicMove(row))
}
