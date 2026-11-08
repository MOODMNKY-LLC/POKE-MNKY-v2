-- P0–P1 hardening: immutable frozen config/seed, append-only steps/events,
-- and RLS on simulation_runs for authenticated clients (service_role bypasses).

-- ---------------------------------------------------------------------------
-- Freeze config / rules / seed once config_frozen_at is set
-- ---------------------------------------------------------------------------

create or replace function public.enforce_simulation_run_frozen_config()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.config_frozen_at is not null then
    if new.config is distinct from old.config
       or new.rules_snapshot is distinct from old.rules_snapshot
       or new.master_seed is distinct from old.master_seed
       or new.rng_algorithm is distinct from old.rng_algorithm
       or new.rng_algorithm_version is distinct from old.rng_algorithm_version
       or (new.config_frozen_at is distinct from old.config_frozen_at
           and new.config_frozen_at is null) then
      raise exception 'SIM_CONFIG_FROZEN: cannot mutate config/rules/seed after freeze'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_simulation_run_frozen_config on public.simulation_runs;
create trigger trg_enforce_simulation_run_frozen_config
  before update on public.simulation_runs
  for each row
  execute function public.enforce_simulation_run_frozen_config();

revoke all on function public.enforce_simulation_run_frozen_config() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Append-only steps / events (and command payload_hash immutability)
-- ---------------------------------------------------------------------------

create or replace function public.reject_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'APPEND_ONLY: % rows cannot be %', tg_table_name, lower(tg_op)
    using errcode = 'check_violation';
end;
$$;

revoke all on function public.reject_mutation() from public, anon, authenticated;

drop trigger if exists trg_simulation_steps_no_update on public.simulation_steps;
create trigger trg_simulation_steps_no_update
  before update or delete on public.simulation_steps
  for each row execute function public.reject_mutation();

drop trigger if exists trg_simulation_events_no_update on public.simulation_events;
create trigger trg_simulation_events_no_update
  before update or delete on public.simulation_events
  for each row execute function public.reject_mutation();

create or replace function public.enforce_simulation_command_payload_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payload_hash is distinct from old.payload_hash
     or new.payload is distinct from old.payload
     or new.command_type is distinct from old.command_type
     or new.command_id is distinct from old.command_id
     or new.run_id is distinct from old.run_id
     or new.season_id is distinct from old.season_id
     or new.expected_step_seq is distinct from old.expected_step_seq
     or new.expected_run_version is distinct from old.expected_run_version then
    raise exception 'COMMAND_IMMUTABLE_FIELDS: cannot change identity/payload after accept'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_simulation_command_payload_immutable
  on public.simulation_commands;
create trigger trg_enforce_simulation_command_payload_immutable
  before update on public.simulation_commands
  for each row
  execute function public.enforce_simulation_command_payload_immutable();

revoke all on function public.enforce_simulation_command_payload_immutable()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS on simulation_runs (admin select/write; service_role unrestricted)
-- ---------------------------------------------------------------------------

alter table public.simulation_runs enable row level security;

revoke all on table public.simulation_runs from public, anon;
grant select, insert, update, delete on table public.simulation_runs to authenticated;
grant select, insert, update, delete on table public.simulation_runs to service_role;

drop policy if exists "admins select simulation_runs" on public.simulation_runs;
create policy "admins select simulation_runs"
  on public.simulation_runs for select to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

drop policy if exists "admins write simulation_runs" on public.simulation_runs;
create policy "admins write simulation_runs"
  on public.simulation_runs for all to authenticated
  using ((select public.user_has_role_or_higher((select auth.uid()), 'admin')))
  with check ((select public.user_has_role_or_higher((select auth.uid()), 'admin')));

-- ---------------------------------------------------------------------------
-- Ensure composite run/season FKs exist (idempotent; create-table-if-not-exists
-- can leave older child tables without them).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'simulation_commands_run_season_fkey'
  ) then
    alter table public.simulation_commands
      add constraint simulation_commands_run_season_fkey
      foreign key (run_id, season_id)
      references public.simulation_runs (id, season_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'simulation_steps_run_season_fkey'
  ) then
    alter table public.simulation_steps
      add constraint simulation_steps_run_season_fkey
      foreign key (run_id, season_id)
      references public.simulation_runs (id, season_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'simulation_events_run_season_fkey'
  ) then
    alter table public.simulation_events
      add constraint simulation_events_run_season_fkey
      foreign key (run_id, season_id)
      references public.simulation_runs (id, season_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'simulation_decisions_run_season_fkey'
  ) then
    alter table public.simulation_decisions
      add constraint simulation_decisions_run_season_fkey
      foreign key (run_id, season_id)
      references public.simulation_runs (id, season_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'simulation_bot_seats_run_season_fkey'
  ) then
    alter table public.sim_bot_seats
      add constraint simulation_bot_seats_run_season_fkey
      foreign key (run_id, season_id)
      references public.simulation_runs (id, season_id)
      on delete cascade;
  end if;
end $$;

-- Also ensure simple run_id FKs exist on children.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'simulation_commands_run_id_fkey'
  ) then
    alter table public.simulation_commands
      add constraint simulation_commands_run_id_fkey
      foreign key (run_id) references public.simulation_runs(id) on delete cascade;
  end if;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Re-assert RPC grants (defense in depth)
-- ---------------------------------------------------------------------------

revoke all on function public.sim_claim_run_lease(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.sim_claim_run_lease(uuid, text, integer) to service_role;

revoke all on function public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.sim_apply_foundation_step(uuid, uuid, text, text, uuid, jsonb, text)
  to service_role;

revoke all on schema sim_private from public, anon, authenticated;
grant usage on schema sim_private to service_role;
