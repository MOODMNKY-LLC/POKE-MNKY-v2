-- Migration: Fix teams and coaches population
-- Purpose: Ensure all 20 teams are populated by creating seasons/conferences/divisions if needed
-- Date: 2026-01-19
-- 
-- This migration fixes the issue where only 2 teams were created because
-- conferences/divisions didn't exist. It ensures the full structure exists,
-- then inserts all 20 teams.

-- ============================================================================
-- 0. Ensure Season, Conferences, and Divisions Exist
-- ============================================================================

-- Create or update current season
-- First, set all seasons to not current
UPDATE seasons
SET is_current = false;

-- Then create/update Season 5 as current
INSERT INTO seasons (id, name, start_date, end_date, is_current)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Season 5',
  '2025-08-17'::date,
  '2025-12-31'::date,
  true
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_current = true;

-- Create conferences if they don't exist
INSERT INTO conferences (id, name, season_id)
SELECT 
  conf_data.id,
  conf_data.name,
  s.id AS season_id
FROM (
  VALUES
    ('00000000-0000-0000-0000-000000000010'::uuid, 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000011'::uuid, 'Leon Conference')
) AS conf_data(id, name)
CROSS JOIN (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
) s
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  season_id = EXCLUDED.season_id;

-- Create divisions if they don't exist
INSERT INTO divisions (id, name, conference_id, season_id)
SELECT 
  div_data.id,
  div_data.name,
  c.id AS conference_id,
  s.id AS season_id
FROM (
  VALUES
    ('00000000-0000-0000-0000-000000000020'::uuid, 'Kanto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000021'::uuid, 'Johto', 'Lance Conference'),
    ('00000000-0000-0000-0000-000000000022'::uuid, 'Hoenn', 'Leon Conference'),
    ('00000000-0000-0000-0000-000000000023'::uuid, 'Sinnoh', 'Leon Conference')
) AS div_data(id, name, conference_name)
CROSS JOIN (
  SELECT id FROM seasons WHERE is_current = true LIMIT 1
) s
LEFT JOIN conferences c ON c.season_id = s.id AND c.name = div_data.conference_name
WHERE c.id IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  conference_id = EXCLUDED.conference_id,
  season_id = EXCLUDED.season_id;

-- ============================================================================
-- 1. TEAMS - Insert all 20 Teams with Real Names and Coaches
-- ============================================================================

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
-- 3. DRAFT BUDGETS - Initialize 120 Points Per Team
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
  ELSE
    RAISE NOTICE 'Successfully created % teams', team_count;
  END IF;
  
  IF budget_count < 20 THEN
    RAISE WARNING 'Expected 20 draft budgets, found %', budget_count;
  ELSE
    RAISE NOTICE 'Successfully created % draft budgets', budget_count;
  END IF;
  
  RAISE NOTICE 'Migration complete: % teams, % coaches, % draft budgets for season %', 
    team_count, coach_count, budget_count, current_season_id;
END $$;
