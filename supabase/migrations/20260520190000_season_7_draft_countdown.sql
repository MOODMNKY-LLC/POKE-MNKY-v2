-- Homepage countdown: Season 7 draft Aug 15, 2026 at 2:00 PM America/Chicago (CDT → 19:00 UTC)

UPDATE public.seasons
SET
  draft_open_at = '2026-08-15T19:00:00+00'::timestamptz,
  updated_at = NOW()
WHERE name = 'Season 7';
