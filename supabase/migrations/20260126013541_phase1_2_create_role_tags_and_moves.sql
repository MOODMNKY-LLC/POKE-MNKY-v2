-- Phase 1.2: Role Tags & Moves System
-- Creates role_tags table, enhances moves table, and creates join tables
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 2068-2119)

-- Create role_category enum
DO $$ BEGIN
  CREATE TYPE role_category AS ENUM (
    'hazard_setter','hazard_remover','cleric','pivot','phasing','priority','recovery','screens',
    'status_utility','win_condition','anti_setup','disruption','weather_terrain','support_general'
  );
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- Role Tags table (canonical taxonomy)
CREATE TABLE IF NOT EXISTS public.role_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,            -- STRICT: "<Category>: <Mechanism>"
  category role_category NOT NULL,
  mechanism TEXT NOT NULL,              -- e.g. "Stealth Rock", "Defog", "Intimidate"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT role_tag_name_format_chk CHECK (position(': ' in name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_role_tags_category ON public.role_tags(category);
CREATE INDEX IF NOT EXISTS idx_role_tags_name ON public.role_tags(name);

-- Enhance moves table if it exists (from comprehensive pokedex)
-- Add columns that might be missing for the utility moves system
DO $$
BEGIN
  -- Check if moves table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'moves') THEN
    -- Add columns if they don't exist
    ALTER TABLE public.moves 
      ADD COLUMN IF NOT EXISTS type pokemon_type,
      ADD COLUMN IF NOT EXISTS category TEXT,  -- 'physical','special','status'
      ADD COLUMN IF NOT EXISTS power INTEGER,
      ADD COLUMN IF NOT EXISTS accuracy INTEGER,
      ADD COLUMN IF NOT EXISTS pp INTEGER,
      ADD COLUMN IF NOT EXISTS priority INTEGER,
      ADD COLUMN IF NOT EXISTS tags TEXT[],     -- e.g. {'hazard','removal','pivot'}
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Create unique constraint on name if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'moves_name_key' 
      AND conrelid = 'public.moves'::regclass
    ) THEN
      ALTER TABLE public.moves ADD CONSTRAINT moves_name_key UNIQUE (name);
    END IF;
  ELSE
    -- Create moves table if it doesn't exist (simplified version for utility moves)
    CREATE TABLE public.moves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      type pokemon_type,
      category TEXT,                -- 'physical','special','status'
      power INTEGER,
      accuracy INTEGER,
      pp INTEGER,
      priority INTEGER,
      tags TEXT[],                  -- e.g. {'hazard','removal','pivot'}
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Create updated_at trigger for moves
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS moves_set_updated_at ON public.moves;
  CREATE TRIGGER moves_set_updated_at 
    BEFORE UPDATE ON public.moves
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Join: Pokémon ↔ Role Tags (many-to-many)
CREATE TABLE IF NOT EXISTS public.pokemon_role_tags (
  pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE CASCADE,
  role_tag_id UUID NOT NULL REFERENCES public.role_tags(id) ON DELETE CASCADE,
  source TEXT,                          -- 'notion','import','manual','ai'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pokemon_id, role_tag_id)
);

CREATE INDEX IF NOT EXISTS idx_pokemon_role_tags_pokemon ON public.pokemon_role_tags(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_role_tags_role ON public.pokemon_role_tags(role_tag_id);

-- Optional join: Role Tag ↔ Move (0..1 move reference; if you want strict move linkage)
CREATE TABLE IF NOT EXISTS public.role_tag_moves (
  role_tag_id UUID NOT NULL REFERENCES public.role_tags(id) ON DELETE CASCADE,
  move_id UUID NOT NULL REFERENCES public.moves(id) ON DELETE CASCADE,
  PRIMARY KEY (role_tag_id, move_id)
);

CREATE INDEX IF NOT EXISTS idx_role_tag_moves_role ON public.role_tag_moves(role_tag_id);
CREATE INDEX IF NOT EXISTS idx_role_tag_moves_move ON public.role_tag_moves(move_id);

-- Optional join: Pokémon ↔ Moves (utility association, not full learnset)
CREATE TABLE IF NOT EXISTS public.pokemon_moves_utility (
  pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE CASCADE,
  move_id UUID NOT NULL REFERENCES public.moves(id) ON DELETE CASCADE,
  notes TEXT,
  PRIMARY KEY (pokemon_id, move_id)
);

CREATE INDEX IF NOT EXISTS idx_pokemon_moves_utility_pokemon ON public.pokemon_moves_utility(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_moves_utility_move ON public.pokemon_moves_utility(move_id);

-- Create updated_at trigger for role_tags
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS role_tags_set_updated_at ON public.role_tags;
  CREATE TRIGGER role_tags_set_updated_at 
    BEFORE UPDATE ON public.role_tags
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Comments
COMMENT ON TABLE public.role_tags IS 'Canonical role taxonomy for Pokemon competitive utility. Name must follow "Category: Mechanism" format.';
COMMENT ON TABLE public.pokemon_role_tags IS 'Many-to-many relationship between Pokemon and their competitive roles';
COMMENT ON TABLE public.role_tag_moves IS 'Optional linkage between role tags and the moves that grant them';
COMMENT ON TABLE public.pokemon_moves_utility IS 'Utility move associations for Pokemon (not full learnset)';
