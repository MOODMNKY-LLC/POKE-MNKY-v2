-- Verification Queries for Homepage Performance Indexes
-- Run these queries to verify indexes are being used

-- 1. Check if indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_teams_wins_desc',
  'idx_matches_playoff_created_desc',
  'idx_matches_created_at_desc',
  'idx_pokemon_stats_kills_desc',
  'idx_matches_team1_id',
  'idx_matches_team2_id',
  'idx_matches_winner_id'
)
ORDER BY tablename, indexname;

-- 2. Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_teams_wins_desc',
  'idx_matches_playoff_created_desc',
  'idx_matches_created_at_desc',
  'idx_pokemon_stats_kills_desc',
  'idx_matches_team1_id',
  'idx_matches_team2_id',
  'idx_matches_winner_id'
)
ORDER BY idx_scan DESC;

-- 3. Analyze query plans (example queries)
-- Teams query
EXPLAIN ANALYZE
SELECT id, name, wins, losses, division, conference, coach_name, avatar_url
FROM teams
ORDER BY wins DESC
LIMIT 5;

-- Matches count query
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM matches
WHERE is_playoff = false;

-- Recent matches query
EXPLAIN ANALYZE
SELECT 
  id, week, team1_id, team2_id, winner_id,
  team1_score, team2_score, created_at
FROM matches
WHERE is_playoff = false
ORDER BY created_at DESC
LIMIT 3;

-- Pokemon stats query (if kills column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pokemon_stats' 
    AND column_name = 'kills'
  ) THEN
    PERFORM (
      EXPLAIN ANALYZE
      SELECT pokemon_id, kills
      FROM pokemon_stats
      ORDER BY kills DESC
      LIMIT 3
    );
  END IF;
END $$;
