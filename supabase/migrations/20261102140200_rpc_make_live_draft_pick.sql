-- purpose: atomic live draft pick + timer enforce/advance helpers for Vercel Hobby.
-- affected: functions rpc_make_live_draft_pick, rpc_enforce_draft_pick_timer,
--           rpc_set_draft_pick_deadline
-- special: SECURITY DEFINER with search_path locked; execute granted to service_role
--          only (app routes authenticate then call via service role).

create or replace function public.rpc_set_draft_pick_deadline(p_session_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_limit integer;
  v_deadline timestamptz;
begin
  select coalesce(pick_time_limit_seconds, 45)
  into v_limit
  from public.draft_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  v_deadline := now() + make_interval(secs => greatest(v_limit, 1));

  update public.draft_sessions
  set current_pick_deadline_at = v_deadline,
      updated_at = now()
  where id = p_session_id;

  return v_deadline;
end;
$$;

create or replace function public.rpc_make_live_draft_pick(
  p_session_id uuid,
  p_team_id uuid,
  p_pokemon_name text,
  p_force_skip boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.draft_sessions%rowtype;
  v_pool public.draft_pool%rowtype;
  v_budget public.draft_budgets%rowtype;
  v_turn_order uuid[];
  v_effective uuid[];
  v_is_snake boolean;
  v_picks_in_round integer;
  v_expected_team uuid;
  v_pokemon_uuid uuid;
  v_type1 text;
  v_type2 text;
  v_next_pick integer;
  v_next_round integer;
  v_next_snake boolean;
  v_next_order uuid[];
  v_next_index integer;
  v_next_team uuid;
  v_total_picks integer;
  v_complete boolean;
  v_deadline timestamptz;
begin
  if p_session_id is null or p_team_id is null then
    raise exception 'INVALID_ARGS';
  end if;

  select * into v_session
  from public.draft_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.status is distinct from 'active' then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;

  if coalesce(v_session.governance_approval_status, 'approved') is distinct from 'approved' then
    raise exception 'SESSION_PENDING_APPROVAL';
  end if;

  v_turn_order := coalesce(
    array(select jsonb_array_elements_text(v_session.turn_order)::uuid),
    array[]::uuid[]
  );

  if coalesce(array_length(v_turn_order, 1), 0) = 0 then
    raise exception 'TURN_ORDER_EMPTY';
  end if;

  v_is_snake := v_session.draft_type = 'snake' and (v_session.current_round % 2 = 0);
  if v_is_snake then
    v_effective := (
      select array_agg(t order by ord desc)
      from unnest(v_turn_order) with ordinality as u(t, ord)
    );
  else
    v_effective := v_turn_order;
  end if;

  v_picks_in_round := ((v_session.current_pick_number - 1) % array_length(v_turn_order, 1));
  v_expected_team := v_effective[v_picks_in_round + 1];

  if v_expected_team is distinct from p_team_id then
    raise exception 'NOT_YOUR_TURN';
  end if;

  -- Skip / timer advance without writing a pick
  if p_force_skip then
    v_next_pick := v_session.current_pick_number + 1;
    v_next_round := ((v_next_pick - 1) / array_length(v_turn_order, 1)) + 1;
    v_next_snake := v_session.draft_type = 'snake' and (v_next_round % 2 = 0);
    if v_next_snake then
      v_next_order := (
        select array_agg(t order by ord desc)
        from unnest(v_turn_order) with ordinality as u(t, ord)
      );
    else
      v_next_order := v_turn_order;
    end if;
    v_next_index := ((v_next_pick - 1) % array_length(v_turn_order, 1));
    v_next_team := v_next_order[v_next_index + 1];
    v_total_picks := v_session.total_teams * v_session.total_rounds;
    v_complete := v_next_pick > v_total_picks;
    v_deadline := case
      when v_complete then null
      else now() + make_interval(secs => greatest(coalesce(v_session.pick_time_limit_seconds, 45), 1))
    end;

    update public.draft_sessions
    set current_pick_number = v_next_pick,
        current_round = v_next_round,
        current_team_id = v_next_team,
        status = case when v_complete then 'completed' else 'active' end,
        completed_at = case when v_complete then now() else null end,
        current_pick_deadline_at = v_deadline,
        updated_at = now()
    where id = p_session_id;

    return jsonb_build_object(
      'success', true,
      'skipped', true,
      'next_team_id', v_next_team,
      'completed', v_complete,
      'deadline_at', v_deadline
    );
  end if;

  if p_pokemon_name is null or length(trim(p_pokemon_name)) = 0 then
    raise exception 'POKEMON_REQUIRED';
  end if;

  select * into v_pool
  from public.draft_pool
  where season_id = v_session.season_id
    and lower(pokemon_name) = lower(trim(p_pokemon_name))
    and (status = 'available' or status is null)
  for update;

  if not found then
    raise exception 'POKEMON_NOT_AVAILABLE';
  end if;

  select * into v_budget
  from public.draft_budgets
  where team_id = p_team_id
    and season_id = v_session.season_id
  for update;

  if not found then
    raise exception 'BUDGET_NOT_FOUND';
  end if;

  if v_budget.remaining_points < v_pool.point_value then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  -- Ensure public.pokemon UUID row exists for team_rosters FK
  select id into v_pokemon_uuid
  from public.pokemon
  where lower(name) = lower(v_pool.pokemon_name)
  limit 1;

  if v_pokemon_uuid is null then
    select
      coalesce(pp.type_primary, 'normal'),
      pp.type_secondary
    into v_type1, v_type2
    from public.pokepedia_pokemon pp
    where pp.id = v_pool.pokemon_id
    limit 1;

    insert into public.pokemon (name, slug, type1, type2)
    values (
      lower(v_pool.pokemon_name),
      trim(both '-' from regexp_replace(lower(v_pool.pokemon_name), '[^a-z0-9]+', '-', 'g')),
      coalesce(v_type1, 'normal'),
      v_type2
    )
    on conflict (name) do update set type1 = excluded.type1
    returning id into v_pokemon_uuid;
  end if;

  if exists (
    select 1 from public.team_rosters tr
    where tr.team_id = p_team_id and tr.pokemon_id = v_pokemon_uuid
  ) then
    raise exception 'DUPLICATE_PICK';
  end if;

  insert into public.team_rosters (
    team_id, pokemon_id, draft_round, draft_order, draft_points, source
  ) values (
    p_team_id,
    v_pokemon_uuid,
    v_session.current_round,
    v_session.current_pick_number,
    v_pool.point_value,
    'draft'
  );

  update public.draft_budgets
  set spent_points = spent_points + v_pool.point_value
  where id = v_budget.id;

  update public.draft_pool
  set status = 'drafted',
      drafted_by_team_id = p_team_id,
      drafted_at = now(),
      draft_round = v_session.current_round,
      draft_pick_number = v_session.current_pick_number,
      updated_at = now()
  where id = v_pool.id
    and (status = 'available' or status is null);

  v_next_pick := v_session.current_pick_number + 1;
  v_next_round := ((v_next_pick - 1) / array_length(v_turn_order, 1)) + 1;
  v_next_snake := v_session.draft_type = 'snake' and (v_next_round % 2 = 0);
  if v_next_snake then
    v_next_order := (
      select array_agg(t order by ord desc)
      from unnest(v_turn_order) with ordinality as u(t, ord)
    );
  else
    v_next_order := v_turn_order;
  end if;
  v_next_index := ((v_next_pick - 1) % array_length(v_turn_order, 1));
  v_next_team := v_next_order[v_next_index + 1];
  v_total_picks := v_session.total_teams * v_session.total_rounds;
  v_complete := v_next_pick > v_total_picks;
  v_deadline := case
    when v_complete then null
    else now() + make_interval(secs => greatest(coalesce(v_session.pick_time_limit_seconds, 45), 1))
  end;

  update public.draft_sessions
  set current_pick_number = v_next_pick,
      current_round = v_next_round,
      current_team_id = v_next_team,
      status = case when v_complete then 'completed' else 'active' end,
      completed_at = case when v_complete then now() else null end,
      current_pick_deadline_at = v_deadline,
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'success', true,
    'skipped', false,
    'pokemon_name', v_pool.pokemon_name,
    'point_value', v_pool.point_value,
    'pick_number', v_session.current_pick_number,
    'round', v_session.current_round,
    'team_id', p_team_id,
    'next_team_id', v_next_team,
    'completed', v_complete,
    'deadline_at', v_deadline
  );
end;
$$;

create or replace function public.rpc_enforce_draft_pick_timer(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.draft_sessions%rowtype;
  v_pick jsonb;
  v_name text;
begin
  select * into v_session
  from public.draft_sessions
  where id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
  end if;

  if v_session.status is distinct from 'active' then
    return jsonb_build_object('success', true, 'action', 'none', 'reason', 'not_active');
  end if;

  if v_session.current_pick_deadline_at is null then
    perform public.rpc_set_draft_pick_deadline(p_session_id);
    return jsonb_build_object('success', true, 'action', 'deadline_set');
  end if;

  if v_session.current_pick_deadline_at > now() then
    return jsonb_build_object(
      'success', true,
      'action', 'none',
      'deadline_at', v_session.current_pick_deadline_at
    );
  end if;

  if coalesce(v_session.auto_draft_enabled, false)
     and v_session.current_team_id is not null then
    select dp.pokemon_name into v_name
    from public.draft_pool dp
    where dp.season_id = v_session.season_id
      and (dp.status = 'available' or dp.status is null)
      and dp.point_value <= coalesce((
        select remaining_points from public.draft_budgets
        where team_id = v_session.current_team_id and season_id = v_session.season_id
      ), 0)
    order by dp.point_value asc, dp.pokemon_name asc
    limit 1;

    if v_name is not null then
      v_pick := public.rpc_make_live_draft_pick(
        p_session_id,
        v_session.current_team_id,
        v_name,
        false
      );
      return jsonb_build_object('success', true, 'action', 'auto_pick', 'result', v_pick);
    end if;
  end if;

  if v_session.current_team_id is null then
    return jsonb_build_object('success', false, 'error', 'NO_CURRENT_TEAM');
  end if;

  v_pick := public.rpc_make_live_draft_pick(
    p_session_id,
    v_session.current_team_id,
    null,
    true
  );
  return jsonb_build_object('success', true, 'action', 'skip', 'result', v_pick);
end;
$$;

revoke all on function public.rpc_set_draft_pick_deadline(uuid) from public, anon, authenticated;
revoke all on function public.rpc_make_live_draft_pick(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.rpc_enforce_draft_pick_timer(uuid) from public, anon, authenticated;
grant execute on function public.rpc_set_draft_pick_deadline(uuid) to service_role;
grant execute on function public.rpc_make_live_draft_pick(uuid, uuid, text, boolean) to service_role;
grant execute on function public.rpc_enforce_draft_pick_timer(uuid) to service_role;
