-- Create draft_pool table for storing available Pokemon with point values
-- This table stores the complete list of Pokemon available for drafting

CREATE TABLE IF NOT EXISTS public.draft_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Pokemon information
  pokemon_name TEXT NOT NULL,
  point_value INTEGER NOT NULL CHECK (point_value >= 12 AND point_value <= 20),
  
  -- Availability status
  is_available BOOLEAN DEFAULT true,
  
  -- Generation data (for filtering)
  generation INTEGER CHECK (generation >= 1 AND generation <= 9),
  
  -- Sheet location (for reference)
  sheet_name TEXT NOT NULL,
  sheet_row INTEGER,
  sheet_column TEXT,
  
  -- Metadata
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique Pokemon per point value per sheet
  UNIQUE(sheet_name, pokemon_name, point_value)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_draft_pool_available ON public.draft_pool(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_draft_pool_point_value ON public.draft_pool(point_value);
CREATE INDEX IF NOT EXISTS idx_draft_pool_generation ON public.draft_pool(generation);
CREATE INDEX IF NOT EXISTS idx_draft_pool_sheet_name ON public.draft_pool(sheet_name);
CREATE INDEX IF NOT EXISTS idx_draft_pool_pokemon_name ON public.draft_pool(pokemon_name);

-- Add RLS policies
ALTER TABLE public.draft_pool ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read draft pool
CREATE POLICY "Draft pool is viewable by authenticated users"
  ON public.draft_pool
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert/update (via backend)
CREATE POLICY "Draft pool is insertable by service role"
  ON public.draft_pool
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Draft pool is updatable by service role"
  ON public.draft_pool
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Draft pool is deletable by service role"
  ON public.draft_pool
  FOR DELETE
  TO service_role
  USING (true);

-- Add comment
COMMENT ON TABLE public.draft_pool IS 'Stores the complete list of Pokemon available for drafting with their point values';
