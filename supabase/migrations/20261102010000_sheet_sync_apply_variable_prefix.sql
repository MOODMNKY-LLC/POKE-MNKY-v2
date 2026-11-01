-- fix: pl/pgsql locals in sheet_sync_apply_one collided with column names.
-- production dry-run failed with: column reference "match_id" is ambiguous
-- when the pokemon_stats upsert hit on conflict (match_id, team_id, pokemon_id).
-- draft_picks delete/where also referenced team_id / pokemon_id unqualified.
-- all locals are now v_-prefixed; #variable_conflict use_column is belt-and-suspenders.

create or replace function public.sheet_sync_apply_one(p_season uuid, change jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_op text := change->>'op';
  v_tbl text := change->>'table';
  v_after jsonb := change->'after';
  v_before jsonb := change->'before';
  v_team_id uuid;
  v_pokemon_id uuid;
  v_match_id uuid;
begin
  if v_tbl = 'teams' and v_op = 'update' then
    update public.teams
    set
      coach_name = v_after->>'coach',
      division = v_after->>'division',
      conference = v_after->>'conference',
      is_bye = (v_after->>'isBye')::boolean,
      is_active = (v_after->>'isActive')::boolean,
      regular_wins = (v_after->>'regularWins')::int,
      regular_losses = (v_after->>'regularLosses')::int,
      regular_differential = (v_after->>'regularDiff')::int,
      wins = (v_after->>'wins')::int,
      losses = (v_after->>'losses')::int,
      differential = (v_after->>'differential')::int,
      playoff_wins = (v_after->>'playoffWins')::int,
      playoff_losses = (v_after->>'playoffLosses')::int,
      playoff_differential = (v_after->>'playoffDiff')::int,
      strength_of_schedule = (v_after->>'sos')::numeric,
      streak_type = nullif(v_after->>'streakType', ''),
      current_streak = (v_after->>'streakLen')::int,
      updated_at = now()
    where season_id = p_season
      and name = v_after->>'name';
  elsif v_tbl = 'matches' and v_op in ('insert', 'update') then
    update public.matches
    set
      team1_score = (v_after->>'score1')::int,
      team2_score = (v_after->>'score2')::int,
      differential = (v_after->>'score1')::int - (v_after->>'score2')::int,
      status = v_after->>'status',
      winner_id = public.sheet_sync_team_id(p_season, v_after->>'winner'),
      is_playoff = (v_after->>'isPlayoff')::boolean,
      playoff_round = nullif(v_after->>'playoffRound', ''),
      outcome_type = v_after->>'outcomeType',
      notes = case
        when notes is null or notes like 'UNCERTAIN%' or notes like 'PROBABLE FORFEIT%'
          or notes like 'advanced vs placeholder%' or notes like 'sheet result entered%'
          then v_after->>'notes'
        else notes
      end,
      source = 'sheet'
    where season_id = p_season
      and week = (v_after->>'week')::int
      and team1_id = public.sheet_sync_team_id(p_season, v_after->>'team1')
      and team2_id = public.sheet_sync_team_id(p_season, v_after->>'team2');
    if v_op = 'insert' and not found then
      insert into public.matches (
        season_id, week, team1_id, team2_id, team1_score, team2_score, differential,
        status, winner_id, is_playoff, playoff_round, outcome_type, notes, source
      ) values (
        p_season,
        (v_after->>'week')::int,
        public.sheet_sync_team_id(p_season, v_after->>'team1'),
        public.sheet_sync_team_id(p_season, v_after->>'team2'),
        (v_after->>'score1')::int,
        (v_after->>'score2')::int,
        (v_after->>'score1')::int - (v_after->>'score2')::int,
        v_after->>'status',
        public.sheet_sync_team_id(p_season, v_after->>'winner'),
        (v_after->>'isPlayoff')::boolean,
        nullif(v_after->>'playoffRound', ''),
        v_after->>'outcomeType',
        v_after->>'notes',
        'sheet'
      );
    end if;
  elsif v_tbl = 'matches' and v_op = 'delete' then
    delete from public.matches
    where season_id = p_season
      and source = 'sheet'
      and week = (v_before->>'week')::int
      and team1_id = public.sheet_sync_team_id(p_season, v_before->>'team1')
      and team2_id = public.sheet_sync_team_id(p_season, v_before->>'team2');
  elsif v_tbl = 'pokemon_stats' and v_op = 'delete' then
    delete from public.pokemon_stats stats
    using public.matches matches, public.teams side, public.pokemon pokemon
    where stats.match_id = matches.id
      and stats.team_id = side.id
      and stats.pokemon_id = pokemon.id
      and stats.source = 'sheet'
      and matches.season_id = p_season
      and matches.week = (v_before->>'week')::int
      and side.name = v_before->>'team'
      and pokemon.name = v_before->>'pokemon';
  elsif v_tbl = 'pokemon_stats' and v_op in ('insert', 'update') then
    select matches.id, side.id, pokemon.id
      into v_match_id, v_team_id, v_pokemon_id
    from public.matches matches
    join public.teams home on home.id = matches.team1_id
    join public.teams away on away.id = matches.team2_id
    join public.teams side on side.season_id = p_season and side.name = v_after->>'team'
    join public.pokemon pokemon on pokemon.name = v_after->>'pokemon'
    where matches.season_id = p_season
      and matches.week = (v_after->>'week')::int
      and home.name = v_after->>'team1'
      and away.name = v_after->>'team2';
    if v_match_id is null or v_team_id is null or v_pokemon_id is null then
      raise exception 'sheet sync could not resolve pokemon_stats % week %', v_after->>'pokemon', v_after->>'week';
    end if;
    insert into public.pokemon_stats (match_id, team_id, pokemon_id, kills, appeared, source)
    values (v_match_id, v_team_id, v_pokemon_id, (v_after->>'kills')::int, true, 'sheet')
    on conflict (match_id, team_id, pokemon_id)
    do update set kills = excluded.kills, source = 'sheet'
    where public.pokemon_stats.kills is distinct from excluded.kills
      or public.pokemon_stats.source is distinct from 'sheet';
  elsif v_tbl = 'draft_picks' and v_op in ('insert', 'update') then
    insert into public.draft_picks (
      season_id, team_id, pokemon_id, acquisition, draft_round, pick_number, status,
      start_date, end_date, points_snapshot, is_tera_captain, notes, source
    ) values (
      p_season,
      public.sheet_sync_team_id(p_season, v_after->>'team'),
      public.sheet_sync_pokemon_id(v_after->>'pokemon'),
      v_after->>'acquisition',
      nullif(v_after->>'round', '')::int,
      nullif(v_after->>'pick', '')::int,
      v_after->>'status',
      nullif(v_after->>'start', '')::date,
      nullif(v_after->>'end', '')::date,
      coalesce((v_after->>'points')::int, 0),
      coalesce((v_after->>'tera')::boolean, false),
      v_after->>'notes',
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
  elsif v_tbl = 'draft_picks' and v_op = 'delete' then
    delete from public.draft_picks
    where season_id = p_season
      and source = 'sheet'
      and team_id = public.sheet_sync_team_id(p_season, v_before->>'team')
      and pokemon_id = public.sheet_sync_pokemon_id(v_before->>'pokemon');
  elsif v_tbl = 'transaction_audit' and v_op = 'update' then
    update public.transaction_audit
    set payload = payload || jsonb_build_object('superseded_at', now())
    where season_id = p_season
      and source_key = v_before->>'sourceKey';
  elsif v_tbl = 'transaction_audit' and v_op = 'insert' then
    insert into public.transaction_audit (season_id, team_id, actor_type, action, payload, source_key)
    values (
      p_season,
      public.sheet_sync_team_id(p_season, v_after->>'team'),
      'import',
      v_after->>'action',
      jsonb_strip_nulls(jsonb_build_object(
        'source_key', v_after->>'sourceKey',
        'add', v_after->'add',
        'drop', v_after->'drop',
        'raw_add', v_after->'rawAdd',
        'raw_drop', v_after->'rawDrop',
        'effective_week_inferred', v_after->'effectiveWeek',
        'source', v_after->>'sourceText'
      )),
      v_after->>'sourceKey'
    );
  elsif v_tbl = 'playoff_seeds' and v_op in ('insert', 'update') then
    insert into public.playoff_seeds (season_id, team_id, seed, round1_bye, is_division_winner, team_name)
    values (
      p_season,
      public.sheet_sync_team_id(p_season, v_after->>'team'),
      (v_after->>'seed')::int,
      (v_after->>'round1Bye')::boolean,
      (v_after->>'divisionWinner')::boolean,
      v_after->>'team'
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
    raise exception 'sheet sync does not apply %.%', v_tbl, v_op;
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
#variable_conflict use_column
declare
  v_change jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('sheet_sync:' || p_season::text)) then
    return jsonb_build_object('status', 'skipped', 'reason', 'locked');
  end if;

  begin
    for v_change in select value from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb))
    loop
      perform public.sheet_sync_apply_one(p_season, v_change);
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
grant execute on function public.sheet_sync_apply(uuid, jsonb, jsonb, boolean) to service_role;
