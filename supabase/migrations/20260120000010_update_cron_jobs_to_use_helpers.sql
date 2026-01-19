-- Update existing cron jobs to use helper functions that handle NULL settings
-- This fixes the "null value in column url" error
-- We create wrapper functions that cron jobs can call, which handle NULL checks

-- Wrapper function for pokepedia-worker
CREATE OR REPLACE FUNCTION public._trigger_pokepedia_worker()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  supabase_url := public._get_supabase_url();
  service_role_key := public._get_service_role_key();
  
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL AND service_role_key != '' THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/pokepedia-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'batchSize', 10,
        'visibilityTimeout', 300,
        'concurrency', 4,
        'enqueueSprites', true
      )
    );
  ELSE
    RAISE WARNING 'pokepedia-worker skipped: Missing app.settings.supabase_url or app.settings.service_role_key';
  END IF;
END;
$$;

-- Wrapper function for pokepedia-sprite-worker
CREATE OR REPLACE FUNCTION public._trigger_pokepedia_sprite_worker()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  supabase_url := public._get_supabase_url();
  service_role_key := public._get_service_role_key();
  
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL AND service_role_key != '' THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/pokepedia-sprite-worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'batchSize', 10,
        'visibilityTimeout', 600,
        'concurrency', 3
      )
    );
  ELSE
    RAISE WARNING 'pokepedia-sprite-worker skipped: Missing app.settings.supabase_url or app.settings.service_role_key';
  END IF;
END;
$$;

-- Wrapper function for ingest-showdown-pokedex
CREATE OR REPLACE FUNCTION public._trigger_showdown_pokedex_ingest()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  supabase_url := public._get_supabase_url();
  service_role_key := public._get_service_role_key();
  
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL AND service_role_key != '' THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/ingest-showdown-pokedex',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb
    );
  ELSE
    RAISE WARNING 'ingest-showdown-pokedex skipped: Missing app.settings.supabase_url or app.settings.service_role_key';
  END IF;
END;
$$;

-- Update pokepedia-worker cron job
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'pokepedia-worker') INTO job_exists;
  
  IF job_exists THEN
    PERFORM cron.unschedule('pokepedia-worker');
    
    PERFORM cron.schedule(
      'pokepedia-worker',
      '* * * * *', -- Every minute
      'SELECT public._trigger_pokepedia_worker();'
    );
  END IF;
END $$;

-- Update pokepedia-sprite-worker cron job
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'pokepedia-sprite-worker') INTO job_exists;
  
  IF job_exists THEN
    PERFORM cron.unschedule('pokepedia-sprite-worker');
    
    PERFORM cron.schedule(
      'pokepedia-sprite-worker',
      '*/2 * * * *', -- Every 2 minutes
      'SELECT public._trigger_pokepedia_sprite_worker();'
    );
  END IF;
END $$;

-- Update ingest-showdown-pokedex-weekly cron job
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'ingest-showdown-pokedex-weekly') INTO job_exists;
  
  IF job_exists THEN
    PERFORM cron.unschedule('ingest-showdown-pokedex-weekly');
    
    PERFORM cron.schedule(
      'ingest-showdown-pokedex-weekly',
      '0 2 * * 0', -- Every Sunday at 2 AM UTC
      'SELECT public._trigger_showdown_pokedex_ingest();'
    );
  END IF;
END $$;

COMMENT ON FUNCTION public._get_supabase_url() IS 'Helper function to get Supabase URL with fallback to production URL';
COMMENT ON FUNCTION public._get_service_role_key() IS 'Helper function to get service role key from app.settings. Returns NULL if not configured';
COMMENT ON FUNCTION public._trigger_pokepedia_worker() IS 'Wrapper function for pokepedia-worker cron job - handles NULL settings gracefully';
COMMENT ON FUNCTION public._trigger_pokepedia_sprite_worker() IS 'Wrapper function for pokepedia-sprite-worker cron job - handles NULL settings gracefully';
COMMENT ON FUNCTION public._trigger_showdown_pokedex_ingest() IS 'Wrapper function for ingest-showdown-pokedex cron job - handles NULL settings gracefully';
