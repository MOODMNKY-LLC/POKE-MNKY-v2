-- Free Agency Transaction System
-- Supports in-app free agency transactions with validation and tracking

-- Free agency transactions table
CREATE TABLE IF NOT EXISTS public.free_agency_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('replacement', 'addition', 'drop_only')),
  added_pokemon_id UUID REFERENCES public.pokemon(id) ON DELETE SET NULL,
  dropped_pokemon_id UUID REFERENCES public.pokemon(id) ON DELETE SET NULL,
  added_points INTEGER DEFAULT 0,
  dropped_points INTEGER DEFAULT 0,
  
  -- Status and processing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  processed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT valid_transaction CHECK (
    (transaction_type = 'replacement' AND added_pokemon_id IS NOT NULL AND dropped_pokemon_id IS NOT NULL) OR
    (transaction_type = 'addition' AND added_pokemon_id IS NOT NULL AND dropped_pokemon_id IS NULL) OR
    (transaction_type = 'drop_only' AND added_pokemon_id IS NULL AND dropped_pokemon_id IS NOT NULL)
  )
);

-- Transaction count tracking (for 10 F/A move limit)
CREATE TABLE IF NOT EXISTS public.team_transaction_counts (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  transaction_count INTEGER DEFAULT 0,
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, season_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_free_agency_transactions_team_season 
  ON public.free_agency_transactions(team_id, season_id);
CREATE INDEX IF NOT EXISTS idx_free_agency_transactions_status 
  ON public.free_agency_transactions(status);
CREATE INDEX IF NOT EXISTS idx_free_agency_transactions_created_at 
  ON public.free_agency_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE public.free_agency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_transaction_counts ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read transactions
CREATE POLICY "Free agency transactions are viewable by authenticated users"
  ON public.free_agency_transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can create transactions for their team
CREATE POLICY "Users can create transactions for their team"
  ON public.free_agency_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams 
      WHERE coach_id IN (
        SELECT id FROM public.coaches 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Service role can update transactions
CREATE POLICY "Service role can update transactions"
  ON public.free_agency_transactions
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Transaction counts are viewable by authenticated users
CREATE POLICY "Transaction counts are viewable by authenticated users"
  ON public.team_transaction_counts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can update transaction counts
CREATE POLICY "Service role can update transaction counts"
  ON public.team_transaction_counts
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.free_agency_transactions IS 'Tracks free agency transactions (additions, drops, replacements)';
COMMENT ON TABLE public.team_transaction_counts IS 'Tracks transaction count per team per season (for 10 F/A move limit)';
