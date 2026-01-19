-- Function to broadcast Showdown pokedex sync progress via Realtime
-- Called from Edge Function to send real-time progress updates

CREATE OR REPLACE FUNCTION broadcast_showdown_sync_progress(
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
    -- Check if realtime extension exists
    IF EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'realtime'
    ) THEN
      PERFORM realtime.send(
        'showdown-pokedex-sync:progress',
        'progress_update',
        payload
      );
    ELSE
      -- Fallback to pg_notify for local development
      PERFORM pg_notify(
        'showdown_pokedex_sync_progress',
        payload::text
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to pg_notify if realtime.send() fails
      PERFORM pg_notify(
        'showdown_pokedex_sync_progress',
        payload::text
      );
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail - progress updates are non-critical
    -- Log error for debugging but don't throw
    RAISE WARNING 'Failed to broadcast progress: %', SQLERRM;
END;
$$;

-- Grant execute permission to service role (used by Edge Functions)
GRANT EXECUTE ON FUNCTION broadcast_showdown_sync_progress TO service_role;
