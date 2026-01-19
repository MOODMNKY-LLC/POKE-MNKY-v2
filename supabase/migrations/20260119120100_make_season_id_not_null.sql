-- Migration: Make season_id NOT NULL in draft_pool
-- Date: 2026-01-19
-- Description: After populating season_id for all rows, make it NOT NULL and replace partial index with full constraint

-- Step 1: Verify all rows have season_id (safety check)
DO $$
DECLARE
    v_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_null_count 
    FROM draft_pool 
    WHERE season_id IS NULL;
    
    IF v_null_count > 0 THEN
        RAISE EXCEPTION 'Cannot make season_id NOT NULL: % rows have NULL season_id', v_null_count;
    END IF;
    
    RAISE NOTICE 'All rows have season_id populated. Proceeding with NOT NULL constraint.';
END $$;

-- Step 2: Make season_id NOT NULL
ALTER TABLE draft_pool 
ALTER COLUMN season_id SET NOT NULL;

-- Step 3: Replace partial unique index with full unique constraint
-- Drop the partial index
DROP INDEX IF EXISTS draft_pool_season_pokemon_unique_partial;

-- Create full unique constraint
ALTER TABLE draft_pool
ADD CONSTRAINT IF NOT EXISTS draft_pool_season_pokemon_unique
UNIQUE (season_id, pokemon_name);

-- Step 4: Add comment
COMMENT ON CONSTRAINT draft_pool_season_pokemon_unique ON draft_pool IS 
'Ensures each Pokemon can only appear once per season in the draft pool.';
