-- Add season_id field to seasons table (format: AABPBL-Season-6-2026)
-- This is a human-readable identifier separate from the UUID primary key

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'seasons' 
    AND column_name = 'season_id'
  ) THEN
    ALTER TABLE public.seasons 
    ADD COLUMN season_id TEXT UNIQUE;
    
    -- Create index for season_id lookups
    CREATE INDEX IF NOT EXISTS idx_seasons_season_id 
    ON public.seasons(season_id) 
    WHERE season_id IS NOT NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.seasons.season_id IS 
    'Human-readable season identifier (e.g., AABPBL-Season-6-2026). Separate from UUID primary key.';
    
    RAISE NOTICE 'Added season_id column to seasons';
  ELSE
    RAISE NOTICE 'season_id column already exists in seasons';
  END IF;
END $$;

-- Note: season_name already exists as the 'name' column
-- We'll use 'name' as season_name in the UI
