-- Phase 1.3: Draft System Enhancement
-- Creates draft_picks table, draft_pools system, and season_teams join table
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 2184-2233)

-- Create acquisition_type enum
DO $$ BEGIN
  CREATE TYPE acquisition_type AS ENUM ('draft','free_agency','trade','waiver');
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- Create pick_status enum
DO $$ BEGIN
  CREATE TYPE pick_status AS ENUM ('active','dropped','traded_away','ir','banned');
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- Season participants (Teams ↔ Seasons) - many-to-many join table
CREATE TABLE IF NOT EXISTS public.season_teams (
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (season_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_season_teams_season ON public.season_teams(season_id);
CREATE INDEX IF NOT EXISTS idx_season_teams_team ON public.season_teams(team_id);

-- Draft Pools (versioned snapshots)
CREATE TABLE IF NOT EXISTS public.draft_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                         -- "S6 Pool v1"
  rules_notes TEXT,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(season_id, name)
);

CREATE INDEX IF NOT EXISTS idx_draft_pools_season ON public.draft_pools(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_pools_locked ON public.draft_pools(season_id, locked);

-- Draft Pool contents (many-to-many + inclusion flag)
CREATE TABLE IF NOT EXISTS public.draft_pool_pokemon (
  draft_pool_id UUID NOT NULL REFERENCES public.draft_pools(id) ON DELETE CASCADE,
  pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE CASCADE,
  included BOOLEAN NOT NULL DEFAULT true,      -- false = banned/excluded
  reason TEXT,
  PRIMARY KEY (draft_pool_id, pokemon_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_pool_pokemon_included ON public.draft_pool_pokemon(draft_pool_id, included);
CREATE INDEX IF NOT EXISTS idx_draft_pool_pokemon_pokemon ON public.draft_pool_pokemon(pokemon_id);

-- Draft Picks (transactional roster records)
-- Note: This replaces/enhances team_rosters table with proper snapshot support
CREATE TABLE IF NOT EXISTS public.draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE RESTRICT,

  acquisition acquisition_type NOT NULL DEFAULT 'draft',
  draft_round INTEGER,
  pick_number INTEGER,

  status pick_status NOT NULL DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,

  points_snapshot INTEGER NOT NULL,               -- critical: preserves history
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- prevent duplicate active ownership in same season
  CONSTRAINT uq_season_pokemon_unique UNIQUE (season_id, pokemon_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_picks_team ON public.draft_picks(season_id, team_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_status ON public.draft_picks(status);
CREATE INDEX IF NOT EXISTS idx_draft_picks_pokemon ON public.draft_picks(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_season_team_status ON public.draft_picks(season_id, team_id, status);

-- Create updated_at triggers
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS draft_pools_set_updated_at ON public.draft_pools;
  CREATE TRIGGER draft_pools_set_updated_at 
    BEFORE UPDATE ON public.draft_pools
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS draft_picks_set_updated_at ON public.draft_picks;
  CREATE TRIGGER draft_picks_set_updated_at 
    BEFORE UPDATE ON public.draft_picks
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Comments
COMMENT ON TABLE public.draft_picks IS 'Transactional roster records with points snapshot for history preservation';
COMMENT ON COLUMN public.draft_picks.points_snapshot IS 'Points at time of acquisition (preserves history even if pokemon.draft_points changes)';
COMMENT ON TABLE public.draft_pools IS 'Versioned draft pool snapshots per season';
COMMENT ON TABLE public.draft_pool_pokemon IS 'Many-to-many relationship between draft pools and Pokemon with inclusion flag';
COMMENT ON TABLE public.season_teams IS 'Many-to-many relationship between seasons and participating teams';
