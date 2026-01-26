-- Create music-tracks storage bucket
-- This bucket stores downloaded music tracks from Pixabay

-- Note: Bucket creation via SQL is not directly supported in Supabase
-- This migration documents the bucket configuration
-- The bucket should be created via Supabase Dashboard or API

-- Bucket configuration:
-- Name: music-tracks
-- Public: true (for direct audio playback)
-- File size limit: 50MB
-- Allowed MIME types: audio/mpeg, audio/mp3, audio/ogg, audio/wav, audio/webm

-- To create the bucket manually:
-- 1. Go to Supabase Dashboard → Storage → New Bucket
-- 2. Name: music-tracks
-- 3. Public: Yes
-- 4. File size limit: 50MB
-- 5. Allowed MIME types: audio/mpeg, audio/mp3, audio/ogg, audio/wav, audio/webm

-- Or use the Storage API:
-- POST /storage/v1/bucket
-- {
--   "name": "music-tracks",
--   "public": true,
--   "file_size_limit": 52428800,
--   "allowed_mime_types": ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/webm"]
-- }

-- Storage policies for music-tracks bucket
-- Public read access (anyone can play tracks)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can read music tracks'
  ) THEN
    CREATE POLICY "Public can read music tracks"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'music-tracks');
  END IF;
END $$;

-- Admin full access (upload, delete, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Admins can manage music tracks'
  ) THEN
    CREATE POLICY "Admins can manage music tracks"
    ON storage.objects FOR ALL
    USING (
      bucket_id = 'music-tracks'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );
  END IF;
END $$;
