-- Drop the season-less unique key on draft_pool (pokemon_name, point_value).
--
-- Affected: public.draft_pool
-- Removes: draft_pool_pokemon_name_point_value_key
-- Keeps: draft_pool_season_pokemon_unique (season_id, pokemon_name)
--        idx_draft_pool_season_pokemon_point (season_id, pokemon_name, point_value)
--
-- 20250302150000_drop_draft_pool_pokemon_name_point_value_constraint.sql already
-- drops this key, but that file sorts before draft_pool is created
-- (20260112000000_create_draft_pool.sql), so the drop is a no-op on a fresh
-- database. 20260119105458_remote_schema.sql then creates the unique index
-- again on (pokemon_name, point_value) with no season_id. Production still has
-- that index, so inserting Season 7's pool into Season 8 fails when the same
-- name and point value already exist.
--
-- The index may be either a unique index or a table constraint of the same
-- name. Drop the constraint first when it exists, then the index.
--
-- App writes do not rely on the season-less key. Upserts and ON CONFLICT
-- targets use season_id with pokemon_name, or season_id with pokemon_name and
-- point_value (notion sync, showdown seed, draft pool publish, and
-- apply_current_season_draft_pool_copy).
--
-- Do not apply this file to production from the agent. It ships for the
-- normal migration path.

do $$
begin
  if to_regclass('public.draft_pool') is null then
    return;
  end if;

  -- Dropping the constraint also drops the index that backs it.
  if exists (
    select 1
    from pg_constraint
    where conname = 'draft_pool_pokemon_name_point_value_key'
      and conrelid = 'public.draft_pool'::regclass
  ) then
    alter table public.draft_pool
      drop constraint draft_pool_pokemon_name_point_value_key;
  end if;
end
$$;

-- Remote schema created this as a unique index, not a constraint.
drop index if exists public.draft_pool_pokemon_name_point_value_key;
