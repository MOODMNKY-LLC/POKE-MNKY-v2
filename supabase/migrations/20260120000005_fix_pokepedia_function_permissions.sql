-- Fix permissions and type mismatches for PokéPedia functions
-- These functions need SECURITY DEFINER to access cron and pgmq schemas

-- 1. Fix get_pokepedia_cron_status() - needs SECURITY DEFINER to access cron.job
-- Note: cron.job table doesn't have last_run/next_run columns in standard pg_cron
-- We'll get last_run from cron.job_run_details if available
CREATE OR REPLACE FUNCTION public.get_pokepedia_cron_status()
RETURNS TABLE (
  job_name TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    (SELECT MAX(jrd.start_time) FROM cron.job_run_details jrd WHERE jrd.jobid = j.jobid)::TIMESTAMPTZ AS last_run,
    NULL::TIMESTAMPTZ AS next_run  -- pg_cron doesn't provide next_run, would need to calculate from schedule
  FROM cron.job j
  WHERE j.jobname IN ('pokepedia-worker', 'pokepedia-sprite-worker')
  ORDER BY j.jobname;
END;
$$;

-- Grant execute permissions to authenticated users (for admin panel)
GRANT EXECUTE ON FUNCTION public.get_pokepedia_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_cron_status() TO anon;

-- 2. Fix get_pokepedia_sync_progress() - fix type mismatch (total_estimated needs BIGINT cast)
CREATE OR REPLACE FUNCTION public.get_pokepedia_sync_progress()
RETURNS TABLE (
  resource_type TEXT,
  synced_count BIGINT,
  total_estimated BIGINT,
  progress_percent NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.resource_type,
    COUNT(*)::BIGINT AS synced_count,
    CASE 
      WHEN pr.resource_type = 'pokemon' THEN 1025::BIGINT
      WHEN pr.resource_type = 'pokemon-species' THEN 1025::BIGINT
      WHEN pr.resource_type = 'move' THEN 1000::BIGINT
      WHEN pr.resource_type = 'ability' THEN 400::BIGINT
      WHEN pr.resource_type = 'type' THEN 20::BIGINT
      WHEN pr.resource_type = 'item' THEN 2000::BIGINT
      ELSE 100::BIGINT
    END AS total_estimated,
    ROUND(
      (COUNT(*)::NUMERIC / 
       CASE 
         WHEN pr.resource_type = 'pokemon' THEN 1025
         WHEN pr.resource_type = 'pokemon-species' THEN 1025
         WHEN pr.resource_type = 'move' THEN 1000
         WHEN pr.resource_type = 'ability' THEN 400
         WHEN pr.resource_type = 'type' THEN 20
         WHEN pr.resource_type = 'item' THEN 2000
         ELSE 100
       END) * 100, 
      2
    ) AS progress_percent
  FROM public.pokeapi_resources pr
  GROUP BY pr.resource_type
  ORDER BY pr.resource_type;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pokepedia_sync_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_sync_progress() TO anon;

-- 3. Fix get_pokepedia_queue_stats() - needs SECURITY DEFINER to access pgmq schema
-- Note: pgmq.metrics() returns oldest_msg_age_sec (integer seconds), not oldest_msg_age (interval)
CREATE OR REPLACE FUNCTION public.get_pokepedia_queue_stats()
RETURNS TABLE (
  queue_name TEXT,
  queue_length BIGINT,
  oldest_message_age INTERVAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  ingest_metrics RECORD;
  sprite_metrics RECORD;
BEGIN
  -- Get metrics for pokepedia_ingest queue
  SELECT 
    m.queue_length,
    m.oldest_msg_age_sec
  INTO ingest_metrics
  FROM pgmq.metrics('pokepedia_ingest') m;
  
  -- Get metrics for pokepedia_sprites queue
  SELECT 
    m.queue_length,
    m.oldest_msg_age_sec
  INTO sprite_metrics
  FROM pgmq.metrics('pokepedia_sprites') m;
  
  -- Return results
  RETURN QUERY
  SELECT 
    'pokepedia_ingest'::TEXT AS queue_name,
    COALESCE(ingest_metrics.queue_length, 0)::BIGINT AS queue_length,
    (COALESCE(ingest_metrics.oldest_msg_age_sec, 0) || ' seconds')::INTERVAL AS oldest_message_age
  UNION ALL
  SELECT 
    'pokepedia_sprites'::TEXT AS queue_name,
    COALESCE(sprite_metrics.queue_length, 0)::BIGINT AS queue_length,
    (COALESCE(sprite_metrics.oldest_msg_age_sec, 0) || ' seconds')::INTERVAL AS oldest_message_age;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pokepedia_queue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_queue_stats() TO anon;

COMMENT ON FUNCTION public.get_pokepedia_cron_status() IS 'Get status of Poképedia cron jobs - requires SECURITY DEFINER to access cron schema';
COMMENT ON FUNCTION public.get_pokepedia_sync_progress() IS 'Returns sync progress by resource type (synced vs estimated total)';
COMMENT ON FUNCTION public.get_pokepedia_queue_stats() IS 'Returns queue depth and age metrics for monitoring - requires SECURITY DEFINER to access pgmq schema';
