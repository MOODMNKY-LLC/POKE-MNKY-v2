-- Migration: Create canonical_league_config table for canonical league rules and constants
-- Date: 2026-01-17
-- Purpose: Single source of truth for league rules, weights, and season parameters
-- Note: Named canonical_league_config to avoid conflict with existing league_config table (parsed rules storage)

-- Create canonical_league_config table
CREATE TABLE IF NOT EXISTS public.canonical_league_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id),
  
  -- Battle Weighting Constants (canonical)
  intra_divisional_weight DECIMAL(3,2) NOT NULL DEFAULT 1.5,
  intra_conference_weight DECIMAL(3,2) NOT NULL DEFAULT 1.25,
  cross_conference_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  
  -- Season Structure
  team_count INTEGER NOT NULL, -- 12 for Season 6
  division_count INTEGER NOT NULL DEFAULT 4,
  conference_count INTEGER NOT NULL DEFAULT 2,
  playoff_teams INTEGER NOT NULL DEFAULT 12,
  
  -- Ranking Criteria (stored as JSONB for flexibility)
  ranking_criteria JSONB NOT NULL DEFAULT '[
    {"priority": 1, "criterion": "win_percentage", "direction": "descending"},
    {"priority": 2, "criterion": "losses", "direction": "ascending"},
    {"priority": 3, "criterion": "point_differential", "direction": "descending"},
    {"priority": 4, "criterion": "head_to_head", "direction": "better_record_wins"},
    {"priority": 5, "criterion": "win_streak", "direction": "descending"},
    {"priority": 6, "criterion": "strength_of_schedule", "direction": "descending"},
    {"priority": 7, "criterion": "team_name_alphabetical", "direction": "ascending"}
  ]'::jsonb,
  
  -- Win Streak Definition
  win_streak_type TEXT NOT NULL DEFAULT 'active', -- 'active' or 'best_ever'
  win_streak_breaks_on_loss BOOLEAN NOT NULL DEFAULT true,
  
  -- Head-to-Head Rules
  h2h_applies_to_two_team_ties BOOLEAN NOT NULL DEFAULT true,
  h2h_applies_to_multi_team_ties BOOLEAN NOT NULL DEFAULT true,
  h2h_multi_team_method TEXT NOT NULL DEFAULT 'mini_table', -- 'mini_table' or 'direct_only'
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure one active config per season (using partial unique index)
DROP INDEX IF EXISTS idx_canonical_league_config_one_active_per_season;
CREATE UNIQUE INDEX idx_canonical_league_config_one_active_per_season 
  ON public.canonical_league_config(season_id) 
  WHERE is_active = true;

-- Indexes
CREATE INDEX idx_canonical_league_config_season ON public.canonical_league_config(season_id);
CREATE INDEX idx_canonical_league_config_active ON public.canonical_league_config(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE public.canonical_league_config IS 'Canonical league rules and constants configuration';
COMMENT ON COLUMN public.canonical_league_config.intra_divisional_weight IS 'Battle weight multiplier for intra-divisional matches (1.5x)';
COMMENT ON COLUMN public.canonical_league_config.intra_conference_weight IS 'Battle weight multiplier for intra-conference matches (1.25x)';
COMMENT ON COLUMN public.canonical_league_config.cross_conference_weight IS 'Battle weight multiplier for cross-conference matches (1.0x)';
COMMENT ON COLUMN public.canonical_league_config.ranking_criteria IS 'JSON array of ranking criteria in priority order';
COMMENT ON COLUMN public.canonical_league_config.win_streak_type IS 'Type of win streak: active (current consecutive) or best_ever (historical maximum)';
COMMENT ON COLUMN public.canonical_league_config.h2h_multi_team_method IS 'Method for H2H in multi-team ties: mini_table (record vs tied group) or direct_only (pairwise only)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_canonical_league_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER canonical_league_config_updated_at
  BEFORE UPDATE ON public.canonical_league_config
  FOR EACH ROW
  EXECUTE FUNCTION update_canonical_league_config_updated_at();

-- RLS Policies
ALTER TABLE public.canonical_league_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active config
CREATE POLICY "Canonical league config is viewable by authenticated users"
  ON public.canonical_league_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to manage config
CREATE POLICY "Canonical league config is manageable by service role"
  ON public.canonical_league_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
