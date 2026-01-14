-- Migration: Add stock teams flag and user tagging support
-- Stock teams are pre-loaded teams available to all users
-- Users can tag their own teams for organization

-- Add is_stock flag to mark stock/pre-loaded teams
ALTER TABLE public.showdown_teams 
ADD COLUMN IF NOT EXISTS is_stock BOOLEAN DEFAULT FALSE;

-- Add user_tags for user-defined tags (separate from system tags)
ALTER TABLE public.showdown_teams 
ADD COLUMN IF NOT EXISTS user_tags TEXT[] DEFAULT '{}';

-- Add index for stock teams queries
CREATE INDEX IF NOT EXISTS idx_showdown_teams_is_stock 
ON public.showdown_teams(is_stock) 
WHERE is_stock = TRUE;

-- Update RLS policy to allow viewing stock teams
DROP POLICY IF EXISTS "Users can view own teams" ON public.showdown_teams;
CREATE POLICY "Users can view own teams and stock teams"
  ON public.showdown_teams
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      -- User's own teams
      coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()) OR
      team_id IN (SELECT id FROM public.teams WHERE coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid())) OR
      -- Stock teams (available to all authenticated users)
      (is_stock = TRUE AND auth.uid() IS NOT NULL)
    )
  );

-- Comments
COMMENT ON COLUMN public.showdown_teams.is_stock IS 'Whether this is a stock/pre-loaded team available to all users';
COMMENT ON COLUMN public.showdown_teams.user_tags IS 'User-defined tags for organizing teams (separate from system tags)';
