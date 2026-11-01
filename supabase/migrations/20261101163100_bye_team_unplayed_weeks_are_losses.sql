-- Bye teams take a loss for each regular-season week with no completed match.
-- The sheet's Bye 1 / Bye 2 rows are 0-8, differential 0, streak L8 because each
-- of weeks 1-8 is a bye-vs-bye placeholder (both sides lose, 0 kills). Those
-- rows were not imported. Playoff games stored as outcome_type 'bye' are
-- is_playoff and stay out of the regular-season table.
-- Synthetic rows are only the bye team's own result. They have no opponent,
-- so real teams' records, differentials, and strength of schedule do not change.

create or replace view public.v_match_team_rows_regular as
select
  m.season_id,
  m.id as match_id,
  m.week,
  coalesce(m.played_at, m.created_at, now()) as played_at,
  false as is_playoffs,
  m.team1_id as team_id,
  m.team2_id as opponent_team_id,
  m.team1_score as kills,
  m.team2_score as deaths,
  case
    when m.team1_score is not null and m.team2_score is not null then m.team1_score - m.team2_score
    else coalesce(m.differential, 0)
  end as differential,
  case
    when m.outcome_type = 'double_forfeit' then 0
    when m.winner_id = m.team1_id then 1
    else 0
  end as is_win,
  case
    when m.outcome_type = 'double_forfeit' then 1
    when m.winner_id = m.team1_id then 0
    else 1
  end as is_loss
from public.matches m
left join public.seasons se on se.id = m.season_id
where coalesce(m.is_playoff, false) = false
  and m.status = 'completed'
  and m.week between 1 and coalesce(se.regular_season_weeks, 8)
union all
select
  m.season_id,
  m.id as match_id,
  m.week,
  coalesce(m.played_at, m.created_at, now()) as played_at,
  false as is_playoffs,
  m.team2_id as team_id,
  m.team1_id as opponent_team_id,
  m.team2_score as kills,
  m.team1_score as deaths,
  case
    when m.team1_score is not null and m.team2_score is not null then m.team2_score - m.team1_score
    else coalesce(-m.differential, 0)
  end as differential,
  case
    when m.outcome_type = 'double_forfeit' then 0
    when m.winner_id = m.team2_id then 1
    else 0
  end as is_win,
  case
    when m.outcome_type = 'double_forfeit' then 1
    when m.winner_id = m.team2_id then 0
    else 1
  end as is_loss
from public.matches m
left join public.seasons se on se.id = m.season_id
where coalesce(m.is_playoff, false) = false
  and m.status = 'completed'
  and m.week between 1 and coalesce(se.regular_season_weeks, 8)
union all
select
  t.season_id,
  null::uuid as match_id,
  weeks.week,
  coalesce(se.start_date::timestamptz, now()) as played_at,
  false as is_playoffs,
  t.id as team_id,
  null::uuid as opponent_team_id,
  0 as kills,
  0 as deaths,
  0 as differential,
  0 as is_win,
  1 as is_loss
from public.teams t
join public.seasons se on se.id = t.season_id
cross join lateral generate_series(1, coalesce(se.regular_season_weeks, 8)) as weeks(week)
where t.is_bye
  and not exists (
    select 1
    from public.matches m
    where m.season_id = t.season_id
      and coalesce(m.is_playoff, false) = false
      and m.status = 'completed'
      and m.week = weeks.week
      and (m.team1_id = t.id or m.team2_id = t.id)
  );

alter view public.v_match_team_rows_regular set (security_invoker = true);
