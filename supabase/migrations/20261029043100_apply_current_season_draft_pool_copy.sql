-- Atomic copy of a planned draft pool into the current season.
--
-- Affected: public.season_draft_pool, public.draft_pool
-- Called by the admin copy endpoint via rpc apply_current_season_draft_pool_copy.
--
-- Both writes run in this function body. PostgREST executes the call inside
-- one transaction, so a failure on the live board rolls back the season pool
-- write as well. Pick, round, and team fields are forced empty and status is
-- forced to available. Rows already drafted in the target season are left
-- unchanged. is_tera_banned and tera_captain_eligible are taken from the
-- payload so a previous season's Tera rules are not replaced by column defaults.
--
-- security invoker: the Next.js route calls this with the service role after
-- an admin/commissioner check. Execute is granted only to service_role.
-- search_path is empty and every object is schema-qualified.

create or replace function public.apply_current_season_draft_pool_copy(
  p_target_season_id uuid,
  p_board_rows jsonb,
  p_season_rows jsonb
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_season_upserted integer := 0;
  v_board_upserted integer := 0;
  v_skipped_drafted integer := 0;
begin
  if p_target_season_id is null then
    raise exception 'p_target_season_id is required'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.seasons
    where id = p_target_season_id
      and is_current is true
  ) then
    raise exception 'Draft pool copy target must be the current season'
      using errcode = '22023';
  end if;

  -- Serialize overlapping copies of the same season for this transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_target_season_id::text, 0));

  if exists (
    select 1
    from public.draft_sessions
    where season_id = p_target_season_id
      and status = 'active'
  ) then
    raise exception 'Cannot copy a draft pool while the current season has an active draft session'
      using errcode = 'P0001';
  end if;

  select count(*)
  into v_skipped_drafted
  from (
    select distinct lower(btrim(board_row->>'pokemon_name')) as name_key
    from jsonb_array_elements(coalesce(p_board_rows, '[]'::jsonb)) as board_row
    where btrim(coalesce(board_row->>'pokemon_name', '')) <> ''
  ) as planned
  join public.draft_pool as existing
    on existing.season_id = p_target_season_id
   and lower(existing.pokemon_name) = planned.name_key
   and existing.status = 'drafted';

  insert into public.season_draft_pool (
    season_id,
    pokemon_id,
    is_included,
    assigned_points
  )
  select
    p_target_season_id,
    planned.pokemon_id,
    planned.is_included,
    planned.assigned_points
  from (
    select distinct on (season_row->>'pokemon_id')
      (season_row->>'pokemon_id')::uuid as pokemon_id,
      coalesce((season_row->>'is_included')::boolean, true) as is_included,
      nullif(season_row->>'assigned_points', '')::integer as assigned_points
    from jsonb_array_elements(coalesce(p_season_rows, '[]'::jsonb)) as season_row
    where nullif(btrim(coalesce(season_row->>'pokemon_id', '')), '') is not null
    order by season_row->>'pokemon_id'
  ) as planned
  on conflict (season_id, pokemon_id) do update
  set
    is_included = excluded.is_included,
    assigned_points = excluded.assigned_points;

  get diagnostics v_season_upserted = row_count;

  insert into public.draft_pool (
    season_id,
    pokemon_name,
    point_value,
    pokemon_id,
    generation,
    status,
    draft_pick_number,
    draft_round,
    drafted_at,
    drafted_by_team_id,
    banned_reason,
    is_tera_banned,
    tera_captain_eligible,
    updated_at
  )
  select
    p_target_season_id,
    planned.pokemon_name,
    planned.point_value,
    planned.pokemon_id,
    planned.generation,
    'available',
    null,
    null,
    null,
    null,
    null,
    planned.is_tera_banned,
    planned.tera_captain_eligible,
    now()
  from (
    select distinct on (lower(btrim(board_row->>'pokemon_name')))
      btrim(board_row->>'pokemon_name') as pokemon_name,
      least(
        20,
        greatest(
          1,
          coalesce(nullif(board_row->>'point_value', '')::integer, 12)
        )
      ) as point_value,
      nullif(board_row->>'pokemon_id', '')::integer as pokemon_id,
      nullif(board_row->>'generation', '')::integer as generation,
      coalesce((board_row->>'is_tera_banned')::boolean, false) as is_tera_banned,
      coalesce((board_row->>'tera_captain_eligible')::boolean, true) as tera_captain_eligible
    from jsonb_array_elements(coalesce(p_board_rows, '[]'::jsonb)) as board_row
    where btrim(coalesce(board_row->>'pokemon_name', '')) <> ''
    order by lower(btrim(board_row->>'pokemon_name'))
  ) as planned
  where not exists (
    select 1
    from public.draft_pool as existing
    where existing.season_id = p_target_season_id
      and lower(existing.pokemon_name) = lower(planned.pokemon_name)
      and existing.status = 'drafted'
  )
  on conflict (season_id, pokemon_name) do update
  set
    point_value = excluded.point_value,
    pokemon_id = excluded.pokemon_id,
    generation = excluded.generation,
    status = 'available',
    draft_pick_number = null,
    draft_round = null,
    drafted_at = null,
    drafted_by_team_id = null,
    banned_reason = null,
    is_tera_banned = excluded.is_tera_banned,
    tera_captain_eligible = excluded.tera_captain_eligible,
    updated_at = now()
  where draft_pool.status is distinct from 'drafted';

  get diagnostics v_board_upserted = row_count;

  return jsonb_build_object(
    'season_draft_pool_upserted', v_season_upserted,
    'draft_pool_upserted', v_board_upserted,
    'draft_pool_skipped_drafted', v_skipped_drafted
  );
end;
$$;

comment on function public.apply_current_season_draft_pool_copy(uuid, jsonb, jsonb) is
  'Upserts season_draft_pool and draft_pool for the current season in one transaction. Copied board rows are available, pick fields are cleared, and Tera flags are preserved. Drafted target rows are skipped.';

revoke all on function public.apply_current_season_draft_pool_copy(uuid, jsonb, jsonb) from public;
revoke all on function public.apply_current_season_draft_pool_copy(uuid, jsonb, jsonb) from anon;
revoke all on function public.apply_current_season_draft_pool_copy(uuid, jsonb, jsonb) from authenticated;
grant execute on function public.apply_current_season_draft_pool_copy(uuid, jsonb, jsonb) to service_role;
