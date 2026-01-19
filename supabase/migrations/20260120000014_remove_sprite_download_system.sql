-- Remove Sprite Download System
-- Sprites are now served directly from GitHub (PokeAPI/sprites repo)
-- This migration updates functions to remove sprite queue references

-- Update get_pokepedia_queue_stats() to only show pokepedia_ingest queue
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
BEGIN
  -- Get metrics for pokepedia_ingest queue only
  SELECT 
    (pgmq.metrics('pokepedia_ingest')).queue_length,
    (pgmq.metrics('pokepedia_ingest')).oldest_msg_age_sec
  INTO ingest_metrics;
  
  -- Return only ingest queue stats
  RETURN QUERY
  SELECT 
    'pokepedia_ingest'::TEXT AS queue_name,
    COALESCE(ingest_metrics.queue_length, 0)::BIGINT AS queue_length,
    (COALESCE(ingest_metrics.oldest_msg_age_sec, 0) || ' seconds')::INTERVAL AS oldest_message_age;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pokepedia_queue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_queue_stats() TO anon;

COMMENT ON FUNCTION public.get_pokepedia_queue_stats() IS 'Get queue stats for PokéPedia sync. Only shows pokepedia_ingest queue (sprite downloads removed - using GitHub sprites repo directly).';

-- Note: pokepedia_assets table and pokepedia_sprites queue are left in place
-- but are no longer used. They can be manually cleaned up later if needed.
-- The pokepedia-sprite-worker Edge Function should be undeployed separately.
