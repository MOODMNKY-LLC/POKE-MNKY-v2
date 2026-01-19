-- ============================================================================
-- Fix pokemon_unified View
-- 
-- Replaces FULL OUTER JOIN with UNION to avoid join condition errors
-- ============================================================================

DROP VIEW IF EXISTS public.pokemon_unified CASCADE;

CREATE VIEW public.pokemon_unified AS
SELECT 
  -- Primary identifiers
  COALESCE(pp.id, ps.dex_num) AS pokemon_id,
  COALESCE(pp.name, ps.name) AS name,
  ps.showdown_id,
  ps.dex_num,
  
  -- PokéAPI data (sprites, species, etc.)
  pp.species_name,
  pp.height,
  pp.weight,
  pp.base_experience,
  pp.is_default,
  pp.sprite_front_default_path,
  pp.sprite_official_artwork_path,
  pp.types AS pokeapi_types,
  pp.type_primary,
  pp.type_secondary,
  pp.base_stats AS pokeapi_base_stats,
  pp.total_base_stat,
  pp.abilities AS pokeapi_abilities,
  pp.ability_primary,
  pp.ability_hidden,
  pp."order",
  pp.generation,
  pp.cry_latest_path,
  pp.cry_legacy_path,
  pp.moves_count,
  pp.forms_count,
  
  -- Showdown data (battle metadata)
  ps.tier AS showdown_tier,
  ps.base_species,
  ps.forme,
  ps.is_nonstandard,
  ps.hp AS showdown_hp,
  ps.atk AS showdown_atk,
  ps.def AS showdown_def,
  ps.spa AS showdown_spa,
  ps.spd AS showdown_spd,
  ps.spe AS showdown_spe,
  ps.evolution_data,
  
  -- Unified stats (prefer Showdown, fallback to PokéAPI)
  COALESCE(ps.hp, (pp.base_stats->>'hp')::INTEGER) AS hp,
  COALESCE(ps.atk, (pp.base_stats->>'attack')::INTEGER) AS atk,
  COALESCE(ps.def, (pp.base_stats->>'defense')::INTEGER) AS def,
  COALESCE(ps.spa, (pp.base_stats->>'special-attack')::INTEGER) AS spa,
  COALESCE(ps.spd, (pp.base_stats->>'special-defense')::INTEGER) AS spd,
  COALESCE(ps.spe, (pp.base_stats->>'speed')::INTEGER) AS spe,
  
  -- Unified types (prefer PokéAPI, fallback to Showdown)
  COALESCE(
    pp.types,
    (
      SELECT json_agg(type ORDER BY slot)::jsonb
      FROM pokemon_showdown_types pst
      WHERE pst.showdown_id = ps.showdown_id
    )
  ) AS types,
  
  -- Unified abilities (prefer PokéAPI, fallback to Showdown)
  COALESCE(
    pp.abilities,
    (
      SELECT json_agg(ability ORDER BY 
        CASE slot
          WHEN '0' THEN 1
          WHEN '1' THEN 2
          WHEN 'H' THEN 3
          ELSE 4
        END
      )::jsonb
      FROM pokemon_showdown_abilities psa
      WHERE psa.showdown_id = ps.showdown_id
    )
  ) AS abilities,
  
  -- Metadata
  pp.updated_at AS pokeapi_updated_at,
  ps.updated_at AS showdown_updated_at,
  GREATEST(COALESCE(pp.updated_at, '1970-01-01'::timestamptz), COALESCE(ps.updated_at, '1970-01-01'::timestamptz)) AS last_updated
  
FROM public.pokepedia_pokemon pp
LEFT JOIN public.pokemon_showdown ps ON pp.id = ps.dex_num

UNION

SELECT 
  -- Primary identifiers
  COALESCE(pp.id, ps.dex_num) AS pokemon_id,
  COALESCE(pp.name, ps.name) AS name,
  ps.showdown_id,
  ps.dex_num,
  
  -- PokéAPI data
  pp.species_name,
  pp.height,
  pp.weight,
  pp.base_experience,
  pp.is_default,
  pp.sprite_front_default_path,
  pp.sprite_official_artwork_path,
  pp.types AS pokeapi_types,
  pp.type_primary,
  pp.type_secondary,
  pp.base_stats AS pokeapi_base_stats,
  pp.total_base_stat,
  pp.abilities AS pokeapi_abilities,
  pp.ability_primary,
  pp.ability_hidden,
  pp."order",
  pp.generation,
  pp.cry_latest_path,
  pp.cry_legacy_path,
  pp.moves_count,
  pp.forms_count,
  
  -- Showdown data
  ps.tier AS showdown_tier,
  ps.base_species,
  ps.forme,
  ps.is_nonstandard,
  ps.hp AS showdown_hp,
  ps.atk AS showdown_atk,
  ps.def AS showdown_def,
  ps.spa AS showdown_spa,
  ps.spd AS showdown_spd,
  ps.spe AS showdown_spe,
  ps.evolution_data,
  
  -- Unified stats
  COALESCE(ps.hp, (pp.base_stats->>'hp')::INTEGER) AS hp,
  COALESCE(ps.atk, (pp.base_stats->>'attack')::INTEGER) AS atk,
  COALESCE(ps.def, (pp.base_stats->>'defense')::INTEGER) AS def,
  COALESCE(ps.spa, (pp.base_stats->>'special-attack')::INTEGER) AS spa,
  COALESCE(ps.spd, (pp.base_stats->>'special-defense')::INTEGER) AS spd,
  COALESCE(ps.spe, (pp.base_stats->>'speed')::INTEGER) AS spe,
  
  -- Unified types
  COALESCE(
    pp.types,
    (
      SELECT json_agg(type ORDER BY slot)::jsonb
      FROM pokemon_showdown_types pst
      WHERE pst.showdown_id = ps.showdown_id
    )
  ) AS types,
  
  -- Unified abilities
  COALESCE(
    pp.abilities,
    (
      SELECT json_agg(ability ORDER BY 
        CASE slot
          WHEN '0' THEN 1
          WHEN '1' THEN 2
          WHEN 'H' THEN 3
          ELSE 4
        END
      )::jsonb
      FROM pokemon_showdown_abilities psa
      WHERE psa.showdown_id = ps.showdown_id
    )
  ) AS abilities,
  
  -- Metadata
  pp.updated_at AS pokeapi_updated_at,
  ps.updated_at AS showdown_updated_at,
  GREATEST(COALESCE(pp.updated_at, '1970-01-01'::timestamptz), COALESCE(ps.updated_at, '1970-01-01'::timestamptz)) AS last_updated
  
FROM public.pokemon_showdown ps
LEFT JOIN public.pokepedia_pokemon pp ON ps.dex_num = pp.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.pokepedia_pokemon pp2 WHERE pp2.id = ps.dex_num
);

COMMENT ON VIEW public.pokemon_unified IS 'Unified view combining PokéAPI and Showdown Pokemon data using UNION to avoid FULL JOIN limitations';

-- Re-grant permissions
GRANT SELECT ON public.pokemon_unified TO authenticated;
