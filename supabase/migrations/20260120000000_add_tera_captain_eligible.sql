-- Add tera_captain_eligible column to draft_pool table
-- This tracks whether a Pokemon can be designated as a Tera Captain
-- Tera banned Pokemon are still draftable but cannot be Tera Captains

ALTER TABLE public.draft_pool 
ADD COLUMN IF NOT EXISTS tera_captain_eligible BOOLEAN DEFAULT true NOT NULL;

-- Create index for filtering Tera Captain eligible Pokemon
CREATE INDEX IF NOT EXISTS idx_draft_pool_tera_eligible 
ON public.draft_pool(tera_captain_eligible) 
WHERE tera_captain_eligible = true;

-- Add comment explaining the column
COMMENT ON COLUMN public.draft_pool.tera_captain_eligible IS 
  'Whether this Pokemon can be designated as a Tera Captain. Tera banned Pokemon have this set to false but are still draftable (status = available).';

-- Backfill existing rows: all current Pokemon are eligible unless we know otherwise
-- This is safe because we're adding new data, not changing existing behavior
UPDATE public.draft_pool 
SET tera_captain_eligible = true 
WHERE tera_captain_eligible IS NULL;
