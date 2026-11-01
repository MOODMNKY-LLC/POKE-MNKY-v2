-- DB audit (Phase 3) item 2: showdown_client_teams was readable by anyone
-- ("Read client teams": SELECT to anon, authenticated USING (true)), exposing
-- every user's full team text including private teams.
--
-- App usage check: the Next.js app never queries this table; it is written/read
-- only by the Showdown loginserver, which uses the service-role key (bypasses
-- RLS). So we restrict direct client reads to the owner: ownerid is the
-- Showdown userid (toID of the username: lowercase, alphanumerics only),
-- matched against the caller's profiles.showdown_username.
--
-- Rollback:
--   drop policy if exists "Owners read own client teams" on public.showdown_client_teams;
--   create policy "Read client teams" on public.showdown_client_teams
--     for select to anon, authenticated using (true);
--   grant select, insert, update, delete, truncate on public.showdown_client_teams to anon, authenticated;

drop policy if exists "Read client teams" on public.showdown_client_teams;

create policy "Owners read own client teams"
  on public.showdown_client_teams
  for select
  to authenticated
  using (
    ownerid = (
      select regexp_replace(lower(p.showdown_username), '[^a-z0-9]', '', 'g')
      from public.profiles p
      where p.id = (select auth.uid())
    )
  );

revoke insert, update, delete, truncate on public.showdown_client_teams from anon, authenticated;
revoke select on public.showdown_client_teams from anon;
