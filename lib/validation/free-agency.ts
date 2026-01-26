/**
 * Phase 5.4: Free Agency Transaction Validation Schema
 * Zod schemas for free agency transaction endpoint validation
 */

import { z } from "zod"

export const freeAgencyTransactionSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID"),
  team_id: z.string().uuid("team_id must be a valid UUID"),
  drop_pokemon_id: z.string().uuid("drop_pokemon_id must be a valid UUID"),
  add_pokemon_id: z.string().uuid("add_pokemon_id must be a valid UUID"),
  notes: z.string().optional().nullable(),
})

export type FreeAgencyTransactionInput = z.infer<typeof freeAgencyTransactionSchema>
