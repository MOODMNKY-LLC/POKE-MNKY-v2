-- Expand draft_pool table to support admin panel and Google Sheets export
-- Add missing columns: generation and is_tera_banned
-- Migration: 20260120052444_expand_draft_pool_for_admin_and_export

-- Add generation column (1-9, nullable)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'draft_pool' 
    AND column_name = 'generation'
  ) THEN
    ALTER TABLE public.draft_pool 
    ADD COLUMN generation INTEGER;
    
    -- Add check constraint for valid generation range (1-9)
    ALTER TABLE public.draft_pool 
    ADD CONSTRAINT draft_pool_generation_check 
    CHECK (generation IS NULL OR (generation >= 1 AND generation <= 9));
    
    -- Create index for generation queries
    CREATE INDEX IF NOT EXISTS idx_draft_pool_generation 
    ON public.draft_pool(generation) 
    WHERE generation IS NOT NULL;
    
    RAISE NOTICE 'Added generation column to draft_pool';
  ELSE
    RAISE NOTICE 'generation column already exists in draft_pool';
  END IF;
END $$;

-- Add is_tera_banned column (boolean, nullable, default false)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'draft_pool' 
    AND column_name = 'is_tera_banned'
  ) THEN
    ALTER TABLE public.draft_pool 
    ADD COLUMN is_tera_banned BOOLEAN DEFAULT false;
    
    -- Create index for tera banned queries
    CREATE INDEX IF NOT EXISTS idx_draft_pool_tera_banned 
    ON public.draft_pool(is_tera_banned) 
    WHERE is_tera_banned = true;
    
    -- Add comment
    COMMENT ON COLUMN public.draft_pool.is_tera_banned IS 
    'Indicates if this Pokemon is banned from being used as a Tera Captain. Defaults to false.';
    
    RAISE NOTICE 'Added is_tera_banned column to draft_pool';
  ELSE
    RAISE NOTICE 'is_tera_banned column already exists in draft_pool';
  END IF;
END $$;

-- Update existing rows: set is_tera_banned to false if NULL
UPDATE public.draft_pool 
SET is_tera_banned = false 
WHERE is_tera_banned IS NULL;

-- Set NOT NULL constraint after backfilling
DO $$ 
BEGIN
  -- Only set NOT NULL if column exists and we've backfilled
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'draft_pool' 
    AND column_name = 'is_tera_banned'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.draft_pool 
    ALTER COLUMN is_tera_banned SET NOT NULL;
    
    RAISE NOTICE 'Set is_tera_banned to NOT NULL';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.draft_pool.generation IS 
'Pokemon generation (1-9). Used for filtering and display in admin panel and exports.';

-- Refresh schema cache to ensure Supabase/PostgREST recognizes new columns
-- This is critical for the admin panel to work correctly
NOTIFY pgrst, 'reload schema';
