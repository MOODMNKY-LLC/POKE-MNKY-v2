-- ============================================================================
-- Ensure pokedex-sprites Storage Bucket Exists
-- This migration ensures the bucket exists for sprite mirroring
-- Note: Bucket creation via SQL is not directly supported, but we can
-- document the requirement and provide a helper function
-- ============================================================================

-- Note: Storage buckets must be created via:
-- 1. Supabase Dashboard: Storage → Buckets → New bucket
-- 2. Supabase Storage API: POST /storage/v1/bucket
-- 3. Supabase JS Client: supabase.storage.createBucket('pokedex-sprites', { public: true })

-- This migration serves as documentation and can be used to verify bucket existence
-- The actual bucket creation should be done via the script or dashboard

-- Function to check if bucket exists (for verification)
CREATE OR REPLACE FUNCTION public.check_pokedex_sprites_bucket()
RETURNS TEXT AS $$
BEGIN
  -- This function can be called from application code to verify bucket exists
  -- Actual bucket existence check must be done via Storage API
  RETURN 'Bucket check must be done via Storage API. Use supabase.storage.listBuckets() to verify.';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_pokedex_sprites_bucket() IS 
'Helper function to remind that bucket existence must be checked via Storage API. The pokedex-sprites bucket should be created with public: true for CDN delivery.';

-- ============================================================================
-- Bucket Configuration Requirements:
-- ============================================================================
-- Name: pokedex-sprites
-- Public: true (for CDN delivery)
-- File Size Limit: 50MB (default)
-- Allowed MIME Types: image/png, image/gif, image/svg+xml
--
-- Directory Structure (preserved from PokeAPI/sprites repo):
-- pokemon/{id}/front_default.png
-- pokemon/{id}/front_shiny.png
-- pokemon/{id}/back_default.png
-- pokemon/{id}/back_shiny.png
-- pokemon/{id}/other/official-artwork.png
-- pokemon/{id}/other/home/front.png
-- pokemon/{id}/other/home/front_shiny.png
-- ============================================================================
