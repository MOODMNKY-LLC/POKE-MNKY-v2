-- Rebuild the pokepedia pgmq queues and their PostgREST wrappers.
--
-- Problem: pgmq.q_pokepedia_ingest / q_pokepedia_sprites existed without their
-- msg_id column and were not registered in pgmq.meta, so pgmq.read()/send()
-- failed with `column "msg_id" does not exist`. All four queue/archive tables
-- were empty (checked 2026-11-01), so they are dropped and recreated via pgmq.
--
-- Also:
--  * wrappers use an empty search_path with schema-qualified calls and are
--    executable by service_role only (edge functions use the secret key);
--  * adds pgmq_public_send (single message);
--  * recreates check_existing_pokeapi_resources (called by pokepedia-seed but
--    missing from the DB) and fixes its URL parsing (it read 'v2' as the type).
--
-- Rollback (data-free queues, so rollback is safe):
--   SELECT pgmq.drop_queue('pokepedia_ingest'); SELECT pgmq.drop_queue('pokepedia_sprites');
--   DROP FUNCTION IF EXISTS public.pgmq_public_send(text, jsonb, integer);
--   DROP FUNCTION IF EXISTS public.check_existing_pokeapi_resources(text[]);
--   -- previous wrapper bodies: supabase/migrations/20260120000016_create_pgmq_wrapper_functions.sql

DO $$
DECLARE
  q text;
BEGIN
  FOREACH q IN ARRAY ARRAY['pokepedia_ingest', 'pokepedia_sprites'] LOOP
    IF EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = q) THEN
      PERFORM pgmq.drop_queue(q);
    END IF;
    -- Orphaned tables (not in pgmq.meta): clean up manually.
    EXECUTE format('DROP TABLE IF EXISTS pgmq.%I', 'q_' || q);
    EXECUTE format('DROP TABLE IF EXISTS pgmq.%I', 'a_' || q);
    PERFORM pgmq.create(q);
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.pgmq_public_send_batch(
  queue_name text,
  messages jsonb[],
  sleep_seconds integer DEFAULT 0
)
RETURNS TABLE (msg_id bigint, enqueued_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s AS msg_id, now() AS enqueued_at
  FROM pgmq.send_batch(queue_name, messages, sleep_seconds) AS s;
$$;

CREATE OR REPLACE FUNCTION public.pgmq_public_send(
  queue_name text,
  message jsonb,
  sleep_seconds integer DEFAULT 0
)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s FROM pgmq.send(queue_name, message, sleep_seconds) AS s;
$$;

-- NB: `sleep_seconds` is passed to pgmq.read as the visibility timeout (vt);
-- the parameter name is kept for compatibility with existing callers.
CREATE OR REPLACE FUNCTION public.pgmq_public_read(
  queue_name text,
  sleep_seconds integer DEFAULT 0,
  n integer DEFAULT 1
)
RETURNS TABLE (msg_id bigint, read_ct integer, enqueued_at timestamptz, vt timestamptz, message jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.msg_id, m.read_ct, m.enqueued_at, m.vt, m.message
  FROM pgmq.read(queue_name, sleep_seconds, n) AS m;
$$;

CREATE OR REPLACE FUNCTION public.pgmq_public_delete(
  queue_name text,
  message_id bigint
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(pgmq.delete(queue_name, message_id), false);
$$;

CREATE OR REPLACE FUNCTION public.check_existing_pokeapi_resources(resource_urls text[])
RETURNS TABLE (url text, already_exists boolean, resource_type text, resource_key text)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  -- https://pokeapi.co/api/v2/pokemon/25/  ->  path parts: api, v2, pokemon, 25
  WITH url_parts AS (
    SELECT
      u AS url,
      (string_to_array(trim(both '/' from regexp_replace(u, '^https?://[^/]+', '')), '/'))[3] AS resource_type,
      (string_to_array(trim(both '/' from regexp_replace(u, '^https?://[^/]+', '')), '/'))[4] AS resource_key
    FROM unnest(resource_urls) AS u
  )
  SELECT up.url, (pr.id IS NOT NULL) AS already_exists, up.resource_type, up.resource_key
  FROM url_parts up
  LEFT JOIN public.pokeapi_resources pr
    ON pr.resource_type = up.resource_type
   AND pr.resource_key = up.resource_key;
$$;

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.pgmq_public_send_batch(text, jsonb[], integer)',
    'public.pgmq_public_send(text, jsonb, integer)',
    'public.pgmq_public_read(text, integer, integer)',
    'public.pgmq_public_delete(text, bigint)',
    'public.check_existing_pokeapi_resources(text[])'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END
$$;
