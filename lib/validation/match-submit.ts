import { z } from "zod"

export const matchSubmitBodySchema = z
  .object({
    week: z.number().int().min(1),
    team1_id: z.string().uuid(),
    team2_id: z.string().uuid(),
    winner_id: z.string().uuid(),
    team1_score: z.number().int().min(0),
    team2_score: z.number().int().min(0),
    differential: z.number().int().min(0).optional(),
    replay_url: z.string().max(2048).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    season_id: z.string().uuid().optional(),
    match_id: z.string().uuid().optional(),
  })
  .refine((d) => d.team1_id !== d.team2_id, {
    message: "team1_id and team2_id must differ",
  })
  .refine(
    (d) => d.winner_id === d.team1_id || d.winner_id === d.team2_id,
    { message: "winner_id must be team1_id or team2_id" }
  )

export type MatchSubmitBody = z.infer<typeof matchSubmitBodySchema>
