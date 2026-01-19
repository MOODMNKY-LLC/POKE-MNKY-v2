-- ============================================================================
-- Unified Pokemon Views
-- 
-- Combines PokéAPI and Showdown data into efficient, queryable views
-- Provides single-source queries for complete Pokemon data
-- ============================================================================

-- ============================================================================
-- 1. Pokemon Unified View
-- Combines pokepedia_pokemon (PokéAPI) + pokemon_showdown (Showdown)
-- ============================================================================

CREATE OR REPLACE VIEW public.pokemon_unified AS
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
WHERE ps.dex_num NOT IN (
  SELECT id FROM public.pokepedia_pokemon WHERE id = ps.dex_num
);

COMMENT ON VIEW public.pokemon_unified IS 'Unified view combining PokéAPI and Showdown Pokemon data with intelligent matching and fallbacks';

-- ============================================================================
-- 2. Pokemon With All Data View
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
-- 3. Enhanced Draft Pool View
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

-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Get Pokemon by ID with all data
CREATE OR REPLACE FUNCTION public.get_pokemon_by_id(pokemon_id_param INTEGER)
RETURNS TABLE (
  pokemon_id INTEGER,
  name TEXT,
  sprite_front_default_path TEXT,
  sprite_official_artwork_path TEXT,
  types JSONB,
  abilities JSONB,
  hp INTEGER,
  atk INTEGER,
  def INTEGER,
  spa INTEGER,
  spd INTEGER,
  spe INTEGER,
  showdown_tier TEXT,
  generation INTEGER,
  base_experience INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.pokemon_id,
    pu.name,
    pu.sprite_front_default_path,
    pu.sprite_official_artwork_path,
    pu.types,
    pu.abilities,
    pu.hp,
    pu.atk,
    pu.def,
    pu.spa,
    pu.spd,
    pu.spe,
    pu.showdown_tier,
    pu.generation,
    pu.base_experience
  FROM public.pokemon_unified pu
  WHERE pu.pokemon_id = pokemon_id_param
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_pokemon_by_id IS 'Get complete Pokemon data by ID';

-- Get Pokemon by name (fuzzy matching)
CREATE OR REPLACE FUNCTION public.get_pokemon_by_name(pokemon_name_param TEXT)
RETURNS TABLE (
  pokemon_id INTEGER,
  name TEXT,
  sprite_front_default_path TEXT,
  sprite_official_artwork_path TEXT,
  types JSONB,
  abilities JSONB,
  hp INTEGER,
  atk INTEGER,
  def INTEGER,
  spa INTEGER,
  spd INTEGER,
  spe INTEGER,
  showdown_tier TEXT,
  generation INTEGER,
  base_experience INTEGER
) AS $$
DECLARE
  normalized_name TEXT;
BEGIN
  normalized_name := lower(trim(pokemon_name_param));
  
  RETURN QUERY
  SELECT 
    pu.pokemon_id,
    pu.name,
    pu.sprite_front_default_path,
    pu.sprite_official_artwork_path,
    pu.types,
    pu.abilities,
    pu.hp,
    pu.atk,
    pu.def,
    pu.spa,
    pu.spd,
    pu.spe,
    pu.showdown_tier,
    pu.generation,
    pu.base_experience
  FROM public.pokemon_unified pu
  WHERE 
    lower(pu.name) = normalized_name
    OR lower(replace(pu.name, ' ', '-')) = normalized_name
    OR lower(pu.showdown_id) = normalized_name
  ORDER BY 
    CASE 
      WHEN lower(pu.name) = normalized_name THEN 1
      WHEN lower(replace(pu.name, ' ', '-')) = normalized_name THEN 2
      ELSE 3
    END
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_pokemon_by_name IS 'Get complete Pokemon data by name with fuzzy matching';

-- Search Pokemon with filters
CREATE OR REPLACE FUNCTION public.search_pokemon(
  search_query TEXT DEFAULT NULL,
  type_filter TEXT DEFAULT NULL,
  ability_filter TEXT DEFAULT NULL,
  tier_filter TEXT DEFAULT NULL,
  generation_filter INTEGER DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  pokemon_id INTEGER,
  name TEXT,
  sprite_official_artwork_path TEXT,
  types JSONB,
  abilities JSONB,
  hp INTEGER,
  atk INTEGER,
  def INTEGER,
  spa INTEGER,
  spd INTEGER,
  spe INTEGER,
  showdown_tier TEXT,
  generation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pu.pokemon_id,
    pu.name,
    pu.sprite_official_artwork_path,
    pu.types,
    pu.abilities,
    pu.hp,
    pu.atk,
    pu.def,
    pu.spa,
    pu.spd,
    pu.spe,
    pu.showdown_tier,
    pu.generation
  FROM public.pokemon_unified pu
  WHERE 
    (search_query IS NULL OR 
     lower(pu.name) LIKE '%' || lower(search_query) || '%' OR
     lower(pu.showdown_id) LIKE '%' || lower(search_query) || '%')
    AND (type_filter IS NULL OR 
         pu.type_primary = type_filter OR 
         pu.type_secondary = type_filter OR
         pu.types::TEXT LIKE '%' || type_filter || '%')
    AND (ability_filter IS NULL OR
         pu.ability_primary = ability_filter OR
         pu.ability_hidden = ability_filter OR
         pu.abilities::TEXT LIKE '%' || ability_filter || '%')
    AND (tier_filter IS NULL OR pu.showdown_tier = tier_filter)
    AND (generation_filter IS NULL OR pu.generation = generation_filter)
  ORDER BY pu.pokemon_id
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.search_pokemon IS 'Search Pokemon with multiple filters (name, type, ability, tier, generation)';

-- Get Pokemon for draft with all data
CREATE OR REPLACE FUNCTION public.get_pokemon_for_draft(season_id_param UUID)
RETURNS TABLE (
  id UUID,
  pokemon_name TEXT,
  point_value INTEGER,
  status TEXT,
  pokemon_id INTEGER,
  sprite_official_artwork_path TEXT,
  types JSONB,
  abilities JSONB,
  hp INTEGER,
  atk INTEGER,
  def INTEGER,
  spa INTEGER,
  spd INTEGER,
  spe INTEGER,
  showdown_tier TEXT,
  generation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dpc.id,
    dpc.pokemon_name,
    dpc.point_value,
    dpc.status::TEXT,
    dpc.pokemon_id,
    dpc.sprite_official_artwork_path,
    dpc.types,
    dpc.abilities,
    dpc.hp,
    dpc.atk,
    dpc.def,
    dpc.spa,
    dpc.spd,
    dpc.spe,
    dpc.showdown_tier,
    dpc.generation
  FROM public.draft_pool_comprehensive dpc
  WHERE dpc.season_id = season_id_param
  ORDER BY dpc.pokemon_name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_pokemon_for_draft IS 'Get all Pokemon for a draft season with complete data';

-- Grant permissions
GRANT SELECT ON public.pokemon_unified TO authenticated;
GRANT SELECT ON public.pokemon_with_all_data TO authenticated;
GRANT SELECT ON public.draft_pool_comprehensive TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_pokemon_by_id(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokemon_by_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_pokemon(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokemon_for_draft(UUID) TO authenticated;
