/**
 * Phase 5.3: Draft Pick Validation Schema
 * Zod schemas for draft pick endpoint validation
 */

import { z } from "zod"

export const draftPickSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID"),
  team_id: z.string().uuid("team_id must be a valid UUID"),
  pokemon_id: z.string().uuid("pokemon_id must be a valid UUID"),
  acquisition: z.enum(["draft", "free_agency", "trade", "waiver"], {
    errorMap: () => ({
      message: "acquisition must be one of: draft, free_agency, trade, waiver",
    }),
  }),
  draft_round: z.number().int().positive().optional().nullable(),
  pick_number: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type DraftPickInput = z.infer<typeof draftPickSchema>
