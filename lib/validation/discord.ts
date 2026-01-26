/**
 * Phase 5.5: Discord Bot Endpoint Validation Schemas
 * Zod schemas for Discord bot API endpoints
 */

import { z } from "zod"

export const discordDraftPickSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID"),
  discord_user_id: z.string().min(1, "discord_user_id is required"),
  pokemon_id: z.string().uuid("pokemon_id must be a valid UUID"),
  draft_round: z.number().int().positive().optional().nullable(),
  pick_number: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type DiscordDraftPickInput = z.infer<typeof discordDraftPickSchema>

export const discordDraftStatusSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID").optional(),
  discord_user_id: z.string().min(1, "discord_user_id is required"),
  guild_id: z.string().min(1, "guild_id is required").optional(),
})

export type DiscordDraftStatusInput = z.infer<typeof discordDraftStatusSchema>

export const discordPokemonSearchSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID").optional(),
  guild_id: z.string().min(1, "guild_id is required").optional(),
  query: z.string().min(1, "query is required"),
  limit: z.number().int().positive().max(25).default(25),
  exclude_owned: z.boolean().default(true),
  discord_user_id: z.string().min(1, "discord_user_id is required").optional(),
})

export type DiscordPokemonSearchInput = z.infer<typeof discordPokemonSearchSchema>

export const discordGuildConfigGetSchema = z.object({
  guild_id: z.string().min(1, "guild_id is required"),
})

export type DiscordGuildConfigGetInput = z.infer<typeof discordGuildConfigGetSchema>

export const discordGuildConfigSetSchema = z.object({
  guild_id: z.string().min(1, "guild_id is required"),
  default_season_id: z.string().uuid("default_season_id must be a valid UUID"),
  admin_role_ids: z.array(z.string()).optional().default([]),
})

export type DiscordGuildConfigSetInput = z.infer<typeof discordGuildConfigSetSchema>

export const discordCoachWhoAmISchema = z.object({
  discord_user_id: z.string().min(1, "discord_user_id is required"),
  season_id: z.string().uuid("season_id must be a valid UUID").optional(),
})

export type DiscordCoachWhoAmIInput = z.infer<typeof discordCoachWhoAmISchema>

export const discordNotifyCoverageSchema = z.object({
  season_id: z.string().uuid("season_id must be a valid UUID"),
  team_id: z.string().uuid("team_id must be a valid UUID"),
  channel_id: z.string().min(1, "channel_id is required"),
  checks: z
    .array(
      z.enum([
        "hazard_removal",
        "hazard_setting",
        "cleric",
        "speed_control",
        "recovery",
        "phasing",
        "screens",
      ])
    )
    .min(1, "At least one check is required"),
  mention_role: z.string().optional().nullable(),
})

export type DiscordNotifyCoverageInput = z.infer<typeof discordNotifyCoverageSchema>
