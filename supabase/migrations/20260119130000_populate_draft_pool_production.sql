-- Migration: Populate draft_pool from sheets_draft_pool (Production Fix)
-- Date: 2026-01-19
-- Description: Populates draft_pool table with Pokemon from sheets_draft_pool for current season
-- 
-- This migration fixes the issue where draft_pool was empty in production.
-- The original migration 20260119120000 was missing the INSERT statement.
-- This migration is idempotent and safe to run multiple times.

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
