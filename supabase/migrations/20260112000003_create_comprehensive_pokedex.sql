-- Comprehensive Pokedex Schema
-- Creates normalized tables for complete Pokemon data from PokeAPI

-- ============================================================================
-- MASTER DATA TABLES
-- ============================================================================

-- Types Master Data
CREATE TABLE IF NOT EXISTS public.types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  damage_relations JSONB, -- {double_damage_from, double_damage_to, etc.}
  game_indices JSONB,
  generation_id INTEGER,
  move_damage_class_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilities Master Data
CREATE TABLE IF NOT EXISTS public.abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ability_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  is_main_series BOOLEAN DEFAULT true,
  effect_entries JSONB, -- [{language: {name, url}, effect, short_effect}]
  flavor_text_entries JSONB,
  generation_id INTEGER,
  pokemon JSONB, -- List of Pokemon with this ability
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moves Master Data
CREATE TABLE IF NOT EXISTS public.moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  accuracy INTEGER,
  effect_chance INTEGER,
  pp INTEGER,
  priority INTEGER,
  power INTEGER,
  damage_class_id INTEGER, -- physical, special, status
  type_id INTEGER REFERENCES public.types(type_id),
  target_id INTEGER,
  effect_entries JSONB,
  flavor_text_entries JSONB,
  stat_changes JSONB,
  meta JSONB, -- {ailment, category, min_hits, max_hits, etc.}
  generation_id INTEGER,
  learned_by_pokemon JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items Master Data
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  cost INTEGER,
  fling_power INTEGER,
  fling_effect_id INTEGER,
  attributes JSONB,
  category_id INTEGER,
  effect_entries JSONB,
  flavor_text_entries JSONB,
  game_indices JSONB,
  sprites JSONB,
  held_by_pokemon JSONB, -- [{pokemon: {name, url}, version_details: [{rarity, version}]}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stats Master Data
CREATE TABLE IF NOT EXISTS public.stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stat_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  is_battle_only BOOLEAN DEFAULT false,
  game_index INTEGER,
  move_damage_class_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generations Master Data
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generation_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  abilities JSONB,
  main_region_id INTEGER,
  moves JSONB,
  pokemon_species JSONB,
  types JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- POKEMON CORE TABLES
-- ============================================================================

-- Pokemon Species (Base species information)
CREATE TABLE IF NOT EXISTS public.pokemon_species (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  species_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  "order" INTEGER,
  gender_rate INTEGER, -- -1 = genderless, 0-8 = female ratio
  capture_rate INTEGER,
  base_happiness INTEGER,
  is_baby BOOLEAN DEFAULT false,
  is_legendary BOOLEAN DEFAULT false,
  is_mythical BOOLEAN DEFAULT false,
  hatch_counter INTEGER,
  has_gender_differences BOOLEAN DEFAULT false,
  forms_switchable BOOLEAN DEFAULT false,
  growth_rate_id INTEGER,
  habitat_id INTEGER,
  generation_id INTEGER REFERENCES public.generations(generation_id),
  evolution_chain_id INTEGER,
  color_id INTEGER,
  shape_id INTEGER,
  egg_groups JSONB, -- [{name, url}]
  flavor_text_entries JSONB, -- [{flavor_text, language, version}]
  form_descriptions JSONB,
  genera JSONB, -- [{genus, language}]
  names JSONB, -- [{name, language}]
  pal_park_encounters JSONB,
  pokedex_numbers JSONB, -- [{entry_number, pokedex: {name, url}}]
  varieties JSONB, -- [{is_default, pokemon: {name, url}}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon (Individual Pokemon instances)
CREATE TABLE IF NOT EXISTS public.pokemon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_experience INTEGER,
  height INTEGER, -- in decimeters
  weight INTEGER, -- in hectograms
  "order" INTEGER,
  is_default BOOLEAN DEFAULT true,
  location_area_encounters TEXT, -- URL
  sprites JSONB, -- {front_default, front_shiny, back_default, etc.}
  species_id INTEGER REFERENCES public.pokemon_species(species_id),
  form_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evolution Chains
CREATE TABLE IF NOT EXISTS public.evolution_chains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evolution_chain_id INTEGER UNIQUE NOT NULL,
  baby_trigger_item_id INTEGER REFERENCES public.items(item_id),
  chain_data JSONB, -- Full evolution chain structure
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon Forms
CREATE TABLE IF NOT EXISTS public.pokemon_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "order" INTEGER,
  form_order INTEGER,
  is_default BOOLEAN DEFAULT false,
  is_battle_only BOOLEAN DEFAULT false,
  is_mega BOOLEAN DEFAULT false,
  pokemon_id INTEGER,
  version_group_id INTEGER,
  form_names JSONB,
  form_sprites JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint conditionally (only if pokemon_comprehensive exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive' AND column_name = 'pokemon_id'
    )
  ) THEN
    ALTER TABLE public.pokemon_forms 
    ADD CONSTRAINT fk_pokemon_forms_pokemon 
    FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_comprehensive(pokemon_id);
  END IF;
END $$;

-- ============================================================================
-- RELATIONSHIP TABLES
-- ============================================================================

-- Pokemon-Ability Relationships
CREATE TABLE IF NOT EXISTS public.pokemon_abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_id INTEGER,
  ability_id INTEGER REFERENCES public.abilities(ability_id),
  is_hidden BOOLEAN DEFAULT false,
  slot INTEGER, -- 1, 2, or 3
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_id, ability_id, slot)
);

-- Add foreign key constraint conditionally
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive' AND column_name = 'pokemon_id'
    )
  ) THEN
    ALTER TABLE public.pokemon_abilities 
    ADD CONSTRAINT fk_pokemon_abilities_pokemon 
    FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_comprehensive(pokemon_id);
  END IF;
END $$;

-- Pokemon-Move Relationships
CREATE TABLE IF NOT EXISTS public.pokemon_moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_id INTEGER,
  move_id INTEGER REFERENCES public.moves(move_id),
  version_group_id INTEGER,
  move_learn_method_id INTEGER, -- level-up, machine, tutor, etc.
  level_learned_at INTEGER,
  "order" INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_id, move_id, version_group_id, move_learn_method_id, level_learned_at)
);

-- Pokemon-Type Relationships
CREATE TABLE IF NOT EXISTS public.pokemon_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_id INTEGER,
  type_id INTEGER REFERENCES public.types(type_id),
  slot INTEGER, -- 1 or 2
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_id, type_id, slot)
);

-- Add foreign key constraint conditionally
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive' AND column_name = 'pokemon_id'
    )
  ) THEN
    ALTER TABLE public.pokemon_types 
    ADD CONSTRAINT fk_pokemon_types_pokemon 
    FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_comprehensive(pokemon_id);
  END IF;
END $$;

-- Pokemon-Item Relationships (Held Items)
CREATE TABLE IF NOT EXISTS public.pokemon_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_id INTEGER,
  item_id INTEGER REFERENCES public.items(item_id),
  version_details JSONB, -- [{rarity, version: {name, url}}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_id, item_id)
);

-- Add foreign key constraint conditionally
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive' AND column_name = 'pokemon_id'
    )
  ) THEN
    ALTER TABLE public.pokemon_items 
    ADD CONSTRAINT fk_pokemon_items_pokemon 
    FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_comprehensive(pokemon_id);
  END IF;
END $$;

-- Pokemon-Stat Relationships (Note: pokemon_stats table may already exist with different structure)
-- Check if table exists first, if so, we'll use it or create new one
DO $$
BEGIN
  -- Create pokemon_stats_new first
  CREATE TABLE IF NOT EXISTS public.pokemon_stats_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pokemon_id INTEGER NOT NULL, -- Will reference pokemon.pokemon_id after table creation
    stat_id INTEGER REFERENCES public.stats(stat_id),
    base_stat INTEGER NOT NULL,
    effort INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pokemon_id, stat_id)
  );
  
  -- If pokemon_stats doesn't exist, rename pokemon_stats_new to pokemon_stats
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats'
  ) THEN
    ALTER TABLE public.pokemon_stats_new RENAME TO pokemon_stats;
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Pokemon indexes (conditional - only if pokemon_comprehensive exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pokemon_comprehensive_species_id ON public.pokemon_comprehensive(species_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_comprehensive_name ON public.pokemon_comprehensive(name);
    CREATE INDEX IF NOT EXISTS idx_pokemon_comprehensive_is_default ON public.pokemon_comprehensive(is_default);
    CREATE INDEX IF NOT EXISTS idx_pokemon_comprehensive_pokemon_id ON public.pokemon_comprehensive(pokemon_id);
  END IF;
END $$;

-- Species indexes
CREATE INDEX IF NOT EXISTS idx_pokemon_species_generation ON public.pokemon_species(generation_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_species_name ON public.pokemon_species(name);
CREATE INDEX IF NOT EXISTS idx_pokemon_species_evolution_chain ON public.pokemon_species(evolution_chain_id);

-- Relationship indexes
CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_pokemon ON public.pokemon_abilities(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_ability ON public.pokemon_abilities(ability_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_moves_pokemon ON public.pokemon_moves(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_moves_move ON public.pokemon_moves(move_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_types_pokemon ON public.pokemon_types(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_types_type ON public.pokemon_types(type_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_items_pokemon ON public.pokemon_items(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_items_item ON public.pokemon_items(item_id);
-- Pokemon stats indexes (conditional - check if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_stats' AND column_name = 'pokemon_id'
    )
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_pokemon ON public.pokemon_stats(pokemon_id);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_stats' AND column_name = 'stat_id'
    )
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_pokemon_stats_stat ON public.pokemon_stats(stat_id);
  END IF;
END $$;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_pokemon_name_fts ON public.pokemon USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_pokemon_species_name_fts ON public.pokemon_species USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_abilities_name_fts ON public.abilities USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_moves_name_fts ON public.moves USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_types_name_fts ON public.types USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_items_name_fts ON public.items USING gin(to_tsvector('english', name));

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_abilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_items ENABLE ROW LEVEL SECURITY;
-- Enable RLS on pokemon_stats_comprehensive (conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats_comprehensive'
  ) THEN
    ALTER TABLE public.pokemon_stats_comprehensive ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Public read access for all Pokemon data
CREATE POLICY "Pokemon data is viewable by everyone" ON public.pokemon FOR SELECT USING (true);
CREATE POLICY "Pokemon species is viewable by everyone" ON public.pokemon_species FOR SELECT USING (true);
CREATE POLICY "Abilities are viewable by everyone" ON public.abilities FOR SELECT USING (true);
CREATE POLICY "Moves are viewable by everyone" ON public.moves FOR SELECT USING (true);
CREATE POLICY "Types are viewable by everyone" ON public.types FOR SELECT USING (true);
CREATE POLICY "Items are viewable by everyone" ON public.items FOR SELECT USING (true);
CREATE POLICY "Stats are viewable by everyone" ON public.stats FOR SELECT USING (true);
CREATE POLICY "Generations are viewable by everyone" ON public.generations FOR SELECT USING (true);
CREATE POLICY "Evolution chains are viewable by everyone" ON public.evolution_chains FOR SELECT USING (true);
CREATE POLICY "Pokemon forms are viewable by everyone" ON public.pokemon_forms FOR SELECT USING (true);
CREATE POLICY "Pokemon abilities are viewable by everyone" ON public.pokemon_abilities FOR SELECT USING (true);
CREATE POLICY "Pokemon moves are viewable by everyone" ON public.pokemon_moves FOR SELECT USING (true);
CREATE POLICY "Pokemon types are viewable by everyone" ON public.pokemon_types FOR SELECT USING (true);
CREATE POLICY "Pokemon items are viewable by everyone" ON public.pokemon_items FOR SELECT USING (true);
-- Conditional policy for pokemon_stats (table may not exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pokemon_stats' 
    AND policyname = 'Pokemon stats are viewable by everyone'
  ) THEN
    CREATE POLICY "Pokemon stats are viewable by everyone" ON public.pokemon_stats FOR SELECT USING (true);
  END IF;
END $$;

-- Service role can insert/update/delete
-- RLS Policy for pokemon_comprehensive (conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'pokemon_comprehensive' 
    AND policyname = 'Service role can manage Pokemon data'
  ) THEN
    CREATE POLICY "Service role can manage Pokemon data" ON public.pokemon_comprehensive FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
CREATE POLICY "Service role can manage Pokemon species" ON public.pokemon_species FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage abilities" ON public.abilities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage moves" ON public.moves FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage types" ON public.types FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage items" ON public.items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage stats" ON public.stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage generations" ON public.generations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage evolution chains" ON public.evolution_chains FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage Pokemon forms" ON public.pokemon_forms FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage Pokemon abilities" ON public.pokemon_abilities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage Pokemon moves" ON public.pokemon_moves FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage Pokemon types" ON public.pokemon_types FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage Pokemon items" ON public.pokemon_items FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Conditional policy for pokemon_stats (table may not exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_stats'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pokemon_stats' 
    AND policyname = 'Service role can manage Pokemon stats'
  ) THEN
    CREATE POLICY "Service role can manage Pokemon stats" ON public.pokemon_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.pokemon IS 'Individual Pokemon instances with basic data';
COMMENT ON TABLE public.pokemon_species IS 'Pokemon species information including evolution, breeding, etc.';
COMMENT ON TABLE public.abilities IS 'Pokemon abilities master data';
COMMENT ON TABLE public.moves IS 'Pokemon moves master data';
COMMENT ON TABLE public.types IS 'Pokemon types master data';
COMMENT ON TABLE public.items IS 'Pokemon items master data';
COMMENT ON TABLE public.stats IS 'Pokemon stats master data';
COMMENT ON TABLE public.generations IS 'Pokemon generations master data';
COMMENT ON TABLE public.evolution_chains IS 'Pokemon evolution chain data';
COMMENT ON TABLE public.pokemon_forms IS 'Pokemon form variations';
COMMENT ON TABLE public.pokemon_abilities IS 'Many-to-many relationship: Pokemon to Abilities';
COMMENT ON TABLE public.pokemon_moves IS 'Many-to-many relationship: Pokemon to Moves';
COMMENT ON TABLE public.pokemon_types IS 'Many-to-many relationship: Pokemon to Types';
COMMENT ON TABLE public.pokemon_items IS 'Many-to-many relationship: Pokemon to Held Items';
COMMENT ON TABLE public.pokemon_stats IS 'Many-to-many relationship: Pokemon to Stats';
