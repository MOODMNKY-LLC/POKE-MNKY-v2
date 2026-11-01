-- DB audit (Phase 3) item 3: storage buckets.
--
-- Findings:
--  * All buckets (pokedex-sprites, avatars, music-tracks, team-assets) hold
--    content that is meant to be public (sprites, avatars, music, team logos),
--    rendered via getPublicUrl(). They stay public: public-URL reads do not go
--    through RLS, so no image/audio URL changes.
--  * There were no anon write/delete policies, but every write policy was
--    granted to role "public" (includes anon). Re-scoped to authenticated.
--  * Broad "Public can read ..." SELECT policies let anyone LIST every object
--    in music-tracks / team-assets via the Storage API. The app only lists
--    music-tracks server-side with the service-role client
--    (app/api/music/music-tracks), so these listing policies are dropped.
--  * "Coaches can manage own team assets" trusted profiles.team_id, which any
--    user could previously self-set; the profiles trigger migration now pins
--    team_id to coached teams. The policy keeps the team_id check and also
--    accepts direct coach ownership (coaches -> teams.coach_id).
--  * The app uploads avatars to bucket "user-avatars"
--    (components/profile/profile-sheet.tsx) but that bucket did not exist on the
--    hosted project, so avatar uploads failed. Created here (public, 5MB,
--    images), matching supabase/config.toml and migration 20260305130000.
--
-- Rollback:
--   drop policy "Admins can manage music tracks" / "Admins can manage team assets" /
--     "Coaches can manage own showdown team assets" / "Coaches can manage own team assets" /
--     "Users can manage own avatar" on storage.objects and recreate them with
--     "to public" (same USING/WITH CHECK as below);
--   create policy "Public can read music tracks" on storage.objects for select using (bucket_id = 'music-tracks');
--   create policy "Public can read team assets"  on storage.objects for select using (bucket_id = 'team-assets');
--   create policy "Public can read user avatars" on storage.objects for select using (bucket_id = 'user-avatars');
--   (optional) delete from storage.buckets where id = 'user-avatars';  -- only if empty

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 5242880,
        array['image/png','image/jpeg','image/jpg','image/gif','image/webp'])
on conflict (id) do nothing;

drop policy if exists "Public can read music tracks" on storage.objects;
drop policy if exists "Public can read team assets" on storage.objects;
drop policy if exists "Public can read user avatars" on storage.objects;

drop policy if exists "Admins can manage music tracks" on storage.objects;
create policy "Admins can manage music tracks" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'music-tracks'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  )
  with check (
    bucket_id = 'music-tracks'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
  );

drop policy if exists "Admins can manage team assets" on storage.objects;
create policy "Admins can manage team assets" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'team-assets'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','commissioner'))
  )
  with check (
    bucket_id = 'team-assets'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin','commissioner'))
  );

drop policy if exists "Coaches can manage own showdown team assets" on storage.objects;
create policy "Coaches can manage own showdown team assets" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'team-assets'
    and (storage.foldername(name))[1] = 'showdown-teams'
    and exists (
      select 1 from public.showdown_teams st join public.coaches c on c.id = st.coach_id
      where st.id::text = (storage.foldername(name))[2] and c.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'team-assets'
    and (storage.foldername(name))[1] = 'showdown-teams'
    and exists (
      select 1 from public.showdown_teams st join public.coaches c on c.id = st.coach_id
      where st.id::text = (storage.foldername(name))[2] and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Coaches can manage own team assets" on storage.objects;
create policy "Coaches can manage own team assets" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'team-assets'
    and (storage.foldername(name))[1] = 'teams'
    and (
      (storage.foldername(name))[2] = (select p.team_id::text from public.profiles p where p.id = (select auth.uid()))
      or exists (
        select 1 from public.teams t join public.coaches c on c.id = t.coach_id
        where t.id::text = (storage.foldername(name))[2] and c.user_id = (select auth.uid())
      )
    )
  )
  with check (
    bucket_id = 'team-assets'
    and (storage.foldername(name))[1] = 'teams'
    and (
      (storage.foldername(name))[2] = (select p.team_id::text from public.profiles p where p.id = (select auth.uid()))
      or exists (
        select 1 from public.teams t join public.coaches c on c.id = t.coach_id
        where t.id::text = (storage.foldername(name))[2] and c.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users can manage own avatar" on storage.objects;
create policy "Users can manage own avatar" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
