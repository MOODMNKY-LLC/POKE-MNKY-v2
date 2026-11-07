-- P3 provisional-demo season path (schedule → statistical results → playoffs → champion).
-- Sandbox/sim-scoped only. Results are STATISTICAL_SEEDED — not Showdown battles.
-- Draft complete handoff: pause awaiting schedule (no longer permanent schedule block).

-- ---------------------------------------------------------------------------
-- Soften draft-complete permanent block → pause awaiting schedule
-- ---------------------------------------------------------------------------

create or replace function sim_private.apply_draft_pick(
  p_run_id uuid,
  p_lease_token uuid,
  p_operation_key text,
  p_command_id uuid,
  p_pick_number integer,
  p_team_id uuid,
  p_pokemon_name text,
  p_point_value integer,
  p_round integer,
  p_decision_source text default 'rng',
  p_decision_payload jsonb default '{}'::jsonb,
  p_draft_complete boolean default false
)
returns table (
  applied boolean,
  step_seq bigint,
  run_version bigint,
  run_status text,
  reason text
)
language plpgsql
security definer
set search_path = public, sim_private, pg_temp
as $$
declare
  v_row public.simulation_runs%rowtype;
  v_cmd public.simulation_commands%rowtype;
  v_pool public.sim_draft_pool%rowtype;
  v_budget public.sim_draft_budgets%rowtype;
  v_next bigint;
  v_event bigint;
  v_step_id uuid;
  v_decision_id uuid;
  v_sandbox boolean;
  v_expected_pick integer;
begin
  select * into v_row from public.simulation_runs where id = p_run_id for update;
  if not found then
    applied := false; step_seq := 0; run_version := 0; run_status := 'missing'; reason := 'RUN_NOT_FOUND';
    return next; return;
  end if;

  if v_row.lease_token is distinct from p_lease_token then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'STALE_LEASE';
    return next; return;
  end if;

  if v_row.lease_expires_at is null or v_row.lease_expires_at < now() then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'LEASE_EXPIRED';
    return next; return;
  end if;

  if v_row.status = 'cancel_requested' then
    update public.simulation_runs
    set status = 'cancelled', lease_owner = null, lease_token = null, lease_expires_at = null,
        active_command_id = null, updated_at = now(),
        run_version = simulation_runs.run_version + 1,
        completed_at = coalesce(completed_at, now())
    where id = p_run_id returning * into v_row;
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'CANCELLED';
    return next; return;
  end if;

  if v_row.status not in ('running', 'queued') then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'STATUS_NOT_RUNNABLE';
    return next; return;
  end if;

  select coalesce(s.is_sandbox, false) into v_sandbox
  from public.seasons s where s.id = v_row.season_id;
  if not coalesce(v_sandbox, false) then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'NOT_SANDBOX';
    return next; return;
  end if;

  if exists (
    select 1 from public.simulation_steps s
    where s.run_id = p_run_id and s.operation_key = p_operation_key
  ) then
    select s.step_seq into v_next
    from public.simulation_steps s
    where s.run_id = p_run_id and s.operation_key = p_operation_key;
    applied := true; step_seq := v_next; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'ALREADY_APPLIED';
    return next; return;
  end if;

  v_expected_pick := coalesce((v_row.cursor->>'pick_number')::integer, 0) + 1;
  if p_pick_number is distinct from v_expected_pick then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'PICK_CURSOR_MISMATCH';
    return next; return;
  end if;

  select * into v_pool
  from public.sim_draft_pool
  where run_id = p_run_id and pokemon_name = p_pokemon_name
  for update;
  if not found then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'POKEMON_NOT_IN_POOL';
    return next; return;
  end if;
  if v_pool.status <> 'available' then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'POKEMON_UNAVAILABLE';
    return next; return;
  end if;
  if v_pool.point_value is distinct from p_point_value then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'POINT_VALUE_MISMATCH';
    return next; return;
  end if;

  select * into v_budget
  from public.sim_draft_budgets
  where run_id = p_run_id and team_id = p_team_id
  for update;
  if not found then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'BUDGET_MISSING';
    return next; return;
  end if;
  if v_budget.remaining_points < p_point_value then
    applied := false; step_seq := v_row.step_seq; run_version := v_row.run_version;
    run_status := v_row.status; reason := 'INSUFFICIENT_BUDGET';
    return next; return;
  end if;

  if p_command_id is not null then
    select * into v_cmd
    from public.simulation_commands c
    where c.run_id = p_run_id and c.command_id = p_command_id;
  end if;

  v_next := v_row.step_seq + 1;
  v_event := v_row.event_seq + 1;

  insert into public.simulation_decisions (
    run_id, season_id, step_seq, source, answer
  ) values (
    p_run_id, v_row.season_id, v_next,
    case
      when coalesce(p_decision_source, 'rng') in ('human', 'heuristic', 'jev', 'rng', 'system')
        then coalesce(p_decision_source, 'rng')
      else 'rng'
    end,
    coalesce(p_decision_payload, '{}'::jsonb) || jsonb_build_object(
      'decision_type', 'draft_pick',
      'pick_number', p_pick_number,
      'round', p_round,
      'team_id', p_team_id,
      'pokemon_name', p_pokemon_name,
      'point_value', p_point_value
    )
  ) returning id into v_decision_id;

  update public.sim_draft_pool
  set status = 'drafted',
      drafted_by_team_id = p_team_id,
      drafted_pick_number = p_pick_number
  where id = v_pool.id;

  update public.sim_draft_budgets
  set spent_points = spent_points + p_point_value
  where id = v_budget.id;

  insert into public.sim_draft_picks (
    run_id, season_id, team_id, pick_number, round, pokemon_name, point_value, step_seq, decision_id
  ) values (
    p_run_id, v_row.season_id, p_team_id, p_pick_number, p_round, p_pokemon_name, p_point_value, v_next, v_decision_id
  );

  insert into public.simulation_steps (
    run_id, season_id, command_row_id, command_id, step_seq, operation_key, kind, status, output, decision_source
  ) values (
    p_run_id, v_row.season_id, v_cmd.id, p_command_id, v_next, p_operation_key, 'draft_pick', 'applied',
    jsonb_build_object(
      'pick_number', p_pick_number,
      'round', p_round,
      'team_id', p_team_id,
      'pokemon_name', p_pokemon_name,
      'point_value', p_point_value,
      'decision_id', v_decision_id
    ),
    coalesce(p_decision_source, 'rng')
  ) returning id into v_step_id;

  insert into public.simulation_events (
    run_id, season_id, event_seq, event_type, step_seq, command_id, provenance, payload_sanitized
  ) values (
    p_run_id, v_row.season_id, v_event, 'draft.pick_applied', v_next, p_command_id,
    jsonb_build_object('source', coalesce(p_decision_source, 'rng')),
    jsonb_build_object(
      'pick_number', p_pick_number,
      'pokemon_name', p_pokemon_name,
      'operation_key', p_operation_key
    )
  );

  if p_draft_complete then
    update public.simulation_runs
    set
      step_seq = v_next,
      event_seq = v_event,
      cursor = jsonb_build_object(
        'step_seq', v_next,
        'pick_number', p_pick_number,
        'round', p_round,
        'draft_complete', true,
        'awaiting', 'schedule'
      ),
      phase = 'draft',
      status = 'paused',
      blocked_reason = null,
      error_code = null,
      error_message = null,
      active_command_id = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      heartbeat_at = now(),
      updated_at = now(),
      run_version = simulation_runs.run_version + 1
    where id = p_run_id
    returning * into v_row;

    v_event := v_row.event_seq + 1;
    insert into public.simulation_events (
      run_id, season_id, event_seq, event_type, command_id, provenance, payload_sanitized
    ) values (
      p_run_id, v_row.season_id, v_event, 'draft.complete_awaiting_schedule', p_command_id,
      jsonb_build_object('source', 'system'),
      jsonb_build_object(
        'fidelity', 'statistical_seeded',
        'disclaimer', 'Draft rosters are not battle sets; subsequent results are seeded statistical outcomes, not Showdown battles'
      )
    );
    update public.simulation_runs set event_seq = v_event where id = p_run_id;

    select r.run_version into run_version from public.simulation_runs r where r.id = p_run_id;
    applied := true; step_seq := v_next; run_status := 'paused'; reason := 'DRAFT_COMPLETE';
    return next; return;
  end if;

  update public.simulation_runs
  set
    step_seq = v_next,
    event_seq = v_event,
    phase = 'draft',
    cursor = jsonb_build_object(
      'step_seq', v_next,
      'pick_number', p_pick_number,
      'round', p_round,
      'draft_complete', false
    ),
    heartbeat_at = now(),
    lease_expires_at = now() + interval '30 seconds',
    updated_at = now(),
    run_version = simulation_runs.run_version + 1,
    status = 'running',
    blocked_reason = null,
    error_code = null,
    error_message = null
  where id = p_run_id
  returning * into v_row;

  applied := true;
  step_seq := v_next;
  run_version := v_row.run_version;
  run_status := v_row.status;
  reason := 'APPLIED';
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Season-path tables (sandbox simulation only)
-- ---------------------------------------------------------------------------

create table if not exists public.sim_matches (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  week integer not null check (week >= 1),
  match_index integer not null check (match_index >= 1),
  team1_id uuid not null references public.teams(id) on delete cascade,
  team2_id uuid not null references public.teams(id) on delete cascade,
  is_playoff boolean not null default false,
  playoff_round integer,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed')),
  winner_id uuid references public.teams(id) on delete set null,
  team1_score integer,
  team2_score integer,
  differential integer,
  fidelity text not null default 'statistical_seeded'
    check (fidelity in ('statistical_seeded')),
  step_seq bigint,
  decision_id uuid,
  created_at timestamptz not null default now(),
  constraint sim_matches_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    deferrable initially immediate
);

create unique index if not exists uq_sim_matches_slot
  on public.sim_matches (run_id, week, match_index, is_playoff, (coalesce(playoff_round, 0)));

create table if not exists public.sim_standings (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  wins integer not null default 0,
  losses integer not null default 0,
  differential integer not null default 0,
  playoff_wins integer not null default 0,
  playoff_losses integer not null default 0,
  playoff_differential integer not null default 0,
  seed integer,
  updated_at timestamptz not null default now(),
  constraint sim_standings_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    deferrable initially immediate,
  constraint sim_standings_unique_team unique (run_id, team_id)
);

create table if not exists public.sim_season_outcomes (
  run_id uuid primary key references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  champion_team_id uuid not null references public.teams(id) on delete cascade,
  fidelity text not null default 'statistical_seeded'
    check (fidelity in ('statistical_seeded')),
  disclaimer text not null,
  completed_at timestamptz not null default now(),
  constraint sim_season_outcomes_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    deferrable initially immediate
);

alter table public.sim_matches enable row level security;
alter table public.sim_standings enable row level security;
alter table public.sim_season_outcomes enable row level security;

drop policy if exists "admins select sim_matches" on public.sim_matches;
create policy "admins select sim_matches"
  on public.sim_matches for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));
drop policy if exists "admins write sim_matches" on public.sim_matches;
create policy "admins write sim_matches"
  on public.sim_matches for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select sim_standings" on public.sim_standings;
create policy "admins select sim_standings"
  on public.sim_standings for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));
drop policy if exists "admins write sim_standings" on public.sim_standings;
create policy "admins write sim_standings"
  on public.sim_standings for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select sim_season_outcomes" on public.sim_season_outcomes;
create policy "admins select sim_season_outcomes"
  on public.sim_season_outcomes for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));
drop policy if exists "admins write sim_season_outcomes" on public.sim_season_outcomes;
create policy "admins write sim_season_outcomes"
  on public.sim_season_outcomes for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

grant select, insert, update, delete on table public.sim_matches to service_role;
grant select, insert, update, delete on table public.sim_standings to service_role;
grant select, insert, update, delete on table public.sim_season_outcomes to service_role;

-- ---------------------------------------------------------------------------
-- Scoped domain reset (UUID purge of sim_* domain tables; keeps run shell)
-- ---------------------------------------------------------------------------

create or replace function public.sim_reset_run_domain(
  p_run_id uuid,
  p_keep_config boolean default true
)
returns table (
  ok boolean,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.simulation_runs%rowtype;
  v_sandbox boolean;
begin
  select * into v_row from public.simulation_runs where id = p_run_id for update;
  if not found then
    ok := false; reason := 'RUN_NOT_FOUND'; return next; return;
  end if;

  select coalesce(s.is_sandbox, false) into v_sandbox
  from public.seasons s where s.id = v_row.season_id;
  if not coalesce(v_sandbox, false) then
    ok := false; reason := 'NOT_SANDBOX'; return next; return;
  end if;

  delete from public.sim_season_outcomes where run_id = p_run_id;
  delete from public.sim_standings where run_id = p_run_id;
  delete from public.sim_matches where run_id = p_run_id;
  delete from public.sim_draft_picks where run_id = p_run_id;
  delete from public.sim_draft_budgets where run_id = p_run_id;
  delete from public.sim_draft_pool where run_id = p_run_id;

  -- Append-only steps/events/decisions/commands are NOT deleted (evidence retained).
  -- Keep step_seq/event_seq high-water so new rows never collide on (run_id, step_seq).
  -- Bump domain_epoch so new operation_keys (e{N}:…) do not idempotent-hit prior epoch.
  update public.simulation_runs
  set
    -- keep_config replay: re-queue so advance/tick can claim without a separate resume
    status = case when p_keep_config then 'queued' else 'configured' end,
    phase = 'configured',
    cursor = jsonb_build_object(
      'step_seq', simulation_runs.step_seq,
      'pick_number', 0,
      'round', 0,
      'draft_complete', false,
      'reset', true,
      'domain_epoch', coalesce((simulation_runs.cursor->>'domain_epoch')::int, 0) + 1
    ),
    active_command_id = null,
    lease_owner = null,
    lease_token = null,
    lease_expires_at = null,
    blocked_reason = null,
    error_code = null,
    error_message = null,
    completed_at = null,
    rng_counters = '{}'::jsonb,
    run_version = simulation_runs.run_version + 1,
    updated_at = now(),
    config_frozen_at = case when p_keep_config then config_frozen_at else null end
  where id = p_run_id;

  ok := true; reason := 'DOMAIN_RESET';
  return next;
end;
$$;

revoke all on function public.sim_reset_run_domain(uuid, boolean) from public, anon, authenticated;
grant execute on function public.sim_reset_run_domain(uuid, boolean) to service_role;
