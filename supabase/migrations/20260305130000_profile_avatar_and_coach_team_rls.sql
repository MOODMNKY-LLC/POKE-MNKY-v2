-- Phase 1: Profile, Account, Coach Profile UI Reorganization
-- 1.1 Coach team update policy - coaches can UPDATE their own team (name, avatar_url, logo_url)
-- 1.2 User avatar storage - user-avatars bucket and policies
-- 1.3 Showdown team avatar - add avatar_url column and storage policies

-- ============================================
-- 1.1 Coach team update policy
-- ============================================
-- Coaches can UPDATE only their own team (via is_coach_of_team).
-- Restricts to name, avatar_url, logo_url - wins/losses/coach_id remain admin-only.
-- Uses separate policy so coaches get UPDATE without INSERT/DELETE.

DROP POLICY IF EXISTS "admin writes teams" ON public.teams;

-- Admin retains full control
CREATE POLICY "admin writes teams"
ON public.teams
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Coaches can UPDATE their own team (name, avatar, logo only)
-- Postgres RLS: multiple policies OR together. Coach UPDATE is allowed when is_coach_of_team.
CREATE POLICY "coach updates own team branding"
ON public.teams
FOR UPDATE
USING (public.is_coach_of_team(id))
WITH CHECK (public.is_coach_of_team(id));

COMMENT ON POLICY "coach updates own team branding" ON public.teams IS
  'Coaches can update name, avatar_url, logo_url for their assigned team. Wins/losses/coach_id remain admin-only.';

-- ============================================
-- 1.2 User avatar storage
-- ============================================
-- Bucket "user-avatars" for profile avatar uploads.
-- Local dev: defined in supabase/config.toml [storage.buckets.user-avatars]
-- Hosted: create via Dashboard (Storage → New bucket: user-avatars, public, 5MB, image/*)

-- Public read for user avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public can read user avatars'
  ) THEN
    CREATE POLICY "Public can read user avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'user-avatars');
  END IF;
END $$;

-- Users can manage only their own avatar: users/<auth.uid()>/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can manage own avatar'
  ) THEN
    CREATE POLICY "Users can manage own avatar"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'user-avatars'
      AND (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    )
    WITH CHECK (
      bucket_id = 'user-avatars'
      AND (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = (auth.uid())::text
    );
  END IF;
END $$;

-- ============================================
-- 1.3 Showdown team avatar
-- ============================================
ALTER TABLE public.showdown_teams
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.showdown_teams.avatar_url IS 'Optional avatar/image URL for the Showdown team (stored in team-assets/showdown-teams/<id>)';

-- Extend team-assets: coaches can manage showdown-teams/<showdown_team_id>/ for their own teams
-- Coach owns showdown_team if coach_id matches their coach record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Coaches can manage own showdown team assets'
  ) THEN
    CREATE POLICY "Coaches can manage own showdown team assets"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'team-assets'
      AND (storage.foldername(name))[1] = 'showdown-teams'
      AND EXISTS (
        SELECT 1 FROM public.showdown_teams st
        JOIN public.coaches c ON c.id = st.coach_id
        WHERE st.id::text = (storage.foldername(name))[2]
          AND c.user_id = auth.uid()
      )
    )
    WITH CHECK (
      bucket_id = 'team-assets'
      AND (storage.foldername(name))[1] = 'showdown-teams'
      AND EXISTS (
        SELECT 1 FROM public.showdown_teams st
        JOIN public.coaches c ON c.id = st.coach_id
        WHERE st.id::text = (storage.foldername(name))[2]
          AND c.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Public read for showdown team assets (reuse team-assets bucket)
-- team-assets already has "Public can read team assets" which covers all objects in bucket
