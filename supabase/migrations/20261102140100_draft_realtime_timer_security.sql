-- purpose: draft realtime publication + pick deadline column;
--          set v_pokemon_catalog to security_invoker = true (advisor fix).
-- affected: draft_sessions.current_pick_deadline_at, supabase_realtime publication,
--           v_pokemon_catalog
-- special: additive only. Historical note: this migration left
--          v_public_free_agency at security_invoker=false so anon could read FA
--          moves without SELECT on transaction_audit. 20261114053802 later sets
--          that view to security_invoker=true; if audit is tightened further,
--          prefer column grants — do not revert the view to definer.

alter table public.draft_sessions
  add column if not exists current_pick_deadline_at timestamptz;

comment on column public.draft_sessions.current_pick_deadline_at is
  'When the current pick timer expires. Set when a turn starts/advances; enforced by rpc_enforce_draft_pick_timer and /api/cron/draft-timers.';

-- Idempotently add live-draft tables to supabase_realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise notice 'publication supabase_realtime missing — skip realtime adds';
    return;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'draft_pool'
  ) then
    execute 'alter publication supabase_realtime add table public.draft_pool';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'draft_sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.draft_sessions';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'draft_budgets'
  ) then
    execute 'alter publication supabase_realtime add table public.draft_budgets';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_rosters'
  ) then
    execute 'alter publication supabase_realtime add table public.team_rosters';
  end if;
end $$;

-- Advisor: views without security_invoker run as owner. Underlying tables already
-- allow anon/authenticated SELECT (pokepedia_pokemon, pokemon_cache).
alter view public.v_pokemon_catalog set (security_invoker = true);

comment on view public.v_pokemon_catalog is
  'Compat shim of pokemon ids/names: pokepedia preferred over deprecated pokemon_cache. security_invoker=true; app reads go through lib/pokemon-read.';
