-- Add kills column to pokemon_stats table if it doesn't exist
-- This is for match statistics (kills per Pokemon per match)
-- Note: pokemon_stats may have been created by comprehensive_pokedex migration
-- which has a different schema (pokemon_id INTEGER, stat_id, base_stat)
-- This migration ensures the match stats version has the kills column

DO $$
BEGIN
  -- Check if pokemon_stats table exists with match_id column (match stats version)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pokemon_stats' 
      AND column_name = 'match_id'
  ) THEN
    -- Table exists with match_id - add kills column if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'pokemon_stats' 
        AND column_name = 'kills'
    ) THEN
      ALTER TABLE public.pokemon_stats 
      ADD COLUMN kills INTEGER DEFAULT 0;
      
      COMMENT ON COLUMN public.pokemon_stats.kills IS 'Number of KOs scored by this Pokemon in this match';
    END IF;
  END IF;
END $$;
