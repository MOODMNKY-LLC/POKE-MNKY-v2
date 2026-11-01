-- Make the pg_net -> edge function trigger work with the new sb_secret_ API keys,
-- and lock down key-touching / privileged helper functions.
--
-- Problem:
--   * public._get_service_role_key() only read app.settings.service_role_key, which is
--     not set on this project (and legacy JWT service_role keys are being retired), so
--     public._trigger_showdown_pokedex_ingest() always skipped with a WARNING.
--   * These helpers (and the populate_*_from_pokeapi bulk loaders and the cron
--     unschedule helper) were EXECUTE-able by PUBLIC / anon / authenticated.
--
-- Fix:
--   * _get_service_role_key() now reads the Vault secret named 'supabase_secret_key'
--     (a project sb_secret_ key, stored out-of-band; NOT in this file), falling back to
--     app.settings.service_role_key. SECURITY DEFINER, empty search_path, and only the
--     owner (postgres; pg_cron jobs) can execute it.
--   * _trigger_showdown_pokedex_ingest() sends the key in the `apikey` header (sb_ keys
--     are not JWTs; the function itself has verify_jwt=false and checks the key).
--   * REVOKE EXECUTE from PUBLIC/anon/authenticated on all of the above.
--
-- Storing the key (run once, out of band, never commit the value):
--   select vault.create_secret('<sb_secret_...>', 'supabase_secret_key',
--          'Project secret key for pg_net calls to edge functions');
--   -- rotate: select vault.update_secret(id, '<new>') from vault.secrets where name='supabase_secret_key';
--
-- Rollback:
--   * Re-create the previous bodies (see 20260120000025_update_cron_jobs_to_use_helpers.sql):
--     _get_service_role_key() = NULLIF(current_setting('app.settings.service_role_key', true), ''),
--     SECURITY INVOKER; trigger used 'Authorization: Bearer <key>'.
--   * GRANT EXECUTE ON FUNCTION <fn> TO PUBLIC, anon, authenticated; for the functions below.
--   * Optionally: delete from vault.secrets where name = 'supabase_secret_key';

CREATE OR REPLACE FUNCTION public._get_service_role_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT ds.decrypted_secret
       FROM vault.decrypted_secrets ds
      WHERE ds.name = 'supabase_secret_key'
      ORDER BY ds.created_at DESC
      LIMIT 1),
    NULLIF(current_setting('app.settings.service_role_key', true), '')
  );
$$;

CREATE OR REPLACE FUNCTION public._trigger_showdown_pokedex_ingest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url text := public._get_supabase_url();
  v_key text := public._get_service_role_key();
BEGIN
  IF v_url IS NOT NULL AND v_key IS NOT NULL AND v_key <> '' THEN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/ingest-showdown-pokedex',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_key
      ),
      body    := '{}'::jsonb
    );
  ELSE
    RAISE WARNING 'ingest-showdown-pokedex skipped: no secret key (Vault secret "supabase_secret_key" or app.settings.service_role_key)';
  END IF;
END;
$$;

DO $$
DECLARE
  fn text;
BEGIN
  -- Key / cron helpers: owner (postgres, pg_cron) only. The trigger is also callable by service_role.
  FOREACH fn IN ARRAY ARRAY[
    'public._get_service_role_key()',
    'public._get_supabase_url()',
    'public._trigger_showdown_pokedex_ingest()',
    'public.unschedule_showdown_pokedex_cron()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', fn);
  END LOOP;
  GRANT EXECUTE ON FUNCTION public._trigger_showdown_pokedex_ingest() TO service_role;

  -- Bulk loaders used only by service-role scripts (scripts/populate-master-tables.ts etc.).
  FOR fn IN
    SELECT p.oid::regprocedure::text
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname LIKE 'populate\_%\_from\_pokeapi'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END
$$;
