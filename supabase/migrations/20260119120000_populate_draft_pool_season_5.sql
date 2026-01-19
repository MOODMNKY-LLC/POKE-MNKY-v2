-- Migration: Populate draft_pool from sheets_draft_pool for Season 5
-- Date: 2026-01-19
-- Description: Initial population of draft_pool table with Pokemon from sheets_draft_pool for Season 5
-- 
-- This migration populates draft_pool in production (seed.sql handles it locally).
-- Both use the same INSERT logic for consistency.

-- Step 1: Populate draft_pool from sheets_draft_pool for current season
INSERT INTO draft_pool (
    pokemon_name,
    point_value,
    pokemon_id,
    season_id,
    status,
    created_at,
    updated_at
)
SELECT 
    sdp.pokemon_name,
    sdp.point_value,
    sdp.pokemon_id,  -- May be NULL, which is fine
    s.id as season_id,
    CASE 
        WHEN sdp.is_available = true THEN 'available'::draft_pool_status
        ELSE 'unavailable'::draft_pool_status
    END as status,
    now() as created_at,
    now() as updated_at
FROM sheets_draft_pool sdp
CROSS JOIN (
    SELECT id FROM seasons WHERE is_current = true LIMIT 1
) s
WHERE sdp.is_available = true  -- Only populate available Pokemon initially
ON CONFLICT (season_id, pokemon_name) 
WHERE season_id IS NOT NULL
DO UPDATE SET
    point_value = EXCLUDED.point_value,
    pokemon_id = COALESCE(EXCLUDED.pokemon_id, draft_pool.pokemon_id),
    status = EXCLUDED.status,
    updated_at = now();

-- Step 2: Add comment explaining the population
COMMENT ON TABLE draft_pool IS 
'Draft pool for Pokemon available to be drafted. Populated from sheets_draft_pool for each season. '
'Status tracks availability: available, drafted, banned, unavailable. '
'Draft metadata (drafted_by_team_id, drafted_at, draft_round, draft_pick_number) is denormalized for performance.';

-- Step 3: Verify population
DO $$
DECLARE
    v_count INTEGER;
    v_season_id UUID;
BEGIN
    -- Get current season ID
    SELECT id INTO v_season_id FROM seasons WHERE is_current = true LIMIT 1;
    
    IF v_season_id IS NULL THEN
        RAISE WARNING 'No current season found. Population may be incomplete.';
    ELSE
        -- Count Pokemon in draft_pool for current season
        SELECT COUNT(*) INTO v_count 
        FROM draft_pool 
        WHERE season_id = v_season_id;
        
        RAISE NOTICE 'Populated % Pokemon into draft_pool for Season 5 (season_id: %)', v_count, v_season_id;
    END IF;
END $$;
