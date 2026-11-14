-- purpose: harden ACLs for draft_pool_versions phase-1 objects (post-merge prod audit).
-- affected:
--   rpc_apply_draft_pool_pending_import — revoke EXECUTE from PUBLIC/anon/authenticated;
--     grant EXECUTE to service_role only; add defensive caller guard.
--   draft_pool_versions, draft_pool_version_entries, season_pokemon_restrictions,
--     draft_pool_sheet_aliases, pokemon_catalog_index_only — wipe leftover
--     TRUNCATE/REFERENCES/TRIGGER/MAINTAIN from default privileges; re-grant
--     SELECT/INSERT/UPDATE/DELETE only (RLS still gates writes).
-- special considerations:
--   - Additive and safe for Deploy-to-production auto-apply on merge.
--   - Does not alter draft_pool / season_draft_pool data, publish APIs, or pick RPCs.
--   - Mirrors PR40 / season-sim shared-DB harden: REVOKE ALL then least-privilege GRANT
--     (selective REVOKE of DML alone leaves TRUNCATE leftovers from Supabase defaults).
-- rollback (emergency; restores pre-harden grants — less safe):
--   revoke all on function public.rpc_apply_draft_pool_pending_import(
--     uuid, jsonb, jsonb, jsonb, jsonb, uuid, text) from public, anon;
--   grant execute on function public.rpc_apply_draft_pool_pending_import(
--     uuid, jsonb, jsonb, jsonb, jsonb, uuid, text) to authenticated, service_role;
--   -- (recreate function body without the caller guard from 20261114170000 if needed)
--   grant select, insert, update, delete, truncate, references, trigger
--     on table public.draft_pool_versions,
--            public.draft_pool_version_entries,
--            public.season_pokemon_restrictions,
--            public.draft_pool_sheet_aliases,
--            public.pokemon_catalog_index_only
--     to authenticated;
--   grant all on table public.draft_pool_versions,
--                      public.draft_pool_version_entries,
--                      public.season_pokemon_restrictions,
--                      public.draft_pool_sheet_aliases,
--                      public.pokemon_catalog_index_only
--     to service_role;

-- ---------------------------------------------------------------------------
-- Table ACLs: wipe leftovers, re-grant SID only
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'draft_pool_versions',
    'draft_pool_version_entries',
    'season_pokemon_restrictions',
    'draft_pool_sheet_aliases',
    'pokemon_catalog_index_only'
  ];
begin
  foreach t in array tables
  loop
    if to_regclass('public.' || t) is null then
      raise exception 'DRAFT_POOL_ACL_HARDEN_FAILED: missing table public.%', t;
    end if;

    -- Supabase default privileges grant authenticated/service_role ALL
    -- (arwdDxtm incl. TRUNCATE/TRIGGER/MAINTAIN). Wipe then least privilege.
    execute format('revoke all on table public.%I from public', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from authenticated', t);
    execute format('revoke all on table public.%I from service_role', t);

    -- authenticated: DML only; RLS policies already gate who can write.
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      t
    );
    -- service_role: API/importer DML (bypasses RLS); no truncate/trigger/maintain
    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- rpc_apply_draft_pool_pending_import: service_role-only EXECUTE + caller guard
-- ---------------------------------------------------------------------------
-- Recreate with the same body as 20261114170000 plus a defensive gate so a
-- future accidental GRANT EXECUTE to authenticated cannot archive/replace
-- pending revisions unless the JWT caller is service_role or a draft-pool editor.

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
    p_actor,
    now(),
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

comment on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) is
  'Atomically archive the season''s pending draft_pool_versions row (if any), insert a new pending revision, and write entries/restrictions/aliases/catalog-only rows. EXECUTE is service_role-only; body also requires auth.role()=service_role or is_draft_pool_editor(). Used by scripts/draft-pool importer --apply.';

-- Explicit revoke of authenticated (CREATE FUNCTION + Supabase default privileges
-- can leave EXECUTE on authenticated even after REVOKE FROM PUBLIC).
revoke all on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) from public, anon, authenticated;
grant execute on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) to service_role;
