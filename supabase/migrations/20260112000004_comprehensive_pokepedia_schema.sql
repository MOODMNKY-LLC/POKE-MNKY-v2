-- Comprehensive Pokepedia Schema
-- Covers ALL PokeAPI v2 endpoints comprehensively
-- Local-first approach: Works with supabase db push

-- ============================================================================
-- EXTENDED MASTER DATA TABLES
-- ============================================================================

-- Locations (for Pokemon encounters)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  region_id INTEGER,
  names JSONB,
  game_indices JSONB,
  areas JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location Areas (Pokemon encounter locations)
CREATE TABLE IF NOT EXISTS public.location_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_area_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  game_index INTEGER,
  location_id INTEGER REFERENCES public.locations(location_id),
  encounter_method_rates JSONB,
  pokemon_encounters JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regions
CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  locations JSONB,
  main_generation_id INTEGER,
  names JSONB,
  pokedexes JSONB,
  version_groups JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Berries
CREATE TABLE IF NOT EXISTS public.berries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  berry_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  growth_time INTEGER,
  max_harvest INTEGER,
  natural_gift_power INTEGER,
  size INTEGER,
  smoothness INTEGER,
  soil_dryness INTEGER,
  firmness_id INTEGER,
  flavors JSONB,
  item_id INTEGER REFERENCES public.items(item_id),
  natural_gift_type_id INTEGER REFERENCES public.types(type_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Berry Firmnesses
CREATE TABLE IF NOT EXISTS public.berry_firmnesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firmness_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  berries JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Berry Flavors
CREATE TABLE IF NOT EXISTS public.berry_flavors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flavor_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  berries JSONB,
  contest_type_id INTEGER,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contest Types
CREATE TABLE IF NOT EXISTS public.contest_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_type_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  berry_flavor_id INTEGER REFERENCES public.berry_flavors(flavor_id),
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contest Effects
CREATE TABLE IF NOT EXISTS public.contest_effects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contest_effect_id INTEGER UNIQUE NOT NULL,
  appeal INTEGER,
  jam INTEGER,
  effect_entries JSONB,
  flavor_text_entries JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Super Contest Effects
CREATE TABLE IF NOT EXISTS public.super_contest_effects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_contest_effect_id INTEGER UNIQUE NOT NULL,
  appeal INTEGER,
  flavor_text_entries JSONB,
  moves JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encounter Methods
CREATE TABLE IF NOT EXISTS public.encounter_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_method_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  "order" INTEGER,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encounter Conditions
CREATE TABLE IF NOT EXISTS public.encounter_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_condition_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  values JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encounter Condition Values
CREATE TABLE IF NOT EXISTS public.encounter_condition_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_condition_value_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  condition_id INTEGER REFERENCES public.encounter_conditions(encounter_condition_id),
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines (TMs/HMs)
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id INTEGER UNIQUE NOT NULL,
  item_id INTEGER REFERENCES public.items(item_id),
  move_id INTEGER REFERENCES public.moves(move_id),
  version_group_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move Ailments
CREATE TABLE IF NOT EXISTS public.move_ailments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_ailment_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  moves JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move Battle Styles
CREATE TABLE IF NOT EXISTS public.move_battle_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_battle_style_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move Categories
CREATE TABLE IF NOT EXISTS public.move_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_category_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  moves JSONB,
  descriptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move Damage Classes
CREATE TABLE IF NOT EXISTS public.move_damage_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_damage_class_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  descriptions JSONB,
  moves JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move Learn Methods
CREATE TABLE IF NOT EXISTS public.move_learn_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_learn_method_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  descriptions JSONB,
  names JSONB,
  version_groups JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Move Targets
CREATE TABLE IF NOT EXISTS public.move_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  move_target_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  descriptions JSONB,
  moves JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Natures
CREATE TABLE IF NOT EXISTS public.natures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nature_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  decreased_stat_id INTEGER REFERENCES public.stats(stat_id),
  increased_stat_id INTEGER REFERENCES public.stats(stat_id),
  hates_flavor_id INTEGER REFERENCES public.berry_flavors(flavor_id),
  likes_flavor_id INTEGER REFERENCES public.berry_flavors(flavor_id),
  pokeathlon_stat_changes JSONB,
  move_battle_style_preferences JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokeathlon Stats
CREATE TABLE IF NOT EXISTS public.pokeathlon_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokeathlon_stat_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  affecting_natures JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Egg Groups
CREATE TABLE IF NOT EXISTS public.egg_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  egg_group_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  names JSONB,
  pokemon_species JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Genders
CREATE TABLE IF NOT EXISTS public.genders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gender_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  pokemon_species_details JSONB,
  required_for_evolution JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Growth Rates
CREATE TABLE IF NOT EXISTS public.growth_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  growth_rate_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  formula TEXT,
  descriptions JSONB,
  levels JSONB,
  pokemon_species JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon Colors
CREATE TABLE IF NOT EXISTS public.pokemon_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  color_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  names JSONB,
  pokemon_species JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon Habitats
CREATE TABLE IF NOT EXISTS public.pokemon_habitats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habitat_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  names JSONB,
  pokemon_species JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokemon Shapes
CREATE TABLE IF NOT EXISTS public.pokemon_shapes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shape_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  awesome_names JSONB,
  names JSONB,
  pokemon_species JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pal Park Areas
CREATE TABLE IF NOT EXISTS public.pal_park_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pal_park_area_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  names JSONB,
  pokemon_encounters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pokedexes
CREATE TABLE IF NOT EXISTS public.pokedexes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokedex_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  is_main_series BOOLEAN DEFAULT false,
  descriptions JSONB,
  names JSONB,
  pokemon_entries JSONB,
  region_id INTEGER REFERENCES public.regions(region_id),
  version_groups JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Versions
CREATE TABLE IF NOT EXISTS public.versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  names JSONB,
  version_group_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version Groups
CREATE TABLE IF NOT EXISTS public.version_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_group_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  "order" INTEGER,
  generation_id INTEGER REFERENCES public.generations(generation_id),
  move_learn_methods JSONB,
  pokedexes JSONB,
  regions JSONB,
  versions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Attributes
CREATE TABLE IF NOT EXISTS public.item_attributes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_attribute_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  items JSONB,
  names JSONB,
  descriptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Categories
CREATE TABLE IF NOT EXISTS public.item_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_category_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  items JSONB,
  names JSONB,
  pocket_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Fling Effects
CREATE TABLE IF NOT EXISTS public.item_fling_effects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_fling_effect_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  effect_entries JSONB,
  items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Pockets
CREATE TABLE IF NOT EXISTS public.item_pockets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_pocket_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  categories JSONB,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Languages
CREATE TABLE IF NOT EXISTS public.languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language_id INTEGER UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  official BOOLEAN DEFAULT false,
  iso639 TEXT,
  iso3166 TEXT,
  names JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characteristics
CREATE TABLE IF NOT EXISTS public.characteristics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  characteristic_id INTEGER UNIQUE NOT NULL,
  gene_modulo INTEGER,
  possible_values JSONB,
  highest_stat_id INTEGER REFERENCES public.stats(stat_id),
  descriptions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENHANCED POKEMON TABLES
-- ============================================================================

-- Create pokemon_comprehensive if it doesn't exist (rename from pokemon if needed)
DO $$
BEGIN
  -- If pokemon_comprehensive doesn't exist but pokemon does, rename it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon'
  ) THEN
    ALTER TABLE public.pokemon RENAME TO pokemon_comprehensive;
  END IF;
  
  -- Create pokemon_comprehensive if it still doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
  ) THEN
    CREATE TABLE public.pokemon_comprehensive (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      pokemon_id INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      base_experience INTEGER,
      height INTEGER,
      weight INTEGER,
      "order" INTEGER,
      is_default BOOLEAN DEFAULT true,
      location_area_encounters TEXT,
      sprites JSONB,
      species_id INTEGER,
      form_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Update pokemon_comprehensive to include more fields
ALTER TABLE public.pokemon_comprehensive
  ADD COLUMN IF NOT EXISTS cries JSONB,
  ADD COLUMN IF NOT EXISTS past_types JSONB,
  ADD COLUMN IF NOT EXISTS past_abilities JSONB,
  ADD COLUMN IF NOT EXISTS game_indices JSONB,
  ADD COLUMN IF NOT EXISTS forms JSONB;

-- Update pokemon_species to include more fields
ALTER TABLE public.pokemon_species
  ADD COLUMN IF NOT EXISTS evolves_from_species_id INTEGER REFERENCES public.pokemon_species(species_id),
  ADD COLUMN IF NOT EXISTS color_id INTEGER REFERENCES public.pokemon_colors(color_id),
  ADD COLUMN IF NOT EXISTS shape_id INTEGER REFERENCES public.pokemon_shapes(shape_id),
  ADD COLUMN IF NOT EXISTS habitat_id INTEGER REFERENCES public.pokemon_habitats(habitat_id);

-- Pokemon Location Areas (many-to-many)
CREATE TABLE IF NOT EXISTS public.pokemon_location_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_id INTEGER NOT NULL,
  location_area_id INTEGER NOT NULL REFERENCES public.location_areas(location_area_id),
  version_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_id, location_area_id)
);

-- Pokemon Egg Groups (many-to-many)
CREATE TABLE IF NOT EXISTS public.pokemon_egg_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pokemon_species_id INTEGER NOT NULL,
  egg_group_id INTEGER NOT NULL REFERENCES public.egg_groups(egg_group_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_species_id, egg_group_id)
);

-- Add foreign key constraints conditionally
DO $$
BEGIN
  -- Add foreign key for pokemon_location_areas
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_comprehensive' AND column_name = 'pokemon_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_pokemon_location_areas_pokemon'
    )
  ) THEN
    ALTER TABLE public.pokemon_location_areas 
    ADD CONSTRAINT fk_pokemon_location_areas_pokemon 
    FOREIGN KEY (pokemon_id) REFERENCES public.pokemon_comprehensive(pokemon_id);
  END IF;
  
  -- Add foreign key for pokemon_egg_groups
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'pokemon_species'
    AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'pokemon_species' AND column_name = 'species_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_pokemon_egg_groups_species'
    )
  ) THEN
    ALTER TABLE public.pokemon_egg_groups 
    ADD CONSTRAINT fk_pokemon_egg_groups_species 
    FOREIGN KEY (pokemon_species_id) REFERENCES public.pokemon_species(species_id);
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_locations_region ON public.locations(region_id);
CREATE INDEX IF NOT EXISTS idx_location_areas_location ON public.location_areas(location_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_location_areas_pokemon ON public.pokemon_location_areas(pokemon_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_location_areas_location ON public.pokemon_location_areas(location_area_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_egg_groups_species ON public.pokemon_egg_groups(pokemon_species_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_egg_groups_egg_group ON public.pokemon_egg_groups(egg_group_id);
CREATE INDEX IF NOT EXISTS idx_machines_item ON public.machines(item_id);
CREATE INDEX IF NOT EXISTS idx_machines_move ON public.machines(move_id);
CREATE INDEX IF NOT EXISTS idx_natures_decreased_stat ON public.natures(decreased_stat_id);
CREATE INDEX IF NOT EXISTS idx_natures_increased_stat ON public.natures(increased_stat_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_locations_name_fts ON public.locations USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_location_areas_name_fts ON public.location_areas USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_regions_name_fts ON public.regions USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_berries_name_fts ON public.berries USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_natures_name_fts ON public.natures USING gin(to_tsvector('english', name));

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.berries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.berry_firmnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.berry_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_contest_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_condition_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_ailments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_battle_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_damage_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_learn_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokeathlon_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_habitats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_shapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pal_park_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokedexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_fling_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_location_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_egg_groups ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'locations', 'location_areas', 'regions', 'berries', 'berry_firmnesses', 'berry_flavors',
    'contest_types', 'contest_effects', 'super_contest_effects', 'encounter_methods',
    'encounter_conditions', 'encounter_condition_values', 'machines', 'move_ailments',
    'move_battle_styles', 'move_categories', 'move_damage_classes', 'move_learn_methods',
    'move_targets', 'natures', 'pokeathlon_stats', 'egg_groups', 'genders', 'growth_rates',
    'pokemon_colors', 'pokemon_habitats', 'pokemon_shapes', 'pal_park_areas', 'pokedexes',
    'versions', 'version_groups', 'item_attributes', 'item_categories', 'item_fling_effects',
    'item_pockets', 'languages', 'characteristics', 'pokemon_location_areas', 'pokemon_egg_groups'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = table_name 
      AND policyname = format('%s is viewable by everyone', table_name)
    ) THEN
      EXECUTE format('CREATE POLICY "%s is viewable by everyone" ON public.%I FOR SELECT USING (true)', 
        table_name, table_name);
    END IF;
  END LOOP;
END $$;

-- Service role can manage all tables
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'locations', 'location_areas', 'regions', 'berries', 'berry_firmnesses', 'berry_flavors',
    'contest_types', 'contest_effects', 'super_contest_effects', 'encounter_methods',
    'encounter_conditions', 'encounter_condition_values', 'machines', 'move_ailments',
    'move_battle_styles', 'move_categories', 'move_damage_classes', 'move_learn_methods',
    'move_targets', 'natures', 'pokeathlon_stats', 'egg_groups', 'genders', 'growth_rates',
    'pokemon_colors', 'pokemon_habitats', 'pokemon_shapes', 'pal_park_areas', 'pokedexes',
    'versions', 'version_groups', 'item_attributes', 'item_categories', 'item_fling_effects',
    'item_pockets', 'languages', 'characteristics', 'pokemon_location_areas', 'pokemon_egg_groups'
  ];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = table_name 
      AND policyname = format('Service role can manage %s', table_name)
    ) THEN
      EXECUTE format('CREATE POLICY "Service role can manage %s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', 
        table_name, table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.locations IS 'Locations where Pokemon can be found';
COMMENT ON TABLE public.location_areas IS 'Specific areas within locations with Pokemon encounters';
COMMENT ON TABLE public.regions IS 'Pokemon regions (Kanto, Johto, etc.)';
COMMENT ON TABLE public.berries IS 'Berries that Pokemon can consume';
COMMENT ON TABLE public.natures IS 'Pokemon natures affecting stat growth';
COMMENT ON TABLE public.egg_groups IS 'Egg groups for Pokemon breeding';
COMMENT ON TABLE public.machines IS 'TMs and HMs that teach moves';
COMMENT ON TABLE public.pokedexes IS 'Pokedex entries by region';
