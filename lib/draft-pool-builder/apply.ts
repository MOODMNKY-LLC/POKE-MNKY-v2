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
 * Replaces any existing pending version for that season (archived first).
 * Does NOT touch draft_pool / season_draft_pool / published versions.
 */
export async function applyPendingRevision(
  opts: ApplyPendingOptions,
): Promise<ApplyPendingResult> {
  const { supabase, seasonId, plan } = opts

  const { data: existingPending, error: pendingErr } = await supabase
    .from("draft_pool_versions")
    .select("id")
    .eq("season_id", seasonId)
    .eq("status", "pending")
    .maybeSingle()

  if (pendingErr) throw pendingErr

  if (existingPending?.id) {
    const { error: archiveErr } = await supabase
      .from("draft_pool_versions")
      .update({
        status: "archived",
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notes: "Archived by draft-pool importer before replacing pending revision",
      })
      .eq("id", existingPending.id)
    if (archiveErr) throw archiveErr
  }

  const { data: version, error: versionErr } = await supabase
    .from("draft_pool_versions")
    .insert({
      season_id: seasonId,
      status: "pending",
      created_by: opts.actorUserId ?? null,
      submitted_by: opts.actorUserId ?? null,
      submitted_at: new Date().toISOString(),
      notes:
        opts.notes ??
        "Phase-1 sheet import (pending). Not wired to live draft board yet.",
    })
    .select("id")
    .single()

  if (versionErr) throw versionErr
  const versionId = version.id as string

  const entryRows = plan.entries.map((e) => ({
    version_id: versionId,
    pokemon_id: e.pokemonId,
    sheet_name: e.displayName,
    points: e.points,
    status: e.status,
    tera_banned: e.teraBanned,
    sort_order: e.sortOrder,
  }))

  // Insert in chunks to stay under PostgREST payload limits
  const chunkSize = 200
  let entriesInserted = 0
  for (let i = 0; i < entryRows.length; i += chunkSize) {
    const chunk = entryRows.slice(i, i + chunkSize)
    const { error } = await supabase.from("draft_pool_version_entries").insert(chunk)
    if (error) throw error
    entriesInserted += chunk.length
  }

  // Resolve restriction sheet names → pokemon_id from plan entries when possible
  const byName = new Map(plan.entries.map((e) => [norm(e.displayName), e]))
  const restrictionRows = plan.restrictions.map((r) => {
    const hit = r.sheetName ? byName.get(norm(r.sheetName)) : undefined
    return {
      version_id: versionId,
      pokemon_id: hit?.pokemonId ?? null,
      sheet_name: r.sheetName,
      kind: r.kind,
      name: r.name,
      note: r.note,
    }
  })

  const { error: restErr } = await supabase
    .from("season_pokemon_restrictions")
    .insert(restrictionRows)
  if (restErr) throw restErr

  let aliasesUpserted = 0
  if (opts.seedAliases !== false) {
    const aliasRows = plan.entries.map((e) => ({
      sheet_name: e.displayName,
      sheet_slug: e.slug,
      pokemon_id: e.pokemonId,
      match_kind: e.matchKind,
      notes: e.source,
      updated_at: new Date().toISOString(),
    }))
    for (let i = 0; i < aliasRows.length; i += chunkSize) {
      const chunk = aliasRows.slice(i, i + chunkSize)
      const { error } = await supabase
        .from("draft_pool_sheet_aliases")
        .upsert(chunk, { onConflict: "sheet_name" })
      if (error) throw error
      aliasesUpserted += chunk.length
    }
  }

  // Catalog-only regionals: only insert when pokemon_id is already known.
  // Missing catalog rows are left for a later hydrate step (never invent ids).
  let catalogOnlySkipped = 0
  for (const r of plan.catalogOnlyRegionals) {
    if (r.pokemonId == null) {
      catalogOnlySkipped++
      continue
    }
    const { error } = await supabase.from("pokemon_catalog_index_only").upsert(
      {
        pokemon_id: r.pokemonId,
        sheet_name: r.displayName,
        sheet_slug: r.slug,
        reason: r.reason,
      },
      { onConflict: "pokemon_id" },
    )
    if (error) throw error
  }

  return {
    versionId,
    entriesInserted,
    restrictionsInserted: restrictionRows.length,
    aliasesUpserted,
    catalogOnlySkipped,
  }
}
