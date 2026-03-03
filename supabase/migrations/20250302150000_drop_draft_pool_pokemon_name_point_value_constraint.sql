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
--
-- Wrapped in DO block: this migration runs before draft_pool is created (20260112),
-- so we only alter if the table exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'draft_pool'
  ) THEN
    ALTER TABLE public.draft_pool
      DROP CONSTRAINT IF EXISTS draft_pool_pokemon_name_point_value_key;
  END IF;
END $$;

DROP INDEX IF EXISTS public.draft_pool_pokemon_name_point_value_key;
