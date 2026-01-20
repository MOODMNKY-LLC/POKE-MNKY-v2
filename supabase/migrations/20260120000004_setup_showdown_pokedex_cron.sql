-- ============================================================================
-- Showdown Pokedex Cron Job
-- Sets up scheduled execution of Showdown pokedex ingestion
-- Runs weekly on Sundays at 2 AM UTC to keep competitive database up to date
-- ============================================================================

-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Setup cron job using the same pattern as pokepedia cron jobs
DO $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Try to get from environment or use defaults for local development
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Defaults for local development (from supabase status output)
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'http://127.0.0.1:54321';
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
  END IF;
  
  -- Schedule Showdown pokedex ingestion to run weekly on Sundays at 2 AM UTC
  -- Schedule: '0 2 * * 0' = Every Sunday at 2 AM UTC
  PERFORM cron.schedule(
    'ingest-showdown-pokedex-weekly',
    '0 2 * * 0', -- Every Sunday at 2 AM UTC
    $cron_job$
    DO $inner$
    DECLARE
      supabase_url TEXT;
      service_role_key TEXT;
      final_url TEXT;
    BEGIN
      -- Try to get from settings, fallback to production URL
      supabase_url := COALESCE(
        NULLIF(current_setting('app.settings.supabase_url', true), ''),
        'https://chmrszrwlfeqovwxyrmt.supabase.co'
      );
      service_role_key := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        '' -- Will fail if not set, but better than NULL
      );
      
      -- Only proceed if we have both values
      IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL AND service_role_key != '' THEN
        final_url := supabase_url || '/functions/v1/ingest-showdown-pokedex';
        PERFORM net.http_post(
          url := final_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := '{}'::jsonb
        );
      ELSE
        RAISE WARNING 'Showdown cron job skipped: Missing app.settings.supabase_url or app.settings.service_role_key';
      END IF;
    END $inner$;
    $cron_job$
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- If cron job already exists, that's fine
    RAISE NOTICE 'Cron job may already exist: %', SQLERRM;
END $$;

-- Function to unschedule cron job (for cleanup)
CREATE OR REPLACE FUNCTION public.unschedule_showdown_pokedex_cron()
RETURNS void AS $$
BEGIN
  PERFORM cron.unschedule('ingest-showdown-pokedex-weekly');
END;
$$ LANGUAGE plpgsql;

-- Function to check cron job status
CREATE OR REPLACE FUNCTION public.get_showdown_pokedex_cron_status()
RETURNS TABLE (
  job_name TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    j.last_run,
    j.next_run
  FROM cron.job j
  WHERE j.jobname = 'ingest-showdown-pokedex-weekly';
END;
$$;

-- Grant execute permissions to authenticated users (for admin panel)
GRANT EXECUTE ON FUNCTION public.get_showdown_pokedex_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_showdown_pokedex_cron_status() TO anon;

COMMENT ON FUNCTION public.unschedule_showdown_pokedex_cron() IS 'Unschedule Showdown pokedex cron job';
COMMENT ON FUNCTION public.get_showdown_pokedex_cron_status() IS 'Get status of Showdown pokedex cron job';

-- Note: In production, ensure these settings are configured in Supabase Dashboard:
-- app.settings.supabase_url = 'https://your-project.supabase.co'
-- app.settings.service_role_key = 'your-service-role-key'
