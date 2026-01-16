-- Add avatar and banner URL fields to teams table
-- Migration: 20260116000012_add_team_avatar_fields.sql

ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add comments
COMMENT ON COLUMN public.teams.avatar_url IS 'Team avatar/logo URL (square, for profile cards and team listings)';
COMMENT ON COLUMN public.teams.banner_url IS 'Team banner URL (wide, for team detail pages)';
COMMENT ON COLUMN public.teams.logo_url IS 'Legacy team logo URL (deprecated, use avatar_url instead)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teams_avatar_url ON public.teams(avatar_url) WHERE avatar_url IS NOT NULL;
