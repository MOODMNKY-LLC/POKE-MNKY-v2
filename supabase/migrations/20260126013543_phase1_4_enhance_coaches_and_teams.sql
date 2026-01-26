-- Phase 1.4: Coach & Team Enhancements
-- Adds Discord user ID mapping, franchise keys, and admin user management
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 2125-2159, 4838-4844)

-- Add discord_user_id to coaches table
ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_coaches_discord_user_id ON public.coaches(discord_user_id);

-- Ensure coaches.user_id references auth.users if it doesn't already
DO $$
BEGIN
  -- Check if user_id column exists and doesn't have the foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coaches' 
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'coaches' 
    AND constraint_name LIKE '%user_id%'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE public.coaches 
      ADD CONSTRAINT coaches_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add franchise_key to teams table
ALTER TABLE public.teams 
  ADD COLUMN IF NOT EXISTS franchise_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_teams_franchise_key ON public.teams(franchise_key);

-- Create admin_users table for admin role management
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Update coaches table structure to match conversation document
-- Add missing columns if they don't exist
ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS coach_name TEXT,
  ADD COLUMN IF NOT EXISTS discord_handle TEXT,
  ADD COLUMN IF NOT EXISTS showdown_username CITEXT,
  ADD COLUMN IF NOT EXISTS github_name TEXT,
  ADD COLUMN IF NOT EXISTS smogon_name TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- If display_name exists, migrate to coach_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coaches' 
    AND column_name = 'display_name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'coaches' 
    AND column_name = 'coach_name'
  ) THEN
    -- Migrate display_name to coach_name where coach_name is null
    UPDATE public.coaches 
    SET coach_name = display_name 
    WHERE coach_name IS NULL AND display_name IS NOT NULL;
  END IF;
END $$;

-- Create index on showdown_username
CREATE INDEX IF NOT EXISTS idx_coaches_showdown ON public.coaches(showdown_username);

-- Update teams table structure to match conversation document
-- Add missing columns if they don't exist
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate name to team_name if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'team_name'
  ) THEN
    -- Migrate name to team_name where team_name is null
    UPDATE public.teams 
    SET team_name = name 
    WHERE team_name IS NULL AND name IS NOT NULL;
  END IF;
END $$;

-- Create updated_at triggers
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS coaches_set_updated_at ON public.coaches;
  CREATE TRIGGER coaches_set_updated_at 
    BEFORE UPDATE ON public.coaches
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS teams_set_updated_at ON public.teams;
  CREATE TRIGGER teams_set_updated_at 
    BEFORE UPDATE ON public.teams
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Comments
COMMENT ON COLUMN public.coaches.discord_user_id IS 'Discord user snowflake ID for bot integration';
COMMENT ON COLUMN public.teams.franchise_key IS 'Stable identifier for team across seasons';
COMMENT ON TABLE public.admin_users IS 'Admin user management for RBAC';
