-- Playoff seeds persistence, split regular/playoff team stats, align SOS weights with app (2.0 / 1.5 / 1.0)

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS regular_wins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regular_losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regular_differential integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playoff_wins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playoff_losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS playoff_differential integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.teams.regular_wins IS 'Regular-season wins only (excludes playoffs)';
COMMENT ON COLUMN public.teams.playoff_wins IS 'Playoff wins only';
COMMENT ON COLUMN public.teams.wins IS 'Season total wins (regular + playoff)';

-- Backfill split columns from existing totals when unset
UPDATE public.teams
SET
  regular_wins = wins,
  regular_losses = losses,
  regular_differential = differential
WHERE regular_wins = 0
  AND regular_losses = 0
  AND (wins <> 0 OR losses <> 0);

CREATE TABLE IF NOT EXISTS public.playoff_seeds (
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  seed integer NOT NULL,
  round1_bye boolean NOT NULL DEFAULT false,
  is_division_winner boolean NOT NULL DEFAULT false,
  team_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (season_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_playoff_seeds_season_seed
  ON public.playoff_seeds (season_id, seed);

ALTER TABLE public.playoff_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read playoff_seeds"
  ON public.playoff_seeds FOR SELECT
  USING (true);

CREATE POLICY "Service role manage playoff_seeds"
  ON public.playoff_seeds FOR ALL
  USING (auth.role() = 'service_role');

-- Align SOS weights with lib/playoff-seeding.ts (2.0 intra-div, 1.5 intra-conf, 1.0 inter-conf)
CREATE OR REPLACE VIEW public.v_strength_of_schedule_regular AS
WITH games AS (
  SELECT
    r.season_id,
    r.team_id,
    r.opponent_team_id,
    CASE
      WHEN t.division = o_1.division THEN 2.0
      WHEN t.conference = o_1.conference THEN 1.5
      ELSE 1.0
    END AS weight
  FROM public.v_match_team_rows_regular r
  JOIN public.teams t ON t.id = r.team_id AND t.season_id = r.season_id
  JOIN public.teams o_1 ON o_1.id = r.opponent_team_id AND o_1.season_id = r.season_id
),
opp AS (
  SELECT season_id, team_id, win_pct
  FROM public.v_opponent_winpct_regular
)
SELECT
  g.season_id,
  g.team_id,
  CASE
    WHEN sum(g.weight) = 0::numeric THEN 0.0::double precision
    ELSE sum(g.weight::double precision * o.win_pct) / sum(g.weight)::double precision
  END AS sos
FROM games g
JOIN opp o ON o.season_id = g.season_id AND o.team_id = g.opponent_team_id
GROUP BY g.season_id, g.team_id;

-- Playoff-only team records from completed matches
CREATE OR REPLACE VIEW public.v_team_record_playoff AS
WITH playoff_rows AS (
  SELECT
    m.season_id,
    m.id AS match_id,
    m.team1_id AS team_id,
    m.team1_score AS kills,
    m.team2_score AS deaths,
    COALESCE(m.differential, m.team1_score - m.team2_score) AS differential,
    (m.winner_id = m.team1_id) AS is_win
  FROM public.matches m
  WHERE m.is_playoff = true AND m.status = 'completed'
  UNION ALL
  SELECT
    m.season_id,
    m.id AS match_id,
    m.team2_id AS team_id,
    m.team2_score AS kills,
    m.team1_score AS deaths,
    COALESCE(-m.differential, m.team2_score - m.team1_score) AS differential,
    (m.winner_id = m.team2_id) AS is_win
  FROM public.matches m
  WHERE m.is_playoff = true AND m.status = 'completed'
)
SELECT
  pr.season_id,
  pr.team_id,
  t.name AS team_name,
  t.conference,
  t.division,
  count(*) FILTER (WHERE pr.is_win)::integer AS wins,
  count(*) FILTER (WHERE NOT pr.is_win)::integer AS losses,
  coalesce(sum(pr.kills), 0)::integer AS kills,
  coalesce(sum(pr.deaths), 0)::integer AS deaths,
  coalesce(sum(pr.differential), 0)::integer AS differential
FROM playoff_rows pr
JOIN public.teams t ON t.id = pr.team_id AND t.season_id = pr.season_id
GROUP BY pr.season_id, pr.team_id, t.name, t.conference, t.division;
