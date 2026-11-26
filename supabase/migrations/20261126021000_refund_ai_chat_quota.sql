-- Give back one league chat reservation when OpenClaw fails before a reply.
--
-- Purpose: consume_ai_chat_quota reserves a coach hour, coach New York day, and
-- app-wide day slot before the gateway call, so concurrent sends still hit the
-- limit. This function undoes that one reservation. Call it with the same
-- p_now that reserved the slot. Do not call it after a reply byte has streamed.
--
-- Affected: public.refund_ai_chat_quota (new). public.ai_chat_usage row counts
-- are decremented and never go below zero. No columns change.
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

  return pg_catalog.jsonb_build_object('refunded', true);
end;
$function$;

comment on function public.refund_ai_chat_quota(uuid, timestamptz) is
  'Undo one consume_ai_chat_quota reservation for the same timestamp. Service role only. Not for a reply that already started.';

revoke all on function public.refund_ai_chat_quota(uuid, timestamptz) from public;
revoke all on function public.refund_ai_chat_quota(uuid, timestamptz) from anon;
revoke all on function public.refund_ai_chat_quota(uuid, timestamptz) from authenticated;
grant execute on function public.refund_ai_chat_quota(uuid, timestamptz) to service_role;
