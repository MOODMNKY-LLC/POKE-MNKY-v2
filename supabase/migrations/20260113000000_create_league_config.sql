-- Create league_config table for storing rules and league configuration
-- This table stores parsed rules from Google Sheets Rules parser

CREATE TABLE IF NOT EXISTS public.league_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Configuration type (rules, scoring, draft_settings, etc.)
  config_type TEXT NOT NULL CHECK (config_type IN ('rules', 'scoring', 'draft_settings', 'season_structure', 'general')),
  
  -- Section title/name
  section_title TEXT NOT NULL,
  
  -- Section type (e.g., 'draft_rules', 'scoring_system', 'point_system')
  section_type TEXT,
  
  -- Main content (markdown or plain text)
  content TEXT,
  
  -- Subsections (stored as JSONB for flexibility)
  subsections JSONB DEFAULT '[]'::jsonb,
  
  -- Embedded tables/data (stored as JSONB)
  embedded_tables JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  sheet_name TEXT,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique sections by type and title
  UNIQUE(config_type, section_title)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_league_config_type ON public.league_config(config_type);
CREATE INDEX IF NOT EXISTS idx_league_config_section_type ON public.league_config(section_type);

-- Add RLS policies (allow read for authenticated users, write for admins)
ALTER TABLE public.league_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read league config
CREATE POLICY "League config is viewable by authenticated users"
  ON public.league_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert/update (via backend)
CREATE POLICY "League config is insertable by service role"
  ON public.league_config
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "League config is updatable by service role"
  ON public.league_config
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.league_config IS 'Stores league rules and configuration parsed from Google Sheets';
