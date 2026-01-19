-- Create wrapper functions for pgmq operations accessible via PostgREST
-- PostgREST cannot directly access pgmq schema functions, so we create public wrappers
-- These use SECURITY DEFINER to access pgmq functions with proper permissions

-- Wrapper for pgmq.send_batch()
CREATE OR REPLACE FUNCTION public.pgmq_public_send_batch(
  queue_name TEXT,
  messages JSONB[],
  sleep_seconds INTEGER DEFAULT 0
)
RETURNS TABLE (
  msg_id BIGINT,
  enqueued_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  -- Call pgmq.send_batch() function
  RETURN QUERY
  SELECT 
    m.msg_id,
    m.enqueued_at
  FROM pgmq.send_batch(queue_name, messages, sleep_seconds) m;
END;
$$;

-- Wrapper for pgmq.read()
CREATE OR REPLACE FUNCTION public.pgmq_public_read(
  queue_name TEXT,
  sleep_seconds INTEGER DEFAULT 0,
  n INTEGER DEFAULT 1
)
RETURNS TABLE (
  msg_id BIGINT,
  read_ct INTEGER,
  enqueued_at TIMESTAMPTZ,
  vt TIMESTAMPTZ,
  message JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  -- Call pgmq.read() function
  RETURN QUERY
  SELECT 
    m.msg_id,
    m.read_ct,
    m.enqueued_at,
    m.vt,
    m.message
  FROM pgmq.read(queue_name, sleep_seconds, n) m;
END;
$$;

-- Wrapper for pgmq.delete()
CREATE OR REPLACE FUNCTION public.pgmq_public_delete(
  queue_name TEXT,
  message_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE
  deleted BOOLEAN;
BEGIN
  -- Call pgmq.delete() function
  SELECT pgmq.delete(queue_name, message_id) INTO deleted;
  RETURN COALESCE(deleted, false);
END;
$$;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.pgmq_public_send_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_public_send_batch TO anon;
GRANT EXECUTE ON FUNCTION public.pgmq_public_send_batch TO service_role;

GRANT EXECUTE ON FUNCTION public.pgmq_public_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_public_read TO anon;
GRANT EXECUTE ON FUNCTION public.pgmq_public_read TO service_role;

GRANT EXECUTE ON FUNCTION public.pgmq_public_delete TO authenticated;
GRANT EXECUTE ON FUNCTION public.pgmq_public_delete TO anon;
GRANT EXECUTE ON FUNCTION public.pgmq_public_delete TO service_role;

COMMENT ON FUNCTION public.pgmq_public_send_batch IS 'Wrapper for pgmq.send_batch() - accessible via PostgREST. Enqueues messages into a pgmq queue.';
COMMENT ON FUNCTION public.pgmq_public_read IS 'Wrapper for pgmq.read() - accessible via PostgREST. Reads messages from a pgmq queue.';
COMMENT ON FUNCTION public.pgmq_public_delete IS 'Wrapper for pgmq.delete() - accessible via PostgREST. Deletes a message from a pgmq queue.';
