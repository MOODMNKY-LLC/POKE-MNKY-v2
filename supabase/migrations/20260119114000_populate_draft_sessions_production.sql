-- Migration: Populate draft_sessions for Production (Optional)
-- Purpose: Create a draft session in 'pending' status for production testing
-- 
-- This migration creates a draft session that can be activated for testing
-- draft flow in production. The session starts in 'pending' status and can
-- be updated to 'active' when ready to start the draft.
-- 
-- Idempotent: Uses ON CONFLICT DO UPDATE to handle re-runs safely
-- Generated: 2026-01-19T11:40:00.000Z
--
-- Note: This is optional - only create if you want a draft session ready in production
-- You can also create draft sessions on-demand via API/UI

-- ============================================================================
-- DRAFT SESSIONS - Create pending draft session for Season 5
-- ============================================================================

INSERT INTO draft_sessions (
  id,
  season_id,
  session_name,
  status,
  draft_type,
  total_teams,
  total_rounds,
  current_pick_number,
  current_round,
  turn_order,
  pick_time_limit_seconds,
  auto_draft_enabled
)
SELECT 
  '00000000-0000-0000-0000-000000000200'::uuid AS id,
  s.id AS season_id,
  'Season 5 Draft' AS session_name,
  'pending' AS status,  -- Change to 'active' when ready to start draft
  'snake' AS draft_type,
  20 AS total_teams,
  11 AS total_rounds,
  1 AS current_pick_number,
  1 AS current_round,
  (
    SELECT jsonb_agg(id ORDER BY 
      CASE 
        WHEN division = 'Kanto' THEN 1
        WHEN division = 'Johto' THEN 2
        WHEN division = 'Hoenn' THEN 3
        WHEN division = 'Sinnoh' THEN 4
      END,
      name
    )
    FROM teams
    WHERE season_id = s.id
  ) AS turn_order,
  45 AS pick_time_limit_seconds,
  false AS auto_draft_enabled
FROM seasons s
WHERE s.is_current = true
LIMIT 1
ON CONFLICT (id) DO UPDATE
SET 
  status = EXCLUDED.status,
  current_pick_number = EXCLUDED.current_pick_number,
  current_round = EXCLUDED.current_round,
  turn_order = EXCLUDED.turn_order,
  updated_at = now();

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count
  FROM draft_sessions
  WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1);
  
  IF session_count > 0 THEN
    RAISE NOTICE 'Draft session created: % session(s) for current season', session_count;
  ELSE
    RAISE WARNING 'No draft session created - check if current season exists';
  END IF;
END $$;
