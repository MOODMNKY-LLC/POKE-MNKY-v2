-- Season regular season + playoff week counts for in-app season wizard

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS regular_season_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS playoff_weeks INTEGER;

COMMENT ON COLUMN public.seasons.regular_season_weeks IS 'Regular season matchweek count for this season';
COMMENT ON COLUMN public.seasons.playoff_weeks IS 'Playoff matchweek count for this season';
