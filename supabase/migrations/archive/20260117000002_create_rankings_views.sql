-- Migration: Create rankings calculation views (adapted from ChatGPT's SQL spec)
-- Date: 2026-01-17
-- Purpose: Implement league rankings using Matt's exact tie-break chain
-- Adapted from: CHAT-GPT-SOS-DB-PLANNING.md
-- Schema adaptations: team1_id/team2_id, team1_score/team2_score, is_playoff (singular)

-- ============================================================================
-- 1) Core derived stats views (regular season)
-- ============================================================================

-- 1A) Normalize matches into per-team rows (kills/deaths/diff per game)
-- This view creates two rows per match (one per team perspective)
CREATE OR REPLACE VIEW v_match_team_rows_regular AS
SELECT
  m.season_id,
  m.id AS match_id,
  m.week,
  COALESCE(m.played_at, m.created_at, NOW()) AS played_at,
  false AS is_playoffs,
  m.team1_id AS team_id,
  m.team2_id AS opponent_team_id,
  m.team1_score AS kills,
  m.team2_score AS deaths,
  -- Use stored differential if available, otherwise compute
  COALESCE(m.differential, m.team1_score - m.team2_score) AS differential,
  CASE WHEN m.winner_id = m.team1_id THEN 1 ELSE 0 END AS is_win,
  CASE WHEN m.winner_id = m.team1_id THEN 0 ELSE 1 END AS is_loss
FROM matches m
WHERE m.is_playoff = false
  AND m.status = 'completed'

UNION ALL

SELECT
  m.season_id,
  m.id AS match_id,
  m.week,
  COALESCE(m.played_at, m.created_at, NOW()) AS played_at,
  false AS is_playoffs,
  m.team2_id AS team_id,
  m.team1_id AS opponent_team_id,
  m.team2_score AS kills,
  m.team1_score AS deaths,
  -- Use stored differential if available, otherwise compute (negated for team2)
  COALESCE(-m.differential, m.team2_score - m.team1_score) AS differential,
  CASE WHEN m.winner_id = m.team2_id THEN 1 ELSE 0 END AS is_win,
  CASE WHEN m.winner_id = m.team2_id THEN 0 ELSE 1 END AS is_loss
FROM matches m
WHERE m.is_playoff = false
  AND m.status = 'completed';

COMMENT ON VIEW v_match_team_rows_regular IS 'Normalized match data: one row per team per match (regular season only)';

-- 1B) Team record + totals (wins, losses, kills, deaths, differential)
CREATE OR REPLACE VIEW v_team_record_regular AS
SELECT
  t.season_id,
  t.id AS team_id,
  t.name AS team_name,
  t.conference,
  t.division,
  COALESCE(SUM(r.is_win), 0)::int AS wins,
  COALESCE(SUM(r.is_loss), 0)::int AS losses,
  COALESCE(SUM(r.kills), 0)::int AS kills,
  COALESCE(SUM(r.deaths), 0)::int AS deaths,
  COALESCE(SUM(r.differential), 0)::int AS differential
FROM teams t
LEFT JOIN v_match_team_rows_regular r
  ON r.season_id = t.season_id AND r.team_id = t.id
GROUP BY t.season_id, t.id, t.name, t.conference, t.division;

COMMENT ON VIEW v_team_record_regular IS 'Team records: wins, losses, kills, deaths, differential (regular season)';

-- 1C) Opponent win% (regular season) used for SoS
CREATE OR REPLACE VIEW v_opponent_winpct_regular AS
SELECT
  tr.season_id,
  tr.team_id,
  tr.wins,
  tr.losses,
  CASE
    WHEN (tr.wins + tr.losses) = 0 THEN 0.0
    ELSE tr.wins::float / (tr.wins + tr.losses)::float
  END AS win_pct
FROM v_team_record_regular tr;

COMMENT ON VIEW v_opponent_winpct_regular IS 'Opponent win percentages for SoS calculations (regular season)';

-- ============================================================================
-- 2) Head-to-head view (regular season)
-- ============================================================================

CREATE OR REPLACE VIEW v_head_to_head_regular AS
SELECT
  r.season_id,
  r.team_id,
  r.opponent_team_id,
  SUM(r.is_win)::int AS h2h_wins,
  SUM(r.is_loss)::int AS h2h_losses,
  (SUM(r.is_win) + SUM(r.is_loss))::int AS h2h_games
FROM v_match_team_rows_regular r
GROUP BY r.season_id, r.team_id, r.opponent_team_id;

COMMENT ON VIEW v_head_to_head_regular IS 'Pairwise head-to-head records (regular season)';

-- ============================================================================
-- 3) Active win streak (regular season)
-- Computes the current win streak (consecutive wins from most recent match backwards)
-- ============================================================================

CREATE OR REPLACE VIEW v_active_win_streak_regular AS
WITH ordered AS (
  SELECT
    r.season_id,
    r.team_id,
    r.match_id,
    r.week,
    r.played_at,
    r.is_win,
    ROW_NUMBER() OVER (
      PARTITION BY r.season_id, r.team_id 
      ORDER BY r.week DESC, r.played_at DESC, r.match_id DESC
    ) AS rn_desc
  FROM v_match_team_rows_regular r
),
first_loss_pos AS (
  SELECT
    season_id,
    team_id,
    MIN(rn_desc) FILTER (WHERE is_win = 0) AS first_nonwin_rn
  FROM ordered
  GROUP BY season_id, team_id
)
SELECT
  o.season_id,
  o.team_id,
  CASE
    -- if no games: 0
    WHEN MAX(o.rn_desc) IS NULL THEN 0
    -- if never lost in season so far: streak = games played
    WHEN f.first_nonwin_rn IS NULL THEN COUNT(*)::int
    -- else streak = number of leading wins before first loss
    ELSE GREATEST(f.first_nonwin_rn - 1, 0)::int
  END AS active_win_streak
FROM ordered o
LEFT JOIN first_loss_pos f
  ON f.season_id = o.season_id AND f.team_id = o.team_id
GROUP BY o.season_id, o.team_id, f.first_nonwin_rn;

COMMENT ON VIEW v_active_win_streak_regular IS 'Active consecutive win streaks (regular season)';

-- ============================================================================
-- 4) Strength of Schedule (SoS) - weighted opponent win%
-- Weights: same division = 1.5, same conference = 1.25, cross conference = 1.0
-- Formula: SoS = Σ(Opponent Win% × Weight) / Σ(Weight)
-- ============================================================================

CREATE OR REPLACE VIEW v_strength_of_schedule_regular AS
WITH games AS (
  SELECT
    r.season_id,
    r.team_id,
    r.opponent_team_id,
    CASE
      WHEN t.division = o.division THEN 1.5
      WHEN t.conference = o.conference THEN 1.25
      ELSE 1.0
    END AS weight
  FROM v_match_team_rows_regular r
  JOIN teams t ON t.id = r.team_id AND t.season_id = r.season_id
  JOIN teams o ON o.id = r.opponent_team_id AND o.season_id = r.season_id
),
opp AS (
  SELECT season_id, team_id, win_pct
  FROM v_opponent_winpct_regular
)
SELECT
  g.season_id,
  g.team_id,
  CASE
    WHEN SUM(g.weight) = 0 THEN 0.0
    ELSE SUM(g.weight * o.win_pct) / SUM(g.weight)
  END AS sos
FROM games g
JOIN opp o
  ON o.season_id = g.season_id AND o.team_id = g.opponent_team_id
GROUP BY g.season_id, g.team_id;

COMMENT ON VIEW v_strength_of_schedule_regular IS 'Strength of Schedule: weighted average of opponent win percentages (regular season)';

-- ============================================================================
-- 5) Regular-season ranking view using Matt's exact tie-break chain
-- Order: wins desc → losses asc → differential desc → H2H → win streak desc → sos desc → team_name asc
-- ============================================================================

CREATE OR REPLACE VIEW v_regular_team_rankings AS
WITH base AS (
  SELECT
    r.season_id,
    r.team_id,
    r.team_name,
    r.conference,
    r.division,
    r.wins,
    r.losses,
    r.differential,
    COALESCE(s.active_win_streak, 0) AS active_win_streak,
    COALESCE(ss.sos, 0.0) AS sos
  FROM v_team_record_regular r
  LEFT JOIN v_active_win_streak_regular s
    ON s.season_id = r.season_id AND s.team_id = r.team_id
  LEFT JOIN v_strength_of_schedule_regular ss
    ON ss.season_id = r.season_id AND ss.team_id = r.team_id
),
tie_groups AS (
  SELECT
    *,
    DENSE_RANK() OVER (
      PARTITION BY season_id
      ORDER BY wins DESC, losses ASC, differential DESC
    ) AS tie_group_id
  FROM base
),
h2h_within_tie AS (
  SELECT
    tg.season_id,
    tg.tie_group_id,
    tg.team_id,
    COALESCE(SUM(h.h2h_wins), 0)::int AS tied_h2h_wins,
    COALESCE(SUM(h.h2h_losses), 0)::int AS tied_h2h_losses,
    CASE
      WHEN (COALESCE(SUM(h.h2h_wins), 0) + COALESCE(SUM(h.h2h_losses), 0)) = 0 THEN 0.0
      ELSE COALESCE(SUM(h.h2h_wins), 0)::float
           / (COALESCE(SUM(h.h2h_wins), 0) + COALESCE(SUM(h.h2h_losses), 0))::float
    END AS tied_h2h_win_pct
  FROM tie_groups tg
  LEFT JOIN v_head_to_head_regular h
    ON h.season_id = tg.season_id
   AND h.team_id = tg.team_id
  -- only count opponents inside the same tie group
  LEFT JOIN tie_groups opp
    ON opp.season_id = tg.season_id
   AND opp.tie_group_id = tg.tie_group_id
   AND opp.team_id = h.opponent_team_id
  GROUP BY tg.season_id, tg.tie_group_id, tg.team_id
)
SELECT
  tg.*,
  hw.tied_h2h_wins,
  hw.tied_h2h_losses,
  hw.tied_h2h_win_pct,
  ROW_NUMBER() OVER (
    PARTITION BY tg.season_id
    ORDER BY
      tg.wins DESC,
      tg.losses ASC,
      tg.differential DESC,
      hw.tied_h2h_win_pct DESC,
      tg.active_win_streak DESC,
      tg.sos DESC,
      tg.team_name ASC
  ) AS league_rank
FROM tie_groups tg
LEFT JOIN h2h_within_tie hw
  ON hw.season_id = tg.season_id
 AND hw.tie_group_id = tg.tie_group_id
 AND hw.team_id = tg.team_id;

COMMENT ON VIEW v_regular_team_rankings IS 'Regular season team rankings with all tiebreakers (Matt''s exact priority chain)';

-- ============================================================================
-- 6) Playoff seeding views (Top 4 division winners, then 5–12)
-- ============================================================================

-- 6A) Division winners (best in each division by league_rank)
CREATE OR REPLACE VIEW v_division_winners_regular AS
WITH ranked AS (
  SELECT * FROM v_regular_team_rankings
)
SELECT DISTINCT ON (season_id, division)
  season_id,
  division,
  team_id,
  team_name,
  league_rank
FROM ranked
ORDER BY season_id, division, league_rank ASC;

COMMENT ON VIEW v_division_winners_regular IS 'Division winners: top team per division (regular season)';

-- 6B) Seeds 1-4 = division winners re-ranked against each other
CREATE OR REPLACE VIEW v_playoff_seeds_top4 AS
WITH winners AS (
  SELECT r.*
  FROM v_regular_team_rankings r
  JOIN v_division_winners_regular w
    ON w.season_id = r.season_id AND w.team_id = r.team_id
),
seeded AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY season_id
      ORDER BY
        wins DESC,
        losses ASC,
        differential DESC,
        tied_h2h_win_pct DESC,
        active_win_streak DESC,
        sos DESC,
        team_name ASC
    ) AS seed
  FROM winners
)
SELECT * FROM seeded
WHERE seed BETWEEN 1 AND 4;

COMMENT ON VIEW v_playoff_seeds_top4 IS 'Playoff seeds 1-4: division winners re-ranked globally';

-- 6C) Seeds 5-12 = best remaining teams after removing division winners
CREATE OR REPLACE VIEW v_playoff_seeds_5_12 AS
WITH ranked AS (
  SELECT * FROM v_regular_team_rankings
),
winners AS (
  SELECT season_id, team_id FROM v_division_winners_regular
),
remaining AS (
  SELECT r.*
  FROM ranked r
  LEFT JOIN winners w
    ON w.season_id = r.season_id AND w.team_id = r.team_id
  WHERE w.team_id IS NULL
),
seeded AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY season_id ORDER BY league_rank ASC) AS seed_in_remaining
  FROM remaining
)
SELECT
  season_id,
  team_id,
  team_name,
  (seed_in_remaining + 4) AS seed
FROM seeded
WHERE seed_in_remaining BETWEEN 1 AND 8; -- for 12-team playoffs: 5..12

COMMENT ON VIEW v_playoff_seeds_5_12 IS 'Playoff seeds 5-12: best remaining teams after division winners';
