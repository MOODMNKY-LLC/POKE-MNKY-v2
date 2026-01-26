-- Phase 1.1: Pokémon Schema Expansion
-- Expands the pokemon table with type-effectiveness multipliers, speed benchmarks, abilities, and external naming fields
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 2002-2062)

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Create pokemon_form enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE pokemon_form AS ENUM ('none','alolan','galarian','hisuian','paldean','mega','primal','other');
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- Create pokemon_type enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE pokemon_type AS ENUM (
    'normal','fire','water','electric','grass','ice','fighting','poison','ground','flying',
    'psychic','bug','rock','ghost','dragon','dark','steel','fairy'
  );
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- Add new columns to pokemon table (using IF NOT EXISTS pattern)
ALTER TABLE public.pokemon 
  ADD COLUMN IF NOT EXISTS species_name TEXT,
  ADD COLUMN IF NOT EXISTS form pokemon_form DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS eligible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS draft_points INTEGER,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS restriction_notes TEXT,
  ADD COLUMN IF NOT EXISTS sprite_primary_url TEXT,
  ADD COLUMN IF NOT EXISTS sprite_bw_url TEXT,
  ADD COLUMN IF NOT EXISTS sprite_serebii_url TEXT,
  ADD COLUMN IF NOT EXISTS sprite_home_url TEXT,
  ADD COLUMN IF NOT EXISTS hp INTEGER,
  ADD COLUMN IF NOT EXISTS atk INTEGER,
  ADD COLUMN IF NOT EXISTS def INTEGER,
  ADD COLUMN IF NOT EXISTS spa INTEGER,
  ADD COLUMN IF NOT EXISTS spd INTEGER,
  ADD COLUMN IF NOT EXISTS spe INTEGER,
  ADD COLUMN IF NOT EXISTS speed_0_ev INTEGER,
  ADD COLUMN IF NOT EXISTS speed_252_ev INTEGER,
  ADD COLUMN IF NOT EXISTS speed_252_plus INTEGER,
  ADD COLUMN IF NOT EXISTS ability1 TEXT,
  ADD COLUMN IF NOT EXISTS ability2 TEXT,
  ADD COLUMN IF NOT EXISTS hidden_ability TEXT,
  -- Type effectiveness multipliers (defensive multipliers)
  ADD COLUMN IF NOT EXISTS vs_normal NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_fire NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_water NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_electric NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_grass NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_ice NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_fighting NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_poison NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_ground NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_flying NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_psychic NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_bug NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_rock NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_ghost NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_dragon NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_dark NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_steel NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS vs_fairy NUMERIC(4,2),
  -- External naming fields
  ADD COLUMN IF NOT EXISTS github_name TEXT,
  ADD COLUMN IF NOT EXISTS smogon_name TEXT,
  ADD COLUMN IF NOT EXISTS pokemondb_name TEXT,
  ADD COLUMN IF NOT EXISTS smogon_url TEXT,
  ADD COLUMN IF NOT EXISTS pokemondb_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Convert existing type1/type2 columns to enum if they exist and are text
-- Note: This is a safe migration - if columns don't exist or are already correct type, it will skip
DO $$
BEGIN
  -- Only attempt conversion if type1 exists as text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pokemon' 
    AND column_name = 'type1'
    AND data_type = 'text'
  ) THEN
    -- Add temporary columns
    ALTER TABLE public.pokemon 
      ADD COLUMN IF NOT EXISTS type1_new pokemon_type,
      ADD COLUMN IF NOT EXISTS type2_new pokemon_type;
    
    -- Convert values (lowercase, handle nulls)
    UPDATE public.pokemon 
    SET type1_new = CASE 
      WHEN LOWER(type1) IN ('normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy') 
      THEN LOWER(type1)::pokemon_type 
      ELSE NULL 
    END,
    type2_new = CASE 
      WHEN type2 IS NOT NULL AND LOWER(type2) IN ('normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy') 
      THEN LOWER(type2)::pokemon_type 
      ELSE NULL 
    END;
    
    -- Drop old columns and rename new ones
    ALTER TABLE public.pokemon DROP COLUMN IF EXISTS type1;
    ALTER TABLE public.pokemon DROP COLUMN IF EXISTS type2;
    ALTER TABLE public.pokemon RENAME COLUMN type1_new TO type1;
    ALTER TABLE public.pokemon RENAME COLUMN type2_new TO type2;
  END IF;
END $$;

-- Ensure type1 is NOT NULL if pokemon table exists and has rows
-- But only if we're creating fresh - if data exists, make it nullable initially
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pokemon') THEN
    -- Check if table has data
    IF EXISTS (SELECT 1 FROM public.pokemon LIMIT 1) THEN
      -- Table has data, keep nullable for now (data migration needed separately)
      NULL;
    ELSE
      -- Table is empty, enforce NOT NULL
      ALTER TABLE public.pokemon ALTER COLUMN type1 SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Add dex_number column if it doesn't exist (for indexing)
ALTER TABLE public.pokemon 
  ADD COLUMN IF NOT EXISTS dex_number INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pokemon_dex ON public.pokemon(dex_number);
CREATE INDEX IF NOT EXISTS idx_pokemon_points ON public.pokemon(draft_points);
CREATE INDEX IF NOT EXISTS idx_pokemon_types ON public.pokemon(type1, type2);
CREATE INDEX IF NOT EXISTS idx_pokemon_slug ON public.pokemon(slug);
CREATE INDEX IF NOT EXISTS idx_pokemon_eligible ON public.pokemon(eligible);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at (with error handling)
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS pokemon_set_updated_at ON public.pokemon;
  CREATE TRIGGER pokemon_set_updated_at 
    BEFORE UPDATE ON public.pokemon
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  -- Trigger might already exist with different definition, skip
  NULL;
END $$;

-- Comments for documentation
COMMENT ON COLUMN public.pokemon.slug IS 'Stable unique identifier (e.g., gardevoir-mega)';
COMMENT ON COLUMN public.pokemon.form IS 'Pokemon form variant';
COMMENT ON COLUMN public.pokemon.eligible IS 'Whether this Pokemon is eligible for the current league';
COMMENT ON COLUMN public.pokemon.draft_points IS 'Current point cost for drafting (snapshots stored in draft_picks.points_snapshot)';
COMMENT ON COLUMN public.pokemon.vs_normal IS 'Type effectiveness multiplier vs Normal type (0, 0.25, 0.5, 1, 2, 4)';
