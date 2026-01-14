-- Migration: Add Showdown integration fields to matches table
-- Adds support for Showdown room tracking and battle room URLs

-- Add Showdown room tracking to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS showdown_room_id TEXT,
  ADD COLUMN IF NOT EXISTS showdown_room_url TEXT;

-- Create index for faster lookups by room ID
CREATE INDEX IF NOT EXISTS idx_matches_showdown_room_id ON public.matches(showdown_room_id)
WHERE showdown_room_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.matches.showdown_room_id IS 'Showdown room identifier for battle tracking (e.g., battle-match-{match_id})';
COMMENT ON COLUMN public.matches.showdown_room_url IS 'Full URL to join Showdown battle room';
