-- Coach onboarding: track progress for users who start onboarding from the dashboard.
-- Used with Supabase client; optional Notion integration can feed copy or steps.

create table if not exists public.coach_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_step text not null default 'welcome',
  completed_steps jsonb not null default '[]',
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.coach_onboarding is 'Tracks coach onboarding progress per user; started from user dashboard.';

create index if not exists idx_coach_onboarding_updated
  on public.coach_onboarding(updated_at);

alter table public.coach_onboarding enable row level security;

create policy "coach_onboarding_select_own"
  on public.coach_onboarding for select to authenticated
  using (auth.uid() = user_id);

create policy "coach_onboarding_insert_own"
  on public.coach_onboarding for insert to authenticated
  with check (auth.uid() = user_id);

create policy "coach_onboarding_update_own"
  on public.coach_onboarding for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.coach_onboarding to authenticated;
