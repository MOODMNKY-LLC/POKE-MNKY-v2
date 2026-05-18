create or replace view public.v_weekly_match_team_rows
with (security_invoker = true) as
  select
    m.season_id,
    coalesce(mw.week_number, m.week) as week_number,
    m.matchweek_id,
    m.id as match_id,
    m.is_playoff,
    false as is_playoffs,
    m.team1_id as team_id,
    m.team2_id as opponent_team_id,
    t1.name as team_name,
    t1.coach_name,
    t1.conference,
    t1.division,
    t2.name as opponent_team_name,
    t2.coach_name as opponent_coach_name,
    m.team1_score as kills,
    m.team2_score as deaths,
    coalesce(m.differential, (m.team1_score - m.team2_score)) as differential,
    case when m.winner_id = m.team1_id then 1 else 0 end as is_win,
    case when m.winner_id = m.team1_id then 0 else 1 end as is_loss
  from public.matches m
  left join public.matchweeks mw on mw.id = m.matchweek_id
  join public.teams t1 on t1.id = m.team1_id
  join public.teams t2 on t2.id = m.team2_id
  where m.status = 'completed'

  union all

  select
    m.season_id,
    coalesce(mw.week_number, m.week) as week_number,
    m.matchweek_id,
    m.id as match_id,
    m.is_playoff,
    false as is_playoffs,
    m.team2_id as team_id,
    m.team1_id as opponent_team_id,
    t2.name as team_name,
    t2.coach_name,
    t2.conference,
    t2.division,
    t1.name as opponent_team_name,
    t1.coach_name as opponent_coach_name,
    m.team2_score as kills,
    m.team1_score as deaths,
    coalesce((-m.differential), (m.team2_score - m.team1_score)) as differential,
    case when m.winner_id = m.team2_id then 1 else 0 end as is_win,
    case when m.winner_id = m.team2_id then 0 else 1 end as is_loss
  from public.matches m
  left join public.matchweeks mw on mw.id = m.matchweek_id
  join public.teams t1 on t1.id = m.team1_id
  join public.teams t2 on t2.id = m.team2_id
  where m.status = 'completed';

create or replace view public.v_weekly_team_summary
with (security_invoker = true) as
  select
    season_id,
    week_number,
    is_playoff,
    team_id,
    team_name,
    coach_name,
    conference,
    division,
    coalesce(sum(is_win), 0)::integer as wins,
    coalesce(sum(is_loss), 0)::integer as losses,
    coalesce(sum(kills), 0)::integer as kills,
    coalesce(sum(deaths), 0)::integer as deaths,
    coalesce(sum(differential), 0)::integer as differential
  from public.v_weekly_match_team_rows
  group by season_id, week_number, is_playoff, team_id, team_name, coach_name, conference, division;

create or replace view public.v_weekly_pokemon_leaders
with (security_invoker = true) as
  select
    m.season_id,
    coalesce(mw.week_number, m.week) as week_number,
    m.is_playoff,
    ps.team_id,
    t.name as team_name,
    t.coach_name,
    ps.pokemon_id,
    p.name as pokemon_name,
    coalesce(sum(ps.kills), 0)::integer as kills,
    count(distinct ps.match_id)::integer as matches
  from public.pokemon_stats ps
  join public.matches m on m.id = ps.match_id
  left join public.matchweeks mw on mw.id = m.matchweek_id
  join public.teams t on t.id = ps.team_id
  join public.pokemon p on p.id = ps.pokemon_id
  where m.status = 'completed'
  group by
    m.season_id,
    coalesce(mw.week_number, m.week),
    m.is_playoff,
    ps.team_id,
    t.name,
    t.coach_name,
    ps.pokemon_id,
    p.name;
