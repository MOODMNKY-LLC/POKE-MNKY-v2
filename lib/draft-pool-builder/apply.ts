import type { SupabaseClient } from "@supabase/supabase-js"
import { norm } from "@/lib/draft-pool-builder/normalize"
import type { ImportPlan } from "@/lib/draft-pool-builder/types"

export interface ApplyPendingOptions {
  supabase: SupabaseClient
  seasonId: string
  plan: ImportPlan
  /** auth.users id recorded on the version row (optional). */
  actorUserId?: string | null
  notes?: string
  /**
   * When true, upsert draft_pool_sheet_aliases from plan entry match metadata.
   * pokemon_id is only written when resolved (never guessed).
   */
  seedAliases?: boolean
}

export interface ApplyPendingResult {
  versionId: string
  entriesInserted: number
  restrictionsInserted: number
  aliasesUpserted: number
  catalogOnlySkipped: number
}

/**
 * Write the import plan as the single pending revision for a season.
 * Uses rpc_apply_draft_pool_pending_import so archive + inserts are atomic.
 * Does NOT touch draft_pool / season_draft_pool / published versions.
 */
export async function applyPendingRevision(
  opts: ApplyPendingOptions,
): Promise<ApplyPendingResult> {
  const { supabase, seasonId, plan } = opts

  const entries = plan.entries.map((e) => ({
    pokemon_id: e.pokemonId,
    sheet_name: e.displayName,
    points: e.points,
    status: e.status,
    tera_banned: e.teraBanned,
    sort_order: e.sortOrder,
  }))

  const byName = new Map(plan.entries.map((e) => [norm(e.displayName), e]))
  const restrictions = plan.restrictions.map((r) => {
    const hit = r.sheetName ? byName.get(norm(r.sheetName)) : undefined
    return {
      pokemon_id: hit?.pokemonId ?? null,
      sheet_name: r.sheetName,
      kind: r.kind,
      name: r.name,
      note: r.note,
    }
  })

  const aliases =
    opts.seedAliases === false
      ? []
      : plan.entries.map((e) => ({
          sheet_name: e.displayName,
          sheet_slug: e.slug,
          pokemon_id: e.pokemonId,
          match_kind: e.matchKind,
          notes: e.source,
        }))

  const catalogOnly = plan.catalogOnlyRegionals.map((r) => ({
    pokemon_id: r.pokemonId,
    sheet_name: r.displayName,
    sheet_slug: r.slug,
    reason: r.reason,
  }))

  const { data, error } = await supabase.rpc(
    "rpc_apply_draft_pool_pending_import",
    {
      p_season_id: seasonId,
      p_entries: entries,
      p_restrictions: restrictions,
      p_aliases: aliases,
      p_catalog_only: catalogOnly,
      p_actor: opts.actorUserId ?? null,
      p_notes:
        opts.notes ??
        "Phase-1 sheet import (pending). Not wired to live draft board yet.",
    },
  )

  if (error) throw error

  const result = (data ?? {}) as {
    version_id?: string
    entries_inserted?: number
    restrictions_inserted?: number
    aliases_upserted?: number
    catalog_only_skipped?: number
  }

  if (!result.version_id) {
    throw new Error("rpc_apply_draft_pool_pending_import returned no version_id")
  }

  return {
    versionId: result.version_id,
    entriesInserted: result.entries_inserted ?? entries.length,
    restrictionsInserted: result.restrictions_inserted ?? restrictions.length,
    aliasesUpserted: result.aliases_upserted ?? aliases.length,
    catalogOnlySkipped:
      result.catalog_only_skipped ??
      catalogOnly.filter((r) => r.pokemon_id == null).length,
  }
}
