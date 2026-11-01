-- Security lockdown 1/3: anon-callable SECURITY DEFINER functions
-- Context: 28 SECURITY DEFINER functions in public were executable by PUBLIC/anon with no auth check.
-- * 24 admin/worker/trigger functions -> service_role only (triggers keep firing: EXECUTE is
--   only checked when a trigger is created, not when it fires).
-- * 4 read-only helpers used by signed-in users (RLS policies on simulation_runs, admin UI, lib/rbac)
--   -> authenticated + service_role, with an auth check added inside.
-- * search_path pinned on every function in scope that lacked one.

-- ---------- service_role only ----------
REVOKE ALL ON FUNCTION public.assign_coach_to_team(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_coach_to_team(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.broadcast_draft_pick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_draft_pick() TO service_role;
REVOKE ALL ON FUNCTION public.broadcast_draft_turn() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_draft_turn() TO service_role;
REVOKE ALL ON FUNCTION public.broadcast_pokemon_cache_sync_progress(text,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_pokemon_cache_sync_progress(text,integer,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.broadcast_showdown_sync_progress(text,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.broadcast_showdown_sync_progress(text,integer,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.clear_showdown_pokedex_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_showdown_pokedex_data() TO service_role;
REVOKE ALL ON FUNCTION public.get_available_pokemon(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_pokemon(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_available_pokemon_for_free_agency(uuid,integer,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_pokemon_for_free_agency(uuid,integer,integer,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.get_team_transaction_count(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_transaction_count(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.handle_first_user_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_first_user_admin() TO service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE ALL ON FUNCTION public.ingest_showdown_pokedex_batch(jsonb,text,timestamp with time zone,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_showdown_pokedex_batch(jsonb,text,timestamp with time zone,text) TO service_role;
REVOKE ALL ON FUNCTION public.is_valid_api_key(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_api_key(text,text) TO service_role;
REVOKE ALL ON FUNCTION public.notify_activity_feed_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_activity_feed_insert() TO service_role;
REVOKE ALL ON FUNCTION public.pgmq_public_delete(text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_public_delete(text,bigint) TO service_role;
REVOKE ALL ON FUNCTION public.pgmq_public_read(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_public_read(text,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.pgmq_public_send_batch(text,jsonb[],integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_public_send_batch(text,jsonb[],integer) TO service_role;
REVOKE ALL ON FUNCTION public.populate_draft_pool_from_showdown_tiers(uuid,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.populate_draft_pool_from_showdown_tiers(uuid,boolean,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.populate_showdown_pool_from_tiers(uuid,boolean,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.populate_showdown_pool_from_tiers(uuid,boolean,boolean) TO service_role;
REVOKE ALL ON FUNCTION public.release_coach_from_team(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_coach_from_team(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.rpc_discord_submit_draft_pick(text,uuid,text,uuid,integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_discord_submit_draft_pick(text,uuid,text,uuid,integer,integer,text) TO service_role;
REVOKE ALL ON FUNCTION public.seed_roster_versions_for_week(uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_roster_versions_for_week(uuid,integer) TO service_role;
REVOKE ALL ON FUNCTION public.update_discord_roles(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_discord_roles(uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.validate_free_agency_transaction(uuid,uuid,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_free_agency_transaction(uuid,uuid,text,integer,integer) TO service_role;

-- ---------- pin search_path where it was missing ----------
ALTER FUNCTION public.assign_coach_to_team(uuid,uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.broadcast_draft_pick() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.broadcast_draft_turn() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.broadcast_pokemon_cache_sync_progress(text,integer,integer,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.broadcast_showdown_sync_progress(text,integer,integer,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_available_pokemon(uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_available_pokemon_for_free_agency(uuid,integer,integer,integer,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.get_team_transaction_count(uuid,uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.handle_first_user_admin() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.is_valid_api_key(text,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.notify_activity_feed_insert() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.populate_showdown_pool_from_tiers(uuid,boolean,boolean) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.release_coach_from_team(uuid,uuid) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.rpc_discord_submit_draft_pick(text,uuid,text,uuid,integer,integer,text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_discord_roles(uuid,jsonb) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.validate_free_agency_transaction(uuid,uuid,text,integer,integer) SET search_path = public, extensions, pg_temp;

-- ---------- authenticated helpers with an auth check ----------
-- Callers with a user JWT may only ask about themselves unless they are admin/commissioner
-- (profiles.role, matching existing RLS policies). Callers with no auth.uid() can only be
-- service_role or a direct DB session, because anon no longer has EXECUTE.

CREATE OR REPLACE FUNCTION public.user_has_role_or_higher(user_id uuid, required_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL
     AND user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')) THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE user_role
    WHEN 'admin' THEN role_hierarchy := 4;
    WHEN 'commissioner' THEN role_hierarchy := 3;
    WHEN 'coach' THEN role_hierarchy := 2;
    WHEN 'spectator' THEN role_hierarchy := 1;
    ELSE role_hierarchy := 0;
  END CASE;

  CASE required_role
    WHEN 'admin' THEN required_hierarchy := 4;
    WHEN 'commissioner' THEN required_hierarchy := 3;
    WHEN 'coach' THEN required_hierarchy := 2;
    WHEN 'spectator' THEN required_hierarchy := 1;
    ELSE required_hierarchy := 0;
  END CASE;

  RETURN role_hierarchy >= required_hierarchy;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_permission(user_id uuid, required_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
  role_permissions JSONB;
BEGIN
  IF auth.uid() IS NOT NULL
     AND user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')) THEN
    RETURN FALSE;
  END IF;

  SELECT role, permissions INTO user_role, user_permissions
  FROM public.profiles
  WHERE id = user_id;

  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  SELECT permissions INTO role_permissions
  FROM public.role_permissions
  WHERE role = user_role;

  RETURN (
    role_permissions ? required_permission OR
    user_permissions ? required_permission OR
    role_permissions ? '*' OR
    user_permissions ? '*'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  user_role TEXT;
  user_perms JSONB;
  role_perms JSONB;
  combined_perms JSONB;
BEGIN
  IF auth.uid() IS NOT NULL
     AND user_id IS DISTINCT FROM auth.uid()
     AND NOT EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT role, permissions INTO user_role, user_perms
  FROM public.profiles
  WHERE id = user_id;

  SELECT permissions INTO role_perms
  FROM public.role_permissions
  WHERE role = user_role;

  combined_perms = COALESCE(role_perms, '[]'::jsonb) || COALESCE(user_perms, '[]'::jsonb);

  RETURN combined_perms;
END;
$function$;

-- Called from the browser by components/admin/showdown-pokedex-sync.tsx (signed-in admin).
CREATE OR REPLACE FUNCTION public.get_showdown_pokedex_cron_status()
 RETURNS TABLE(job_name text, schedule text, active boolean, last_run timestamp with time zone, next_run timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    (SELECT MAX(jrd.start_time) FROM cron.job_run_details jrd WHERE jrd.jobid = j.jobid)::TIMESTAMPTZ AS last_run,
    NULL::TIMESTAMPTZ AS next_run
  FROM cron.job j
  WHERE j.jobname = 'ingest-showdown-pokedex-weekly';
END;
$function$;

REVOKE ALL ON FUNCTION public.user_has_role_or_higher(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_role_or_higher(uuid,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.user_has_permission(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid,text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_showdown_pokedex_cron_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_showdown_pokedex_cron_status() TO authenticated, service_role;
