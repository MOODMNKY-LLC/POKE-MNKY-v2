-- purpose: draft pool builder phase 5 - pick-time rule enforcement.
--   1. Published pool source: when a season has a draft_pool_versions row with
--      status='published', a pick/claim is valid only for a `draftable` entry of that
--      version and costs the entry's points. No published version -> legacy validation.
--   2. Identity via draft_pool_sheet_aliases + entry pokemon_id (no name guessing).
--   3. Species clause (SPECIES_CLAUSE), keyed by draft_pool_species_key().
--   4. Roster max (ROSTER_FULL) against seasons.roster_size_max (null = no check).
-- affected: new helper functions draft_pool_*; create or replace of
--   rpc_make_live_draft_pick, rpc_free_agency_transaction, rpc_submit_draft_pick
--   (signatures unchanged; bodies based on the production definitions).
--   Does NOT touch sim_*, rpc_discord_submit_draft_pick, validate_free_agency_transaction.
-- drift note: the production (and repo) rpc_submit_draft_pick fails on every call that reaches
--   its totals query with 42702 "column reference points_snapshot is ambiguous" (RETURNS TABLE
--   column vs draft_picks.points_snapshot). The only change to the production body other than
--   the pick rules is the `#variable_conflict use_column` directive that fixes this.
-- rollback: re-apply the previous definitions of the three pick functions from
--   20261102140200_rpc_make_live_draft_pick.sql and 20260515113358_remote_schema.sql
--   (rpc_free_agency_transaction, rpc_submit_draft_pick with
--   set search_path = public, extensions, pg_temp), re-apply service_role-only grants, then
--   drop function public.draft_pool_* helpers created below.
-- special: no data writes, no table grants, no RLS changes. Helpers are SECURITY DEFINER,
--   service_role only. Pick functions keep the production ACL (service_role only).
--   Error detail carries machine-readable context for rpc-error-map.ts
--   (SPECIES_CLAUSE: species=<key>; ROSTER_FULL: roster_max=<n>).
--   Roster for rule purposes = distinct union of team_rosters rows for the team and
--   active draft_picks rows for (season, team): live drafts write team_rosters, coach
--   self-service / free agency write draft_picks, and nothing syncs the two.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.draft_pool_published_version_id(p_season_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.id
  from public.draft_pool_versions v
  where v.season_id = p_season_id
    and v.status = 'published'
  limit 1
$$;

-- Maps a public.pokemon row to pokepedia_pokemon.id. Same linkage rpc_make_live_draft_pick
-- uses when it creates rows (name = lower(sheet name), slug = hyphenated name). Exact matches
-- only; the first step that finds exactly one id wins; more than one id at a step -> null.
create or replace function public.draft_pool_resolve_pokepedia_id(p_pokemon uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_slug text;
  v_name_slug text;
  v_ids integer[];
begin
  if p_pokemon is null then
    return null;
  end if;

  select lower(btrim(p.name)), nullif(lower(btrim(coalesce(p.slug, ''))), '')
  into v_name, v_slug
  from public.pokemon p
  where p.id = p_pokemon;

  if not found then
    return null;
  end if;

  v_name_slug := nullif(
    trim(both '-' from regexp_replace(coalesce(v_name, ''), '[^a-z0-9]+', '-', 'g')),
    ''
  );

  -- 1. alias by exact sheet name
  select array_agg(distinct a.pokemon_id) into v_ids
  from public.draft_pool_sheet_aliases a
  where a.pokemon_id is not null
    and lower(btrim(a.sheet_name)) = v_name;
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  if cardinality(v_ids) > 1 then return null; end if;

  -- 2. alias by slug (stored slug, or the slug rpc_make_live_draft_pick derives from the name)
  select array_agg(distinct a.pokemon_id) into v_ids
  from public.draft_pool_sheet_aliases a
  where a.pokemon_id is not null
    and (
      lower(btrim(a.sheet_slug)) in (v_slug, v_name_slug)
      or trim(both '-' from regexp_replace(lower(btrim(a.sheet_name)), '[^a-z0-9]+', '-', 'g'))
         in (v_slug, v_name_slug)
    );
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  if cardinality(v_ids) > 1 then return null; end if;

  -- 3. entry of a published version by exact sheet name
  select array_agg(distinct e.pokemon_id) into v_ids
  from public.draft_pool_version_entries e
  join public.draft_pool_versions v on v.id = e.version_id and v.status = 'published'
  where e.pokemon_id is not null
    and lower(btrim(e.sheet_name)) = v_name;
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;
  if cardinality(v_ids) > 1 then return null; end if;

  -- 4. catalog row with the identical name / slug
  select array_agg(distinct pp.id) into v_ids
  from public.pokepedia_pokemon pp
  where lower(pp.name) in (v_name, v_slug, v_name_slug);
  if cardinality(v_ids) = 1 then return v_ids[1]; end if;

  return null;
end;
$$;

-- Entry of the season's PUBLISHED version for a pokepedia id (entry's own pokemon_id, or an
-- alias of the entry's sheet name when the entry has no id). Never reads other statuses.
create or replace function public.draft_pool_published_entry_for(
  p_season_id uuid,
  p_pokepedia_id integer
)
returns table (
  entry_id uuid,
  version_id uuid,
  sheet_name text,
  points integer,
  entry_status text,
  pokepedia_id integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id, e.version_id, e.sheet_name, e.points::integer, e.status, p_pokepedia_id
  from public.draft_pool_version_entries e
  join public.draft_pool_versions v
    on v.id = e.version_id
   and v.season_id = p_season_id
   and v.status = 'published'
  where p_pokepedia_id is not null
    and (
      e.pokemon_id = p_pokepedia_id
      or (
        e.pokemon_id is null
        and exists (
          select 1
          from public.draft_pool_sheet_aliases a
          where a.pokemon_id = p_pokepedia_id
            and lower(btrim(a.sheet_name)) = lower(btrim(e.sheet_name))
        )
      )
    )
  order by (e.pokemon_id is not null) desc, (e.status = 'draftable') desc, e.sort_order, e.sheet_name
  limit 1
$$;

-- Resolve a typed name against the published version: entries.sheet_name first (exact,
-- trimmed, case-insensitive), then draft_pool_sheet_aliases.sheet_name -> pokemon_id -> entry.
create or replace function public.draft_pool_published_entry_for_name(
  p_season_id uuid,
  p_name text
)
returns table (
  entry_id uuid,
  version_id uuid,
  sheet_name text,
  points integer,
  entry_status text,
  pokepedia_id integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with k as (
    select lower(btrim(p_name)) as key
  ),
  direct as (
    select
      e.id as entry_id,
      e.version_id,
      e.sheet_name,
      e.points::integer as points,
      e.status as entry_status,
      coalesce(
        e.pokemon_id,
        (
          select a.pokemon_id
          from public.draft_pool_sheet_aliases a
          where a.pokemon_id is not null
            and lower(btrim(a.sheet_name)) = lower(btrim(e.sheet_name))
          limit 1
        )
      ) as pokepedia_id
    from public.draft_pool_version_entries e
    where e.version_id = public.draft_pool_published_version_id(p_season_id)
      and lower(btrim(e.sheet_name)) = (select key from k)
    limit 1
  ),
  alias_ids as (
    select array_agg(distinct a.pokemon_id) as ids
    from public.draft_pool_sheet_aliases a
    where a.pokemon_id is not null
      and lower(btrim(a.sheet_name)) = (select key from k)
  )
  select d.entry_id, d.version_id, d.sheet_name, d.points, d.entry_status, d.pokepedia_id
  from direct d
  union all
  select f.entry_id, f.version_id, f.sheet_name, f.points, f.entry_status, f.pokepedia_id
  from alias_ids ai
  cross join lateral public.draft_pool_published_entry_for(p_season_id, ai.ids[1]) f
  where cardinality(ai.ids) = 1
    and not exists (select 1 from direct)
$$;

-- Published entry for a public.pokemon row: by resolved pokepedia id, else by its name.
create or replace function public.draft_pool_published_entry_for_pokemon(
  p_season_id uuid,
  p_pokemon uuid
)
returns table (
  entry_id uuid,
  version_id uuid,
  sheet_name text,
  points integer,
  entry_status text,
  pokepedia_id integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with by_id as (
    select f.entry_id, f.version_id, f.sheet_name, f.points, f.entry_status, f.pokepedia_id
    from public.draft_pool_published_entry_for(
      p_season_id,
      public.draft_pool_resolve_pokepedia_id(p_pokemon)
    ) f
  )
  select b.entry_id, b.version_id, b.sheet_name, b.points, b.entry_status, b.pokepedia_id
  from by_id b
  union all
  select n.entry_id, n.version_id, n.sheet_name, n.points, n.entry_status, n.pokepedia_id
  from public.pokemon p
  cross join lateral public.draft_pool_published_entry_for_name(p_season_id, p.name) n
  where p.id = p_pokemon
    and not exists (select 1 from by_id)
$$;

-- Published-pool cost for a public.pokemon row.
--   no published version         -> null (caller keeps legacy validation)
--   not draftable / not in pool  -> raises p_not_in_pool_code
--   draftable                    -> the entry's points
create or replace function public.draft_pool_published_cost_for_pokemon(
  p_season_id uuid,
  p_pokemon uuid,
  p_not_in_pool_code text default 'POKEMON_NOT_IN_POOL'
)
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_points integer;
  v_status text;
begin
  if public.draft_pool_published_version_id(p_season_id) is null then
    return null;
  end if;

  select e.points, e.entry_status
  into v_points, v_status
  from public.draft_pool_published_entry_for_pokemon(p_season_id, p_pokemon) e
  limit 1;

  if v_status is distinct from 'draftable' then
    raise exception using message = coalesce(nullif(btrim(p_not_in_pool_code), ''), 'POKEMON_NOT_IN_POOL');
  end if;

  return v_points;
end;
$$;

-- Species key used by the species clause. Change the rule here only.
-- Resolved catalog species_name first, then public.pokemon.species_name. Null = unknown
-- (the clause is skipped for that Pokemon rather than guessing).
create or replace function public.draft_pool_species_key(
  p_pokepedia_id integer,
  p_pokemon uuid default null
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select nullif(
    lower(btrim(coalesce(
      (select pp.species_name from public.pokepedia_pokemon pp where pp.id = p_pokepedia_id),
      (select p.species_name from public.pokemon p where p.id = p_pokemon)
    ))),
    ''
  )
$$;

-- Distinct roster (public.pokemon ids) for rule checks; p_exclude_pokemon is left out.
create or replace function public.draft_pool_team_roster_pokemon(
  p_season_id uuid,
  p_team_id uuid,
  p_exclude_pokemon uuid default null
)
returns table (pokemon_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.pokemon_id
  from (
    select tr.pokemon_id
    from public.team_rosters tr
    where tr.team_id = p_team_id
    union
    select dp.pokemon_id
    from public.draft_picks dp
    where dp.season_id = p_season_id
      and dp.team_id = p_team_id
      and dp.status = 'active'
  ) r
  where r.pokemon_id is not null
    and (p_exclude_pokemon is null or r.pokemon_id <> p_exclude_pokemon)
$$;

-- True when any team of the season already holds the Pokemon on team_rosters.
create or replace function public.draft_pool_pokemon_held_in_season(
  p_season_id uuid,
  p_pokepedia_id integer,
  p_sheet_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.team_rosters tr
    join public.teams t on t.id = tr.team_id
    where t.season_id = p_season_id
      and (
        (p_pokepedia_id is not null
          and public.draft_pool_resolve_pokepedia_id(tr.pokemon_id) = p_pokepedia_id)
        or exists (
          select 1
          from public.pokemon p
          where p.id = tr.pokemon_id
            and lower(btrim(p.name)) = lower(btrim(p_sheet_name))
        )
      )
  )
$$;

-- ROSTER_FULL when adding would push the team above seasons.roster_size_max.
-- A drop of a rostered Pokemon makes the move size-neutral (drop+add is fine at max).
create or replace function public.draft_pool_assert_roster_capacity(
  p_season_id uuid,
  p_team_id uuid,
  p_drop_pokemon uuid default null
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_max integer;
  v_count integer;
begin
  select s.roster_size_max into v_max
  from public.seasons s
  where s.id = p_season_id;

  if v_max is null then
    return;
  end if;

  if p_drop_pokemon is not null and exists (
    select 1
    from public.draft_pool_team_roster_pokemon(p_season_id, p_team_id, null) r
    where r.pokemon_id = p_drop_pokemon
  ) then
    return;
  end if;

  select count(*) into v_count
  from public.draft_pool_team_roster_pokemon(p_season_id, p_team_id, null);

  if v_count >= v_max then
    raise exception 'ROSTER_FULL' using detail = 'roster_max=' || v_max::text;
  end if;
end;
$$;

-- SPECIES_CLAUSE when the team already holds the same species (p_drop_pokemon excluded).
-- p_defer_identity_to_unique_index: for draft_picks writers; when the candidate is already an
-- active pick in the season, the existing uq_season_pokemon_unique path raises its own code.
create or replace function public.draft_pool_assert_species_clause(
  p_season_id uuid,
  p_team_id uuid,
  p_pokemon uuid,
  p_pokepedia_id integer default null,
  p_drop_pokemon uuid default null,
  p_defer_identity_to_unique_index boolean default false
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_conflict text;
begin
  if p_defer_identity_to_unique_index and exists (
    select 1
    from public.draft_picks dp
    where dp.season_id = p_season_id
      and dp.pokemon_id = p_pokemon
      and dp.status = 'active'
  ) then
    return;
  end if;

  v_key := public.draft_pool_species_key(
    coalesce(p_pokepedia_id, public.draft_pool_resolve_pokepedia_id(p_pokemon)),
    p_pokemon
  );

  if v_key is null then
    return;
  end if;

  select k.species into v_conflict
  from (
    select public.draft_pool_species_key(
      public.draft_pool_resolve_pokepedia_id(r.pokemon_id),
      r.pokemon_id
    ) as species
    from public.draft_pool_team_roster_pokemon(p_season_id, p_team_id, p_drop_pokemon) r
  ) k
  where k.species = v_key
  limit 1;

  if v_conflict is not null then
    raise exception 'SPECIES_CLAUSE' using detail = 'species=' || v_conflict;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_make_live_draft_pick (production body + pick rules)
-- ---------------------------------------------------------------------------

create or replace function public.rpc_make_live_draft_pick(
  p_session_id uuid,
  p_team_id uuid,
  p_pokemon_name text,
  p_force_skip boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_session public.draft_sessions%rowtype;
  v_pool public.draft_pool%rowtype;
  v_budget public.draft_budgets%rowtype;
  v_turn_order uuid[];
  v_effective uuid[];
  v_is_snake boolean;
  v_picks_in_round integer;
  v_expected_team uuid;
  v_pokemon_uuid uuid;
  v_type1 text;
  v_type2 text;
  v_next_pick integer;
  v_next_round integer;
  v_next_snake boolean;
  v_next_order uuid[];
  v_next_index integer;
  v_next_team uuid;
  v_total_picks integer;
  v_complete boolean;
  v_deadline timestamptz;
  v_published_version uuid;
  v_entry record;
  v_pool_found boolean := false;
  v_name text;
  v_points integer;
  v_pp_id integer;
begin
  if p_session_id is null or p_team_id is null then
    raise exception 'INVALID_ARGS';
  end if;

  select * into v_session
  from public.draft_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.status is distinct from 'active' then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;

  if coalesce(v_session.governance_approval_status, 'approved') is distinct from 'approved' then
    raise exception 'SESSION_PENDING_APPROVAL';
  end if;

  v_turn_order := coalesce(
    array(select jsonb_array_elements_text(v_session.turn_order)::uuid),
    array[]::uuid[]
  );

  if coalesce(array_length(v_turn_order, 1), 0) = 0 then
    raise exception 'TURN_ORDER_EMPTY';
  end if;

  v_is_snake := v_session.draft_type = 'snake' and (v_session.current_round % 2 = 0);
  if v_is_snake then
    v_effective := (
      select array_agg(t order by ord desc)
      from unnest(v_turn_order) with ordinality as u(t, ord)
    );
  else
    v_effective := v_turn_order;
  end if;

  v_picks_in_round := ((v_session.current_pick_number - 1) % array_length(v_turn_order, 1));
  v_expected_team := v_effective[v_picks_in_round + 1];

  if v_expected_team is distinct from p_team_id then
    raise exception 'NOT_YOUR_TURN';
  end if;

  -- Skip / timer advance without writing a pick
  if p_force_skip then
    v_next_pick := v_session.current_pick_number + 1;
    v_next_round := ((v_next_pick - 1) / array_length(v_turn_order, 1)) + 1;
    v_next_snake := v_session.draft_type = 'snake' and (v_next_round % 2 = 0);
    if v_next_snake then
      v_next_order := (
        select array_agg(t order by ord desc)
        from unnest(v_turn_order) with ordinality as u(t, ord)
      );
    else
      v_next_order := v_turn_order;
    end if;
    v_next_index := ((v_next_pick - 1) % array_length(v_turn_order, 1));
    v_next_team := v_next_order[v_next_index + 1];
    v_total_picks := v_session.total_teams * v_session.total_rounds;
    v_complete := v_next_pick > v_total_picks;
    v_deadline := case
      when v_complete then null
      else now() + make_interval(secs => greatest(coalesce(v_session.pick_time_limit_seconds, 45), 1))
    end;

    update public.draft_sessions
    set current_pick_number = v_next_pick,
        current_round = v_next_round,
        current_team_id = v_next_team,
        status = case when v_complete then 'completed' else 'active' end,
        completed_at = case when v_complete then now() else null end,
        current_pick_deadline_at = v_deadline,
        updated_at = now()
    where id = p_session_id;

    return jsonb_build_object(
      'success', true,
      'skipped', true,
      'next_team_id', v_next_team,
      'completed', v_complete,
      'deadline_at', v_deadline
    );
  end if;

  if p_pokemon_name is null or length(trim(p_pokemon_name)) = 0 then
    raise exception 'POKEMON_REQUIRED';
  end if;

  v_published_version := public.draft_pool_published_version_id(v_session.season_id);

  if v_published_version is not null then
    -- Published pool: only a draftable entry of the published version is valid; cost = entry points.
    select e.* into v_entry
    from public.draft_pool_published_entry_for_name(v_session.season_id, p_pokemon_name) e
    limit 1;

    if not found or v_entry.entry_status is distinct from 'draftable' then
      raise exception 'POKEMON_NOT_IN_POOL';
    end if;

    v_name := v_entry.sheet_name;
    v_points := v_entry.points;
    v_pp_id := v_entry.pokepedia_id;

    -- Availability: the legacy draft_pool row (if the season has one) and other teams' rosters.
    select * into v_pool
    from public.draft_pool dp
    where dp.season_id = v_session.season_id
      and (
        lower(dp.pokemon_name) = lower(v_name)
        or lower(dp.pokemon_name) = lower(trim(p_pokemon_name))
        or (v_pp_id is not null and dp.pokemon_id = v_pp_id)
      )
    order by (dp.status = 'available' or dp.status is null) desc
    limit 1
    for update;

    v_pool_found := found;

    if v_pool_found and not (v_pool.status = 'available' or v_pool.status is null) then
      raise exception 'POKEMON_NOT_AVAILABLE';
    end if;

    if public.draft_pool_pokemon_held_in_season(v_session.season_id, v_pp_id, v_name) then
      raise exception 'POKEMON_NOT_AVAILABLE';
    end if;
  else
    select * into v_pool
    from public.draft_pool
    where season_id = v_session.season_id
      and lower(pokemon_name) = lower(trim(p_pokemon_name))
      and (status = 'available' or status is null)
    for update;

    if not found then
      raise exception 'POKEMON_NOT_AVAILABLE';
    end if;

    v_pool_found := true;
    v_name := v_pool.pokemon_name;
    v_points := v_pool.point_value;
    v_pp_id := v_pool.pokemon_id;
  end if;

  select * into v_budget
  from public.draft_budgets
  where team_id = p_team_id
    and season_id = v_session.season_id
  for update;

  if not found then
    raise exception 'BUDGET_NOT_FOUND';
  end if;

  if v_budget.remaining_points < v_points then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  -- Ensure public.pokemon UUID row exists for team_rosters FK
  select id into v_pokemon_uuid
  from public.pokemon
  where lower(name) = lower(v_name)
  limit 1;

  if v_pokemon_uuid is null then
    select
      coalesce(pp.type_primary, 'normal'),
      pp.type_secondary
    into v_type1, v_type2
    from public.pokepedia_pokemon pp
    where pp.id = v_pp_id
    limit 1;

    insert into public.pokemon (name, slug, type1, type2)
    values (
      lower(v_name),
      trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')),
      coalesce(v_type1, 'normal'),
      v_type2
    )
    on conflict (name) do update set type1 = excluded.type1
    returning id into v_pokemon_uuid;
  end if;

  if exists (
    select 1 from public.team_rosters tr
    where tr.team_id = p_team_id and tr.pokemon_id = v_pokemon_uuid
  ) then
    raise exception 'DUPLICATE_PICK';
  end if;

  v_pp_id := coalesce(v_pp_id, public.draft_pool_resolve_pokepedia_id(v_pokemon_uuid));

  perform public.draft_pool_assert_roster_capacity(v_session.season_id, p_team_id, null);
  perform public.draft_pool_assert_species_clause(
    v_session.season_id, p_team_id, v_pokemon_uuid, v_pp_id, null, false
  );

  insert into public.team_rosters (
    team_id, pokemon_id, draft_round, draft_order, draft_points, source
  ) values (
    p_team_id,
    v_pokemon_uuid,
    v_session.current_round,
    v_session.current_pick_number,
    v_points,
    'draft'
  );

  update public.draft_budgets
  set spent_points = spent_points + v_points
  where id = v_budget.id;

  if v_pool_found then
    update public.draft_pool
    set status = 'drafted',
        drafted_by_team_id = p_team_id,
        drafted_at = now(),
        draft_round = v_session.current_round,
        draft_pick_number = v_session.current_pick_number,
        updated_at = now()
    where id = v_pool.id
      and (status = 'available' or status is null);
  end if;

  v_next_pick := v_session.current_pick_number + 1;
  v_next_round := ((v_next_pick - 1) / array_length(v_turn_order, 1)) + 1;
  v_next_snake := v_session.draft_type = 'snake' and (v_next_round % 2 = 0);
  if v_next_snake then
    v_next_order := (
      select array_agg(t order by ord desc)
      from unnest(v_turn_order) with ordinality as u(t, ord)
    );
  else
    v_next_order := v_turn_order;
  end if;
  v_next_index := ((v_next_pick - 1) % array_length(v_turn_order, 1));
  v_next_team := v_next_order[v_next_index + 1];
  v_total_picks := v_session.total_teams * v_session.total_rounds;
  v_complete := v_next_pick > v_total_picks;
  v_deadline := case
    when v_complete then null
    else now() + make_interval(secs => greatest(coalesce(v_session.pick_time_limit_seconds, 45), 1))
  end;

  update public.draft_sessions
  set current_pick_number = v_next_pick,
      current_round = v_next_round,
      current_team_id = v_next_team,
      status = case when v_complete then 'completed' else 'active' end,
      completed_at = case when v_complete then now() else null end,
      current_pick_deadline_at = v_deadline,
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'success', true,
    'skipped', false,
    'pokemon_name', v_name,
    'point_value', v_points,
    'pick_number', v_session.current_pick_number,
    'round', v_session.current_round,
    'team_id', p_team_id,
    'next_team_id', v_next_team,
    'completed', v_complete,
    'deadline_at', v_deadline
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- rpc_free_agency_transaction (production body + pick rules)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_free_agency_transaction(p_season_id uuid, p_team_id uuid, p_drop_pokemon_id uuid, p_add_pokemon_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(dropped_pick_id uuid, added_pick_id uuid, added_points_snapshot integer, points_used integer, budget_remaining integer, slots_used integer, slots_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_drop_pick_id UUID;
  v_drop_points INTEGER;
  v_add_points INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
  v_published_version UUID;
BEGIN
  -- AuthZ: Must be admin or coach of the team
  IF NOT (public.is_admin() OR public.is_coach_of_team(p_team_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Membership: Team must be in season
  IF NOT EXISTS (
    SELECT 1 FROM public.season_teams st 
    WHERE st.season_id = p_season_id AND st.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_IN_SEASON';
  END IF;

  -- Load season rules
  SELECT draft_points_budget, roster_size_max
  INTO v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  -- Serialize roster-rule checks per team
  PERFORM pg_advisory_xact_lock(hashtextextended('draft_pool_pick_rules:' || p_team_id::text, 0));

  -- Lock + locate the active pick being dropped
  SELECT id, points_snapshot
  INTO v_drop_pick_id, v_drop_points
  FROM public.draft_picks
  WHERE season_id = p_season_id
    AND team_id = p_team_id
    AND pokemon_id = p_drop_pokemon_id
    AND status = 'active'
  FOR UPDATE;

  IF v_drop_pick_id IS NULL THEN
    RAISE EXCEPTION 'DROP_NOT_OWNED';
  END IF;

  v_published_version := public.draft_pool_published_version_id(p_season_id);

  IF v_published_version IS NOT NULL THEN
    -- Published pool: draftable entry only, cost = entry points
    v_add_points := public.draft_pool_published_cost_for_pokemon(
      p_season_id, p_add_pokemon_id, 'ADD_NOT_IN_POOL'
    );
  ELSE
    -- Pool legality for add
    SELECT id INTO v_pool_id
    FROM public.draft_pools
    WHERE season_id = p_season_id AND locked = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_pool_id IS NOT NULL THEN
      SELECT included INTO v_included
      FROM public.draft_pool_pokemon
      WHERE draft_pool_id = v_pool_id AND pokemon_id = p_add_pokemon_id;

      IF v_included IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'ADD_NOT_IN_POOL';
      END IF;
    END IF;

    -- Snapshot points for add
    SELECT draft_points INTO v_add_points 
    FROM public.pokemon 
    WHERE id = p_add_pokemon_id;
  END IF;

  IF v_add_points IS NULL THEN
    RAISE EXCEPTION 'ADD_POINTS_MISSING';
  END IF;

  -- Compute current totals
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  -- Hypothetical budget after swap
  IF (v_points_used - v_drop_points + v_add_points) > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  -- Species clause (dropped Pokemon excluded) and roster max (drop+add is size-neutral)
  PERFORM public.draft_pool_assert_species_clause(
    p_season_id, p_team_id, p_add_pokemon_id, NULL, p_drop_pokemon_id, true
  );
  PERFORM public.draft_pool_assert_roster_capacity(p_season_id, p_team_id, p_drop_pokemon_id);

  -- Execute atomic swap
  UPDATE public.draft_picks
  SET status = 'dropped',
      end_date = CURRENT_DATE,
      notes = COALESCE(notes, '') || CASE 
        WHEN p_notes IS NULL THEN '' 
        ELSE E'\n' || p_notes 
      END
  WHERE id = v_drop_pick_id;

  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, p_team_id, p_add_pokemon_id,
    'free_agency', 'active', CURRENT_DATE, v_add_points, p_notes
  )
  RETURNING id INTO added_pick_id;

  dropped_pick_id := v_drop_pick_id;
  added_points_snapshot := v_add_points;

  -- Return updated totals
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  RETURN QUERY
  SELECT
    dropped_pick_id,
    added_pick_id,
    added_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ADD_ALREADY_OWNED';
END;
$function$;

-- ---------------------------------------------------------------------------
-- rpc_submit_draft_pick (production body + pick rules)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_submit_draft_pick(p_season_id uuid, p_team_id uuid, p_pokemon_id uuid, p_acquisition acquisition_type, p_draft_round integer DEFAULT NULL::integer, p_pick_number integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(draft_pick_id uuid, points_snapshot integer, points_used integer, budget_remaining integer, slots_used integer, slots_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
#variable_conflict use_column
DECLARE
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_points_snapshot INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
  v_published_version UUID;
BEGIN
  -- AuthZ: Must be admin or coach of the team
  IF NOT (public.is_admin() OR public.is_coach_of_team(p_team_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Membership: Team must be in season
  IF NOT EXISTS (
    SELECT 1 FROM public.season_teams st 
    WHERE st.season_id = p_season_id AND st.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_IN_SEASON';
  END IF;

  -- Load season rules
  SELECT draft_points_budget, roster_size_max
  INTO v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  -- Serialize roster-rule checks per team
  PERFORM pg_advisory_xact_lock(hashtextextended('draft_pool_pick_rules:' || p_team_id::text, 0));

  v_published_version := public.draft_pool_published_version_id(p_season_id);

  IF v_published_version IS NOT NULL THEN
    -- Published pool: draftable entry only, cost = entry points
    v_points_snapshot := public.draft_pool_published_cost_for_pokemon(
      p_season_id, p_pokemon_id, 'POKEMON_NOT_IN_POOL'
    );
  ELSE
    -- Snapshot points from pokemon
    SELECT draft_points INTO v_points_snapshot 
    FROM public.pokemon 
    WHERE id = p_pokemon_id;
    
    IF v_points_snapshot IS NULL THEN
      RAISE EXCEPTION 'POKEMON_POINTS_MISSING';
    END IF;

    -- Pool check (if there is a locked pool for season)
    SELECT id INTO v_pool_id
    FROM public.draft_pools
    WHERE season_id = p_season_id AND locked = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_pool_id IS NOT NULL THEN
      SELECT included INTO v_included
      FROM public.draft_pool_pokemon
      WHERE draft_pool_id = v_pool_id AND pokemon_id = p_pokemon_id;

      IF v_included IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'POKEMON_NOT_IN_POOL';
      END IF;
    END IF;
  END IF;

  -- Current totals (active picks only)
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  -- Budget/slots validations
  IF v_points_used + v_points_snapshot > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  IF v_slots_used + 1 > v_roster_max THEN
    RAISE EXCEPTION 'ROSTER_FULL';
  END IF;

  -- Roster max across draft_picks + team_rosters, then species clause
  PERFORM public.draft_pool_assert_roster_capacity(p_season_id, p_team_id, NULL);
  PERFORM public.draft_pool_assert_species_clause(
    p_season_id, p_team_id, p_pokemon_id, NULL, NULL, true
  );

  -- Insert (uniqueness guarded by uq_season_pokemon_unique)
  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, p_team_id, p_pokemon_id,
    p_acquisition, p_draft_round, p_pick_number,
    'active', CURRENT_DATE, v_points_snapshot, p_notes
  )
  RETURNING id INTO draft_pick_id;

  -- Recompute after insert
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  RETURN QUERY
  SELECT
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'POKEMON_ALREADY_OWNED';
END;
$function$;

-- ---------------------------------------------------------------------------
-- ACLs: service_role only (helpers and the re-created pick functions)
-- ---------------------------------------------------------------------------

revoke all on function public.draft_pool_published_version_id(uuid) from public, anon, authenticated;
revoke all on function public.draft_pool_resolve_pokepedia_id(uuid) from public, anon, authenticated;
revoke all on function public.draft_pool_published_entry_for(uuid, integer) from public, anon, authenticated;
revoke all on function public.draft_pool_published_entry_for_name(uuid, text) from public, anon, authenticated;
revoke all on function public.draft_pool_published_entry_for_pokemon(uuid, uuid) from public, anon, authenticated;
revoke all on function public.draft_pool_published_cost_for_pokemon(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.draft_pool_species_key(integer, uuid) from public, anon, authenticated;
revoke all on function public.draft_pool_team_roster_pokemon(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.draft_pool_pokemon_held_in_season(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.draft_pool_assert_roster_capacity(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.draft_pool_assert_species_clause(uuid, uuid, uuid, integer, uuid, boolean) from public, anon, authenticated;

grant execute on function public.draft_pool_published_version_id(uuid) to service_role;
grant execute on function public.draft_pool_resolve_pokepedia_id(uuid) to service_role;
grant execute on function public.draft_pool_published_entry_for(uuid, integer) to service_role;
grant execute on function public.draft_pool_published_entry_for_name(uuid, text) to service_role;
grant execute on function public.draft_pool_published_entry_for_pokemon(uuid, uuid) to service_role;
grant execute on function public.draft_pool_published_cost_for_pokemon(uuid, uuid, text) to service_role;
grant execute on function public.draft_pool_species_key(integer, uuid) to service_role;
grant execute on function public.draft_pool_team_roster_pokemon(uuid, uuid, uuid) to service_role;
grant execute on function public.draft_pool_pokemon_held_in_season(uuid, integer, text) to service_role;
grant execute on function public.draft_pool_assert_roster_capacity(uuid, uuid, uuid) to service_role;
grant execute on function public.draft_pool_assert_species_clause(uuid, uuid, uuid, integer, uuid, boolean) to service_role;

revoke all on function public.rpc_make_live_draft_pick(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.rpc_free_agency_transaction(uuid, uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.rpc_submit_draft_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) from public, anon, authenticated;
grant execute on function public.rpc_make_live_draft_pick(uuid, uuid, text, boolean) to service_role;
grant execute on function public.rpc_free_agency_transaction(uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.rpc_submit_draft_pick(uuid, uuid, uuid, public.acquisition_type, integer, integer, text) to service_role;
