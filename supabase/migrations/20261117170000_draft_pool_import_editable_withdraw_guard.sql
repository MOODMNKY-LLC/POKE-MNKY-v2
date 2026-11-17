-- Draft pool: editable imports + fail-closed withdraw guard
--
-- Purpose
--   1. rpc_apply_draft_pool_pending_import now creates the new pending version
--      as an editable draft: created_by = p_actor, submitted_by = null,
--      submitted_at = null. Previously it stamped submitted_by/submitted_at,
--      which immediately froze the revision (editor RLS requires
--      submitted_at is null) so nobody could edit an imported pool.
--   2. rpc_draft_pool_withdraw_revision no longer fails open when
--      submitted_by is null. `v_actor <> null` evaluates to null, so the old
--      IF was skipped and any editor could withdraw. Now a null submitter means
--      only an admin may withdraw; otherwise the submitter or an admin.
--
-- Scope: function bodies and EXECUTE grants only. No data changes, no RLS or
-- table grant changes. Signatures, SECURITY DEFINER and search_path unchanged.
--
-- Rollback: re-create both functions from
--   20261114170000_draft_pool_versions_phase1.sql / 20261114180000_draft_pool_versions_acl_harden.sql
--   (import) and 20261114190000_draft_pool_versions_phase2_workflow.sql
--   (withdraw), then re-apply the grants below.

create or replace function public.rpc_apply_draft_pool_pending_import(
  p_season_id uuid,
  p_entries jsonb,
  p_restrictions jsonb,
  p_aliases jsonb default '[]'::jsonb,
  p_catalog_only jsonb default '[]'::jsonb,
  p_actor uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_version_id uuid;
  v_entries_n integer := 0;
  v_restrictions_n integer := 0;
  v_aliases_n integer := 0;
  v_catalog_only_n integer := 0;
  v_catalog_only_skipped integer := 0;
  v_role text;
begin
  -- Defensive: even if EXECUTE is re-granted later, only service_role or
  -- is_draft_pool_editor() may run this SECURITY DEFINER import path.
  -- Prefer PostgREST JWT role claim (auth.role() equivalent without requiring
  -- auth.role() to exist in disposable harnesses).
  v_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(
      (
        case
          when nullif(current_setting('request.jwt.claims', true), '') is null
            then null
          else (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
        end
      ),
      ''
    )
  );
  if not (
    v_role = 'service_role'
    or coalesce((select public.is_draft_pool_editor()), false)
  ) then
    raise exception
      'permission denied for rpc_apply_draft_pool_pending_import'
      using errcode = '42501';
  end if;

  if p_season_id is null then
    raise exception 'p_season_id is required';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries must be a jsonb array';
  end if;
  if p_restrictions is null or jsonb_typeof(p_restrictions) <> 'array' then
    raise exception 'p_restrictions must be a jsonb array';
  end if;

  update public.draft_pool_versions
  set
    status = 'archived',
    archived_at = now(),
    updated_at = now(),
    notes = coalesce(
      notes,
      'Archived by rpc_apply_draft_pool_pending_import before replace'
    )
  where season_id = p_season_id
    and status = 'pending';

  -- Editable draft: not submitted, so editors can still change entries.
  insert into public.draft_pool_versions (
    season_id,
    status,
    created_by,
    submitted_by,
    submitted_at,
    notes
  )
  values (
    p_season_id,
    'pending',
    p_actor,
    null,
    null,
    coalesce(
      p_notes,
      'Phase-1 sheet import (pending). Not wired to live draft board yet.'
    )
  )
  returning id into v_version_id;

  insert into public.draft_pool_version_entries (
    version_id,
    pokemon_id,
    sheet_name,
    points,
    status,
    tera_banned,
    sort_order
  )
  select
    v_version_id,
    nullif(e->>'pokemon_id', '')::integer,
    e->>'sheet_name',
    (e->>'points')::smallint,
    e->>'status',
    coalesce((e->>'tera_banned')::boolean, false),
    coalesce((e->>'sort_order')::integer, 0)
  from jsonb_array_elements(p_entries) as e;

  get diagnostics v_entries_n = row_count;

  insert into public.season_pokemon_restrictions (
    version_id,
    pokemon_id,
    sheet_name,
    kind,
    name,
    note
  )
  select
    v_version_id,
    nullif(r->>'pokemon_id', '')::integer,
    nullif(r->>'sheet_name', ''),
    r->>'kind',
    r->>'name',
    nullif(r->>'note', '')
  from jsonb_array_elements(p_restrictions) as r;

  get diagnostics v_restrictions_n = row_count;

  if p_aliases is not null and jsonb_typeof(p_aliases) = 'array' then
    insert into public.draft_pool_sheet_aliases (
      sheet_name,
      sheet_slug,
      pokemon_id,
      match_kind,
      notes,
      updated_at
    )
    select
      a->>'sheet_name',
      a->>'sheet_slug',
      nullif(a->>'pokemon_id', '')::integer,
      nullif(a->>'match_kind', ''),
      nullif(a->>'notes', ''),
      now()
    from jsonb_array_elements(p_aliases) as a
    on conflict (sheet_name) do update
    set
      sheet_slug = excluded.sheet_slug,
      pokemon_id = excluded.pokemon_id,
      match_kind = excluded.match_kind,
      notes = excluded.notes,
      updated_at = now();
    get diagnostics v_aliases_n = row_count;
  end if;

  if p_catalog_only is not null and jsonb_typeof(p_catalog_only) = 'array' then
    insert into public.pokemon_catalog_index_only (
      pokemon_id,
      sheet_name,
      sheet_slug,
      reason
    )
    select
      (c->>'pokemon_id')::integer,
      c->>'sheet_name',
      c->>'sheet_slug',
      coalesce(nullif(c->>'reason', ''), 'regional_form_excluded_from_pool')
    from jsonb_array_elements(p_catalog_only) as c
    where nullif(c->>'pokemon_id', '') is not null
    on conflict (pokemon_id) do update
    set
      sheet_name = excluded.sheet_name,
      sheet_slug = excluded.sheet_slug,
      reason = excluded.reason;
    get diagnostics v_catalog_only_n = row_count;

    select count(*)::integer into v_catalog_only_skipped
    from jsonb_array_elements(p_catalog_only) as c
    where nullif(c->>'pokemon_id', '') is null;
  end if;

  return jsonb_build_object(
    'version_id', v_version_id,
    'entries_inserted', v_entries_n,
    'restrictions_inserted', v_restrictions_n,
    'aliases_upserted', v_aliases_n,
    'catalog_only_upserted', v_catalog_only_n,
    'catalog_only_skipped', v_catalog_only_skipped
  );
end;
$$;

revoke all on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) from public, anon, authenticated;
grant execute on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) to service_role;

create or replace function public.rpc_draft_pool_withdraw_revision(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_version public.draft_pool_versions%rowtype;
begin
  if v_actor is null or not coalesce((select public.is_draft_pool_editor()), false) then
    raise exception 'permission denied: draft-pool editor access is required'
      using errcode = '42501';
  end if;

  select * into v_version
  from public.draft_pool_versions
  where id = p_version_id;
  if not found then
    raise exception 'draft-pool revision not found' using errcode = 'P0001';
  end if;

  perform v.id
  from public.draft_pool_versions v
  where v.season_id = v_version.season_id
  order by v.id
  for update;

  select * into v_version
  from public.draft_pool_versions
  where id = p_version_id;
  if v_version.status <> 'pending' or v_version.submitted_at is null then
    raise exception 'only a submitted pending revision can be withdrawn'
      using errcode = 'P0001';
  end if;

  -- Fail closed: a null submitter means only an admin may withdraw.
  if v_version.submitted_by is null then
    if not coalesce((select public.is_draft_pool_admin()), false) then
      raise exception 'permission denied: only the submitter or an admin may withdraw this revision'
        using errcode = '42501';
    end if;
  elsif v_actor is distinct from v_version.submitted_by
    and not coalesce((select public.is_draft_pool_admin()), false) then
    raise exception 'permission denied: only the submitter or an admin may withdraw this revision'
      using errcode = '42501';
  end if;

  update public.draft_pool_versions
  set submitted_by = null, submitted_at = null, updated_at = now()
  where id = p_version_id;
end;
$$;

revoke all on function public.rpc_draft_pool_withdraw_revision(uuid)
  from public, anon;
grant execute on function public.rpc_draft_pool_withdraw_revision(uuid)
  to authenticated, service_role;
