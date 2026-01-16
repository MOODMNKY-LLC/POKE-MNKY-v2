-- Fix pokemon_stats table conflict
-- The comprehensive pokedex migration created pokemon_stats with base stats schema
-- But we need pokemon_stats for match statistics (kills per match)
-- Solution: Rename comprehensive version to pokemon_base_stats, create match stats version

DO $$
BEGIN
  -- Check if pokemon_stats exists with stat_id (comprehensive pokedex version)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pokemon_stats' 
      AND column_name = 'stat_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pokemon_stats' 
      AND column_name = 'match_id'
  ) THEN
    -- Rename comprehensive pokedex version to pokemon_base_stats
    ALTER TABLE public.pokemon_stats RENAME TO pokemon_base_stats;
    
    RAISE NOTICE 'Renamed pokemon_stats (comprehensive pokedex) to pokemon_base_stats';
  END IF;
  
  -- Now create the match stats version if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'pokemon_stats'
  ) THEN
    -- Create match stats table
    CREATE TABLE public.pokemon_stats (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
      pokemon_id UUID NOT NULL REFERENCES public.pokemon(id) ON DELETE CASCADE,
      team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
      kills INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_match ON public.pokemon_stats(match_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_pokemon ON public.pokemon_stats(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_team ON public.pokemon_stats(team_id);
    
    -- Enable RLS
    ALTER TABLE public.pokemon_stats ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    DROP POLICY IF EXISTS "Allow public read access on pokemon_stats" ON public.pokemon_stats;
    CREATE POLICY "Allow public read access on pokemon_stats" 
      ON public.pokemon_stats FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Allow authenticated insert on pokemon_stats" ON public.pokemon_stats;
    CREATE POLICY "Allow authenticated insert on pokemon_stats" 
      ON public.pokemon_stats FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    RAISE NOTICE 'Created pokemon_stats table for match statistics';
  END IF;
END $$;

COMMENT ON TABLE public.pokemon_stats IS 'Match statistics: KOs scored by Pokemon per match';
COMMENT ON COLUMN public.pokemon_stats.kills IS 'Number of KOs scored by this Pokemon in this match';
COMMENT ON TABLE public.pokemon_base_stats IS 'Pokemon base stats (HP, Attack, Defense, etc.) from comprehensive pokedex';
