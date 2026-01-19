-- FUTURE MIGRATION: Drop is_available column
-- Migration: Phase 1.4 - Remove legacy is_available column (DO NOT RUN YET)
-- Purpose: Remove the old is_available boolean column after verification period
--
-- ⚠️  WARNING: DO NOT RUN THIS MIGRATION UNTIL AFTER VERIFICATION PERIOD (1-2 weeks)
-- 
-- Prerequisites:
-- 1. All application code must use 'status' enum (✅ Complete)
-- 2. All server-side code must use 'status' enum (✅ Complete)
-- 3. Verification period of 1-2 weeks with no issues
-- 4. No remaining references to is_available in codebase
--
-- This migration should be run after:
-- - Confirming all queries use status enum
-- - Verifying no production issues
-- - Checking that parser scripts are updated (or acceptable to keep is_available for one-time imports)

-- Step 1: Drop index on is_available (if exists)
DROP INDEX IF EXISTS public.idx_draft_pool_is_available;
DROP INDEX IF EXISTS public.idx_draft_pool_available;

-- Step 2: Drop the is_available column
-- This is a destructive operation - ensure backups are taken
ALTER TABLE public.draft_pool 
  DROP COLUMN IF EXISTS is_available;

-- Step 3: Update any functions that reference is_available
-- Note: Check get_pokemon_by_tier function in enhance_draft_tracking migration
-- This function may need to be updated to use status instead of is_available
-- 
-- Example update (uncomment when ready):
-- CREATE OR REPLACE FUNCTION get_pokemon_by_tier(tier_points INTEGER)
-- RETURNS TABLE (
--   pokemon_name TEXT,
--   point_value INTEGER,
--   generation INTEGER,
--   pokemon_cache_id INTEGER
-- ) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT 
--     dp.pokemon_name,
--     dp.point_value,
--     dp.generation,
--     pc.pokemon_id as pokemon_cache_id
--   FROM draft_pool dp
--   LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
--   WHERE dp.point_value = tier_points
--     AND dp.status = 'available'::public.draft_pool_status  -- Updated to use status
--   ORDER BY dp.pokemon_name;
-- END;
-- $$ LANGUAGE plpgsql;

-- Add comment documenting the removal
COMMENT ON TABLE public.draft_pool IS 'Stores the complete list of Pokemon available for drafting with their point values. Uses status enum (available, drafted, banned, unavailable) instead of is_available boolean.';
