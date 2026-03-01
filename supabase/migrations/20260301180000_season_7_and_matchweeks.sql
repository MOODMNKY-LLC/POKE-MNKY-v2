-- Season 7 creation and matchweeks for go-live
-- Idempotent: safe to run multiple times (e.g. dev/staging)

-- 1. Ensure only one season can be current: clear all first
UPDATE public.seasons SET is_current = false WHERE is_current = true;

-- 2. Insert or update Season 7 (idempotent)
INSERT INTO public.seasons (
  name,
  season_id,
  start_date,
  end_date,
  is_current,
  draft_points_budget,
  roster_size_min,
  roster_size_max,
  updated_at
) VALUES (
  'Season 7',
  'AABPBL-Season-7-2027',
  '2027-01-01',
  '2027-04-30',
  true,
  120,
  8,
  10,
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  season_id = EXCLUDED.season_id,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_current = EXCLUDED.is_current,
  draft_points_budget = EXCLUDED.draft_points_budget,
  roster_size_min = EXCLUDED.roster_size_min,
  roster_size_max = EXCLUDED.roster_size_max,
  updated_at = EXCLUDED.updated_at;

-- Clear is_current again after upsert so only Season 7 is current
UPDATE public.seasons SET is_current = false WHERE name != 'Season 7';
UPDATE public.seasons SET is_current = true WHERE name = 'Season 7';

-- 3. Insert 10 regular-season matchweeks for Season 7 (idempotent)
-- Week 1 = 2027-01-04 to 2027-01-10, then 7-day blocks
INSERT INTO public.matchweeks (season_id, week_number, start_date, end_date, is_playoff)
SELECT
  s.id,
  w.week,
  ('2027-01-01'::date + ((w.week - 1) * 7))::date,
  ('2027-01-01'::date + ((w.week - 1) * 7) + 6)::date,
  false
FROM public.seasons s
CROSS JOIN (SELECT generate_series(1, 10) AS week) w
WHERE s.name = 'Season 7'
ON CONFLICT (season_id, week_number) DO UPDATE SET
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  is_playoff = EXCLUDED.is_playoff;
