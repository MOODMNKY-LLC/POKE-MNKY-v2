-- sheet sync apply: one transaction, sheet-owned rows, and the standings gate.
-- is_current is not written. season 7 is the sheet-synced season.

alter table public.seasons
  add column if not exists sheet_spreadsheet_id text,
  add column if not exists sheet_sync_enabled boolean not null default false;

comment on column public.seasons.sheet_sync_enabled is
  'The one season the league-sheet cron may write. Independent of is_current.';

update public.seasons
set
  sheet_sync_enabled = true,
  sheet_spreadsheet_id = '1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw'
where season_id = 'AABPBL-Season-7-2027';

alter table public.matches
  add column if not exists source text not null default 'app';
alter table public.pokemon_stats
  add column if not exists source text not null default 'app';
alter table public.draft_picks
  add column if not exists source text not null default 'app';

comment on column public.matches.source is
  'sheet for rows this sync created. app rows are never deleted by the sync.';

update public.matches
set source = 'sheet'
where season_id = (select id from public.seasons where season_id = 'AABPBL-Season-7-2027');

update public.draft_picks
set source = 'sheet'
where season_id = (select id from public.seasons where season_id = 'AABPBL-Season-7-2027');

update public.pokemon_stats as stats
set source = 'sheet'
from public.matches
where matches.id = stats.match_id
  and matches.season_id = (select id from public.seasons where season_id = 'AABPBL-Season-7-2027');

alter table public.sheet_sync_runs
  add column if not exists season_id uuid references public.seasons (id),
  add column if not exists trigger text,
  add column if not exists mode text,
  add column if not exists sheet_version text,
  add column if not exists sheet_modified_time timestamptz,
  add column if not exists snapshot_sha256 text,
  add column if not exists counts jsonb not null default '{}'::jsonb,
  add column if not exists changes jsonb not null default '[]'::jsonb,
  add column if not exists warnings jsonb not null default '[]'::jsonb,
  add column if not exists unmapped jsonb not null default '[]'::jsonb;

alter table public.sheet_sync_runs drop constraint if exists sheet_sync_runs_status_check;
alter table public.sheet_sync_runs
  add constraint sheet_sync_runs_status_check
  check (status in (
    'running', 'dry_run', 'applied', 'failed', 'unchanged', 'no_changes', 'blocked'
  ));

create or replace function public.sheet_sync_team_id(p_season uuid, p_name text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.teams where season_id = p_season and name = p_name limit 1
$$;

create or replace function public.sheet_sync_pokemon_id(p_name text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.pokemon where name = p_name limit 1
$$;

create or replace function public.sheet_sync_rankings_match(p_season uuid, p_expected jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with actual as (
    select
      team_name,
      wins,
      losses,
      differential,
      coalesce(streak_type, 'W') || coalesce(streak_len, 0)::text as streak
    from public.v_regular_team_rankings
    where season_id = p_season
  ),
  expected as (
    select
      value->>'team' as team_name,
      (value->>'wins')::int as wins,
      (value->>'losses')::int as losses,
      (value->>'diff')::int as differential,
      value->>'streak' as streak
    from jsonb_array_elements(p_expected)
  )
  select not exists (
    select 1
    from expected
    left join actual using (team_name)
    where actual.team_name is null
      or actual.wins is distinct from expected.wins
      or actual.losses is distinct from expected.losses
      or actual.differential is distinct from expected.differential
      or actual.streak is distinct from expected.streak
  )
$$;

create or replace function public.sheet_sync_apply_one(p_season uuid, change jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  op text := change->>'op';
  tbl text := change->>'table';
  after jsonb := change->'after';
  before jsonb := change->'before';
  team_id uuid;
  pokemon_id uuid;
  match_id uuid;
begin
  if tbl = 'teams' and op = 'update' then
    update public.teams
    set
      coach_name = after->>'coach',
      division = after->>'division',
      conference = after->>'conference',
      is_bye = (after->>'isBye')::boolean,
      is_active = (after->>'isActive')::boolean,
      regular_wins = (after->>'regularWins')::int,
      regular_losses = (after->>'regularLosses')::int,
      regular_differential = (after->>'regularDiff')::int,
      wins = (after->>'wins')::int,
      losses = (after->>'losses')::int,
      differential = (after->>'differential')::int,
      playoff_wins = (after->>'playoffWins')::int,
      playoff_losses = (after->>'playoffLosses')::int,
      playoff_differential = (after->>'playoffDiff')::int,
      strength_of_schedule = (after->>'sos')::numeric,
      streak_type = nullif(after->>'streakType', ''),
      current_streak = (after->>'streakLen')::int,
      updated_at = now()
    where season_id = p_season
      and name = after->>'name';
  elsif tbl = 'matches' and op in ('insert', 'update') then
    update public.matches
    set
      team1_score = (after->>'score1')::int,
      team2_score = (after->>'score2')::int,
      differential = (after->>'score1')::int - (after->>'score2')::int,
      status = after->>'status',
      winner_id = public.sheet_sync_team_id(p_season, after->>'winner'),
      is_playoff = (after->>'isPlayoff')::boolean,
      playoff_round = nullif(after->>'playoffRound', ''),
      outcome_type = after->>'outcomeType',
      notes = case
        when notes is null or notes like 'UNCERTAIN%' or notes like 'PROBABLE FORFEIT%'
          or notes like 'advanced vs placeholder%' or notes like 'sheet result entered%'
          then after->>'notes'
        else notes
      end,
      source = 'sheet'
    where season_id = p_season
      and week = (after->>'week')::int
      and team1_id = public.sheet_sync_team_id(p_season, after->>'team1')
      and team2_id = public.sheet_sync_team_id(p_season, after->>'team2');
    if op = 'insert' and not found then
      insert into public.matches (
        season_id, week, team1_id, team2_id, team1_score, team2_score, differential,
        status, winner_id, is_playoff, playoff_round, outcome_type, notes, source
      ) values (
        p_season,
        (after->>'week')::int,
        public.sheet_sync_team_id(p_season, after->>'team1'),
        public.sheet_sync_team_id(p_season, after->>'team2'),
        (after->>'score1')::int,
        (after->>'score2')::int,
        (after->>'score1')::int - (after->>'score2')::int,
        after->>'status',
        public.sheet_sync_team_id(p_season, after->>'winner'),
        (after->>'isPlayoff')::boolean,
        nullif(after->>'playoffRound', ''),
        after->>'outcomeType',
        after->>'notes',
        'sheet'
      );
    end if;
  elsif tbl = 'matches' and op = 'delete' then
    delete from public.matches
    where season_id = p_season
      and source = 'sheet'
      and week = (before->>'week')::int
      and team1_id = public.sheet_sync_team_id(p_season, before->>'team1')
      and team2_id = public.sheet_sync_team_id(p_season, before->>'team2');
  elsif tbl = 'pokemon_stats' and op = 'delete' then
    delete from public.pokemon_stats stats
    using public.matches matches, public.teams side, public.pokemon pokemon
    where stats.match_id = matches.id
      and stats.team_id = side.id
      and stats.pokemon_id = pokemon.id
      and stats.source = 'sheet'
      and matches.season_id = p_season
      and matches.week = (before->>'week')::int
      and side.name = before->>'team'
      and pokemon.name = before->>'pokemon';
  elsif tbl = 'pokemon_stats' and op in ('insert', 'update') then
    select matches.id, side.id, pokemon.id
      into match_id, team_id, pokemon_id
    from public.matches matches
    join public.teams home on home.id = matches.team1_id
    join public.teams away on away.id = matches.team2_id
    join public.teams side on side.season_id = p_season and side.name = after->>'team'
    join public.pokemon pokemon on pokemon.name = after->>'pokemon'
    where matches.season_id = p_season
      and matches.week = (after->>'week')::int
      and home.name = after->>'team1'
      and away.name = after->>'team2';
    if match_id is null or team_id is null or pokemon_id is null then
      raise exception 'sheet sync could not resolve pokemon_stats % week %', after->>'pokemon', after->>'week';
    end if;
    insert into public.pokemon_stats (match_id, team_id, pokemon_id, kills, appeared, source)
    values (match_id, team_id, pokemon_id, (after->>'kills')::int, true, 'sheet')
    on conflict (match_id, team_id, pokemon_id)
    do update set kills = excluded.kills, source = 'sheet'
    where public.pokemon_stats.kills is distinct from excluded.kills
      or public.pokemon_stats.source is distinct from 'sheet';
  elsif tbl = 'draft_picks' and op in ('insert', 'update') then
    insert into public.draft_picks (
      season_id, team_id, pokemon_id, acquisition, draft_round, pick_number, status,
      start_date, end_date, points_snapshot, is_tera_captain, notes, source
    ) values (
      p_season,
      public.sheet_sync_team_id(p_season, after->>'team'),
      public.sheet_sync_pokemon_id(after->>'pokemon'),
      after->>'acquisition',
      nullif(after->>'round', '')::int,
      nullif(after->>'pick', '')::int,
      after->>'status',
      nullif(after->>'start', '')::date,
      nullif(after->>'end', '')::date,
      coalesce((after->>'points')::int, 0),
      coalesce((after->>'tera')::boolean, false),
      after->>'notes',
      'sheet'
    )
    on conflict (season_id, pokemon_id) do update set
      team_id = excluded.team_id,
      acquisition = excluded.acquisition,
      draft_round = excluded.draft_round,
      pick_number = excluded.pick_number,
      status = excluded.status,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      points_snapshot = excluded.points_snapshot,
      is_tera_captain = excluded.is_tera_captain,
      notes = excluded.notes,
      source = 'sheet',
      updated_at = now()
    where (
      public.draft_picks.team_id,
      public.draft_picks.acquisition,
      public.draft_picks.draft_round,
      public.draft_picks.pick_number,
      public.draft_picks.status,
      public.draft_picks.start_date,
      public.draft_picks.end_date,
      public.draft_picks.points_snapshot,
      public.draft_picks.is_tera_captain,
      public.draft_picks.notes
    ) is distinct from (
      excluded.team_id,
      excluded.acquisition,
      excluded.draft_round,
      excluded.pick_number,
      excluded.status,
      excluded.start_date,
      excluded.end_date,
      excluded.points_snapshot,
      excluded.is_tera_captain,
      excluded.notes
    );
  elsif tbl = 'draft_picks' and op = 'delete' then
    delete from public.draft_picks
    where season_id = p_season
      and source = 'sheet'
      and team_id = public.sheet_sync_team_id(p_season, before->>'team')
      and pokemon_id = public.sheet_sync_pokemon_id(before->>'pokemon');
  elsif tbl = 'transaction_audit' and op = 'update' then
    update public.transaction_audit
    set payload = payload || jsonb_build_object('superseded_at', now())
    where season_id = p_season
      and source_key = before->>'sourceKey';
  elsif tbl = 'transaction_audit' and op = 'insert' then
    insert into public.transaction_audit (season_id, team_id, actor_type, action, payload, source_key)
    values (
      p_season,
      public.sheet_sync_team_id(p_season, after->>'team'),
      'import',
      after->>'action',
      jsonb_strip_nulls(jsonb_build_object(
        'source_key', after->>'sourceKey',
        'add', after->'add',
        'drop', after->'drop',
        'raw_add', after->'rawAdd',
        'raw_drop', after->'rawDrop',
        'effective_week_inferred', after->'effectiveWeek',
        'source', after->>'sourceText'
      )),
      after->>'sourceKey'
    );
  elsif tbl = 'playoff_seeds' and op in ('insert', 'update') then
    insert into public.playoff_seeds (season_id, team_id, seed, round1_bye, is_division_winner, team_name)
    values (
      p_season,
      public.sheet_sync_team_id(p_season, after->>'team'),
      (after->>'seed')::int,
      (after->>'round1Bye')::boolean,
      (after->>'divisionWinner')::boolean,
      after->>'team'
    )
    on conflict (season_id, team_id) do update set
      seed = excluded.seed,
      round1_bye = excluded.round1_bye,
      is_division_winner = excluded.is_division_winner,
      team_name = excluded.team_name
    where (
      public.playoff_seeds.seed,
      public.playoff_seeds.round1_bye,
      public.playoff_seeds.is_division_winner
    ) is distinct from (
      excluded.seed,
      excluded.round1_bye,
      excluded.is_division_winner
    );
  else
    raise exception 'sheet sync does not apply %.%', tbl, op;
  end if;
end;
$$;

create or replace function public.sheet_sync_apply(
  p_season uuid,
  p_changes jsonb,
  p_expected jsonb,
  p_dry_run boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  change jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('sheet_sync:' || p_season::text)) then
    return jsonb_build_object('status', 'skipped', 'reason', 'locked');
  end if;

  begin
    for change in select value from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb))
    loop
      perform public.sheet_sync_apply_one(p_season, change);
    end loop;

    if p_expected is not null and jsonb_typeof(p_expected) = 'array' and jsonb_array_length(p_expected) > 0 then
      if not public.sheet_sync_rankings_match(p_season, p_expected) then
        raise exception 'sheet_sync_verification';
      end if;
    end if;

    if p_dry_run then
      raise exception 'sheet_sync_dry_run';
    end if;
  exception
    when others then
      if sqlerrm = 'sheet_sync_dry_run' then
        return jsonb_build_object('status', 'dry_run', 'changes', jsonb_array_length(coalesce(p_changes, '[]'::jsonb)));
      end if;
      raise;
  end;

  return jsonb_build_object('status', 'applied', 'changes', jsonb_array_length(coalesce(p_changes, '[]'::jsonb)));
end;
$$;

revoke all on function public.sheet_sync_apply(uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.sheet_sync_apply_one(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.sheet_sync_team_id(uuid, text) from public, anon, authenticated;
revoke all on function public.sheet_sync_pokemon_id(text) from public, anon, authenticated;
revoke all on function public.sheet_sync_rankings_match(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sheet_sync_apply(uuid, jsonb, jsonb, boolean) to service_role;
