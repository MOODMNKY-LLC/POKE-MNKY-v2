-- P2 slice: deterministic legal sandbox draft domain (picks only).
-- Schedule/results/playoffs/champion remain unimplemented (blocked after draft).
-- Uses sim-scoped draft pool/picks/budgets (no live draft_sessions / auth.users).

-- ---------------------------------------------------------------------------
-- Domain tables (sandbox simulation only)
-- ---------------------------------------------------------------------------

create table if not exists public.sim_draft_pool (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  pokemon_name text not null,
  point_value integer not null check (point_value >= 12 and point_value <= 20),
  status text not null default 'available'
    check (status in ('available', 'drafted')),
  drafted_by_team_id uuid references public.teams(id) on delete set null,
  drafted_pick_number integer,
  created_at timestamptz not null default now(),
  constraint sim_draft_pool_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    deferrable initially immediate,
  constraint sim_draft_pool_unique_name unique (run_id, pokemon_name)
);

create index if not exists idx_sim_draft_pool_run_status
  on public.sim_draft_pool (run_id, status);

create table if not exists public.sim_draft_budgets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  total_points integer not null check (total_points > 0),
  spent_points integer not null default 0 check (spent_points >= 0),
  remaining_points integer generated always as (total_points - spent_points) stored,
  created_at timestamptz not null default now(),
  constraint sim_draft_budgets_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    deferrable initially immediate,
  constraint sim_draft_budgets_unique_team unique (run_id, team_id),
  constraint sim_draft_budgets_spent_lte_total check (spent_points <= total_points)
);

create table if not exists public.sim_draft_picks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  pick_number integer not null check (pick_number >= 1),
  round integer not null check (round >= 1),
  pokemon_name text not null,
  point_value integer not null,
  step_seq bigint not null,
  decision_id uuid,
  created_at timestamptz not null default now(),
  constraint sim_draft_picks_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    deferrable initially immediate,
  constraint sim_draft_picks_unique_pick unique (run_id, pick_number),
  constraint sim_draft_picks_unique_step unique (run_id, step_seq)
);

create index if not exists idx_sim_draft_picks_run
  on public.sim_draft_picks (run_id, pick_number);

-- Composite uniqueness for (run_id, season_id) FKs already exists as
-- uq_simulation_runs_id_season from 20261106130022.

alter table public.sim_draft_pool enable row level security;
alter table public.sim_draft_budgets enable row level security;
alter table public.sim_draft_picks enable row level security;

drop policy if exists "admins select sim_draft_pool" on public.sim_draft_pool;
create policy "admins select sim_draft_pool"
  on public.sim_draft_pool for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write sim_draft_pool" on public.sim_draft_pool;
create policy "admins write sim_draft_pool"
  on public.sim_draft_pool for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select sim_draft_budgets" on public.sim_draft_budgets;
create policy "admins select sim_draft_budgets"
  on public.sim_draft_budgets for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write sim_draft_budgets" on public.sim_draft_budgets;
create policy "admins write sim_draft_budgets"
  on public.sim_draft_budgets for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select sim_draft_picks" on public.sim_draft_picks;
create policy "admins select sim_draft_picks"
  on public.sim_draft_picks for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write sim_draft_picks" on public.sim_draft_picks;
create policy "admins write sim_draft_picks"
  on public.sim_draft_picks for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

grant select, insert, update, delete on table public.sim_draft_pool to service_role;
grant select, insert, update, delete on table public.sim_draft_budgets to service_role;
grant select, insert, update, delete on table public.sim_draft_picks to service_role;

-- ---------------------------------------------------------------------------
-- Atomic draft pick apply (lease-fenced)
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

  -- Idempotent replay
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
        'draft_complete', true
      ),
      phase = 'draft',
      status = 'blocked',
      blocked_reason = 'DRAFT_COMPLETE_SCHEDULE_UNSUPPORTED',
      error_code = 'DRAFT_COMPLETE_SCHEDULE_UNSUPPORTED',
      error_message = 'Sandbox draft finished; schedule/results/playoffs domains remain unimplemented',
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
      p_run_id, v_row.season_id, v_event, 'run.blocked', p_command_id,
      jsonb_build_object('source', 'system'),
      jsonb_build_object('reason', 'DRAFT_COMPLETE_SCHEDULE_UNSUPPORTED')
    );
    update public.simulation_runs set event_seq = v_event where id = p_run_id;

    select r.run_version into run_version from public.simulation_runs r where r.id = p_run_id;
    applied := true; step_seq := v_next; run_status := 'blocked'; reason := 'DRAFT_COMPLETE';
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

revoke all on function sim_private.apply_draft_pick(
  uuid, uuid, text, uuid, integer, uuid, text, integer, integer, text, jsonb, boolean
) from public, anon, authenticated;
grant execute on function sim_private.apply_draft_pick(
  uuid, uuid, text, uuid, integer, uuid, text, integer, integer, text, jsonb, boolean
) to service_role;

create or replace function public.sim_apply_draft_pick(
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
language sql
security definer
set search_path = public, sim_private
as $$
  select * from sim_private.apply_draft_pick(
    p_run_id, p_lease_token, p_operation_key, p_command_id,
    p_pick_number, p_team_id, p_pokemon_name, p_point_value, p_round,
    p_decision_source, p_decision_payload, p_draft_complete
  );
$$;

revoke all on function public.sim_apply_draft_pick(
  uuid, uuid, text, uuid, integer, uuid, text, integer, integer, text, jsonb, boolean
) from public, anon, authenticated;
grant execute on function public.sim_apply_draft_pick(
  uuid, uuid, text, uuid, integer, uuid, text, integer, integer, text, jsonb, boolean
) to service_role;
