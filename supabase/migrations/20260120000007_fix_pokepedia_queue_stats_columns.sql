-- Fix get_pokepedia_queue_stats() - pgmq.metrics() returns oldest_msg_age_sec (integer), not oldest_msg_age (interval)
-- Need to convert seconds to INTERVAL type

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
  
  -- Return results (convert seconds to INTERVAL)
  RETURN QUERY
  SELECT 
    'pokepedia_ingest'::TEXT AS queue_name,
    COALESCE(ingest_metrics.queue_length, 0)::BIGINT AS queue_length,
    CASE 
      WHEN ingest_metrics.oldest_msg_age_sec IS NULL THEN NULL::INTERVAL
      ELSE (ingest_metrics.oldest_msg_age_sec || ' seconds')::INTERVAL
    END AS oldest_message_age
  UNION ALL
  SELECT 
    'pokepedia_sprites'::TEXT AS queue_name,
    COALESCE(sprite_metrics.queue_length, 0)::BIGINT AS queue_length,
    CASE 
      WHEN sprite_metrics.oldest_msg_age_sec IS NULL THEN NULL::INTERVAL
      ELSE (sprite_metrics.oldest_msg_age_sec || ' seconds')::INTERVAL
    END AS oldest_message_age;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pokepedia_queue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_queue_stats() TO anon;

COMMENT ON FUNCTION public.get_pokepedia_queue_stats() IS 'Returns queue depth and age metrics for monitoring - requires SECURITY DEFINER to access pgmq schema. Converts oldest_msg_age_sec (integer) to INTERVAL';
