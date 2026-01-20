-- Ensure is_tera_banned column exists in sheets_draft_pool staging table
-- This migration is idempotent and safe to run multiple times
-- It ensures the column exists with correct properties even if manually added

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sheets_draft_pool' 
      AND column_name = 'is_tera_banned'
  ) THEN
    ALTER TABLE public.sheets_draft_pool 
    ADD COLUMN is_tera_banned BOOLEAN DEFAULT false NOT NULL;
    
    RAISE NOTICE 'Added is_tera_banned column to sheets_draft_pool';
  ELSE
    RAISE NOTICE 'Column is_tera_banned already exists';
  END IF;
END $$;

-- Ensure column has correct default value
ALTER TABLE public.sheets_draft_pool 
  ALTER COLUMN is_tera_banned SET DEFAULT false;

-- Ensure column is NOT NULL (in case it was added as nullable)
-- First backfill any NULL values, then set NOT NULL constraint
DO $$
BEGIN
  -- Check if column allows NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'sheets_draft_pool' 
      AND column_name = 'is_tera_banned'
      AND is_nullable = 'YES'
  ) THEN
    -- Backfill NULLs first
    UPDATE public.sheets_draft_pool 
    SET is_tera_banned = false 
    WHERE is_tera_banned IS NULL;
    
    -- Then set NOT NULL
    ALTER TABLE public.sheets_draft_pool 
    ALTER COLUMN is_tera_banned SET NOT NULL;
    
    RAISE NOTICE 'Set is_tera_banned to NOT NULL';
  END IF;
END $$;

-- Backfill any NULL values (shouldn't happen after above, but safety check)
UPDATE public.sheets_draft_pool 
SET is_tera_banned = false 
WHERE is_tera_banned IS NULL;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_sheets_draft_pool_tera_banned 
ON public.sheets_draft_pool(is_tera_banned) 
WHERE is_tera_banned = true;

-- Add comment explaining the column
COMMENT ON COLUMN public.sheets_draft_pool.is_tera_banned IS 
  'Whether this Pokemon is Tera banned (cannot be designated as Tera Captain). Tera banned Pokemon are still draftable (is_available = true) but cannot be Tera Captains.';
