-- Drop draft_pool_pokemon_name_point_value_key unique index
--
-- Purpose: The unique index on (pokemon_name, point_value) without season_id
-- prevents multi-season draft pools. The same Pokemon at the same point value
-- can legitimately exist in different seasons (e.g. Pikachu at 10 pts in S1 and S2).
--
-- Affected: draft_pool table
-- Removes: draft_pool_pokemon_name_point_value_key (pokemon_name, point_value)
-- Keeps: draft_pool_season_pokemon_unique (season_id, pokemon_name)
--        idx_draft_pool_season_pokemon_point (season_id, pokemon_name, point_value)
--
-- This was causing "duplicate key value violates unique constraint" errors
-- when syncing Notion drafts to Supabase for a new season.

-- Try constraint first (some setups use it), then index
alter table public.draft_pool
  drop constraint if exists draft_pool_pokemon_name_point_value_key;

drop index if exists public.draft_pool_pokemon_name_point_value_key;
