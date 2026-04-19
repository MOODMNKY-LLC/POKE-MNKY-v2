/**
 * POKE MNKY v3: Matches API validation schemas
 */

import { z } from "zod"

/** Query params for GET /api/matches */
export const getMatchesQuerySchema = z.object({
  week: z
    .string()
    .optional()
    .refine(
      (s) => s === undefined || s === "" || /^-?\d+$/.test(s),
      { message: "week must be a numeric string" }
    )
    .transform((s) => {
      if (s === undefined || s === "") return undefined
      return parseInt(s, 10)
    })
    .refine((n) => n === undefined || (Number.isInteger(n) && n >= 1), {
      message: "week must be a positive integer",
    }),
})

export type GetMatchesQuery = z.infer<typeof getMatchesQuerySchema>
