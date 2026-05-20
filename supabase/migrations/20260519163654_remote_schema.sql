create or replace view "public"."v_weekly_match_team_rows" as  SELECT m.season_id,
    COALESCE(mw.week_number, m.week) AS week_number,
    m.matchweek_id,
    m.id AS match_id,
    m.is_playoff,
    false AS is_playoffs,
    m.team1_id AS team_id,
    m.team2_id AS opponent_team_id,
    t1.name AS team_name,
    t1.coach_name,
    t1.conference,
    t1.division,
    t2.name AS opponent_team_name,
    t2.coach_name AS opponent_coach_name,
    m.team1_score AS kills,
    m.team2_score AS deaths,
    COALESCE(m.differential, (m.team1_score - m.team2_score)) AS differential,
        CASE
            WHEN (m.winner_id = m.team1_id) THEN 1
            ELSE 0
        END AS is_win,
        CASE
            WHEN (m.winner_id = m.team1_id) THEN 0
            ELSE 1
        END AS is_loss
   FROM (((public.matches m
     LEFT JOIN public.matchweeks mw ON ((mw.id = m.matchweek_id)))
     JOIN public.teams t1 ON ((t1.id = m.team1_id)))
     JOIN public.teams t2 ON ((t2.id = m.team2_id)))
  WHERE (m.status = 'completed'::text)
UNION ALL
 SELECT m.season_id,
    COALESCE(mw.week_number, m.week) AS week_number,
    m.matchweek_id,
    m.id AS match_id,
    m.is_playoff,
    false AS is_playoffs,
    m.team2_id AS team_id,
    m.team1_id AS opponent_team_id,
    t2.name AS team_name,
    t2.coach_name,
    t2.conference,
    t2.division,
    t1.name AS opponent_team_name,
    t1.coach_name AS opponent_coach_name,
    m.team2_score AS kills,
    m.team1_score AS deaths,
    COALESCE((- m.differential), (m.team2_score - m.team1_score)) AS differential,
        CASE
            WHEN (m.winner_id = m.team2_id) THEN 1
            ELSE 0
        END AS is_win,
        CASE
            WHEN (m.winner_id = m.team2_id) THEN 0
            ELSE 1
        END AS is_loss
   FROM (((public.matches m
     LEFT JOIN public.matchweeks mw ON ((mw.id = m.matchweek_id)))
     JOIN public.teams t1 ON ((t1.id = m.team1_id)))
     JOIN public.teams t2 ON ((t2.id = m.team2_id)))
  WHERE (m.status = 'completed'::text);


create or replace view "public"."v_weekly_pokemon_leaders" as  SELECT m.season_id,
    COALESCE(mw.week_number, m.week) AS week_number,
    m.is_playoff,
    ps.team_id,
    t.name AS team_name,
    t.coach_name,
    ps.pokemon_id,
    p.name AS pokemon_name,
    (COALESCE(sum(ps.kills), (0)::bigint))::integer AS kills,
    (count(DISTINCT ps.match_id))::integer AS matches
   FROM ((((public.pokemon_stats ps
     JOIN public.matches m ON ((m.id = ps.match_id)))
     LEFT JOIN public.matchweeks mw ON ((mw.id = m.matchweek_id)))
     JOIN public.teams t ON ((t.id = ps.team_id)))
     JOIN public.pokemon p ON ((p.id = ps.pokemon_id)))
  WHERE (m.status = 'completed'::text)
  GROUP BY m.season_id, COALESCE(mw.week_number, m.week), m.is_playoff, ps.team_id, t.name, t.coach_name, ps.pokemon_id, p.name;


create or replace view "public"."v_weekly_team_summary" as  SELECT season_id,
    week_number,
    is_playoff,
    team_id,
    team_name,
    coach_name,
    conference,
    division,
    (COALESCE(sum(is_win), (0)::bigint))::integer AS wins,
    (COALESCE(sum(is_loss), (0)::bigint))::integer AS losses,
    (COALESCE(sum(kills), (0)::bigint))::integer AS kills,
    (COALESCE(sum(deaths), (0)::bigint))::integer AS deaths,
    (COALESCE(sum(differential), (0)::bigint))::integer AS differential
   FROM public.v_weekly_match_team_rows
  GROUP BY season_id, week_number, is_playoff, team_id, team_name, coach_name, conference, division;



