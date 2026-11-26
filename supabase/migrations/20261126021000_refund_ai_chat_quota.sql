-- Give back one league chat reservation when OpenClaw fails before a reply.
--
-- Purpose: consume_ai_chat_quota reserves a coach hour, coach New York day, and
-- app-wide day slot before the gateway call, so concurrent sends still hit the
-- limit. This function undoes that one reservation. Call it with the same
-- p_now that reserved the slot. Do not call it after a reply byte has streamed.
--
-- Affected: public.refund_ai_chat_quota (new). public.consume_ai_chat_quota is
-- replaced so an empty hour slice cannot set Retry-After. public.ai_chat_usage
-- counts are decremented and a slice at zero is deleted. No columns change.
-- RLS stays enabled. There are still no client policies.
-- Client roles cannot execute this function. service_role bypasses RLS and is
-- granted execute.
--
-- This migration is applied by the normal Supabase migration pipeline.

alter table public.ai_chat_usage enable row level security;

-- No policies on purpose: anon and authenticated stay denied. service_role bypasses RLS.

revoke all on table public.ai_chat_usage from public;
revoke all on table public.ai_chat_usage from anon;
revoke all on table public.ai_chat_usage from authenticated;
grant select, insert, update, delete on table public.ai_chat_usage to service_role;

create or replace function public.refund_ai_chat_quota(
  p_user_id uuid,
  p_now timestamptz
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  v_minute timestamptz;
  v_day_start timestamptz;
  v_global_user uuid := '00000000-0000-0000-0000-000000000000';
begin
  if p_user_id is null or p_now is null then
    raise exception 'ai_chat_usage_invalid_args';
  end if;

  -- Same lock order as consume_ai_chat_quota so a refund cannot deadlock a send.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-chat-global', 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  v_minute := pg_catalog.date_trunc('minute', p_now);
  v_day_start := (
    pg_catalog.date_trunc('day', p_now at time zone 'America/New_York') at time zone 'America/New_York'
  );

  -- The minute slice is the reservation. Day and global move only after that
  -- slice decrements, so a repeated refund or another coach cannot take a shared slot.
  update public.ai_chat_usage as usage
  set count = usage.count - 1
  where usage.user_id = p_user_id
    and usage.bucket = 'hour'
    and usage.window_start = v_minute
    and usage.count > 0;

  if not found then
    return pg_catalog.jsonb_build_object('refunded', false);
  end if;

  update public.ai_chat_usage as usage
  set count = usage.count - 1
  where usage.user_id = p_user_id
    and usage.bucket = 'day'
    and usage.window_start = v_day_start
    and usage.count > 0;

  update public.ai_chat_usage as usage
  set count = usage.count - 1
  where usage.user_id = v_global_user
    and usage.bucket = 'global'
    and usage.window_start = v_day_start
    and usage.count > 0;

  -- A zero slice must not remain. consume_ai_chat_quota uses the oldest hour
  -- slice for Retry-After, and an empty refunded minute would make that time too early.
  delete from public.ai_chat_usage as usage
  where usage.count = 0
    and (
      (
        usage.user_id = p_user_id
        and usage.bucket = 'hour'
        and usage.window_start = v_minute
      )
      or (
        usage.user_id = p_user_id
        and usage.bucket = 'day'
        and usage.window_start = v_day_start
      )
      or (
        usage.user_id = v_global_user
        and usage.bucket = 'global'
        and usage.window_start = v_day_start
      )
    );

  return pg_catalog.jsonb_build_object('refunded', true);
end;
$function$;

comment on function public.refund_ai_chat_quota(uuid, timestamptz) is
  'Undo one consume_ai_chat_quota reservation for the same timestamp. Service role only. Not for a reply that already started.';

revoke all on function public.refund_ai_chat_quota(uuid, timestamptz) from public;
revoke all on function public.refund_ai_chat_quota(uuid, timestamptz) from anon;
revoke all on function public.refund_ai_chat_quota(uuid, timestamptz) from authenticated;
grant execute on function public.refund_ai_chat_quota(uuid, timestamptz) to service_role;

-- Ignore empty hour slices when summing and when choosing the oldest slice.
-- A refund deletes those rows. This still keeps Retry-After correct if a zero remains.
create or replace function public.consume_ai_chat_quota(
  p_user_id uuid,
  p_hour_limit integer,
  p_day_limit integer,
  p_global_limit integer,
  p_now timestamptz
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
declare
  v_minute timestamptz;
  v_day_start timestamptz;
  v_next_day timestamptz;
  v_hour_count integer;
  v_day_count integer;
  v_global_count integer;
  v_oldest_hour timestamptz;
  v_retry integer;
  v_global_user uuid := '00000000-0000-0000-0000-000000000000';
begin
  if p_user_id is null
    or p_hour_limit is null
    or p_day_limit is null
    or p_global_limit is null
    or p_now is null
  then
    raise exception 'ai_chat_usage_invalid_args';
  end if;

  -- Global lock first, then the coach, so concurrent checks cannot both pass the last slot.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-chat-global', 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  v_minute := pg_catalog.date_trunc('minute', p_now);
  v_day_start := (
    pg_catalog.date_trunc('day', p_now at time zone 'America/New_York') at time zone 'America/New_York'
  );
  v_next_day := (
    pg_catalog.date_trunc(
      'day',
      (p_now at time zone 'America/New_York') + interval '1 day'
    ) at time zone 'America/New_York'
  );

  delete from public.ai_chat_usage
  where window_start < p_now - interval '2 days';

  select coalesce(sum(usage.count), 0)
    into v_hour_count
  from public.ai_chat_usage as usage
  where usage.user_id = p_user_id
    and usage.bucket = 'hour'
    and usage.count > 0
    and usage.window_start > p_now - interval '1 hour'
    and usage.window_start <= p_now;

  if v_hour_count >= p_hour_limit then
    select min(usage.window_start)
      into v_oldest_hour
    from public.ai_chat_usage as usage
    where usage.user_id = p_user_id
      and usage.bucket = 'hour'
      and usage.count > 0
      and usage.window_start > p_now - interval '1 hour'
      and usage.window_start <= p_now;

    v_retry := greatest(
      1,
      coalesce(ceil(extract(epoch from (v_oldest_hour + interval '1 hour' - p_now)))::integer, 1)
    );
    return pg_catalog.jsonb_build_object('allowed', false, 'scope', 'hour', 'retry_after', v_retry);
  end if;

  select coalesce((
    select usage.count
    from public.ai_chat_usage as usage
    where usage.user_id = p_user_id
      and usage.bucket = 'day'
      and usage.window_start = v_day_start
      and usage.count > 0
  ), 0)
    into v_day_count;

  if v_day_count >= p_day_limit then
    v_retry := greatest(
      1,
      coalesce(ceil(extract(epoch from (v_next_day - p_now)))::integer, 1)
    );
    return pg_catalog.jsonb_build_object('allowed', false, 'scope', 'day', 'retry_after', v_retry);
  end if;

  select coalesce((
    select usage.count
    from public.ai_chat_usage as usage
    where usage.user_id = v_global_user
      and usage.bucket = 'global'
      and usage.window_start = v_day_start
      and usage.count > 0
  ), 0)
    into v_global_count;

  if v_global_count >= p_global_limit then
    v_retry := greatest(
      1,
      coalesce(ceil(extract(epoch from (v_next_day - p_now)))::integer, 1)
    );
    return pg_catalog.jsonb_build_object('allowed', false, 'scope', 'global', 'retry_after', v_retry);
  end if;

  insert into public.ai_chat_usage as usage (user_id, bucket, window_start, count)
  values (p_user_id, 'hour', v_minute, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = usage.count + 1;

  insert into public.ai_chat_usage as usage (user_id, bucket, window_start, count)
  values (p_user_id, 'day', v_day_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = usage.count + 1;

  insert into public.ai_chat_usage as usage (user_id, bucket, window_start, count)
  values (v_global_user, 'global', v_day_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = usage.count + 1;

  return pg_catalog.jsonb_build_object('allowed', true);
end;
$function$;

comment on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) is
  'Atomically count one league chat send, or refuse when the hour, New York day, or app-wide day limit is reached. Empty slices are ignored.';

revoke all on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) from public;
revoke all on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) from anon;
revoke all on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) from authenticated;
grant execute on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) to service_role;
