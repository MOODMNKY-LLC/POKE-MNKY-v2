-- sheet-exact standings
-- purpose: rank like the average at best google sheet, and store the columns
--          the season 7 import needs (outcome type, bye teams, lineups, banned sets).
-- affected: matches, teams, pokemon_stats, transaction_audit, banned_sets,
--           canonical_league_config, regular-season and playoff standings views.
-- differential convention: matches.differential = team1_score - team2_score.
-- deliberately not applied:
--   * draft_picks "one active holder per pokemon" uniqueness (leave the existing
--     unique (season_id, pokemon_id) in place).
--   * matches.playoff_round check. app keys are round_1, quarterfinals,
--     semifinals, finals (lib/playoff-rounds.ts), not the sheet's labels.
--   * coach lower(name) uniqueness. not verified duplicate-free.
-- bye-vs-bye placeholder rows are not synthesized here. bye teams sort after
-- the field via teams.is_bye, so a 0-0 bye still finishes 11th and 12th.

-- ---------------------------------------------------------------------
-- 1. matches.outcome_type
--    double_forfeit: winner_id may be null and both teams take a loss.
-- ---------------------------------------------------------------------
alter table public.matches
  add column if not exists outcome_type text not null default 'normal';

alter table public.matches drop constraint if exists matches_outcome_type_check;
alter table public.matches add constraint matches_outcome_type_check
  check (outcome_type in ('normal', 'forfeit', 'double_forfeit', 'violation', 'bye'));

comment on column public.matches.outcome_type is
  'normal, forfeit (one winner), double_forfeit (loss for both), violation, or bye (playoff advancement vs a placeholder).';

-- ---------------------------------------------------------------------
-- 2. one fixture per team pair per week per season
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from public.matches
    where season_id is not null
    group by season_id, week, least(team1_id, team2_id), greatest(team1_id, team2_id)
    having count(*) > 1
  ) then
    raise exception 'matches has duplicate season/week/team-pair rows; resolve them before adding uq_matches_season_week_pair';
  end if;
end $$;

create unique index if not exists uq_matches_season_week_pair
  on public.matches (season_id, week, least(team1_id, team2_id), greatest(team1_id, team2_id))
  where season_id is not null;

-- ---------------------------------------------------------------------
-- 2b. signed differential, then correct team differentials built from it
-- ---------------------------------------------------------------------
update public.matches
set differential = team1_score - team2_score
where team1_score is not null
  and team2_score is not null
  and differential is distinct from (team1_score - team2_score);

alter table public.matches drop constraint if exists matches_differential_signed_check;
alter table public.matches add constraint matches_differential_signed_check
  check (
    team1_score is null
    or team2_score is null
    or differential = team1_score - team2_score
  );

comment on column public.matches.differential is
  'signed team1_score - team2_score. positive means team1 outscored team2.';

-- recompute stored team differentials from completed match scores.
-- wins and losses are left as they are; views derive the table from matches.
with sides as (
  select
    matches.team1_id as team_id,
    coalesce(matches.is_playoff, false) as is_playoff,
    matches.team1_score - matches.team2_score as diff
  from public.matches
  where matches.status = 'completed'
    and matches.team1_score is not null
    and matches.team2_score is not null
  union all
  select
    matches.team2_id,
    coalesce(matches.is_playoff, false),
    matches.team2_score - matches.team1_score
  from public.matches
  where matches.status = 'completed'
    and matches.team1_score is not null
    and matches.team2_score is not null
),
agg as (
  select
    sides.team_id,
    coalesce(sum(sides.diff) filter (where not sides.is_playoff), 0)::integer as regular_diff,
    coalesce(sum(sides.diff) filter (where sides.is_playoff), 0)::integer as playoff_diff
  from sides
  group by sides.team_id
)
update public.teams
set
  regular_differential = agg.regular_diff,
  playoff_differential = agg.playoff_diff,
  differential = agg.regular_diff + agg.playoff_diff
from agg
where teams.id = agg.team_id;

-- ---------------------------------------------------------------------
-- 4. pokemon_stats: appearance flag, optional deaths, natural key
-- ---------------------------------------------------------------------
alter table public.pokemon_stats
  add column if not exists appeared boolean not null default true,
  add column if not exists deaths integer;

comment on column public.pokemon_stats.appeared is
  'true when the pokemon was brought, even with 0 kills.';
comment on column public.pokemon_stats.deaths is
  'optional per-pokemon deaths from a team tab. standings ignore this column.';

do $$
begin
  if exists (
    select 1
    from public.pokemon_stats
    group by match_id, team_id, pokemon_id
    having count(*) > 1
  ) then
    raise exception 'pokemon_stats has duplicate (match_id, team_id, pokemon_id) rows; resolve them before adding uq_pokemon_stats_match_team_pokemon';
  end if;
end $$;

create unique index if not exists uq_pokemon_stats_match_team_pokemon
  on public.pokemon_stats (match_id, team_id, pokemon_id);

-- ---------------------------------------------------------------------
-- 5. transaction_audit natural key for sheet fa rows
-- ---------------------------------------------------------------------
alter table public.transaction_audit
  add column if not exists source_key text;

create unique index if not exists uq_transaction_audit_source_key
  on public.transaction_audit (source_key)
  where source_key is not null;

comment on column public.transaction_audit.source_key is
  'importer natural key, for example s7-sheet:team1!f2:g2. null for rows written by the app.';

-- ---------------------------------------------------------------------
-- 6. draft_picks uniqueness is intentionally unchanged.
--    unique (season_id, pokemon_id) stays. do not add a partial index
--    that allows a dropped pokemon to be picked up in the same season.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 7. banned sets (league rules). season_id null means league-wide,
--    so the rows exist before season 7 is imported.
-- ---------------------------------------------------------------------
create table if not exists public.banned_sets (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons (id) on delete cascade,
  pokemon_name text,
  kind text not null check (kind in ('move', 'ability', 'item', 'combo', 'mechanic')),
  value text not null,
  rule_text text not null,
  created_at timestamptz not null default now()
);

comment on table public.banned_sets is
  'banned moves, abilities, items, combos, and mechanics. null season_id applies league-wide.';

create unique index if not exists uq_banned_sets
  on public.banned_sets (coalesce(season_id::text, ''), coalesce(pokemon_name, ''), kind, value);

alter table public.banned_sets enable row level security;

drop policy if exists "banned sets are readable by anon" on public.banned_sets;
create policy "banned sets are readable by anon"
  on public.banned_sets
  for select
  to anon
  using (true);

drop policy if exists "banned sets are readable by authenticated" on public.banned_sets;
create policy "banned sets are readable by authenticated"
  on public.banned_sets
  for select
  to authenticated
  using (true);

grant select on public.banned_sets to anon, authenticated;

insert into public.banned_sets (season_id, pokemon_name, kind, value, rule_text)
values
  (null, 'Darkrai', 'move', 'Dark Void', 'Dark Void on Darkrai. (Move)'),
  (null, 'Basculegion', 'move', 'Last Respects', 'Last Respects on Basculegion. (Move)'),
  (null, 'Houndstone', 'move', 'Last Respects', 'Last Respects on Houndstone. (Move)'),
  (null, 'Meloetta', 'move', 'Relic Song', 'Relic Song on Meloetta. (Move)'),
  (null, 'Cyclizar', 'move', 'Shed Tail', 'Shed Tail on Cyclizar. (Move)'),
  (null, 'Orthworm', 'move', 'Shed Tail', 'Shed Tail on Orthworm. (Move)'),
  (null, 'Blaziken', 'ability', 'Speed Boost', 'Speed Boost on Blaziken. (Ability)'),
  (null, 'Espathra', 'ability', 'Speed Boost', 'Speed Boost on Espathra. (Ability)'),
  (null, null, 'combo', 'Substitute + Baton Pass', 'Substitute into Baton Pass is not allowed. (Move)'),
  (null, 'Kingambit', 'ability', 'Supreme Overlord', 'Supreme Overlord on Kingambit. (Ability)'),
  (null, 'Manaphy', 'move', 'Take Heart', 'Take Heart on Manaphy. (Move)'),
  (null, 'Mew', 'move', 'Transform', 'Transform on Mew. (Move)'),
  (null, 'Urshifu Rapid Strike', 'move', 'Surging Strikes', 'Surging Strikes on Urshifu Rapid Strike. (Move)'),
  (null, 'Urshifu Single Strike', 'move', 'Wicked Blow', 'Wicked Blow on Urshifu Single Strike. (Move)'),
  (null, 'Terapagos', 'move', 'Tera Starstorm', 'Tera Starstorm on Terapagos. (Move)'),
  (null, null, 'item', 'Bright Powder', 'Battle Rules 6/13: BRIGHT POWDER IS BANNED'),
  (null, null, 'mechanic', 'Evasion boosting / accuracy lowering', 'Battle Rules 6/13: No evasion boosting abilities; no intentional accuracy lowering (Defog allowed)')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 8. placeholder bye teams (sheet "bye 1" / "bye 2")
-- ---------------------------------------------------------------------
alter table public.teams
  add column if not exists is_bye boolean not null default false;

comment on column public.teams.is_bye is
  'placeholder bye team. counted in the playoff field and appended after real teams in overall standings.';

-- ---------------------------------------------------------------------
-- 9. document the sheet tie-break on canonical_league_config.
--    views and the typescript rankers do not read this column.
-- ---------------------------------------------------------------------
alter table public.canonical_league_config
  alter column ranking_criteria set default '[
    {"priority": 1, "criterion": "games_played", "direction": "descending"},
    {"priority": 2, "criterion": "wins", "direction": "descending"},
    {"priority": 3, "criterion": "losses", "direction": "ascending"},
    {"priority": 4, "criterion": "point_differential", "direction": "descending"},
    {"priority": 5, "criterion": "strength_of_schedule", "direction": "descending", "weighting": "unweighted_distinct_opponents"},
    {"priority": 6, "criterion": "streak_letter", "direction": "descending"},
    {"priority": 7, "criterion": "streak_length", "direction": "descending"},
    {"priority": 8, "criterion": "team_name", "direction": "ascending"},
    {"priority": 9, "criterion": "coach_name", "direction": "ascending"}
  ]'::jsonb;

update public.canonical_league_config
set ranking_criteria = default
where true;

-- ---------------------------------------------------------------------
-- 10. regular-season match rows
--     weeks 1..seasons.regular_season_weeks (8 when unset, matching the sheet).
--     differential comes from scores. double forfeit is a loss for both.
--     a completed match with no winner is also a loss for both.
-- ---------------------------------------------------------------------
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
  and m.week between 1 and coalesce(se.regular_season_weeks, 8);

-- unweighted mean of distinct opponents' w/gp. 0 gp contributes 0.
create or replace view public.v_strength_of_schedule_regular as
with opponents as (
  select distinct
    rows.season_id,
    rows.team_id,
    rows.opponent_team_id
  from public.v_match_team_rows_regular rows
)
select
  opponents.season_id,
  opponents.team_id,
  coalesce(
    avg(
      case
        when (rec.wins + rec.losses) > 0
          then rec.wins::double precision / (rec.wins + rec.losses)::double precision
        else 0::double precision
      end
    ),
    0::double precision
  ) as sos
from opponents
join public.v_team_record_regular rec
  on rec.season_id = opponents.season_id
 and rec.team_id = opponents.opponent_team_id
group by opponents.season_id, opponents.team_id;

-- last result letter and the length of that trailing run.
create or replace view public.v_result_streak_regular
with (security_invoker = true) as
with ordered as (
  select
    rows.season_id,
    rows.team_id,
    case when rows.is_win = 1 then 'W' else 'L' end as result,
    row_number() over (
      partition by rows.season_id, rows.team_id
      order by rows.week desc, rows.match_id desc
    ) as rn,
    first_value(case when rows.is_win = 1 then 'W' else 'L' end) over (
      partition by rows.season_id, rows.team_id
      order by rows.week desc, rows.match_id desc
    ) as last_result
  from public.v_match_team_rows_regular rows
),
runs as (
  select
    ordered.season_id,
    ordered.team_id,
    ordered.last_result,
    min(ordered.rn) filter (where ordered.result <> ordered.last_result) as first_break,
    max(ordered.rn) as n
  from ordered
  group by ordered.season_id, ordered.team_id, ordered.last_result
)
select
  runs.season_id,
  runs.team_id,
  runs.last_result as streak_type,
  coalesce(runs.first_break - 1, runs.n)::integer as streak_len
from runs;

grant select on public.v_result_streak_regular to anon, authenticated, service_role;

-- positive length is a win streak, negative length is a loss streak.
create or replace view public.v_active_win_streak_regular as
select
  streak.season_id,
  streak.team_id,
  case
    when streak.streak_len = 0 then 0
    when streak.streak_type = 'L' then -streak.streak_len
    else streak.streak_len
  end::integer as active_win_streak
from public.v_result_streak_regular streak;

-- overall order: bye teams last, then gp, wins, losses, differential, sos,
-- streak letter (w before l), streak length, name, coach.
-- head-to-head columns stay in place so existing selects still resolve; they are 0
-- and are not part of league_rank.
create or replace view public.v_regular_team_rankings as
select
  rec.season_id,
  rec.team_id,
  rec.team_name,
  rec.conference,
  rec.division,
  rec.wins,
  rec.losses,
  rec.differential,
  case
    when coalesce(streak.streak_len, 0) = 0 then 0
    when streak.streak_type = 'L' then -streak.streak_len
    else streak.streak_len
  end::integer as active_win_streak,
  coalesce(sos.sos, 0::double precision) as sos,
  dense_rank() over (
    partition by rec.season_id
    order by
      (rec.wins + rec.losses) desc,
      rec.wins desc,
      rec.losses asc,
      rec.differential desc
  ) as tie_group_id,
  0::integer as tied_h2h_wins,
  0::integer as tied_h2h_losses,
  0::double precision as tied_h2h_win_pct,
  row_number() over (
    partition by rec.season_id
    order by
      coalesce(teams.is_bye, false) asc,
      (rec.wins + rec.losses) desc,
      rec.wins desc,
      rec.losses asc,
      rec.differential desc,
      coalesce(sos.sos, 0::double precision) desc,
      coalesce(streak.streak_type, 'W') desc,
      coalesce(streak.streak_len, 0) desc,
      lower(rec.team_name) asc,
      lower(coalesce(teams.coach_name, '')) asc
  ) as league_rank,
  (rec.wins + rec.losses)::integer as gp,
  streak.streak_type,
  coalesce(streak.streak_len, 0)::integer as streak_len,
  teams.coach_name,
  coalesce(teams.is_bye, false) as is_bye
from public.v_team_record_regular rec
join public.teams on teams.id = rec.team_id
left join public.v_strength_of_schedule_regular sos
  on sos.season_id = rec.season_id
 and sos.team_id = rec.team_id
left join public.v_result_streak_regular streak
  on streak.season_id = rec.season_id
 and streak.team_id = rec.team_id;

-- division winner: record text desc, differential desc, sos desc, name desc.
create or replace view public.v_division_winners_regular as
select distinct on (rankings.season_id, rankings.division)
  rankings.season_id,
  rankings.division,
  rankings.team_id,
  rankings.team_name,
  rankings.league_rank
from public.v_regular_team_rankings rankings
order by
  rankings.season_id,
  rankings.division,
  (rankings.wins::text || ' - ' || rankings.losses::text) desc,
  rankings.differential desc,
  rankings.sos desc,
  lower(rankings.team_name) desc;

-- seeds 1-4: division winners re-seeded by record text, differential, sos, name asc.
create or replace view public.v_playoff_seeds_top4 as
with winners as (
  select
    rankings.season_id,
    rankings.team_id,
    rankings.team_name,
    rankings.conference,
    rankings.division,
    rankings.wins,
    rankings.losses,
    rankings.differential,
    rankings.active_win_streak,
    rankings.sos,
    rankings.tie_group_id,
    rankings.tied_h2h_wins,
    rankings.tied_h2h_losses,
    rankings.tied_h2h_win_pct,
    rankings.league_rank
  from public.v_regular_team_rankings rankings
  join public.v_division_winners_regular division_winners
    on division_winners.season_id = rankings.season_id
   and division_winners.team_id = rankings.team_id
),
seeded as (
  select
    winners.season_id,
    winners.team_id,
    winners.team_name,
    winners.conference,
    winners.division,
    winners.wins,
    winners.losses,
    winners.differential,
    winners.active_win_streak,
    winners.sos,
    winners.tie_group_id,
    winners.tied_h2h_wins,
    winners.tied_h2h_losses,
    winners.tied_h2h_win_pct,
    winners.league_rank,
    row_number() over (
      partition by winners.season_id
      order by
        (winners.wins::text || ' - ' || winners.losses::text) desc,
        winners.differential desc,
        winners.sos desc,
        lower(winners.team_name) asc
    ) as seed
  from winners
)
select
  seeded.season_id,
  seeded.team_id,
  seeded.team_name,
  seeded.conference,
  seeded.division,
  seeded.wins,
  seeded.losses,
  seeded.differential,
  seeded.active_win_streak,
  seeded.sos,
  seeded.tie_group_id,
  seeded.tied_h2h_wins,
  seeded.tied_h2h_losses,
  seeded.tied_h2h_win_pct,
  seeded.league_rank,
  seeded.seed
from seeded
where seeded.seed >= 1
  and seeded.seed <= 4;

-- seeds 5-12: remaining teams by record text, differential, name asc. no sos.
create or replace view public.v_playoff_seeds_5_12 as
with winners as (
  select
    division_winners.season_id,
    division_winners.team_id
  from public.v_division_winners_regular division_winners
),
remaining as (
  select
    rankings.season_id,
    rankings.team_id,
    rankings.team_name,
    rankings.wins,
    rankings.losses,
    rankings.differential
  from public.v_regular_team_rankings rankings
  left join winners
    on winners.season_id = rankings.season_id
   and winners.team_id = rankings.team_id
  where winners.team_id is null
),
seeded as (
  select
    remaining.season_id,
    remaining.team_id,
    remaining.team_name,
    row_number() over (
      partition by remaining.season_id
      order by
        (remaining.wins::text || ' - ' || remaining.losses::text) desc,
        remaining.differential desc,
        lower(remaining.team_name) asc
    ) as seed_in_remaining
  from remaining
)
select
  seeded.season_id,
  seeded.team_id,
  seeded.team_name,
  (seeded.seed_in_remaining + 4) as seed
from seeded
where seeded.seed_in_remaining >= 1
  and seeded.seed_in_remaining <= 8;

-- playoff differentials use the same signed scores. double forfeit is a loss for both.
create or replace view public.v_team_record_playoff as
with playoff_rows as (
  select
    matches.season_id,
    matches.id as match_id,
    matches.team1_id as team_id,
    matches.team1_score as kills,
    matches.team2_score as deaths,
    case
      when matches.team1_score is not null and matches.team2_score is not null
        then matches.team1_score - matches.team2_score
      else coalesce(matches.differential, 0)
    end as differential,
    case
      when matches.outcome_type = 'double_forfeit' or matches.winner_id is null then false
      else matches.winner_id = matches.team1_id
    end as is_win
  from public.matches
  where matches.is_playoff = true
    and matches.status = 'completed'
  union all
  select
    matches.season_id,
    matches.id,
    matches.team2_id,
    matches.team2_score,
    matches.team1_score,
    case
      when matches.team1_score is not null and matches.team2_score is not null
        then matches.team2_score - matches.team1_score
      else coalesce(-matches.differential, 0)
    end,
    case
      when matches.outcome_type = 'double_forfeit' or matches.winner_id is null then false
      else matches.winner_id = matches.team2_id
    end
  from public.matches
  where matches.is_playoff = true
    and matches.status = 'completed'
)
select
  playoff_rows.season_id,
  playoff_rows.team_id,
  teams.name as team_name,
  teams.conference,
  teams.division,
  count(*) filter (where playoff_rows.is_win)::integer as wins,
  count(*) filter (where not playoff_rows.is_win)::integer as losses,
  coalesce(sum(playoff_rows.kills), 0)::integer as kills,
  coalesce(sum(playoff_rows.deaths), 0)::integer as deaths,
  coalesce(sum(playoff_rows.differential), 0)::integer as differential
from playoff_rows
join public.teams
  on teams.id = playoff_rows.team_id
 and teams.season_id = playoff_rows.season_id
group by
  playoff_rows.season_id,
  playoff_rows.team_id,
  teams.name,
  teams.conference,
  teams.division;

alter view public.v_match_team_rows_regular set (security_invoker = true);
alter view public.v_strength_of_schedule_regular set (security_invoker = true);
alter view public.v_result_streak_regular set (security_invoker = true);
alter view public.v_active_win_streak_regular set (security_invoker = true);
alter view public.v_regular_team_rankings set (security_invoker = true);
alter view public.v_division_winners_regular set (security_invoker = true);
alter view public.v_playoff_seeds_top4 set (security_invoker = true);
alter view public.v_playoff_seeds_5_12 set (security_invoker = true);
alter view public.v_team_record_playoff set (security_invoker = true);
