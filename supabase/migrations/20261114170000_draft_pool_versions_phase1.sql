-- purpose: phase 1 additive schema for a versioned, sheet-independent draft pool.
--          does NOT alter draft_pool / season_draft_pool rows, RPCs, or publish paths.
-- affected (new only):
--   draft_pool_versions, draft_pool_version_entries, season_pokemon_restrictions,
--   draft_pool_sheet_aliases, pokemon_catalog_index_only,
--   is_league_mod(), is_draft_pool_editor()
-- special considerations:
--   - Deploy-to-production auto-applies this on merge. Keep additive and safe.
--   - At most one published and one pending version per season (partial unique indexes).
--   - Mod gate uses profiles.discord_roles JSONB (guild 1190512330556063764,
--     role id 1190663258676396075 "Mod"). Documented in function comments.
-- rollback (emergency; drops phase-1 objects only):
--   drop function if exists public.rpc_apply_draft_pool_pending_import(uuid,jsonb,jsonb,jsonb,jsonb,uuid,text);
--   drop table if exists public.season_pokemon_restrictions cascade;
--   drop table if exists public.draft_pool_version_entries cascade;
--   drop table if exists public.draft_pool_versions cascade;
--   drop table if exists public.draft_pool_sheet_aliases cascade;
--   drop table if exists public.pokemon_catalog_index_only cascade;
--   drop function if exists public.is_draft_pool_editor();
--   drop function if exists public.is_league_mod();

-- ---------------------------------------------------------------------------
-- League Mod helper (Discord role stored on profiles.discord_roles)
-- ---------------------------------------------------------------------------
-- profiles.discord_roles shape (see 20260125000004_add_discord_roles_storage.sql):
--   [{"id":"<discord_role_id>","name":"Mod","color":"#…","position":n}, …]
-- There is no separate discord_member_roles table; sync fills this JSONB array.
-- Role id 1190663258676396075 = "Mod" on guild 1190512330556063764 (AAB Draft League).

create or replace function public.is_league_mod()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    cross join lateral jsonb_array_elements(coalesce(p.discord_roles, '[]'::jsonb)) as role_el
    where p.id = (select auth.uid())
      and (
        role_el->>'id' = '1190663258676396075'
        or lower(coalesce(role_el->>'name', '')) = 'mod'
      )
  );
$$;

comment on function public.is_league_mod() is
  'True when the caller has the league Discord Mod role (id 1190663258676396075) in profiles.discord_roles. Synced from guild 1190512330556063764; not a profiles.role enum value.';

create or replace function public.is_draft_pool_editor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce((select public.is_admin()), false)
    or coalesce((select public.is_league_mod()), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'commissioner')
    );
$$;

comment on function public.is_draft_pool_editor() is
  'Admins (admin_users / profiles.role admin|commissioner) or league Discord Mods may edit pending draft-pool revisions.';

revoke all on function public.is_league_mod() from public, anon;
revoke all on function public.is_draft_pool_editor() from public, anon;
grant execute on function public.is_league_mod() to authenticated, service_role;
grant execute on function public.is_draft_pool_editor() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Versioned pool header
-- ---------------------------------------------------------------------------
create table if not exists public.draft_pool_versions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  status text not null
    check (status in ('published', 'pending', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  submitted_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  archived_at timestamptz
);

comment on table public.draft_pool_versions is
  'Versioned draft-pool revisions per season. Coaches always see the published row; edits land on a pending revision and replace published only after approval (workflow in later phases).';

create index if not exists idx_draft_pool_versions_season
  on public.draft_pool_versions (season_id);

create index if not exists idx_draft_pool_versions_status
  on public.draft_pool_versions (status);

-- At most one published and one pending revision per season.
create unique index if not exists draft_pool_versions_one_published_per_season
  on public.draft_pool_versions (season_id)
  where (status = 'published');

create unique index if not exists draft_pool_versions_one_pending_per_season
  on public.draft_pool_versions (season_id)
  where (status = 'pending');

-- ---------------------------------------------------------------------------
-- Version entries (pool rows)
-- ---------------------------------------------------------------------------
create table if not exists public.draft_pool_version_entries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null
    references public.draft_pool_versions (id) on delete cascade,
  -- Canonical catalog FK (same integer id space as draft_pool.pokemon_id / pokepedia_pokemon).
  pokemon_id integer references public.pokepedia_pokemon (id) on delete set null,
  sheet_name text not null,
  points smallint not null,
  status text not null
    check (status in ('draftable', 'banned')),
  tera_banned boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint draft_pool_version_entries_points_check
    check (points = 99 or (points >= 1 and points <= 20)),
  constraint draft_pool_version_entries_status_points_check
    check (
      (status = 'banned' and points = 99)
      or (status = 'draftable' and points >= 1 and points <= 20)
    ),
  constraint draft_pool_version_entries_version_sheet_name_key
    unique (version_id, sheet_name)
);

comment on table public.draft_pool_version_entries is
  'Pokémon rows for one draft_pool_versions revision. sheet_name is the exact league display name (whitespace-trimmed). Excluded (Pts. = ''-'') and fakemon rows are omitted.';

comment on column public.draft_pool_version_entries.tera_banned is
  'Season Tera-ban list membership. Effective ban = tera_banned AND points <= 10 (see is_effective_tera_ban).';

comment on column public.draft_pool_version_entries.pokemon_id is
  'Nullable FK to pokepedia_pokemon. Null when the importer could not resolve a catalog id (logged as unresolved; never guessed).';

alter table public.draft_pool_version_entries
  add column if not exists is_effective_tera_ban boolean
    generated always as (tera_banned and points <= 10) stored;

comment on column public.draft_pool_version_entries.is_effective_tera_ban is
  'Generated: tera_banned AND points <= 10. Matches league rule that high-cost Tera-list mons stay Tera-legal.';

create index if not exists idx_draft_pool_version_entries_version
  on public.draft_pool_version_entries (version_id);

create index if not exists idx_draft_pool_version_entries_pokemon
  on public.draft_pool_version_entries (pokemon_id)
  where pokemon_id is not null;

create index if not exists idx_draft_pool_version_entries_status
  on public.draft_pool_version_entries (version_id, status);

-- ---------------------------------------------------------------------------
-- Season restrictions (move / ability / combo), version-scoped
-- ---------------------------------------------------------------------------
create table if not exists public.season_pokemon_restrictions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null
    references public.draft_pool_versions (id) on delete cascade,
  pokemon_id integer references public.pokepedia_pokemon (id) on delete set null,
  sheet_name text,
  kind text not null
    check (kind in ('move', 'ability', 'combo')),
  name text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint season_pokemon_restrictions_identity_check
    check (pokemon_id is not null or sheet_name is not null or kind = 'combo')
);

comment on table public.season_pokemon_restrictions is
  'Season-editable banned moves/abilities and global combo rules, scoped to a draft_pool_versions row. pokemon_id may be null for global combo rules or unresolved names.';

create index if not exists idx_season_pokemon_restrictions_version
  on public.season_pokemon_restrictions (version_id);

create index if not exists idx_season_pokemon_restrictions_pokemon
  on public.season_pokemon_restrictions (pokemon_id)
  where pokemon_id is not null;

-- ---------------------------------------------------------------------------
-- Sheet → catalog alias map (importer seed / runtime resolution)
-- ---------------------------------------------------------------------------
create table if not exists public.draft_pool_sheet_aliases (
  sheet_name text primary key,
  sheet_slug text not null,
  pokemon_id integer references public.pokepedia_pokemon (id) on delete set null,
  match_kind text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.draft_pool_sheet_aliases is
  'Maps exact sheet display names (trimmed) to pokepedia_pokemon ids. Seeded by scripts/draft-pool importer from the phase-0 alias map; unresolved names keep pokemon_id null.';

create index if not exists idx_draft_pool_sheet_aliases_slug
  on public.draft_pool_sheet_aliases (sheet_slug);

create index if not exists idx_draft_pool_sheet_aliases_pokemon
  on public.draft_pool_sheet_aliases (pokemon_id)
  where pokemon_id is not null;

-- ---------------------------------------------------------------------------
-- Catalog-only regional forms (index/sprites; never in the draft pool)
-- ---------------------------------------------------------------------------
-- Reuses pokepedia_pokemon rather than duplicating a catalog. Rows here mark
-- Galarian/Alolan/Hisuian (etc.) forms that appear as Pts.='-' on the sheet and
-- must remain out of draft_pool_version_entries.
create table if not exists public.pokemon_catalog_index_only (
  pokemon_id integer primary key
    references public.pokepedia_pokemon (id) on delete cascade,
  sheet_name text not null,
  sheet_slug text not null,
  reason text not null default 'regional_form_excluded_from_pool',
  created_at timestamptz not null default now(),
  constraint pokemon_catalog_index_only_sheet_name_key unique (sheet_name)
);

comment on table public.pokemon_catalog_index_only is
  'Marks pokepedia_pokemon rows that exist for index/sprites only (regional forms with sheet Pts. = ''-''). Never appear in draft_pool_version_entries.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.draft_pool_versions enable row level security;
alter table public.draft_pool_version_entries enable row level security;
alter table public.season_pokemon_restrictions enable row level security;
alter table public.draft_pool_sheet_aliases enable row level security;
alter table public.pokemon_catalog_index_only enable row level security;

-- draft_pool_versions -------------------------------------------------------
drop policy if exists "draft_pool_versions_select_published_authenticated"
  on public.draft_pool_versions;
create policy "draft_pool_versions_select_published_authenticated"
  on public.draft_pool_versions
  for select
  to authenticated
  using (
    status = 'published'
    or (select public.is_draft_pool_editor())
  );

drop policy if exists "draft_pool_versions_insert_editors"
  on public.draft_pool_versions;
create policy "draft_pool_versions_insert_editors"
  on public.draft_pool_versions
  for insert
  to authenticated
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_versions_update_editors"
  on public.draft_pool_versions;
create policy "draft_pool_versions_update_editors"
  on public.draft_pool_versions
  for update
  to authenticated
  using ((select public.is_draft_pool_editor()))
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_versions_delete_editors"
  on public.draft_pool_versions;
create policy "draft_pool_versions_delete_editors"
  on public.draft_pool_versions
  for delete
  to authenticated
  using ((select public.is_draft_pool_editor()));

-- service_role full access (bypass via bypassrls; explicit policies for clarity)
drop policy if exists "draft_pool_versions_all_service_role"
  on public.draft_pool_versions;
create policy "draft_pool_versions_all_service_role"
  on public.draft_pool_versions
  for all
  to service_role
  using (true)
  with check (true);

-- draft_pool_version_entries ------------------------------------------------
drop policy if exists "draft_pool_version_entries_select_authenticated"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_select_authenticated"
  on public.draft_pool_version_entries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and (
          v.status = 'published'
          or (select public.is_draft_pool_editor())
        )
    )
  );

drop policy if exists "draft_pool_version_entries_insert_editors"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_insert_editors"
  on public.draft_pool_version_entries
  for insert
  to authenticated
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_version_entries_update_editors"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_update_editors"
  on public.draft_pool_version_entries
  for update
  to authenticated
  using ((select public.is_draft_pool_editor()))
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_version_entries_delete_editors"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_delete_editors"
  on public.draft_pool_version_entries
  for delete
  to authenticated
  using ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_version_entries_all_service_role"
  on public.draft_pool_version_entries;
create policy "draft_pool_version_entries_all_service_role"
  on public.draft_pool_version_entries
  for all
  to service_role
  using (true)
  with check (true);

-- season_pokemon_restrictions -----------------------------------------------
drop policy if exists "season_pokemon_restrictions_select_authenticated"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_select_authenticated"
  on public.season_pokemon_restrictions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.draft_pool_versions v
      where v.id = version_id
        and (
          v.status = 'published'
          or (select public.is_draft_pool_editor())
        )
    )
  );

drop policy if exists "season_pokemon_restrictions_insert_editors"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_insert_editors"
  on public.season_pokemon_restrictions
  for insert
  to authenticated
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "season_pokemon_restrictions_update_editors"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_update_editors"
  on public.season_pokemon_restrictions
  for update
  to authenticated
  using ((select public.is_draft_pool_editor()))
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "season_pokemon_restrictions_delete_editors"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_delete_editors"
  on public.season_pokemon_restrictions
  for delete
  to authenticated
  using ((select public.is_draft_pool_editor()));

drop policy if exists "season_pokemon_restrictions_all_service_role"
  on public.season_pokemon_restrictions;
create policy "season_pokemon_restrictions_all_service_role"
  on public.season_pokemon_restrictions
  for all
  to service_role
  using (true)
  with check (true);

-- draft_pool_sheet_aliases --------------------------------------------------
drop policy if exists "draft_pool_sheet_aliases_select_authenticated"
  on public.draft_pool_sheet_aliases;
create policy "draft_pool_sheet_aliases_select_authenticated"
  on public.draft_pool_sheet_aliases
  for select
  to authenticated
  using (true);

drop policy if exists "draft_pool_sheet_aliases_insert_editors"
  on public.draft_pool_sheet_aliases;
create policy "draft_pool_sheet_aliases_insert_editors"
  on public.draft_pool_sheet_aliases
  for insert
  to authenticated
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_sheet_aliases_update_editors"
  on public.draft_pool_sheet_aliases;
create policy "draft_pool_sheet_aliases_update_editors"
  on public.draft_pool_sheet_aliases
  for update
  to authenticated
  using ((select public.is_draft_pool_editor()))
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_sheet_aliases_delete_editors"
  on public.draft_pool_sheet_aliases;
create policy "draft_pool_sheet_aliases_delete_editors"
  on public.draft_pool_sheet_aliases
  for delete
  to authenticated
  using ((select public.is_draft_pool_editor()));

drop policy if exists "draft_pool_sheet_aliases_all_service_role"
  on public.draft_pool_sheet_aliases;
create policy "draft_pool_sheet_aliases_all_service_role"
  on public.draft_pool_sheet_aliases
  for all
  to service_role
  using (true)
  with check (true);

-- pokemon_catalog_index_only ------------------------------------------------
drop policy if exists "pokemon_catalog_index_only_select_authenticated"
  on public.pokemon_catalog_index_only;
create policy "pokemon_catalog_index_only_select_authenticated"
  on public.pokemon_catalog_index_only
  for select
  to authenticated
  using (true);

drop policy if exists "pokemon_catalog_index_only_insert_editors"
  on public.pokemon_catalog_index_only;
create policy "pokemon_catalog_index_only_insert_editors"
  on public.pokemon_catalog_index_only
  for insert
  to authenticated
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "pokemon_catalog_index_only_update_editors"
  on public.pokemon_catalog_index_only;
create policy "pokemon_catalog_index_only_update_editors"
  on public.pokemon_catalog_index_only
  for update
  to authenticated
  using ((select public.is_draft_pool_editor()))
  with check ((select public.is_draft_pool_editor()));

drop policy if exists "pokemon_catalog_index_only_delete_editors"
  on public.pokemon_catalog_index_only;
create policy "pokemon_catalog_index_only_delete_editors"
  on public.pokemon_catalog_index_only
  for delete
  to authenticated
  using ((select public.is_draft_pool_editor()));

drop policy if exists "pokemon_catalog_index_only_all_service_role"
  on public.pokemon_catalog_index_only;
create policy "pokemon_catalog_index_only_all_service_role"
  on public.pokemon_catalog_index_only
  for all
  to service_role
  using (true)
  with check (true);

-- Grants: no anon write; authenticated per policies; service_role full
revoke all on table public.draft_pool_versions from anon;
revoke all on table public.draft_pool_version_entries from anon;
revoke all on table public.season_pokemon_restrictions from anon;
revoke all on table public.draft_pool_sheet_aliases from anon;
revoke all on table public.pokemon_catalog_index_only from anon;

grant select, insert, update, delete on table public.draft_pool_versions to authenticated;
grant select, insert, update, delete on table public.draft_pool_version_entries to authenticated;
grant select, insert, update, delete on table public.season_pokemon_restrictions to authenticated;
grant select, insert, update, delete on table public.draft_pool_sheet_aliases to authenticated;
grant select, insert, update, delete on table public.pokemon_catalog_index_only to authenticated;

grant all on table public.draft_pool_versions to service_role;
grant all on table public.draft_pool_version_entries to service_role;
grant all on table public.season_pokemon_restrictions to service_role;
grant all on table public.draft_pool_sheet_aliases to service_role;
grant all on table public.pokemon_catalog_index_only to service_role;

-- ---------------------------------------------------------------------------
-- Atomic pending import (archive + version + children in one transaction)
-- ---------------------------------------------------------------------------
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
begin
  if p_season_id is null then
    raise exception 'p_season_id is required';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'p_entries must be a jsonb array';
  end if;
  if p_restrictions is null or jsonb_typeof(p_restrictions) <> 'array' then
    raise exception 'p_restrictions must be a jsonb array';
  end if;

  -- Archive any existing pending revision for this season first.
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
  'Atomically archive the season''s pending draft_pool_versions row (if any), insert a new pending revision, and write entries/restrictions/aliases/catalog-only rows. Used by scripts/draft-pool importer --apply.';

revoke all on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) from public, anon;
grant execute on function public.rpc_apply_draft_pool_pending_import(
  uuid, jsonb, jsonb, jsonb, jsonb, uuid, text
) to service_role;
