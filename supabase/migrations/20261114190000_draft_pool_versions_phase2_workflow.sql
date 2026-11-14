-- purpose: add the phase-2 editor, review, approval, and atomic publish workflow
--          for versioned draft pools while keeping the current published pool live.
-- affected:
--   draft_pool_versions (lineage, contributors, published timestamp, locked-down DML),
--   draft_pool_version_entries and season_pokemon_restrictions (draft-only writes),
--   is_draft_pool_admin(), contributor tracking triggers, and five workflow RPCs.
-- special considerations:
--   - Additive and safe for Deploy-to-production auto-apply on merge.
--   - Version state changes are SECURITY DEFINER RPC-only for authenticated users.
--   - Does not alter draft_pool / season_draft_pool, pick/free-agency RPCs, or coach tables.
-- rollback (emergency; restore phase-1 editor policies/grants separately before use):
--   drop function if exists public.rpc_draft_pool_discard_revision(uuid);
--   drop function if exists public.rpc_draft_pool_publish_revision(uuid,text);
--   drop function if exists public.rpc_draft_pool_withdraw_revision(uuid);
--   drop function if exists public.rpc_draft_pool_submit_revision(uuid,text);
--   drop function if exists public.rpc_draft_pool_start_revision(uuid,text);
--   drop trigger if exists draft_pool_restrictions_track_contributor on public.season_pokemon_restrictions;
--   drop trigger if exists draft_pool_entries_track_contributor on public.draft_pool_version_entries;
--   drop function if exists public.track_draft_pool_version_contributor();
--   drop function if exists public.is_draft_pool_admin();
--   alter table public.draft_pool_versions drop column if exists published_at,
--     drop column if exists contributor_ids, drop column if exists based_on_version_id;

alter table public.draft_pool_versions
  add column if not exists based_on_version_id uuid null
    references public.draft_pool_versions (id) on delete set null,
  add column if not exists contributor_ids uuid[] not null default '{}'::uuid[],
  add column if not exists published_at timestamptz;

comment on column public.draft_pool_versions.based_on_version_id is
  'Published version copied to create this revision, if one existed.';
comment on column public.draft_pool_versions.contributor_ids is
  'Distinct authenticated users whose entry/restriction writes changed this revision.';
comment on column public.draft_pool_versions.published_at is
  'Timestamp at which this version atomically replaced the prior published version.';

-- ---------------------------------------------------------------------------
-- Admin helper: admin_users membership OR profile role admin/commissioner.
-- ---------------------------------------------------------------------------
create or replace function public.is_draft_pool_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((select public.is_admin()), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'commissioner')
    );
$$;

comment on function public.is_draft_pool_admin() is
  'True for admin_users members or profiles.role admin|commissioner. Used by the versioned draft-pool workflow.';

revoke all on function public.is_draft_pool_admin() from public, anon;
grant execute on function public.is_draft_pool_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Version state is RPC-only. Keep SELECT and the existing SELECT policy.
-- ---------------------------------------------------------------------------
drop policy if exists "draft_pool_versions_insert_editors"
  on public.draft_pool_versions;
drop policy if exists "draft_pool_versions_update_editors"
  on public.draft_pool_versions;
drop policy if exists "draft_pool_versions_delete_editors"
  on public.draft_pool_versions;

revoke insert, update, delete on table public.draft_pool_versions
  from authenticated;

-- ---------------------------------------------------------------------------
-- Child rows are writable only while their parent is an unsubmitted pending draft.
-- Both sides of UPDATE enforce the parent so rows cannot be moved between versions.
-- ---------------------------------------------------------------------------
drop policy if exists "draft_pool_version_entries_insert_editors"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_insert_editors"
  on public.draft_pool_version_entries
  for insert
  to authenticated
  with check (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  );

drop policy if exists "draft_pool_version_entries_update_editors"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_update_editors"
  on public.draft_pool_version_entries
  for update
  to authenticated
  using (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  )
  with check (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  );

drop policy if exists "draft_pool_version_entries_delete_editors"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_delete_editors"
  on public.draft_pool_version_entries
  for delete
  to authenticated
  using (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  );

drop policy if exists "season_pokemon_restrictions_insert_editors"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_insert_editors"
  on public.season_pokemon_restrictions
  for insert
  to authenticated
  with check (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  );

drop policy if exists "season_pokemon_restrictions_update_editors"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_update_editors"
  on public.season_pokemon_restrictions
  for update
  to authenticated
  using (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  )
  with check (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  );

drop policy if exists "season_pokemon_restrictions_delete_editors"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_delete_editors"
  on public.season_pokemon_restrictions
  for delete
  to authenticated
  using (
    (select public.is_draft_pool_editor())
    and exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and v.status = 'pending'
        and v.submitted_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- Contributor tracking. Trigger execution does not require callers to hold
-- EXECUTE on the function, so direct invocation can remain fully revoked.
-- ---------------------------------------------------------------------------
create or replace function public.track_draft_pool_version_contributor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_version_id uuid;
begin
  if v_actor is null then
    return coalesce(new, old);
  end if;

  v_version_id := case when tg_op = 'DELETE' then old.version_id else new.version_id end;

  update public.draft_pool_versions
  set
    contributor_ids = case
      when v_actor = any(contributor_ids) then contributor_ids
      else array_append(contributor_ids, v_actor)
    end,
    updated_at = now()
  where id = v_version_id;

  return coalesce(new, old);
end;
$$;

revoke all on function public.track_draft_pool_version_contributor()
  from public, anon, authenticated;

drop trigger if exists draft_pool_entries_track_contributor
  on public.draft_pool_version_entries;
create trigger draft_pool_entries_track_contributor
  after insert or update or delete on public.draft_pool_version_entries
  for each row execute function public.track_draft_pool_version_contributor();

drop trigger if exists draft_pool_restrictions_track_contributor
  on public.season_pokemon_restrictions;
create trigger draft_pool_restrictions_track_contributor
  after insert or update or delete on public.season_pokemon_restrictions
  for each row execute function public.track_draft_pool_version_contributor();

-- ---------------------------------------------------------------------------
-- Start a draft revision by copying the currently published version.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_draft_pool_start_revision(
  p_season_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_published_id uuid;
  v_version_id uuid;
begin
  if v_actor is null or not coalesce((select public.is_draft_pool_editor()), false) then
    raise exception 'permission denied: draft-pool editor access is required'
      using errcode = '42501';
  end if;
  if p_season_id is null then
    raise exception 'season id is required' using errcode = 'P0001';
  end if;

  perform 1 from public.seasons where id = p_season_id for update;
  if not found then
    raise exception 'season not found' using errcode = 'P0001';
  end if;
  perform v.id
  from public.draft_pool_versions v
  where v.season_id = p_season_id
  order by v.id
  for update;

  if exists (
    select 1 from public.draft_pool_versions
    where season_id = p_season_id and status = 'pending'
  ) then
    raise exception 'a pending revision already exists for this season'
      using errcode = 'P0001';
  end if;

  select id into v_published_id
  from public.draft_pool_versions
  where season_id = p_season_id and status = 'published';

  insert into public.draft_pool_versions (
    season_id,
    status,
    created_by,
    based_on_version_id,
    notes
  )
  values (
    p_season_id,
    'pending',
    v_actor,
    v_published_id,
    p_notes
  )
  returning id into v_version_id;

  if v_published_id is not null then
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
      pokemon_id,
      sheet_name,
      points,
      status,
      tera_banned,
      sort_order
    from public.draft_pool_version_entries
    where version_id = v_published_id;

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
      pokemon_id,
      sheet_name,
      kind,
      name,
      note
    from public.season_pokemon_restrictions
    where version_id = v_published_id;
  end if;

  return v_version_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Submit, withdraw, publish, and discard transitions.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_draft_pool_submit_revision(
  p_version_id uuid,
  p_notes text default null
)
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
  if v_version.status <> 'pending' then
    raise exception 'only a pending revision can be submitted' using errcode = 'P0001';
  end if;
  if v_version.submitted_at is not null then
    raise exception 'revision is already submitted for review' using errcode = 'P0001';
  end if;

  update public.draft_pool_versions
  set
    submitted_by = v_actor,
    submitted_at = now(),
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_version_id;
end;
$$;

create or replace function public.rpc_draft_pool_withdraw_revision(
  p_version_id uuid
)
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
  if v_actor <> v_version.submitted_by
    and not coalesce((select public.is_draft_pool_admin()), false) then
    raise exception 'permission denied: only the submitter or an admin may withdraw this revision'
      using errcode = '42501';
  end if;

  update public.draft_pool_versions
  set submitted_by = null, submitted_at = null, updated_at = now()
  where id = p_version_id;
end;
$$;

create or replace function public.rpc_draft_pool_publish_revision(
  p_version_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_version public.draft_pool_versions%rowtype;
  v_archived_id uuid;
  v_is_admin boolean;
  v_is_mod boolean;
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
  if v_version.status <> 'pending' then
    raise exception 'only a pending revision can be published' using errcode = 'P0001';
  end if;

  v_is_admin := coalesce((select public.is_draft_pool_admin()), false);
  v_is_mod := coalesce((select public.is_league_mod()), false);

  if not v_is_admin then
    if not v_is_mod then
      raise exception 'permission denied: admin or league mod approval is required'
        using errcode = '42501';
    end if;
    if v_version.submitted_at is null or v_version.submitted_by is null then
      raise exception 'revision must be submitted before a mod can approve it'
        using errcode = 'P0001';
    end if;
    if v_actor = v_version.submitted_by then
      raise exception 'permission denied: submitters cannot approve their own revision'
        using errcode = '42501';
    end if;
    if v_actor = any(v_version.contributor_ids) then
      raise exception 'permission denied: contributors cannot approve this revision'
        using errcode = '42501';
    end if;
  end if;

  perform e.id
  from public.draft_pool_version_entries e
  where e.version_id = p_version_id
  order by e.id
  for update;
  if not found then
    raise exception 'cannot publish an empty draft-pool revision'
      using errcode = 'P0001';
  end if;

  select id into v_archived_id
  from public.draft_pool_versions
  where season_id = v_version.season_id
    and status = 'published'
    and id <> p_version_id;

  if v_archived_id is not null then
    update public.draft_pool_versions
    set status = 'archived', archived_at = now(), updated_at = now()
    where id = v_archived_id;
  end if;

  update public.draft_pool_versions
  set
    status = 'published',
    approved_by = v_actor,
    approved_at = now(),
    published_at = now(),
    archived_at = null,
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_version_id;

  return jsonb_build_object(
    'published_version_id', p_version_id,
    'archived_version_id', v_archived_id
  );
end;
$$;

create or replace function public.rpc_draft_pool_discard_revision(
  p_version_id uuid
)
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
  if v_version.status <> 'pending' then
    raise exception 'only a pending revision can be discarded' using errcode = 'P0001';
  end if;
  if v_actor <> v_version.created_by
    and not coalesce((select public.is_draft_pool_admin()), false) then
    raise exception 'permission denied: only the creator or an admin may discard this revision'
      using errcode = '42501';
  end if;

  update public.draft_pool_versions
  set status = 'archived', archived_at = now(), updated_at = now()
  where id = p_version_id;
end;
$$;

revoke all on function public.rpc_draft_pool_start_revision(uuid, text)
  from public, anon;
grant execute on function public.rpc_draft_pool_start_revision(uuid, text)
  to authenticated;

revoke all on function public.rpc_draft_pool_submit_revision(uuid, text)
  from public, anon;
grant execute on function public.rpc_draft_pool_submit_revision(uuid, text)
  to authenticated;

revoke all on function public.rpc_draft_pool_withdraw_revision(uuid)
  from public, anon;
grant execute on function public.rpc_draft_pool_withdraw_revision(uuid)
  to authenticated;

revoke all on function public.rpc_draft_pool_publish_revision(uuid, text)
  from public, anon;
grant execute on function public.rpc_draft_pool_publish_revision(uuid, text)
  to authenticated;

revoke all on function public.rpc_draft_pool_discard_revision(uuid)
  from public, anon;
grant execute on function public.rpc_draft_pool_discard_revision(uuid)
  to authenticated;
