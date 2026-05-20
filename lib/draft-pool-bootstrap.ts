/**
 * Cold-start draft pool setup when draft_pool and pokemon_master are empty.
 */

import { createServiceRoleClient } from "@/lib/supabase/service"
import {
  backfillPokemonMasterFromDraftPool,
  seedPokemonMasterFromCatalog,
  type BackfillPokemonMasterResult,
} from "@/lib/pokemon-master-backfill"
import { hydrateCatalogForBootstrap, type CatalogHydrateResult } from "@/lib/pokemon-catalog-hydrate"
import {
  seedDraftPoolFromShowdownTiers,
  type ShowdownTierRpcResult as SeedDraftPoolFromShowdownResult,
} from "@/lib/draft-pool-showdown-seed"
import { trimDraftPoolToGeneration as trimDraftPoolToGenerationImpl } from "@/lib/draft-pool-trim"

export type { SeedDraftPoolFromShowdownResult }
export { seedDraftPoolFromShowdownTiers }

export async function trimDraftPoolToGeneration(seasonId: string, generation: number): Promise<number> {
  const service = createServiceRoleClient()
  return trimDraftPoolToGenerationImpl(service, seasonId, generation)
}

export type BootstrapDraftPoolResult = {
  draft_pool_before: number
  draft_pool_after: number
  catalog?: CatalogHydrateResult
  showdown_seed?: SeedDraftPoolFromShowdownResult
  trimmed_removed?: number
  master: BackfillPokemonMasterResult
  master_source: "draft_pool" | "pokedex" | "none"
  ready_for_generate: boolean
  warning?: string
}

export async function bootstrapDraftPoolForSeason(options: {
  season_id: string
  generation?: number
}): Promise<BootstrapDraftPoolResult> {
  const generation = options.generation ?? 9
  const service = createServiceRoleClient()

  const catalog = await hydrateCatalogForBootstrap({ generation })

  const { count: before } = await service
    .from("draft_pool")
    .select("id", { count: "exact", head: true })
    .eq("season_id", options.season_id)

  const draft_pool_before = before ?? 0
  let showdown_seed: SeedDraftPoolFromShowdownResult | undefined
  let trimmed_removed = 0

  if (draft_pool_before === 0) {
    const unifiedCount = catalog.after.unified

    if (unifiedCount === 0) {
      return {
        draft_pool_before: 0,
        draft_pool_after: 0,
        catalog,
        master: {
          before_count: 0,
          after_count: 0,
          upserted: 0,
          skipped_no_dex: 0,
          source_entries: 0,
          draft_pool_rows_scanned: 0,
          generation_inferred: 0,
          dry_run: false,
          warning:
            "Pokédex catalog is empty after sync attempts. Check Admin → Sync (Showdown + PokeAPI) or deploy Edge Functions.",
        },
        master_source: "none",
        ready_for_generate: false,
        warning:
          catalog.warning ??
          "Cannot seed: pokemon_unified has no rows after catalog hydration.",
      }
    }

    showdown_seed = await seedDraftPoolFromShowdownTiers(options.season_id, {
      generation,
    })
    if (showdown_seed.error) {
      return {
        draft_pool_before: 0,
        draft_pool_after: 0,
        catalog,
        showdown_seed,
        master: {
          before_count: 0,
          after_count: 0,
          upserted: 0,
          skipped_no_dex: 0,
          source_entries: 0,
          draft_pool_rows_scanned: 0,
          generation_inferred: 0,
          dry_run: false,
        },
        master_source: "none",
        ready_for_generate: false,
        warning: `Showdown seed failed: ${showdown_seed.error}`,
      }
    }

    trimmed_removed = await trimDraftPoolToGenerationImpl(service, options.season_id, generation)
  }

  const { count: afterSeed } = await service
    .from("draft_pool")
    .select("id", { count: "exact", head: true })
    .eq("season_id", options.season_id)

  const draft_pool_after = afterSeed ?? 0

  let master = await backfillPokemonMasterFromDraftPool({
    season_id: options.season_id,
    default_generation: generation,
  })
  let master_source: BootstrapDraftPoolResult["master_source"] =
    master.upserted > 0 ? "draft_pool" : "none"

  if ((master.after_count ?? 0) === 0) {
    master = await seedPokemonMasterFromCatalog({ generation })
    master_source = master.upserted > 0 ? "pokedex" : "none"
  }

  const ready_for_generate = (master.after_count ?? 0) > 0

  let warning: string | undefined
  if (!ready_for_generate) {
    warning =
      master.warning ??
      "Registry still empty after bootstrap. Check pokemon_unified / pokemon_cache data."
  } else if (trimmed_removed > 0) {
    warning = `Removed ${trimmed_removed} non-Gen-${generation} rows from draft board after Showdown seed.`
  } else if (master.warning) {
    warning = master.warning
  }

  const warnings = [catalog.warning, warning].filter(Boolean)
  return {
    draft_pool_before,
    draft_pool_after,
    catalog,
    showdown_seed,
    trimmed_removed: trimmed_removed || undefined,
    master,
    master_source,
    ready_for_generate,
    warning: warnings.length ? warnings.join(" ") : undefined,
  }
}
