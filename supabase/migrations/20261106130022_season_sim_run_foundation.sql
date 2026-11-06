-- P1: Durable simulation run foundation (commands/steps/events/leases).
-- Domain draft/schedule/result adapters intentionally deferred.

create schema if not exists sim_private;
revoke all on schema sim_private from public, anon, authenticated;
grant usage on schema sim_private to service_role;

-- ---------------------------------------------------------------------------
-- Extend simulation_runs
-- ---------------------------------------------------------------------------

alter table public.simulation_runs
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table public.simulation_runs
  add column if not exists phase text not null default 'configured';

alter table public.simulation_runs
  add column if not exists run_version bigint not null default 1;

alter table public.simulation_runs
  add column if not exists step_seq bigint not null default 0;

alter table public.simulation_runs
  add column if not exists event_seq bigint not null default 0;

alter table public.simulation_runs
  add column if not exists master_seed text;

alter table public.simulation_runs
  add column if not exists rng_algorithm text not null default 'splitmix64';

alter table public.simulation_runs
  add column if not exists rng_algorithm_version text not null default '1';

alter table public.simulation_runs
  add column if not exists rng_counters jsonb not null default '{}'::jsonb;

alter table public.simulation_runs
  add column if not exists cursor jsonb not null default '{"step_seq":0}'::jsonb;

alter table public.simulation_runs
  add column if not exists config_frozen_at timestamptz;

alter table public.simulation_runs
  add column if not exists rules_snapshot jsonb not null default '{}'::jsonb;

alter table public.simulation_runs
  add column if not exists lease_owner text;

alter table public.simulation_runs
  add column if not exists lease_token uuid;

alter table public.simulation_runs
  add column if not exists lease_expires_at timestamptz;

alter table public.simulation_runs
  add column if not exists heartbeat_at timestamptz;

alter table public.simulation_runs
  add column if not exists active_command_id uuid;

alter table public.simulation_runs
  add column if not exists blocked_reason text;

alter table public.simulation_runs
  add column if not exists error_code text;

alter table public.simulation_runs
  add column if not exists parent_run_id uuid references public.simulation_runs(id) on delete set null;

alter table public.simulation_runs
  add column if not exists updated_at timestamptz not null default now();

-- Replace legacy status check with foundation statuses.
alter table public.simulation_runs drop constraint if exists simulation_runs_status_check;

alter table public.simulation_runs
  add constraint simulation_runs_status_check
  check (status in (
    'configured',
    'queued',
    'running',
    'paused',
    'blocked',
    'cancel_requested',
    'cancelled',
    'failed',
    'completed',
    'archived',
    -- legacy rows from Mock Draft Demo pilot (read-only compatibility)
    'drafting',
    'regular_season',
    'playoffs',
    'reset'
  ));

alter table public.simulation_runs drop constraint if exists simulation_runs_phase_check;
alter table public.simulation_runs
  add constraint simulation_runs_phase_check
  check (phase in (
    'configured',
    'draft',
    'regular',
    'playoffs',
    'complete'
  ));

-- One active foundation run per sandbox season (nullable season_id allowed for legacy).
create unique index if not exists uq_simulation_runs_season_active
  on public.simulation_runs (season_id)
  where season_id is not null
    and status in ('configured', 'queued', 'running', 'paused', 'blocked', 'cancel_requested');

create index if not exists idx_simulation_runs_lease
  on public.simulation_runs (status, lease_expires_at);

create index if not exists idx_simulation_runs_owner
  on public.simulation_runs (owner_user_id);

-- Composite uniqueness for child FK agreement (run_id, season_id).
create unique index if not exists uq_simulation_runs_id_season
  on public.simulation_runs (id, season_id);

-- ---------------------------------------------------------------------------
-- Ensure sandbox season when a season_id is set on modern runs
-- ---------------------------------------------------------------------------

create or replace function public.enforce_simulation_run_sandbox_season()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.season_id is null then
    return new;
  end if;

  if not public.is_sandbox_season(new.season_id) then
    raise exception 'SIM_RUN_REQUIRES_SANDBOX_SEASON: season_id % is not is_sandbox', new.season_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_simulation_run_sandbox_season on public.simulation_runs;
create trigger trg_enforce_simulation_run_sandbox_season
  before insert or update of season_id on public.simulation_runs
  for each row
  execute function public.enforce_simulation_run_sandbox_season();

revoke all on function public.enforce_simulation_run_sandbox_season() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- simulation_commands
-- ---------------------------------------------------------------------------

create table if not exists public.simulation_commands (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  command_id uuid not null,
  command_type text not null,
  unit text,
  n integer,
  payload jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  expected_step_seq bigint not null,
  expected_run_version bigint not null,
  status text not null default 'accepted'
    check (status in ('accepted', 'processing', 'completed', 'failed', 'cancelled')),
  response jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint uq_simulation_commands_run_command unique (run_id, command_id),
  constraint simulation_commands_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    on delete cascade
);

create index if not exists idx_simulation_commands_run_created
  on public.simulation_commands (run_id, created_at);

-- ---------------------------------------------------------------------------
-- simulation_steps
-- ---------------------------------------------------------------------------

create table if not exists public.simulation_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  command_row_id uuid references public.simulation_commands(id) on delete set null,
  command_id uuid,
  step_seq bigint not null,
  operation_key text not null,
  kind text not null,
  status text not null default 'applied'
    check (status in ('applied', 'skipped', 'failed')),
  input_hash text,
  output jsonb not null default '{}'::jsonb,
  decision_source text
    check (decision_source is null or decision_source in ('human', 'heuristic', 'jev', 'rng', 'system')),
  created_at timestamptz not null default now(),
  constraint uq_simulation_steps_run_seq unique (run_id, step_seq),
  constraint uq_simulation_steps_run_operation unique (run_id, operation_key),
  constraint simulation_steps_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    on delete cascade
);

create index if not exists idx_simulation_steps_run_seq
  on public.simulation_steps (run_id, step_seq);

-- ---------------------------------------------------------------------------
-- simulation_events (append-only provenance)
-- ---------------------------------------------------------------------------

create table if not exists public.simulation_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  event_seq bigint not null,
  event_type text not null,
  step_seq bigint,
  command_id uuid,
  correlation_id text,
  provenance jsonb not null default '{}'::jsonb,
  payload_sanitized jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint uq_simulation_events_run_seq unique (run_id, event_seq),
  constraint simulation_events_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    on delete cascade
);

create index if not exists idx_simulation_events_run_seq
  on public.simulation_events (run_id, event_seq);

-- ---------------------------------------------------------------------------
-- simulation_decisions (foundation logging; domain optional)
-- ---------------------------------------------------------------------------

create table if not exists public.simulation_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  step_id uuid references public.simulation_steps(id) on delete cascade,
  step_seq bigint,
  source text not null check (source in ('human', 'heuristic', 'jev', 'rng', 'system')),
  model_id text,
  state_hash text,
  answer jsonb not null default '{}'::jsonb,
  latency_ms integer,
  created_at timestamptz not null default now(),
  constraint simulation_decisions_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    on delete cascade
);

create index if not exists idx_simulation_decisions_run
  on public.simulation_decisions (run_id, created_at);

-- ---------------------------------------------------------------------------
-- sim_bot_seats — synthetic participants; NEVER auth.users
-- ---------------------------------------------------------------------------

create table if not exists public.sim_bot_seats (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.simulation_runs(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  seat_index integer not null,
  display_name text not null,
  selector text not null default 'heuristic'
    check (selector in ('random', 'heuristic', 'jev')),
  created_at timestamptz not null default now(),
  constraint uq_sim_bot_seats_run_index unique (run_id, seat_index),
  constraint simulation_bot_seats_run_season_fkey
    foreign key (run_id, season_id)
    references public.simulation_runs (id, season_id)
    on delete cascade
);

create index if not exists idx_sim_bot_seats_run
  on public.sim_bot_seats (run_id);

-- ---------------------------------------------------------------------------
-- RLS: admin-only for authenticated; service_role bypasses
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'simulation_commands',
    'simulation_steps',
    'simulation_events',
    'simulation_decisions',
    'sim_bot_seats'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Reuse admin role helper for policies.
drop policy if exists "admins select simulation_commands" on public.simulation_commands;
create policy "admins select simulation_commands"
  on public.simulation_commands for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write simulation_commands" on public.simulation_commands;
create policy "admins write simulation_commands"
  on public.simulation_commands for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select simulation_steps" on public.simulation_steps;
create policy "admins select simulation_steps"
  on public.simulation_steps for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write simulation_steps" on public.simulation_steps;
create policy "admins write simulation_steps"
  on public.simulation_steps for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select simulation_events" on public.simulation_events;
create policy "admins select simulation_events"
  on public.simulation_events for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write simulation_events" on public.simulation_events;
create policy "admins write simulation_events"
  on public.simulation_events for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select simulation_decisions" on public.simulation_decisions;
create policy "admins select simulation_decisions"
  on public.simulation_decisions for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write simulation_decisions" on public.simulation_decisions;
create policy "admins write simulation_decisions"
  on public.simulation_decisions for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins select sim_bot_seats" on public.sim_bot_seats;
create policy "admins select sim_bot_seats"
  on public.sim_bot_seats for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write sim_bot_seats" on public.sim_bot_seats;
create policy "admins write sim_bot_seats"
  on public.sim_bot_seats for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

grant select, insert, update, delete on table public.simulation_commands to service_role;
grant select, insert, update, delete on table public.simulation_steps to service_role;
grant select, insert, update, delete on table public.simulation_events to service_role;
grant select, insert, update, delete on table public.simulation_decisions to service_role;
grant select, insert, update, delete on table public.sim_bot_seats to service_role;

-- ---------------------------------------------------------------------------
-- Private RPCs: claim lease + apply foundation step (atomic)
-- ---------------------------------------------------------------------------

create or replace function sim_private.claim_run_lease(
  p_run_id uuid,
  p_worker_id text,
  p_lease_ms integer default 30000
)
returns table (
  claimed boolean,
  lease_token uuid,
  run_status text,
  step_seq bigint,
  run_version bigint,
  season_id uuid
)
language plpgsql
security definer
set search_path = public, sim_private
as $$
declare
  v_token uuid := gen_random_uuid();
  v_row public.simulation_runs%rowtype;
begin
  if p_worker_id is null or length(trim(p_worker_id)) = 0 then
    raise exception 'WORKER_ID_REQUIRED';
  end if;

  select * into v_row
  from public.simulation_runs
  where id = p_run_id
  for update;

  if not found then
    return;
  end if;

  if v_row.season_id is null or not public.is_sandbox_season(v_row.season_id) then
    raise exception 'SIM_RUN_REQUIRES_SANDBOX_SEASON';
  end if;

  if v_row.status not in ('queued', 'running', 'cancel_requested') then
    claimed := false;
    lease_token := v_row.lease_token;
    run_status := v_row.status;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    season_id := v_row.season_id;
    return next;
    return;
  end if;

  if v_row.lease_token is not null
     and v_row.lease_expires_at is not null
     and v_row.lease_expires_at > now()
     and v_row.lease_owner is distinct from p_worker_id then
    claimed := false;
    lease_token := v_row.lease_token;
    run_status := v_row.status;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    season_id := v_row.season_id;
    return next;
    return;
  end if;

  update public.simulation_runs
  set
    lease_owner = p_worker_id,
    lease_token = v_token,
    lease_expires_at = now() + make_interval(secs => greatest(1, p_lease_ms) / 1000.0),
    heartbeat_at = now(),
    status = case
      when status = 'queued' then 'running'
      else status
    end,
    updated_at = now(),
    run_version = run_version + 1
  where id = p_run_id
  returning * into v_row;

  claimed := true;
  lease_token := v_token;
  run_status := v_row.status;
  step_seq := v_row.step_seq;
  run_version := v_row.run_version;
  season_id := v_row.season_id;
  return next;
end;
$$;

revoke all on function sim_private.claim_run_lease(uuid, text, integer) from public, anon, authenticated;
grant execute on function sim_private.claim_run_lease(uuid, text, integer) to service_role;

create or replace function sim_private.apply_foundation_step(
  p_run_id uuid,
  p_lease_token uuid,
  p_operation_key text,
  p_kind text,
  p_command_id uuid,
  p_output jsonb default '{}'::jsonb,
  p_decision_source text default 'system'
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
set search_path = public, sim_private
as $$
declare
  v_row public.simulation_runs%rowtype;
  v_next bigint;
  v_event bigint;
  v_step_id uuid;
  v_cmd public.simulation_commands%rowtype;
begin
  select * into v_row
  from public.simulation_runs
  where id = p_run_id
  for update;

  if not found then
    applied := false;
    step_seq := 0;
    run_version := 0;
    run_status := 'missing';
    reason := 'RUN_NOT_FOUND';
    return next;
    return;
  end if;

  if v_row.season_id is null or not public.is_sandbox_season(v_row.season_id) then
    raise exception 'SIM_RUN_REQUIRES_SANDBOX_SEASON';
  end if;

  if v_row.lease_token is distinct from p_lease_token then
    applied := false;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    run_status := v_row.status;
    reason := 'STALE_LEASE';
    return next;
    return;
  end if;

  if v_row.lease_expires_at is null or v_row.lease_expires_at < now() then
    applied := false;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    run_status := v_row.status;
    reason := 'LEASE_EXPIRED';
    return next;
    return;
  end if;

  if v_row.status = 'cancel_requested' then
    update public.simulation_runs
    set status = 'cancelled',
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        active_command_id = null,
        updated_at = now(),
        run_version = run_version + 1,
        completed_at = coalesce(completed_at, now())
    where id = p_run_id
    returning * into v_row;

    applied := false;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    run_status := v_row.status;
    reason := 'CANCELLED';
    return next;
    return;
  end if;

  if v_row.status not in ('running', 'queued') then
    applied := false;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    run_status := v_row.status;
    reason := 'STATUS_NOT_RUNNABLE';
    return next;
    return;
  end if;

  -- Idempotent: operation already applied
  if exists (
    select 1 from public.simulation_steps s
    where s.run_id = p_run_id and s.operation_key = p_operation_key
  ) then
    select s.step_seq into v_next
    from public.simulation_steps s
    where s.run_id = p_run_id and s.operation_key = p_operation_key;

    applied := true;
    step_seq := v_next;
    run_version := v_row.run_version;
    run_status := v_row.status;
    reason := 'ALREADY_APPLIED';
    return next;
    return;
  end if;

  -- Foundation-only kinds in P1. Domain kinds must block, not fabricate.
  if p_kind not in ('foundation_checkpoint', 'command_ack') then
    update public.simulation_runs
    set status = 'blocked',
        blocked_reason = 'UNSUPPORTED_DOMAIN_STEP:' || p_kind,
        error_code = 'UNSUPPORTED_DOMAIN_STEP',
        error_message = 'Domain step kind is not implemented in P0–P1 foundation',
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        updated_at = now(),
        run_version = run_version + 1
    where id = p_run_id
    returning * into v_row;

    v_event := v_row.event_seq + 1;
    insert into public.simulation_events (
      run_id, season_id, event_seq, event_type, command_id, provenance, payload_sanitized
    ) values (
      p_run_id, v_row.season_id, v_event, 'run.blocked', p_command_id,
      jsonb_build_object('source', 'system'),
      jsonb_build_object('kind', p_kind, 'operation_key', p_operation_key)
    );

    update public.simulation_runs set event_seq = v_event where id = p_run_id;

    applied := false;
    step_seq := v_row.step_seq;
    run_version := v_row.run_version;
    run_status := 'blocked';
    reason := 'UNSUPPORTED_DOMAIN_STEP';
    return next;
    return;
  end if;

  v_next := v_row.step_seq + 1;
  v_event := v_row.event_seq + 1;

  if p_command_id is not null then
    select * into v_cmd
    from public.simulation_commands c
    where c.run_id = p_run_id and c.command_id = p_command_id;
  end if;

  insert into public.simulation_steps (
    run_id, season_id, command_row_id, command_id, step_seq, operation_key, kind, status, output, decision_source
  ) values (
    p_run_id,
    v_row.season_id,
    v_cmd.id,
    p_command_id,
    v_next,
    p_operation_key,
    p_kind,
    'applied',
    coalesce(p_output, '{}'::jsonb),
    coalesce(p_decision_source, 'system')
  )
  returning id into v_step_id;

  insert into public.simulation_events (
    run_id, season_id, event_seq, event_type, step_seq, command_id, provenance, payload_sanitized
  ) values (
    p_run_id, v_row.season_id, v_event, 'step.applied', v_next, p_command_id,
    jsonb_build_object('source', coalesce(p_decision_source, 'system')),
    jsonb_build_object('kind', p_kind, 'operation_key', p_operation_key)
  );

  update public.simulation_runs
  set
    step_seq = v_next,
    event_seq = v_event,
    cursor = jsonb_build_object('step_seq', v_next),
    heartbeat_at = now(),
    lease_expires_at = now() + interval '30 seconds',
    updated_at = now(),
    run_version = run_version + 1,
    status = 'running'
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

revoke all on function sim_private.apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function sim_private.apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  to service_role;

-- Public wrappers callable via supabase-js rpc() — execute granted ONLY to service_role.
create or replace function public.sim_claim_run_lease(
  p_run_id uuid,
  p_worker_id text,
  p_lease_ms integer default 30000
)
returns table (
  claimed boolean,
  lease_token uuid,
  run_status text,
  step_seq bigint,
  run_version bigint,
  season_id uuid
)
language sql
security definer
set search_path = public, sim_private
as $$
  select * from sim_private.claim_run_lease(p_run_id, p_worker_id, p_lease_ms);
$$;

revoke all on function public.sim_claim_run_lease(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.sim_claim_run_lease(uuid, text, integer) to service_role;

create or replace function public.sim_apply_foundation_step(
  p_run_id uuid,
  p_lease_token uuid,
  p_operation_key text,
  p_kind text,
  p_command_id uuid,
  p_output jsonb default '{}'::jsonb,
  p_decision_source text default 'system'
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
  select * from sim_private.apply_foundation_step(
    p_run_id, p_lease_token, p_operation_key, p_kind, p_command_id, p_output, p_decision_source
  );
$$;

revoke all on function public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  to service_role;
