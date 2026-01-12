-- Create draft_sessions table for managing active draft sessions
-- Tracks draft state, turn order, and current pick

CREATE TABLE IF NOT EXISTS public.draft_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Session information
  season_id UUID, -- Will add FK constraint after seasons table exists
  session_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
  
  -- Draft configuration
  draft_type TEXT DEFAULT 'snake' CHECK (draft_type IN ('snake', 'linear', 'auction')),
  total_teams INTEGER NOT NULL DEFAULT 20,
  total_rounds INTEGER NOT NULL DEFAULT 11,
  
  -- Current state
  current_pick_number INTEGER DEFAULT 1,
  current_team_id UUID, -- FK constraint added in later migration after teams table exists
  current_round INTEGER DEFAULT 1,
  
  -- Turn order (stored as JSONB array of team IDs)
  turn_order JSONB DEFAULT '[]'::jsonb,
  
  -- Draft settings
  pick_time_limit_seconds INTEGER DEFAULT 45,
  auto_draft_enabled BOOLEAN DEFAULT false,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_draft_sessions_season ON public.draft_sessions(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_status ON public.draft_sessions(status);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_current_team ON public.draft_sessions(current_team_id);

-- Ensure one active session per season (using partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_sessions_unique_active_per_season 
  ON public.draft_sessions(season_id) 
  WHERE status = 'active';

-- Add RLS policies
ALTER TABLE public.draft_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read draft sessions
CREATE POLICY "Draft sessions are viewable by authenticated users"
  ON public.draft_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert/update (via backend)
CREATE POLICY "Draft sessions are insertable by service role"
  ON public.draft_sessions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Draft sessions are updatable by service role"
  ON public.draft_sessions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.draft_sessions IS 'Manages active draft sessions, turn order, and current pick state';
