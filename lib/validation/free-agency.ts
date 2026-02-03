/**
 * Phase 5.4: Free Agency Transaction Validation Schema
 * Zod schemas for free agency transaction endpoint validation
 */

import { z } from "zod"

/** Replacement (drop + add) – used with rpc_free_agency_transaction */
export const freeAgencyReplacementSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID"),
  team_id: z.string().uuid("team_id must be a valid UUID"),
  drop_pokemon_id: z.string().uuid("drop_pokemon_id must be a valid UUID"),
  add_pokemon_id: z.string().uuid("add_pokemon_id must be a valid UUID"),
  notes: z.string().optional().nullable(),
})

/** Legacy: transaction_type + added_pokemon_id / dropped_pokemon_id (addition, drop_only, replacement) */
export const freeAgencyTransactionSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID"),
  team_id: z.string().uuid("team_id must be a valid UUID"),
  transaction_type: z.enum(["replacement", "addition", "drop_only"]),
  added_pokemon_id: z.string().uuid().optional().nullable(),
  dropped_pokemon_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.transaction_type === "replacement") return !!data.added_pokemon_id && !!data.dropped_pokemon_id
    if (data.transaction_type === "addition") return !!data.added_pokemon_id
    if (data.transaction_type === "drop_only") return !!data.dropped_pokemon_id
    return false
  },
  { message: "replacement needs both added_pokemon_id and dropped_pokemon_id; addition needs added_pokemon_id; drop_only needs dropped_pokemon_id" }
)

export type FreeAgencyReplacementInput = z.infer<typeof freeAgencyReplacementSchema>
export type FreeAgencyTransactionInput = z.infer<typeof freeAgencyTransactionSchema>
