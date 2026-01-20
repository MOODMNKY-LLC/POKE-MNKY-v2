-- Add is_tera_banned column to sheets_draft_pool staging table
-- This tracks which Pokemon are Tera banned (cannot be Tera Captains)
-- Tera banned Pokemon are still draftable (is_available = true) but flagged here

ALTER TABLE public.sheets_draft_pool 
ADD COLUMN IF NOT EXISTS is_tera_banned BOOLEAN DEFAULT false NOT NULL;

-- Create index for filtering Tera banned Pokemon
CREATE INDEX IF NOT EXISTS idx_sheets_draft_pool_tera_banned 
ON public.sheets_draft_pool(is_tera_banned) 
WHERE is_tera_banned = true;

-- Add comment explaining the column
COMMENT ON COLUMN public.sheets_draft_pool.is_tera_banned IS 
  'Whether this Pokemon is Tera banned (cannot be designated as Tera Captain). Tera banned Pokemon are still draftable (is_available = true) but cannot be Tera Captains.';

-- Backfill existing rows: all current Pokemon are not Tera banned
UPDATE public.sheets_draft_pool 
SET is_tera_banned = false 
WHERE is_tera_banned IS NULL;
