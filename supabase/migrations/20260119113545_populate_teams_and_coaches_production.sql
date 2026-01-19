-- Migration: Populate teams and coaches for Production
-- Generated from Google Sheets Team Pages
-- Purpose: Seed teams and coaches tables in production (seed.sql is local-only)
-- 
-- This migration contains INSERT statements for:
-- 1. Teams (20 teams with real names and coaches from Google Sheets)
-- 2. Coaches (populated from team coach names)
-- 3. Draft budgets (120 points per team)
-- 
-- Idempotent: Uses ON CONFLICT DO UPDATE to handle re-runs safely
-- Total Teams: 20
-- Generated: 2026-01-19T11:35:45.000Z
-- Source: Google Sheets Team Pages (A2:B2 = team name, A4:B4 = coach name)
--
-- Note: Uses dynamic lookups for season_id, conference_id, and division_id
-- Works with whatever season is marked as current in production

-- ============================================================================
-- 1. TEAMS - 20 Teams with Real Names and Coaches from Google Sheets
-- ============================================================================
-- Uses dynamic lookups to find current season, conferences, and divisions

INSERT INTO teams (id, name, coach_name, division, conference, season_id, division_id)
SELECT 
  team_data.id,
  team_data.name,
  team_data.coach_name,
  team_data.division,
  team_data.conference,
  s.id AS season_id,
  d.id AS division_id
FROM (
  VALUES
    ('00000000-0000-0000-0000-000000000100'::uuid, 'Arkansas Fighting Hogs', 'Jordan', 'Kanto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000101'::uuid, 'Leicester Lycanrocs', 'Bok Choy', 'Kanto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'Miami Blazins', 'Ary', 'Kanto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'Daycare Dittos', 'PokeGoat', 'Kanto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'Grand Rapids Garchomp', 'Matt', 'Kanto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'Boise State Mudsdales', 'Fouster', 'Johto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000106'::uuid, 'ToneBone Troublemakers', 'Tony', 'Johto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000107'::uuid, 'Tegucigalpa Dragonites', 'Gabe', 'Johto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000108'::uuid, 'Team 9', 'Dandelion', 'Johto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000109'::uuid, 'Montana Meganiums', 'Krampe', 'Johto', 'Lance Conference'),
    ('00000000-0000-0000-0000-00000000010a'::uuid, 'Liverpool Lunalas', 'Harry', 'Hoenn', 'Leon Conference'),
    ('00000000-0000-0000-0000-00000000010b'::uuid, 'Manchester Milcerys', 'ShameWall', 'Hoenn', 'Leon Conference'),
    ('00000000-0000-0000-0000-00000000010c'::uuid, 'Garden City Grimmsnarl', 'Bryce', 'Hoenn', 'Leon Conference'),
    ('00000000-0000-0000-0000-00000000010d'::uuid, 'Team 14', 'Simeon (Mod)', 'Hoenn', 'Leon Conference'),
    ('00000000-0000-0000-0000-00000000010e'::uuid, 'South Bend Snowflakes', 'Pup', 'Hoenn', 'Leon Conference'),
    ('00000000-0000-0000-0000-00000000010f'::uuid, 'Jackson Jigglies', 'Mark', 'Sinnoh', 'Leon Conference'),
    ('00000000-0000-0000-0000-000000000110'::uuid, 'Detroit Drakes', 'Zach', 'Sinnoh', 'Leon Conference'),
    ('00000000-0000-0000-0000-000000000111'::uuid, 'Krazy Kecleons', 'Bfarias', 'Sinnoh', 'Leon Conference'),
    ('00000000-0000-0000-0000-000000000112'::uuid, 'Rockslide Rebels', 'DevXP', 'Sinnoh', 'Leon Conference'),
    ('00000000-0000-0000-0000-000000000113'::uuid, 'Kalamazoo Kangaskhans', 'Andy W', 'Sinnoh', 'Leon Conference')
) AS team_data(id, name, coach_name, division, conference)
CROSS JOIN (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
) s
LEFT JOIN conferences c ON c.season_id = s.id AND c.name = team_data.conference
LEFT JOIN divisions d ON d.season_id = s.id AND d.name = team_data.division AND d.conference_id = c.id
WHERE s.id IS NOT NULL
  AND c.id IS NOT NULL
  AND d.id IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  coach_name = EXCLUDED.coach_name,
  division = EXCLUDED.division,
  conference = EXCLUDED.conference,
  season_id = EXCLUDED.season_id,
  division_id = EXCLUDED.division_id;

-- ============================================================================
-- 2. COACHES - Populate coaches table from team coach names
-- ============================================================================
-- Optional: Only needed if teams.coach_id is used
-- Currently teams use coach_name text field, but coaches table exists
-- ============================================================================

INSERT INTO coaches (id, display_name, email, user_id)
SELECT DISTINCT ON (t.coach_name)
  gen_random_uuid() AS id,
  t.coach_name AS display_name,
  NULL AS email,
  NULL AS user_id
FROM teams t
WHERE t.season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
  AND t.coach_name IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. DRAFT BUDGETS - Initialize 120 Points Per Team (Season 5)
-- ============================================================================

INSERT INTO draft_budgets (team_id, season_id, total_points, spent_points)
SELECT 
  t.id AS team_id,
  s.id AS season_id,
  120 AS total_points,
  0 AS spent_points
FROM teams t
CROSS JOIN (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
) s
WHERE t.season_id = s.id
ON CONFLICT (team_id, season_id) DO UPDATE
SET 
  total_points = EXCLUDED.total_points,
  spent_points = EXCLUDED.spent_points;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  team_count INTEGER;
  coach_count INTEGER;
  budget_count INTEGER;
  current_season_id UUID;
BEGIN
  -- Get current season ID
  SELECT id INTO current_season_id
  FROM seasons
  WHERE is_current = true
  LIMIT 1;
  
  IF current_season_id IS NULL THEN
    RAISE WARNING 'No current season found - teams may not have been created';
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO team_count
  FROM teams
  WHERE season_id = current_season_id;
  
  SELECT COUNT(*) INTO coach_count
  FROM coaches;
  
  SELECT COUNT(*) INTO budget_count
  FROM draft_budgets
  WHERE season_id = current_season_id;
  
  IF team_count < 20 THEN
    RAISE WARNING 'Expected 20 teams, found %', team_count;
  END IF;
  
  IF budget_count < 20 THEN
    RAISE WARNING 'Expected 20 draft budgets, found %', budget_count;
  END IF;
  
  RAISE NOTICE 'Migration complete: % teams, % coaches, % draft budgets for season %', 
    team_count, coach_count, budget_count, current_season_id;
END $$;
