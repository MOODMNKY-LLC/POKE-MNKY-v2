-- DB audit (Phase 3) item 5: security advisor fixes.
--
-- 1) function_search_path_mutable (37 functions): pin search_path so the
--    functions cannot be hijacked by objects in a caller-controlled schema.
--    Uses "public, extensions, pg_temp" (not '') because several bodies use
--    unqualified public tables, vector operators (vector lives in public) and
--    pgcrypto digest() (extensions); cron.* references are already qualified.
--    Behaviour is unchanged for normal callers.
--
-- 2) rpc_free_agency_transaction / rpc_submit_draft_pick are SECURITY DEFINER,
--    do not check auth.uid(), and were executable by anon + authenticated, so
--    anyone could submit picks / transactions for any team via PostgREST.
--    The app only calls them from API routes using the service-role client
--    (app/api/draft/pick, app/api/free-agency/transaction), so EXECUTE is
--    limited to service_role.
--
-- Rollback:
--   alter function public.<fn> reset search_path;   -- for each function below
--   grant execute on function public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text) to anon, authenticated;
--   grant execute on function public.rpc_submit_draft_pick(uuid,uuid,uuid,acquisition_type,integer,integer,text) to anon, authenticated;

alter function public._get_supabase_url() set search_path = public, extensions, pg_temp;
alter function public.calculate_showdown_team_pokemon_count() set search_path = public, extensions, pg_temp;
alter function public.check_pokedex_sprites_bucket() set search_path = public, extensions, pg_temp;
alter function public.extract_id_from_pokeapi_url(text) set search_path = public, extensions, pg_temp;
alter function public.find_showdown_entry_by_name(text) set search_path = public, extensions, pg_temp;
alter function public.get_page_parents(bigint) set search_path = public, extensions, pg_temp;
alter function public.get_pokemon_by_id(integer) set search_path = public, extensions, pg_temp;
alter function public.get_pokemon_by_name(text) set search_path = public, extensions, pg_temp;
alter function public.get_pokemon_by_tier(integer) set search_path = public, extensions, pg_temp;
alter function public.get_pokemon_for_draft(uuid) set search_path = public, extensions, pg_temp;
alter function public.handle_updated_at() set search_path = public, extensions, pg_temp;
alter function public.increment_workflow_version() set search_path = public, extensions, pg_temp;
alter function public.is_admin() set search_path = public, extensions, pg_temp;
alter function public.is_coach_of_team(uuid) set search_path = public, extensions, pg_temp;
alter function public.map_tier_to_point_value(text) set search_path = public, extensions, pg_temp;
alter function public.match_documents(vector,integer,jsonb) set search_path = public, extensions, pg_temp;
alter function public.match_page_sections(vector,double precision,integer,integer) set search_path = public, extensions, pg_temp;
alter function public.mcp_access_token_hook(jsonb) set search_path = public, extensions, pg_temp;
alter function public.normalize_showdown_id_to_name(text) set search_path = public, extensions, pg_temp;
alter function public.populate_abilities_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.populate_all_master_tables_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.populate_moves_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.populate_pokemon_abilities_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.populate_pokemon_moves_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.populate_pokemon_types_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.populate_types_from_pokeapi() set search_path = public, extensions, pg_temp;
alter function public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text) set search_path = public, extensions, pg_temp;
alter function public.rpc_submit_draft_pick(uuid,uuid,uuid,acquisition_type,integer,integer,text) set search_path = public, extensions, pg_temp;
alter function public.search_pokemon(text,text,text,text,integer,integer) set search_path = public, extensions, pg_temp;
alter function public.set_updated_at() set search_path = public, extensions, pg_temp;
alter function public.sha256_hex(text) set search_path = public, extensions, pg_temp;
alter function public.unschedule_showdown_pokedex_cron() set search_path = public, extensions, pg_temp;
alter function public.update_bulbapedia_mechanics_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_canonical_league_config_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_showdown_teams_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_smogon_meta_snapshot_updated_at() set search_path = public, extensions, pg_temp;
alter function public.update_updated_at_column() set search_path = public, extensions, pg_temp;

revoke execute on function public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text) from public, anon, authenticated;
revoke execute on function public.rpc_submit_draft_pick(uuid,uuid,uuid,acquisition_type,integer,integer,text) from public, anon, authenticated;
grant execute on function public.rpc_free_agency_transaction(uuid,uuid,uuid,uuid,text) to service_role;
grant execute on function public.rpc_submit_draft_pick(uuid,uuid,uuid,acquisition_type,integer,integer,text) to service_role;
