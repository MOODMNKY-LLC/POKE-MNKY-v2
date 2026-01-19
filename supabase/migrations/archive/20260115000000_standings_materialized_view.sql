-- Migration: Create Standings Materialized View
-- Purpose: Precompute league standings for fast queries
-- Date: 2026-01-15

-- Create materialized view for league standings
-- This view aggregates match results to calculate wins, losses, differentials, and rankings
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_league_standings AS
SELECT 
    t.id AS team_id,
    t.name AS team_name,
    t.coach_name,
    t.division,
    t.conference,
    t.division_id,
    t.season_id,
    d.conference_id,
    -- Calculate wins (matches where team won)
    COUNT(CASE 
        WHEN m.winner_id = t.id AND m.status = 'completed' THEN 1 
    END)::INTEGER AS wins,
    -- Calculate losses (matches where team lost)
    COUNT(CASE 
        WHEN m.status = 'completed' 
        AND ((m.team1_id = t.id AND m.winner_id = m.team2_id) 
             OR (m.team2_id = t.id AND m.winner_id = m.team1_id)) 
        THEN 1 
    END)::INTEGER AS losses,
    -- Calculate differential (sum of score differences)
    COALESCE(SUM(CASE 
        WHEN m.status = 'completed' AND m.team1_id = t.id THEN m.differential
        WHEN m.status = 'completed' AND m.team2_id = t.id THEN -m.differential
        ELSE 0
    END), 0)::INTEGER AS differential,
    -- Calculate total games played
    COUNT(CASE WHEN m.status = 'completed' THEN 1 END)::INTEGER AS games_played,
    -- Calculate win percentage
    CASE 
        WHEN COUNT(CASE WHEN m.status = 'completed' THEN 1 END) > 0 
        THEN ROUND(
            (COUNT(CASE WHEN m.winner_id = t.id AND m.status = 'completed' THEN 1 END)::NUMERIC / 
             COUNT(CASE WHEN m.status = 'completed' THEN 1 END)::NUMERIC) * 100, 
            2
        )
        ELSE 0.00
    END AS win_percentage,
    -- Calculate current streak
    MAX(CASE WHEN m.status = 'completed' THEN 
        CASE 
            WHEN m.winner_id = t.id THEN 1
            ELSE -1
        END
    END)::INTEGER AS last_result,
    t.created_at,
    t.updated_at
FROM public.teams t
LEFT JOIN public.matches m ON (
    (m.team1_id = t.id OR m.team2_id = t.id) 
    AND m.season_id = t.season_id
)
LEFT JOIN public.divisions d ON d.id = t.division_id
WHERE t.season_id IS NOT NULL
GROUP BY 
    t.id, t.name, t.coach_name, t.division, t.conference, 
    t.division_id, t.season_id, d.conference_id, t.created_at, t.updated_at;

-- Create indexes on materialized view for fast queries
CREATE INDEX IF NOT EXISTS idx_mv_standings_season ON public.mv_league_standings(season_id);
CREATE INDEX IF NOT EXISTS idx_mv_standings_conference ON public.mv_league_standings(conference_id);
CREATE INDEX IF NOT EXISTS idx_mv_standings_division ON public.mv_league_standings(division_id);
CREATE INDEX IF NOT EXISTS idx_mv_standings_team ON public.mv_league_standings(team_id);
-- Composite index for common query pattern: season + conference + division
CREATE INDEX IF NOT EXISTS idx_mv_standings_season_conf_div ON public.mv_league_standings(season_id, conference_id, division_id);
-- Index for ranking queries (wins DESC, differential DESC)
CREATE INDEX IF NOT EXISTS idx_mv_standings_ranking ON public.mv_league_standings(season_id, wins DESC, differential DESC);

-- Create function to refresh standings materialized view
-- Uses CONCURRENTLY to avoid blocking reads during refresh
CREATE OR REPLACE FUNCTION public.refresh_standings_materialized_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if unique index exists (required for CONCURRENTLY)
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'mv_league_standings' 
        AND indexname = 'idx_mv_standings_team_unique'
    ) THEN
        -- Create unique index required for CONCURRENTLY refresh
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_standings_team_unique 
        ON public.mv_league_standings(team_id, season_id);
    END IF;
    
    -- Refresh concurrently to avoid blocking reads
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_league_standings;
END;
$$;

-- Create unique index for CONCURRENTLY refresh (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_standings_team_unique 
ON public.mv_league_standings(team_id, season_id);

-- Create wrapper view with RLS support
-- Materialized views don't support RLS, so we wrap it in a regular view
CREATE OR REPLACE VIEW public.league_standings
WITH (security_invoker = true)
AS
SELECT 
    team_id,
    team_name,
    coach_name,
    division,
    conference,
    division_id,
    season_id,
    conference_id,
    wins,
    losses,
    differential,
    games_played,
    win_percentage,
    last_result,
    created_at,
    updated_at,
    -- Calculate rank within division
    ROW_NUMBER() OVER (
        PARTITION BY season_id, division_id 
        ORDER BY wins DESC, differential DESC, win_percentage DESC
    ) AS division_rank,
    -- Calculate rank within conference
    ROW_NUMBER() OVER (
        PARTITION BY season_id, conference_id 
        ORDER BY wins DESC, differential DESC, win_percentage DESC
    ) AS conference_rank,
    -- Calculate overall rank
    ROW_NUMBER() OVER (
        PARTITION BY season_id 
        ORDER BY wins DESC, differential DESC, win_percentage DESC
    ) AS overall_rank
FROM public.mv_league_standings;

-- Grant permissions
GRANT SELECT ON public.mv_league_standings TO authenticated;
GRANT SELECT ON public.mv_league_standings TO anon;
GRANT SELECT ON public.league_standings TO authenticated;
GRANT SELECT ON public.league_standings TO anon;
GRANT EXECUTE ON FUNCTION public.refresh_standings_materialized_view() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_standings_materialized_view() TO service_role;

-- Enable RLS on wrapper view (will be enforced through security_invoker)
ALTER VIEW public.league_standings SET (security_invoker = true);

-- Comment on materialized view
COMMENT ON MATERIALIZED VIEW public.mv_league_standings IS 
'Precomputed league standings aggregated from match results. Refresh using refresh_standings_materialized_view() function.';

COMMENT ON VIEW public.league_standings IS 
'RLS-enabled wrapper view for standings materialized view with calculated rankings.';

COMMENT ON FUNCTION public.refresh_standings_materialized_view() IS 
'Refreshes the standings materialized view concurrently to avoid blocking reads.';
