-- Team assets storage bucket and policies
-- Bucket "team-assets" is used by the profile Coach Card for team avatar and logo uploads.
-- For local dev the bucket is defined in supabase/config.toml.
-- For hosted Supabase, create the bucket via Dashboard (Storage → New bucket: team-assets, public, 5MB, image/*)
-- or call POST /api/admin/storage with { "name": "team-assets", "public": true, "fileSizeLimit": 5242880 }.

-- Public read: anyone can view team avatars/logos (public URLs used in UI)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read team assets'
  ) THEN
    CREATE POLICY "Public can read team assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'team-assets');
  END IF;
END $$;

-- Coaches can upload/update/delete only under their own team path: teams/<their team_id>/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Coaches can manage own team assets'
  ) THEN
    CREATE POLICY "Coaches can manage own team assets"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'team-assets'
      AND (storage.foldername(name))[1] = 'teams'
      AND (storage.foldername(name))[2] = (
        SELECT (p.team_id)::text FROM public.profiles p WHERE p.id = auth.uid()
      )
      AND (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid()) IS NOT NULL
    )
    WITH CHECK (
      bucket_id = 'team-assets'
      AND (storage.foldername(name))[1] = 'teams'
      AND (storage.foldername(name))[2] = (
        SELECT (p.team_id)::text FROM public.profiles p WHERE p.id = auth.uid()
      )
      AND (SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid()) IS NOT NULL
    );
  END IF;
END $$;

-- Admins can manage any object in team-assets (for support/cleanup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can manage team assets'
  ) THEN
    CREATE POLICY "Admins can manage team assets"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'team-assets'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'commissioner')
      )
    );
  END IF;
END $$;

-- Policies: Public read for team-assets; coaches can manage only teams/<their team_id>/; admins full access.
