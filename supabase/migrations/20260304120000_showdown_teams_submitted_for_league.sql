-- User-submitted teams for coach assignment: flag and notes
-- Plan: User-Submitted Teams for Coach Assignment

ALTER TABLE public.showdown_teams
  ADD COLUMN IF NOT EXISTS submitted_for_league_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_showdown_teams_submitted_for_league_at
  ON public.showdown_teams(submitted_for_league_at)
  WHERE submitted_for_league_at IS NOT NULL;

COMMENT ON COLUMN public.showdown_teams.submitted_for_league_at IS 'When set, user has flagged this team for league submission; commissioner can run compliance and assign.';
COMMENT ON COLUMN public.showdown_teams.submission_notes IS 'Optional note from user to commissioner when submitting for league.';
