-- ============================================================================
-- Recreate Dependent Views
-- 
-- Recreates views that depend on pokemon_unified after it was fixed
-- ============================================================================

-- ============================================================================
-- 1. Pokemon With All Data View
-- Complete Pokemon data with all relationships (types, abilities, moves)
-- ============================================================================

CREATE OR REPLACE VIEW public.pokemon_with_all_data AS
SELECT 
  pu.*,
  
  -- Types from junction table (normalized)
  (
    SELECT json_agg(jsonb_build_object(
      'type_id', pt.type_id,
      'name', t.name,
      'slot', pt.slot
    ) ORDER BY pt.slot)
    FROM pokemon_types pt
    JOIN types t ON pt.type_id = t.type_id
    WHERE pt.pokemon_id = pu.pokemon_id
  ) AS normalized_types,
  
  -- Abilities from junction table (normalized)
  (
    SELECT json_agg(jsonb_build_object(
      'ability_id', pa.ability_id,
      'name', a.name,
      'is_hidden', pa.is_hidden,
      'slot', pa.slot
    ) ORDER BY pa.slot)
    FROM pokemon_abilities pa
    JOIN abilities a ON pa.ability_id = a.ability_id
    WHERE pa.pokemon_id = pu.pokemon_id
  ) AS normalized_abilities,
  
  -- Moves count from junction table
  (
    SELECT COUNT(DISTINCT move_id)
    FROM pokemon_moves pm
    WHERE pm.pokemon_id = pu.pokemon_id
  ) AS normalized_moves_count,
  
  -- Species data (if available)
  ps_species.species_id,
  ps_species.name AS species_name_full,
  ps_species.generation_id AS species_generation_id,
  ps_species.is_legendary,
  ps_species.is_mythical,
  ps_species.is_baby
  
FROM public.pokemon_unified pu
LEFT JOIN public.pokemon_species ps_species ON pu.species_name = ps_species.name;

COMMENT ON VIEW public.pokemon_with_all_data IS 'Complete Pokemon data with all relationships from normalized tables';

-- ============================================================================
-- 2. Enhanced Draft Pool View
-- Extends draft_pool_with_showdown to include PokéAPI data
-- ============================================================================

CREATE OR REPLACE VIEW public.draft_pool_comprehensive AS
SELECT 
  dp.*,
  
  -- PokéAPI data
  pu.sprite_front_default_path,
  pu.sprite_official_artwork_path,
  pu.pokeapi_types,
  pu.pokeapi_abilities,
  pu.generation,
  pu.base_experience,
  pu.height,
  pu.weight,
  
  -- Unified data
  pu.types,
  pu.abilities,
  pu.hp,
  pu.atk,
  pu.def,
  pu.spa,
  pu.spd,
  pu.spe,
  
  -- Showdown data (already in draft_pool_with_showdown, but included for completeness)
  pu.showdown_tier,
  pu.base_species,
  pu.forme
  
FROM public.draft_pool dp
LEFT JOIN public.pokemon_unified pu ON 
  lower(dp.pokemon_name) = lower(pu.name)
  OR lower(replace(dp.pokemon_name, ' ', '-')) = lower(pu.showdown_id);

COMMENT ON VIEW public.draft_pool_comprehensive IS 'Enhanced draft pool view with complete PokéAPI and Showdown data';

-- Grant permissions
GRANT SELECT ON public.pokemon_with_all_data TO authenticated;
GRANT SELECT ON public.draft_pool_comprehensive TO authenticated;
