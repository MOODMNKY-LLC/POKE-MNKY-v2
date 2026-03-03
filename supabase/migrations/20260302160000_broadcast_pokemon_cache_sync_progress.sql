-- Function to broadcast Pokemon cache (PokeAPI) sync progress via Realtime
-- Called from Edge Function sync-pokemon-pokeapi to send real-time progress updates

CREATE OR REPLACE FUNCTION broadcast_pokemon_cache_sync_progress(
  phase text,
  current_count integer,
  total_count integer,
  message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  progress_percent integer;
  payload jsonb;
BEGIN
  -- Calculate progress percentage
  progress_percent := CASE
    WHEN total_count > 0 THEN ROUND((current_count::numeric / total_count::numeric) * 100)
    ELSE 0
  END;

  -- Build payload
  payload := jsonb_build_object(
    'phase', phase,
    'current', current_count,
    'total', total_count,
    'progress', progress_percent,
    'message', COALESCE(message, phase || ': ' || current_count || '/' || total_count),
    'timestamp', NOW()
  );

  -- Try to use realtime.send() if available (production/hosted Supabase)
  -- Fall back to pg_notify for local development
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'realtime'
    ) THEN
      PERFORM realtime.send(
        'pokemon-cache-sync:progress',
        'progress_update',
        payload
      );
    ELSE
      PERFORM pg_notify(
        'pokemon_cache_sync_progress',
        payload::text
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_notify(
        'pokemon_cache_sync_progress',
        payload::text
      );
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to broadcast pokemon cache sync progress: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION broadcast_pokemon_cache_sync_progress TO service_role;
