-- purpose: discord /pick uses the same validated draft-pick write as the app.
--   rpc_discord_submit_draft_pick keeps its signature and return columns.
--   bot key, draft window, coach resolution, and the audit row stay here.
--   pool, points, budget, roster max, species clause, and the draft_picks insert
--   move into draft_pool_record_validated_pick, which rpc_submit_draft_pick also calls.
--   calling rpc_submit_draft_pick from the bot would raise forbidden: that function
--   requires auth.uid() to be an admin or the team's coach, and the bot uses the
--   service role after its own key check.
-- affected: new function draft_pool_record_validated_pick; create or replace of
--   rpc_submit_draft_pick and rpc_discord_submit_draft_pick. signatures unchanged.
-- special: no table writes in this migration. no updates to seasons, rosters,
--   draft_picks, or draft_pool_version_entries. pick rules still no-op the
--   published-pool gate when the season has no published version.
-- rollback: re-apply rpc_submit_draft_pick from 20261125210000 and
--   rpc_discord_submit_draft_pick from 20260515113358 (search_path
--   public, extensions, pg_temp; service_role execute only), then
--   drop function public.draft_pool_record_validated_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text);

-- ---------------------------------------------------------------------------
-- shared validated insert
-- ---------------------------------------------------------------------------

create or replace function public.draft_pool_record_validated_pick(
  p_season_id uuid,
  p_team_id uuid,
  p_pokemon_id uuid,
  p_acquisition public.acquisition_type,
  p_draft_round integer default null,
  p_pick_number integer default null,
  p_notes text default null
)
returns table (
  draft_pick_id uuid,
  points_snapshot integer,
  points_used integer,
  budget_remaining integer,
  slots_used integer,
  slots_remaining integer
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
#variable_conflict use_column
declare
  v_budget integer;
  v_roster_max integer;
  v_points_snapshot integer;
  v_points_used integer;
  v_slots_used integer;
  v_pool_id uuid;
  v_included boolean;
  v_published_version uuid;
begin
  if not exists (
    select 1
    from public.season_teams st
    where st.season_id = p_season_id
      and st.team_id = p_team_id
  ) then
    raise exception 'TEAM_NOT_IN_SEASON';
  end if;

  select s.draft_points_budget, s.roster_size_max
  into v_budget, v_roster_max
  from public.seasons s
  where s.id = p_season_id;

  if v_budget is null then
    raise exception 'SEASON_NOT_FOUND';
  end if;

  -- same per-team lock the app pick path uses
  perform pg_advisory_xact_lock(hashtextextended('draft_pool_pick_rules:' || p_team_id::text, 0));

  v_published_version := public.draft_pool_published_version_id(p_season_id);

  if v_published_version is not null then
    v_points_snapshot := public.draft_pool_published_cost_for_pokemon(
      p_season_id, p_pokemon_id, 'POKEMON_NOT_IN_POOL'
    );
  else
    select p.draft_points
    into v_points_snapshot
    from public.pokemon p
    where p.id = p_pokemon_id;

    if v_points_snapshot is null then
      raise exception 'POKEMON_POINTS_MISSING';
    end if;

    select dp.id
    into v_pool_id
    from public.draft_pools dp
    where dp.season_id = p_season_id
      and dp.locked = true
    order by dp.created_at desc
    limit 1;

    if v_pool_id is not null then
      select dpp.included
      into v_included
      from public.draft_pool_pokemon dpp
      where dpp.draft_pool_id = v_pool_id
        and dpp.pokemon_id = p_pokemon_id;

      if v_included is distinct from true then
        raise exception 'POKEMON_NOT_IN_POOL';
      end if;
    end if;
  end if;

  select coalesce(sum(dp.points_snapshot), 0), coalesce(count(*), 0)
  into v_points_used, v_slots_used
  from public.draft_picks dp
  where dp.season_id = p_season_id
    and dp.team_id = p_team_id
    and dp.status = 'active';

  if v_points_used + v_points_snapshot > v_budget then
    raise exception 'BUDGET_EXCEEDED';
  end if;

  if v_slots_used + 1 > v_roster_max then
    raise exception 'ROSTER_FULL' using detail = 'roster_max=' || v_roster_max::text;
  end if;

  perform public.draft_pool_assert_roster_capacity(p_season_id, p_team_id, null);
  perform public.draft_pool_assert_species_clause(
    p_season_id, p_team_id, p_pokemon_id, null, null, true
  );

  insert into public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) values (
    p_season_id, p_team_id, p_pokemon_id,
    p_acquisition, p_draft_round, p_pick_number,
    'active', current_date, v_points_snapshot, p_notes
  )
  returning id into draft_pick_id;

  select coalesce(sum(dp.points_snapshot), 0), coalesce(count(*), 0)
  into v_points_used, v_slots_used
  from public.draft_picks dp
  where dp.season_id = p_season_id
    and dp.team_id = p_team_id
    and dp.status = 'active';

  return query
  select
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);
exception
  when unique_violation then
    raise exception 'POKEMON_ALREADY_OWNED';
end;
$function$;

comment on function public.draft_pool_record_validated_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) is
  'Shared pick write: published pool or legacy pool, budget, roster max, species clause, then draft_picks insert. no session auth.';

revoke all on function public.draft_pool_record_validated_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) from public, anon, authenticated;
grant execute on function public.draft_pool_record_validated_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- app pick: session auth, then the shared write
-- ---------------------------------------------------------------------------

create or replace function public.rpc_submit_draft_pick(
  p_season_id uuid,
  p_team_id uuid,
  p_pokemon_id uuid,
  p_acquisition public.acquisition_type,
  p_draft_round integer default null,
  p_pick_number integer default null,
  p_notes text default null
)
returns table (
  draft_pick_id uuid,
  points_snapshot integer,
  points_used integer,
  budget_remaining integer,
  slots_used integer,
  slots_remaining integer
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
begin
  if not (public.is_admin() or public.is_coach_of_team(p_team_id)) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select *
  from public.draft_pool_record_validated_pick(
    p_season_id,
    p_team_id,
    p_pokemon_id,
    p_acquisition,
    p_draft_round,
    p_pick_number,
    p_notes
  );
end;
$function$;

revoke all on function public.rpc_submit_draft_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) from public, anon, authenticated;
grant execute on function public.rpc_submit_draft_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- discord pick: bot auth and window stay; the write is the shared function
-- ---------------------------------------------------------------------------

create or replace function public.rpc_discord_submit_draft_pick(
  p_bot_key text,
  p_season_id uuid,
  p_discord_user_id text,
  p_pokemon_id uuid,
  p_draft_round integer default null,
  p_pick_number integer default null,
  p_notes text default null
)
returns table (
  team_id uuid,
  draft_pick_id uuid,
  points_snapshot integer,
  points_used integer,
  budget_remaining integer,
  slots_used integer,
  slots_remaining integer
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
#variable_conflict use_column
declare
  v_now timestamptz := now();
  v_open timestamptz;
  v_close timestamptz;
  v_coach_id uuid;
  v_team_id uuid;
  v_budget integer;
  v_points_snapshot integer;
  v_points_used integer;
  v_budget_remaining integer;
  v_slots_used integer;
  v_slots_remaining integer;
begin
  if not public.is_valid_api_key(p_bot_key, 'draft:submit') then
    raise exception 'BOT_UNAUTHORIZED';
  end if;

  select s.draft_open_at, s.draft_close_at, s.draft_points_budget
  into v_open, v_close, v_budget
  from public.seasons s
  where s.id = p_season_id;

  if v_budget is null then
    raise exception 'SEASON_NOT_FOUND';
  end if;

  if v_open is null or v_close is null then
    raise exception 'DRAFT_WINDOW_NOT_CONFIGURED';
  end if;

  if not (v_now >= v_open and v_now <= v_close) then
    raise exception 'DRAFT_WINDOW_CLOSED';
  end if;

  select c.id
  into v_coach_id
  from public.coaches c
  where c.active = true
    and (c.discord_user_id = p_discord_user_id or c.discord_id = p_discord_user_id)
  limit 1;

  if v_coach_id is null then
    raise exception 'COACH_NOT_FOUND_FOR_DISCORD';
  end if;

  select t.id
  into v_team_id
  from public.teams t
  join public.season_teams st on st.team_id = t.id
  where st.season_id = p_season_id
    and t.coach_id = v_coach_id
  limit 1;

  if v_team_id is null then
    raise exception 'TEAM_NOT_FOUND_FOR_COACH_IN_SEASON';
  end if;

  select
    r.draft_pick_id,
    r.points_snapshot,
    r.points_used,
    r.budget_remaining,
    r.slots_used,
    r.slots_remaining
  into
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    v_budget_remaining,
    v_slots_used,
    v_slots_remaining
  from public.draft_pool_record_validated_pick(
    p_season_id,
    v_team_id,
    p_pokemon_id,
    'draft',
    p_draft_round,
    p_pick_number,
    p_notes
  ) r;

  insert into public.transaction_audit (
    season_id, team_id,
    actor_type, actor_discord_id,
    action, payload
  ) values (
    p_season_id, v_team_id,
    'discord_bot', p_discord_user_id,
    'draft_pick',
    jsonb_build_object(
      'pokemon_id', p_pokemon_id,
      'draft_round', p_draft_round,
      'pick_number', p_pick_number,
      'notes', p_notes
    )
  );

  team_id := v_team_id;

  return query
  select
    team_id,
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    v_budget_remaining,
    v_slots_used,
    v_slots_remaining;
exception
  when unique_violation then
    raise exception 'POKEMON_ALREADY_OWNED';
end;
$function$;

comment on function public.rpc_discord_submit_draft_pick(text, uuid, text, uuid, integer, integer, text) is
  'Bot-only Discord draft pick. Same pool, points, roster, and species rules as rpc_submit_draft_pick. Returns the previous row shape; rule failures raise the same exception codes.';

revoke all on function public.rpc_discord_submit_draft_pick(text, uuid, text, uuid, integer, integer, text) from public, anon, authenticated;
grant execute on function public.rpc_discord_submit_draft_pick(text, uuid, text, uuid, integer, integer, text) to service_role;
