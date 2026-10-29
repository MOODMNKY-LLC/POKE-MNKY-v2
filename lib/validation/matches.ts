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
  season_id: z
    .string()
    .optional()
    .transform((s) => {
      if (s === undefined || s.trim() === "") return undefined
      return s.trim()
    })
    .refine((s) => s === undefined || z.string().uuid().safeParse(s).success, {
      message: "season_id must be a uuid",
    }),
})

export type GetMatchesQuery = z.infer<typeof getMatchesQuerySchema>
