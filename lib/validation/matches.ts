/**
 * POKE MNKY v3: Matches API validation schemas
 */

import { z } from "zod"

/** Query params for GET /api/matches */
export const getMatchesQuerySchema = z.object({
  week: z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined || s === "") return undefined
      const n = parseInt(s, 10)
      return Number.isNaN(n) ? undefined : n
    })
    .refine((n) => n === undefined || (Number.isInteger(n) && n >= 1), {
      message: "week must be a positive integer",
    }),
})

export type GetMatchesQuery = z.infer<typeof getMatchesQuerySchema>
