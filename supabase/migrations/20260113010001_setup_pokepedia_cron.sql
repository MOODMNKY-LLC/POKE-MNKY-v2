-- ============================================================================
-- Poképedia Cron Jobs
-- Sets up scheduled execution of queue workers
-- ============================================================================

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Get project reference from environment (for local, use localhost)
-- In production, this should be set via Supabase Dashboard secrets
DO $$
DECLARE
  project_ref TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Try to get from environment or use defaults for local development
  project_ref := current_setting('app.settings.project_ref', true);
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Defaults for local development (from supabase status output)
  IF project_ref IS NULL OR project_ref = '' THEN
    project_ref := 'local';
  END IF;
  
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'http://127.0.0.1:54321';
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
  END IF;
  
  -- Schedule pokepedia-worker to run every minute
  -- This drains the pokepedia_ingest queue continuously
  PERFORM cron.schedule(
    'pokepedia-worker',
    '* * * * *', -- Every minute
    $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/pokepedia-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'batchSize', 10,
        'visibilityTimeout', 300,
        'concurrency', 4,
        'enqueueSprites', true
      )
    ) AS request_id;
    $$
  );
  
  -- Schedule pokepedia-sprite-worker to run every 2 minutes
  -- This drains the pokepedia_sprites queue
  PERFORM cron.schedule(
    'pokepedia-sprite-worker',
    '*/2 * * * *', -- Every 2 minutes
    $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/pokepedia-sprite-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'batchSize', 10,
        'visibilityTimeout', 600,
        'concurrency', 3
      )
    ) AS request_id;
    $$
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- If cron jobs already exist, that's fine
    RAISE NOTICE 'Cron jobs may already exist: %', SQLERRM;
END $$;

-- Function to unschedule cron jobs (for cleanup)
CREATE OR REPLACE FUNCTION public.unschedule_pokepedia_cron()
RETURNS void AS $$
BEGIN
  PERFORM cron.unschedule('pokepedia-worker');
  PERFORM cron.unschedule('pokepedia-sprite-worker');
END;
$$ LANGUAGE plpgsql;

-- Function to check cron job status
CREATE OR REPLACE FUNCTION public.get_pokepedia_cron_status()
RETURNS TABLE (
  job_name TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    j.last_run,
    j.next_run
  FROM cron.job j
  WHERE j.jobname IN ('pokepedia-worker', 'pokepedia-sprite-worker')
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.unschedule_pokepedia_cron() IS 'Unschedule all Poképedia cron jobs';
COMMENT ON FUNCTION public.get_pokepedia_cron_status() IS 'Get status of Poképedia cron jobs';
