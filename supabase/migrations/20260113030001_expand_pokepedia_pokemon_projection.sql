-- ============================================================================
-- Expand pokepedia_pokemon Projection Table
-- Adds commonly queried fields for better performance and filtering
-- ============================================================================

-- Add new columns to pokepedia_pokemon
ALTER TABLE public.pokepedia_pokemon
  -- Types (for filtering by type - very common query)
  ADD COLUMN IF NOT EXISTS types JSONB,
  ADD COLUMN IF NOT EXISTS type_primary TEXT,
  ADD COLUMN IF NOT EXISTS type_secondary TEXT,
  
  -- Base Stats (for sorting and filtering by stat totals)
  ADD COLUMN IF NOT EXISTS base_stats JSONB,  -- {hp, attack, defense, special_attack, special_defense, speed}
  ADD COLUMN IF NOT EXISTS total_base_stat INTEGER,  -- Sum of all base stats (for sorting)
  
  -- Abilities (for filtering by ability)
  ADD COLUMN IF NOT EXISTS abilities JSONB,  -- Array of ability names with hidden flags
  ADD COLUMN IF NOT EXISTS ability_primary TEXT,
  ADD COLUMN IF NOT EXISTS ability_hidden TEXT,
  
  -- Ordering and Generation
  ADD COLUMN IF NOT EXISTS "order" INTEGER,  -- National Dex order
  ADD COLUMN IF NOT EXISTS generation INTEGER,  -- Calculated from order or species
  
  -- Cries (we have cries repo now)
  ADD COLUMN IF NOT EXISTS cry_latest_path TEXT,
  ADD COLUMN IF NOT EXISTS cry_legacy_path TEXT,
  
  -- Additional useful fields
  ADD COLUMN IF NOT EXISTS moves_count INTEGER,  -- Count of moves (can query JSONB for details)
  ADD COLUMN IF NOT EXISTS forms_count INTEGER;  -- Count of forms

-- Create indexes for commonly filtered columns
CREATE INDEX IF NOT EXISTS pokepedia_pokemon_type_primary_idx
  ON public.pokepedia_pokemon(type_primary);

CREATE INDEX IF NOT EXISTS pokepedia_pokemon_type_secondary_idx
  ON public.pokepedia_pokemon(type_secondary);

CREATE INDEX IF NOT EXISTS pokepedia_pokemon_total_base_stat_idx
  ON public.pokepedia_pokemon(total_base_stat);

CREATE INDEX IF NOT EXISTS pokepedia_pokemon_generation_idx
  ON public.pokepedia_pokemon(generation);

CREATE INDEX IF NOT EXISTS pokepedia_pokemon_order_idx
  ON public.pokepedia_pokemon("order");

CREATE INDEX IF NOT EXISTS pokepedia_pokemon_ability_primary_idx
  ON public.pokepedia_pokemon(ability_primary);

-- GIN index for JSONB type queries (filtering by type in array)
CREATE INDEX IF NOT EXISTS pokepedia_pokemon_types_gin
  ON public.pokepedia_pokemon USING GIN (types jsonb_path_ops);

-- GIN index for JSONB ability queries
CREATE INDEX IF NOT EXISTS pokepedia_pokemon_abilities_gin
  ON public.pokepedia_pokemon USING GIN (abilities jsonb_path_ops);

-- GIN index for JSONB base_stats queries
CREATE INDEX IF NOT EXISTS pokepedia_pokemon_base_stats_gin
  ON public.pokepedia_pokemon USING GIN (base_stats jsonb_path_ops);

-- Comments
COMMENT ON COLUMN public.pokepedia_pokemon.types IS 'Array of type names (e.g., ["grass", "poison"])';
COMMENT ON COLUMN public.pokepedia_pokemon.type_primary IS 'Primary type for fast filtering';
COMMENT ON COLUMN public.pokepedia_pokemon.type_secondary IS 'Secondary type (nullable for single-type Pokemon)';
COMMENT ON COLUMN public.pokepedia_pokemon.base_stats IS 'Base stats object: {hp, attack, defense, special_attack, special_defense, speed}';
COMMENT ON COLUMN public.pokepedia_pokemon.total_base_stat IS 'Sum of all base stats (for sorting by total power)';
COMMENT ON COLUMN public.pokepedia_pokemon.abilities IS 'Array of ability objects: [{name, is_hidden, slot}]';
COMMENT ON COLUMN public.pokepedia_pokemon.ability_primary IS 'Primary ability name';
COMMENT ON COLUMN public.pokepedia_pokemon.ability_hidden IS 'Hidden ability name (nullable)';
COMMENT ON COLUMN public.pokepedia_pokemon."order" IS 'National Dex order (for sorting)';
COMMENT ON COLUMN public.pokepedia_pokemon.generation IS 'Generation number (1-9)';
COMMENT ON COLUMN public.pokepedia_pokemon.cry_latest_path IS 'Path to latest cry audio file in storage';
COMMENT ON COLUMN public.pokepedia_pokemon.cry_legacy_path IS 'Path to legacy cry audio file in storage';
COMMENT ON COLUMN public.pokepedia_pokemon.moves_count IS 'Total number of moves this Pokemon can learn';
COMMENT ON COLUMN public.pokepedia_pokemon.forms_count IS 'Number of forms this Pokemon has';
