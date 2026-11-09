-- Preserve draft cursor fields across foundation checkpoints.
-- P1 apply_foundation_step replaced the whole cursor with {step_seq}, which
-- wiped pick_number/round and broke create→foundation→pick sequences.
-- Behavior otherwise matches 20261106130022 (sandbox raise, lease fencing, etc.).

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
        run_version = simulation_runs.run_version + 1,
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
        run_version = simulation_runs.run_version + 1
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
    cursor = coalesce(simulation_runs.cursor, '{}'::jsonb) || jsonb_build_object('step_seq', v_next),
    heartbeat_at = now(),
    lease_expires_at = now() + interval '30 seconds',
    updated_at = now(),
    run_version = simulation_runs.run_version + 1,
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
