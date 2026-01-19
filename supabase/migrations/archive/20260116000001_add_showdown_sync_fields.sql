-- Migration: Add Showdown account sync fields to profiles table
-- Enables bridge authentication between Supabase and Showdown loginserver

-- Add Showdown sync fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS showdown_username TEXT,
ADD COLUMN IF NOT EXISTS showdown_account_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS showdown_account_synced_at TIMESTAMPTZ;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_showdown_username 
ON public.profiles(showdown_username);

-- Constraint: showdown_username must be unique (if set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_showdown_username_unique 
ON public.profiles(showdown_username) 
WHERE showdown_username IS NOT NULL;

-- Comments
COMMENT ON COLUMN public.profiles.showdown_username IS 'Showdown username synced from Supabase profile';

COMMENT ON COLUMN public.profiles.showdown_account_synced IS 'Whether Showdown account has been synced via loginserver';

COMMENT ON COLUMN public.profiles.showdown_account_synced_at IS 'Timestamp when Showdown account was last synced';
