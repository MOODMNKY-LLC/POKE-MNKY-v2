-- HELD: do not apply to production without explicit rollout approval.
-- Verified central Showdown account link columns (OAuth ownership proof).
-- Username alone is never sufficient; bind only after OAuth assertion callback.

alter table public.profiles
  add column if not exists showdown_userid text,
  add column if not exists showdown_linked_at timestamptz,
  add column if not exists showdown_link_method text;

comment on column public.profiles.showdown_userid is
  'Normalized Pokémon Showdown userid from verified OAuth link (not a username lookup).';
comment on column public.profiles.showdown_linked_at is
  'When the verified OAuth link was established.';
comment on column public.profiles.showdown_link_method is
  'Ownership proof method, e.g. oauth. Never password.';

create unique index if not exists profiles_showdown_userid_uidx
  on public.profiles (showdown_userid)
  where showdown_userid is not null;
