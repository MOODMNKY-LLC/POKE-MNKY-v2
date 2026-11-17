-- sync_jobs attribution + replay protection + access tightening.
--
-- Additive only: every new column is nullable, existing rows are NOT backfilled or updated, and the
-- unique indexes are partial on the new columns so legacy rows (all NULL, ~149 stuck in 'running')
-- can never make index creation fail.
--
-- Rollback (manual):
--   drop index if exists public.sync_jobs_notion_event_id_uidx;
--   drop index if exists public.sync_jobs_running_draft_board_season_uidx;
--   alter table public.sync_jobs drop column if exists actor_user_id, drop column if exists source,
--     drop column if exists request_ip, drop column if exists notion_event_id,
--     drop column if exists season_id, drop column if exists sync_scope;
--   -- and re-create the old policies/grants if public read is needed again.

alter table public.sync_jobs
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists source text,
  add column if not exists request_ip inet,
  add column if not exists notion_event_id text,
  add column if not exists season_id uuid,
  add column if not exists sync_scope text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sync_jobs_source_check' and conrelid = 'public.sync_jobs'::regclass
  ) then
    alter table public.sync_jobs
      add constraint sync_jobs_source_check
      check (source is null or source in ('webhook', 'admin_ui', 'n8n', 'bearer'));
  end if;
end $$;

comment on column public.sync_jobs.actor_user_id is 'Signed-in admin who triggered the job (admin_ui source only).';
comment on column public.sync_jobs.source is 'Trigger path: webhook | admin_ui | n8n | bearer.';
comment on column public.sync_jobs.request_ip is 'Client IP (x-forwarded-for first hop / x-real-ip). Admin/service-role read only.';
comment on column public.sync_jobs.notion_event_id is 'Notion webhook event id; unique when set (replay dedupe).';
comment on column public.sync_jobs.season_id is 'Season a draft_board sync targets.';
comment on column public.sync_jobs.sync_scope is 'draft_board when the job includes the draft board scope.';

-- Replay dedupe: one job per Notion event id.
create unique index if not exists sync_jobs_notion_event_id_uidx
  on public.sync_jobs (notion_event_id)
  where notion_event_id is not null;

-- At most one running draft_board sync per season.
create unique index if not exists sync_jobs_running_draft_board_season_uidx
  on public.sync_jobs (season_id)
  where status = 'running' and sync_scope = 'draft_board' and season_id is not null;

-- ---------------------------------------------------------------------------
-- Access: request_ip / actor_user_id are now stored, so sync_jobs is admin-read, service-role-write.
-- ---------------------------------------------------------------------------
revoke all on table public.sync_jobs from anon, authenticated;
grant select on table public.sync_jobs to authenticated;
grant all on table public.sync_jobs to service_role;

drop policy if exists "Public read sync_jobs" on public.sync_jobs;
drop policy if exists "Authenticated update sync_jobs" on public.sync_jobs;
drop policy if exists "Authenticated insert sync_jobs" on public.sync_jobs;
drop policy if exists "Admins read sync_jobs" on public.sync_jobs;

create policy "Admins read sync_jobs"
  on public.sync_jobs
  for select
  to authenticated
  using ((select public.is_draft_pool_admin()));
