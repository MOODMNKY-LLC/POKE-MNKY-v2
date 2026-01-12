-- Add extended fields to pokemon_cache for rich visual data
-- Run this after 002_enhanced_schema.sql

ALTER TABLE public.pokemon_cache 
  ADD COLUMN IF NOT EXISTS sprites JSONB,
  ADD COLUMN IF NOT EXISTS ability_details JSONB[],
  ADD COLUMN IF NOT EXISTS move_details JSONB[],
  ADD COLUMN IF NOT EXISTS evolution_chain JSONB,
  ADD COLUMN IF NOT EXISTS regional_forms TEXT[],
  ADD COLUMN IF NOT EXISTS hidden_ability TEXT,
  ADD COLUMN IF NOT EXISTS gender_rate INTEGER DEFAULT -1,
  ADD COLUMN IF NOT EXISTS generation INTEGER;

-- Create index for faster generation filtering
CREATE INDEX IF NOT EXISTS idx_pokemon_cache_generation ON public.pokemon_cache(generation);

-- Create index for faster regional form searches
CREATE INDEX IF NOT EXISTS idx_pokemon_cache_regional_forms ON public.pokemon_cache USING GIN(regional_forms);

-- Add comments for documentation
COMMENT ON COLUMN public.pokemon_cache.sprites IS 'All sprite URLs: front, back, shiny, official artwork, etc.';
COMMENT ON COLUMN public.pokemon_cache.ability_details IS 'Ability descriptions and effects';
COMMENT ON COLUMN public.pokemon_cache.move_details IS 'Top 20 competitive moves with power/accuracy/category';
COMMENT ON COLUMN public.pokemon_cache.evolution_chain IS 'Evolution stages and conditions';
COMMENT ON COLUMN public.pokemon_cache.regional_forms IS 'Array of regional variant names (alolan, galarian, etc.)';
COMMENT ON COLUMN public.pokemon_cache.hidden_ability IS 'Hidden ability name if exists';
COMMENT ON COLUMN public.pokemon_cache.gender_rate IS '-1 for genderless, 0-8 for male-female ratio';
COMMENT ON COLUMN public.pokemon_cache.generation IS 'Pokemon generation (1-9)';
