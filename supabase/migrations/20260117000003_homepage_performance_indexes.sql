-- Homepage Performance Indexes
-- Optimizes queries used on the homepage for faster load times
-- Created: 2026-01-17

-- Index for teams wins ordering (homepage top teams)
-- Used by: SELECT * FROM teams ORDER BY wins DESC LIMIT 5
CREATE INDEX IF NOT EXISTS idx_teams_wins_desc ON public.teams(wins DESC NULLS LAST);

-- Composite index for matches filtering and ordering (homepage recent matches)
-- Used by: SELECT * FROM matches WHERE is_playoff = false ORDER BY created_at DESC LIMIT 3
CREATE INDEX IF NOT EXISTS idx_matches_playoff_created_desc 
ON public.matches(is_playoff, created_at DESC NULLS LAST)
WHERE is_playoff = false;

-- Index for matches created_at ordering (used in recent matches query)
-- This complements the composite index above for better query planning
CREATE INDEX IF NOT EXISTS idx_matches_created_at_desc 
ON public.matches(created_at DESC NULLS LAST);

-- Index for pokemon_stats kills ordering (homepage top pokemon)
-- Used by: SELECT pokemon_id, kills FROM pokemon_stats ORDER BY kills DESC LIMIT 3
-- Only create if kills column exists (conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pokemon_stats' 
    AND column_name = 'kills'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_kills_desc 
    ON public.pokemon_stats(kills DESC NULLS LAST)
    WHERE kills > 0; -- Partial index for non-zero kills only
  END IF;
END $$;

-- Index for matches team1_id foreign key (used in joins)
-- Helps with: team1:team1_id(name, coach_name) joins
CREATE INDEX IF NOT EXISTS idx_matches_team1_id ON public.matches(team1_id) 
WHERE team1_id IS NOT NULL;

-- Index for matches team2_id foreign key (used in joins)
-- Helps with: team2:team2_id(name, coach_name) joins
CREATE INDEX IF NOT EXISTS idx_matches_team2_id ON public.matches(team2_id) 
WHERE team2_id IS NOT NULL;

-- Index for matches winner_id foreign key (used in joins)
-- Helps with: winner:winner_id(name) joins
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON public.matches(winner_id) 
WHERE winner_id IS NOT NULL;

-- Analyze tables to update query planner statistics
ANALYZE public.teams;
ANALYZE public.matches;
ANALYZE public.pokemon_stats;
