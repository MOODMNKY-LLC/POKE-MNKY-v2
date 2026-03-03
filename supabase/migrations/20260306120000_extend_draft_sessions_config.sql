-- Extend draft_sessions for Create Draft Feature Enhancement
-- Adds: ruleset, season length, playoff format, draft position method, draft pool source

-- 1. Add new columns to draft_sessions
ALTER TABLE public.draft_sessions
  ADD COLUMN IF NOT EXISTS ruleset_section TEXT,
  ADD COLUMN IF NOT EXISTS season_length_weeks INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS playoff_format TEXT DEFAULT '4_week' CHECK (
    playoff_format IS NULL OR playoff_format IN ('3_week', '4_week', 'single_elimination', 'double_elimination')
  ),
  ADD COLUMN IF NOT EXISTS playoff_weeks INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS playoff_teams INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS draft_position_method TEXT DEFAULT 'randomizer' CHECK (
    draft_position_method IS NULL OR draft_position_method IN ('randomizer', 'commissioner')
  ),
  ADD COLUMN IF NOT EXISTS draft_pool_source TEXT DEFAULT 'season_draft_pool' CHECK (
    draft_pool_source IS NULL OR draft_pool_source IN ('generation', 'game', 'season_draft_pool', 'draft_pool', 'archived')
  ),
  ADD COLUMN IF NOT EXISTS draft_pool_source_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS archived_pool_id UUID REFERENCES public.draft_pools(id) ON DELETE SET NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_draft_sessions_playoff_format ON public.draft_sessions(playoff_format);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_draft_pool_source ON public.draft_sessions(draft_pool_source);
CREATE INDEX IF NOT EXISTS idx_draft_sessions_archived_pool ON public.draft_sessions(archived_pool_id);

-- Add metadata column to draft_pools for archive source (generation, game_code, etc.)
ALTER TABLE public.draft_pools
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.draft_sessions.ruleset_section IS 'league_config section_title for rules (config_type rules or draft_settings)';
COMMENT ON COLUMN public.draft_sessions.season_length_weeks IS 'Regular season weeks (e.g. 10)';
COMMENT ON COLUMN public.draft_sessions.playoff_format IS '3_week, 4_week, single_elimination, or double_elimination';
COMMENT ON COLUMN public.draft_sessions.playoff_weeks IS 'Number of playoff matchweeks';
COMMENT ON COLUMN public.draft_sessions.playoff_teams IS 'Teams advancing to playoffs';
COMMENT ON COLUMN public.draft_sessions.draft_position_method IS 'randomizer or commissioner-assigned order';
COMMENT ON COLUMN public.draft_sessions.draft_pool_source IS 'generation, game, season_draft_pool, draft_pool, or archived';
COMMENT ON COLUMN public.draft_sessions.draft_pool_source_config IS 'JSON: { generation?, game_code?, archived_pool_id? }';
COMMENT ON COLUMN public.draft_pools.source_metadata IS 'Archive metadata: generation, game_code, filters';

-- 2. Add draft_pool_pokemon_master for archives from season_draft_pool (pokemon_master-based)
-- draft_pool_pokemon references pokemon(id); season_draft_pool uses pokemon_master(id)
CREATE TABLE IF NOT EXISTS public.draft_pool_pokemon_master (
  draft_pool_id UUID NOT NULL REFERENCES public.draft_pools(id) ON DELETE CASCADE,
  pokemon_master_id UUID NOT NULL REFERENCES public.pokemon_master(id) ON DELETE CASCADE,
  assigned_points INTEGER,
  is_included BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (draft_pool_id, pokemon_master_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_pool_pokemon_master_pool ON public.draft_pool_pokemon_master(draft_pool_id);
CREATE INDEX IF NOT EXISTS idx_draft_pool_pokemon_master_pokemon ON public.draft_pool_pokemon_master(pokemon_master_id);

ALTER TABLE public.draft_pool_pokemon_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draft_pool_pokemon_master_select_authenticated" ON public.draft_pool_pokemon_master;
CREATE POLICY "draft_pool_pokemon_master_select_authenticated"
  ON public.draft_pool_pokemon_master FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "draft_pool_pokemon_master_admin_write" ON public.draft_pool_pokemon_master;
CREATE POLICY "draft_pool_pokemon_master_admin_write"
  ON public.draft_pool_pokemon_master FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'commissioner'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'commissioner'))
  );

COMMENT ON TABLE public.draft_pool_pokemon_master IS 'Archive contents from season_draft_pool (pokemon_master-based)';
