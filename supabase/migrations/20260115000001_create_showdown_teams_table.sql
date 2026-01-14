-- Migration: Create Showdown Teams table
-- Stores Pokemon Showdown team exports with metadata and validation

-- Showdown Teams table
CREATE TABLE IF NOT EXISTS public.showdown_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Team metadata (extracted from header)
  team_name TEXT NOT NULL,
  generation INTEGER,
  format TEXT, -- ou, uu, vgc, etc.
  folder_path TEXT, -- Folder organization path
  
  -- Team content
  team_text TEXT NOT NULL, -- Original team export text
  canonical_text TEXT NOT NULL, -- Cleaned/prettified version
  
  -- Parsed team data (JSONB for flexible querying)
  pokemon_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of parsed Pokemon
  
  -- Ownership and organization
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Link to league team
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL, -- Owner/creator
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL, -- Season context
  
  -- Team statistics
  pokemon_count INTEGER NOT NULL DEFAULT 0,
  is_validated BOOLEAN DEFAULT FALSE,
  validation_errors TEXT[], -- Array of validation error messages
  
  -- Metadata
  source TEXT, -- 'upload', 'import', 'showdown', etc.
  tags TEXT[], -- User-defined tags for organization
  notes TEXT, -- User notes about the team
  
  -- File metadata
  original_filename TEXT,
  file_size INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ, -- Last time team was used in battle
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_showdown_teams_team_id ON public.showdown_teams(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_showdown_teams_coach_id ON public.showdown_teams(coach_id) WHERE coach_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_showdown_teams_season_id ON public.showdown_teams(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_showdown_teams_generation ON public.showdown_teams(generation) WHERE generation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_showdown_teams_format ON public.showdown_teams(format) WHERE format IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_showdown_teams_folder_path ON public.showdown_teams(folder_path) WHERE folder_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_showdown_teams_created_at ON public.showdown_teams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_showdown_teams_deleted_at ON public.showdown_teams(deleted_at) WHERE deleted_at IS NULL;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_showdown_teams_pokemon_data ON public.showdown_teams USING GIN (pokemon_data);

-- GIN index for array searches (tags)
CREATE INDEX IF NOT EXISTS idx_showdown_teams_tags ON public.showdown_teams USING GIN (tags);

-- Full-text search index for team names and notes
CREATE INDEX IF NOT EXISTS idx_showdown_teams_search ON public.showdown_teams USING GIN (
  to_tsvector('english', COALESCE(team_name, '') || ' ' || COALESCE(notes, ''))
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_showdown_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_showdown_teams_updated_at
  BEFORE UPDATE ON public.showdown_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_showdown_teams_updated_at();

-- Function to calculate pokemon_count from pokemon_data
CREATE OR REPLACE FUNCTION calculate_showdown_team_pokemon_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.pokemon_count = jsonb_array_length(NEW.pokemon_data);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate pokemon_count
CREATE TRIGGER trigger_calculate_showdown_team_pokemon_count
  BEFORE INSERT OR UPDATE OF pokemon_data ON public.showdown_teams
  FOR EACH ROW
  EXECUTE FUNCTION calculate_showdown_team_pokemon_count();

-- Comments for documentation
COMMENT ON TABLE public.showdown_teams IS 'Stores Pokemon Showdown team exports with parsed data and metadata';
COMMENT ON COLUMN public.showdown_teams.team_text IS 'Original team export text from Showdown';
COMMENT ON COLUMN public.showdown_teams.canonical_text IS 'Cleaned and prettified team export text';
COMMENT ON COLUMN public.showdown_teams.pokemon_data IS 'JSONB array of parsed Pokemon with all stats, moves, items, etc.';
COMMENT ON COLUMN public.showdown_teams.folder_path IS 'Folder organization path (e.g., "OU/Offensive", "VGC/Rain Teams")';
COMMENT ON COLUMN public.showdown_teams.is_validated IS 'Whether team has been validated against roster and league rules';
COMMENT ON COLUMN public.showdown_teams.validation_errors IS 'Array of validation error messages if team is invalid';

-- Enable Row Level Security
ALTER TABLE public.showdown_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own teams and public teams
CREATE POLICY "Users can view own teams"
  ON public.showdown_teams
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()) OR
      team_id IN (SELECT id FROM public.teams WHERE coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid()))
    )
  );

-- Users can insert their own teams
CREATE POLICY "Users can insert own teams"
  ON public.showdown_teams
  FOR INSERT
  WITH CHECK (
    coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid())
  );

-- Users can update their own teams
CREATE POLICY "Users can update own teams"
  ON public.showdown_teams
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid())
  );

-- Users can delete their own teams (soft delete)
CREATE POLICY "Users can delete own teams"
  ON public.showdown_teams
  FOR UPDATE
  USING (
    coach_id IN (SELECT id FROM public.coaches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    deleted_at IS NOT NULL
  );
