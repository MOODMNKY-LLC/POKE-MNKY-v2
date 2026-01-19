-- Create Showdown Pokedex Tables
-- This migration creates tables to store Pokémon Showdown pokedex.json data
-- Following best practices: raw storage + relational materialization

-- 1. Raw ingest table (for traceability and versioning)
CREATE TABLE IF NOT EXISTS public.showdown_pokedex_raw (
  showdown_id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  source_version TEXT, -- e.g., commit hash, timestamp, or version string
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  etag TEXT -- for caching/conditional requests
);

-- 2. Query-optimized relational tables
CREATE TABLE IF NOT EXISTS public.pokemon_showdown (
  showdown_id TEXT PRIMARY KEY,
  dex_num INTEGER, -- from "num" field
  name TEXT NOT NULL,
  base_species TEXT, -- from "baseSpecies"
  forme TEXT, -- from "forme"
  is_nonstandard TEXT, -- from "isNonstandard"
  tier TEXT, -- Smogon tier (e.g., "OU", "UU", "Illegal")
  
  -- Physical attributes
  height_m NUMERIC,
  weight_kg NUMERIC,
  
  -- Base stats
  hp INTEGER,
  atk INTEGER,
  def INTEGER,
  spa INTEGER, -- Special Attack
  spd INTEGER, -- Special Defense
  spe INTEGER, -- Speed
  
  -- Evolution metadata (stored as JSONB for flexibility)
  evolution_data JSONB, -- prevo, evos, evoType, evoMove, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Types junction table (many-to-many: Pokemon can have 1-2 types)
-- Note: Using pokemon_showdown_types to avoid conflict with existing pokemon_types (PokéAPI)
CREATE TABLE IF NOT EXISTS public.pokemon_showdown_types (
  showdown_id TEXT NOT NULL REFERENCES public.pokemon_showdown(showdown_id) ON DELETE CASCADE,
  slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
  type TEXT NOT NULL,
  PRIMARY KEY (showdown_id, slot)
);

-- 4. Abilities junction table (many-to-many: Pokemon can have multiple abilities)
-- Note: Using pokemon_showdown_abilities to avoid conflict with existing pokemon_abilities (PokéAPI)
CREATE TABLE IF NOT EXISTS public.pokemon_showdown_abilities (
  showdown_id TEXT NOT NULL REFERENCES public.pokemon_showdown(showdown_id) ON DELETE CASCADE,
  slot TEXT NOT NULL, -- "0", "1", "H" (Hidden), sometimes "S" (Special)
  ability TEXT NOT NULL,
  PRIMARY KEY (showdown_id, slot)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pokemon_showdown_dex_num ON public.pokemon_showdown(dex_num);
CREATE INDEX IF NOT EXISTS idx_pokemon_showdown_name ON public.pokemon_showdown(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_showdown_base_species ON public.pokemon_showdown(base_species);
CREATE INDEX IF NOT EXISTS idx_pokemon_showdown_tier ON public.pokemon_showdown(tier);
CREATE INDEX IF NOT EXISTS idx_pokemon_showdown_types_type ON public.pokemon_showdown_types(type);
CREATE INDEX IF NOT EXISTS idx_pokemon_showdown_abilities_ability ON public.pokemon_showdown_abilities(ability);
CREATE INDEX IF NOT EXISTS idx_showdown_pokedex_raw_fetched_at ON public.showdown_pokedex_raw(fetched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.showdown_pokedex_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_showdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_showdown_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_showdown_abilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Readable by authenticated users, writable by service_role
CREATE POLICY "Showdown pokedex raw is viewable by authenticated users"
  ON public.showdown_pokedex_raw
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Showdown pokedex raw is insertable by service role"
  ON public.showdown_pokedex_raw
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Showdown pokedex raw is updatable by service role"
  ON public.showdown_pokedex_raw
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pokemon Showdown is viewable by authenticated users"
  ON public.pokemon_showdown
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pokemon Showdown is insertable by service role"
  ON public.pokemon_showdown
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Pokemon Showdown is updatable by service role"
  ON public.pokemon_showdown
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pokemon Showdown types is viewable by authenticated users"
  ON public.pokemon_showdown_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pokemon Showdown types is insertable by service role"
  ON public.pokemon_showdown_types
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Pokemon Showdown types is updatable by service role"
  ON public.pokemon_showdown_types
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Pokemon Showdown abilities is viewable by authenticated users"
  ON public.pokemon_showdown_abilities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pokemon Showdown abilities is insertable by service role"
  ON public.pokemon_showdown_abilities
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Pokemon Showdown abilities is updatable by service role"
  ON public.pokemon_showdown_abilities
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper function: Normalize Showdown ID to pokemon_name format
-- Converts "mrmimegalar" -> "Mr. Mime-Galar"
CREATE OR REPLACE FUNCTION public.normalize_showdown_id_to_name(showdown_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  parts TEXT[];
  result TEXT;
BEGIN
  -- Handle special cases first
  CASE showdown_id
    WHEN 'nidoranf' THEN RETURN 'Nidoran-F';
    WHEN 'nidoranm' THEN RETURN 'Nidoran-M';
    WHEN 'mimejr' THEN RETURN 'Mime Jr.';
    WHEN 'typenull' THEN RETURN 'Type: Null';
    WHEN 'mr' THEN RETURN 'Mr.';
    WHEN 'mrs' THEN RETURN 'Mrs.';
    ELSE
      -- Split by common patterns
      parts := string_to_array(showdown_id, '');
      
      -- Capitalize first letter
      result := upper(substring(showdown_id, 1, 1)) || lower(substring(showdown_id, 2));
      
      -- Handle forme suffixes (galar, alola, hisui, etc.)
      IF result LIKE '%galar' THEN
        result := replace(result, 'galar', '-Galar');
      ELSIF result LIKE '%alola' THEN
        result := replace(result, 'alola', '-Alola');
      ELSIF result LIKE '%hisui' THEN
        result := replace(result, 'hisui', '-Hisui');
      ELSIF result LIKE '%paldea' THEN
        result := replace(result, 'paldea', '-Paldea');
      ELSIF result LIKE '%mega' THEN
        result := replace(result, 'mega', '-Mega');
      ELSIF result LIKE '%megax' THEN
        result := replace(result, 'megax', '-Mega-X');
      ELSIF result LIKE '%megay' THEN
        result := replace(result, 'megay', '-Mega-Y');
      END IF;
      
      -- Handle common word boundaries
      result := replace(result, 'mrmime', 'Mr. Mime');
      result := replace(result, 'mime', 'Mime');
      
      RETURN result;
  END CASE;
END;
$$;

-- Helper function: Find Showdown entry by pokemon_name (fuzzy matching)
CREATE OR REPLACE FUNCTION public.find_showdown_entry_by_name(pokemon_name TEXT)
RETURNS TABLE(
  showdown_id TEXT,
  dex_num INTEGER,
  name TEXT,
  tier TEXT,
  hp INTEGER,
  atk INTEGER,
  def INTEGER,
  spa INTEGER,
  spd INTEGER,
  spe INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  normalized_name TEXT;
  search_patterns TEXT[];
BEGIN
  normalized_name := lower(trim(pokemon_name));
  
  -- Try exact match first
  RETURN QUERY
  SELECT 
    ps.showdown_id,
    ps.dex_num,
    ps.name,
    ps.tier,
    ps.hp,
    ps.atk,
    ps.def,
    ps.spa,
    ps.spd,
    ps.spe
  FROM pokemon_showdown ps
  WHERE lower(ps.name) = normalized_name
  LIMIT 1;
  
  -- If no exact match, try fuzzy matching
  IF NOT FOUND THEN
    -- Try normalized showdown ID
    RETURN QUERY
    SELECT 
      ps.showdown_id,
      ps.dex_num,
      ps.name,
      ps.tier,
      ps.hp,
      ps.atk,
      ps.def,
      ps.spa,
      ps.spd,
      ps.spe
    FROM pokemon_showdown ps
    WHERE lower(ps.name) LIKE '%' || replace(normalized_name, ' ', '') || '%'
       OR lower(ps.name) LIKE '%' || replace(normalized_name, '-', '') || '%'
       OR lower(ps.name) LIKE '%' || replace(normalized_name, ' ', '-') || '%'
    LIMIT 1;
  END IF;
END;
$$;

-- View: Join draft_pool with Showdown battle metadata
CREATE OR REPLACE VIEW public.draft_pool_with_showdown AS
SELECT 
  dp.id,
  dp.pokemon_name,
  dp.point_value,
  dp.season_id,
  dp.status,
  dp.pokemon_id,
  ps.showdown_id,
  ps.dex_num,
  ps.tier AS showdown_tier,
  ps.hp,
  ps.atk,
  ps.def,
  ps.spa,
  ps.spd,
  ps.spe,
  ps.base_species,
  ps.forme,
  -- Aggregate types (as JSON array)
  (
    SELECT json_agg(type ORDER BY slot)
    FROM pokemon_showdown_types pt2
    WHERE pt2.showdown_id = ps.showdown_id
  ) AS types,
  -- Aggregate abilities (as JSON array)
  (
    SELECT json_agg(ability ORDER BY 
      CASE slot
        WHEN '0' THEN 1
        WHEN '1' THEN 2
        WHEN 'H' THEN 3
        ELSE 4
      END
    )
    FROM pokemon_showdown_abilities pa2
    WHERE pa2.showdown_id = ps.showdown_id
  ) AS abilities
FROM draft_pool dp
LEFT JOIN pokemon_showdown ps ON 
  lower(ps.name) = lower(dp.pokemon_name)
  OR lower(ps.name) = lower(replace(dp.pokemon_name, ' ', '-'))
  OR lower(ps.name) = lower(replace(dp.pokemon_name, ' ', ''))
GROUP BY 
  dp.id,
  dp.pokemon_name,
  dp.point_value,
  dp.season_id,
  dp.status,
  dp.pokemon_id,
  ps.showdown_id,
  ps.dex_num,
  ps.tier,
  ps.hp,
  ps.atk,
  ps.def,
  ps.spa,
  ps.spd,
  ps.spe,
  ps.base_species,
  ps.forme;

-- Grant permissions
GRANT SELECT ON public.showdown_pokedex_raw TO authenticated;
GRANT SELECT ON public.pokemon_showdown TO authenticated;
GRANT SELECT ON public.pokemon_showdown_types TO authenticated;
GRANT SELECT ON public.pokemon_showdown_abilities TO authenticated;
GRANT SELECT ON public.draft_pool_with_showdown TO authenticated;
