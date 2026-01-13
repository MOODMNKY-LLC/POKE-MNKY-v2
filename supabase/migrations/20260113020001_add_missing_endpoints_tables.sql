-- Migration: Add tables for missing PokéAPI endpoints
-- Adds support for: items, berries, natures, evolution-triggers

-- Items table
CREATE TABLE IF NOT EXISTS public.items (
  item_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  cost INTEGER,
  fling_power INTEGER,
  fling_effect_id INTEGER,
  category_id INTEGER,
  effect_entries JSONB,
  flavor_text_entries JSONB,
  game_indices JSONB,
  names JSONB,
  sprites JSONB,
  held_by_pokemon JSONB,
  attributes JSONB,
  baby_trigger_for JSONB,
  machines JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category_id);

-- Berries table
CREATE TABLE IF NOT EXISTS public.berries (
  berry_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  firmness_id INTEGER,
  natural_gift_power INTEGER,
  natural_gift_type_id INTEGER,
  size INTEGER,
  smoothness INTEGER,
  soil_dryness INTEGER,
  flavors JSONB,
  item_id INTEGER REFERENCES items(item_id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_berries_name ON public.berries(name);
CREATE INDEX IF NOT EXISTS idx_berries_firmness ON public.berries(firmness_id);

-- Natures table
CREATE TABLE IF NOT EXISTS public.natures (
  nature_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  decreased_stat_id INTEGER,
  increased_stat_id INTEGER,
  hates_flavor_id INTEGER,
  likes_flavor_id INTEGER,
  pokeathlon_stat_changes JSONB,
  names JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_natures_name ON public.natures(name);

-- Evolution triggers table
CREATE TABLE IF NOT EXISTS public.evolution_triggers (
  trigger_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  names JSONB,
  pokemon_species JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_triggers_name ON public.evolution_triggers(name);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.berries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_triggers ENABLE ROW LEVEL SECURITY;

-- Policies: Public read, service role write
DROP POLICY IF EXISTS "Public read items" ON public.items;
CREATE POLICY "Public read items" ON public.items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read berries" ON public.berries;
CREATE POLICY "Public read berries" ON public.berries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read natures" ON public.natures;
CREATE POLICY "Public read natures" ON public.natures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read evolution_triggers" ON public.evolution_triggers;
CREATE POLICY "Public read evolution_triggers" ON public.evolution_triggers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage items" ON public.items;
CREATE POLICY "Service role can manage items" ON public.items FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage berries" ON public.berries;
CREATE POLICY "Service role can manage berries" ON public.berries FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage natures" ON public.natures;
CREATE POLICY "Service role can manage natures" ON public.natures FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage evolution_triggers" ON public.evolution_triggers;
CREATE POLICY "Service role can manage evolution_triggers" ON public.evolution_triggers FOR ALL USING (auth.role() = 'service_role');
