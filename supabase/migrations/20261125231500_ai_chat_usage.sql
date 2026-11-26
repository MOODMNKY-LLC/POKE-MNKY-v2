-- League chat rate limits for the aab-member gateway.
--
-- Purpose: count coach and app-wide chat requests that were actually sent.
-- Production has no Vercel KV (KV_* is Preview-only), so the limiter stores
-- counters here. The app calls public.consume_ai_chat_quota with the service role.
--
-- Affected: public.ai_chat_usage (new), public.consume_ai_chat_quota (new).
-- Additive and idempotent. No existing table is changed.
-- Client roles have no privileges and no RLS policies, so they cannot read or write.
-- service_role bypasses RLS and is granted DML plus execute.
--
-- The nil user id 00000000-0000-0000-0000-000000000000 is the app-wide day bucket,
-- not a profile. Day windows are America/New_York calendar days. The hour bucket
-- is a rolling 60 minutes stored in one-minute slices.
--
-- This migration is applied by the normal Supabase migration pipeline.

create table if not exists public.ai_chat_usage (
  user_id uuid not null,
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  constraint ai_chat_usage_pkey primary key (user_id, bucket, window_start),
  constraint ai_chat_usage_bucket_check check (bucket in ('hour', 'day', 'global')),
  constraint ai_chat_usage_count_check check (count >= 0)
);

comment on table public.ai_chat_usage is
  'Service-role counters for league chat rate limits. No client access. The nil uuid is the app-wide bucket.';

comment on column public.ai_chat_usage.user_id is
  'Coach auth user id, or 00000000-0000-0000-0000-000000000000 for the global day bucket.';

comment on column public.ai_chat_usage.bucket is
  'hour (rolling, minute slices), day (America/New_York), or global (America/New_York, shared).';

comment on column public.ai_chat_usage.window_start is
  'Start of the minute (hour bucket) or America/New_York midnight (day and global).';

comment on column public.ai_chat_usage.count is
  'Requests counted in this window. Over-limit requests are not incremented.';

alter table public.ai_chat_usage enable row level security;

-- No policies on purpose: anon and authenticated stay denied. service_role bypasses RLS.

revoke all on table public.ai_chat_usage from public;
revoke all on table public.ai_chat_usage from anon;
revoke all on table public.ai_chat_usage from authenticated;
grant select, insert, update, delete on table public.ai_chat_usage to service_role;

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
    and usage.window_start > p_now - interval '1 hour'
    and usage.window_start <= p_now;

  if v_hour_count >= p_hour_limit then
    select min(usage.window_start)
      into v_oldest_hour
    from public.ai_chat_usage as usage
    where usage.user_id = p_user_id
      and usage.bucket = 'hour'
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
  'Atomically count one league chat send, or refuse when the hour, New York day, or app-wide day limit is reached.';

revoke all on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) from public;
revoke all on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) from anon;
revoke all on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) from authenticated;
grant execute on function public.consume_ai_chat_quota(uuid, integer, integer, integer, timestamptz) to service_role;
