-- ============================================================================
-- Populate Master Tables from Synced PokéAPI Data
-- 
-- Extracts data from pokeapi_resources JSONB and populates normalized tables
-- Uses validated, already-synced data - no external API calls needed
-- ============================================================================

-- Helper function to extract ID from PokéAPI URL
CREATE OR REPLACE FUNCTION public.extract_id_from_pokeapi_url(url TEXT)
RETURNS INTEGER AS $$
BEGIN
  -- PokéAPI URLs format: https://pokeapi.co/api/v2/{resource}/{id}/
  -- Extract the ID from the URL
  RETURN (
    SELECT (regexp_match(url, '/api/v2/[^/]+/(\d+)/'))[1]::INTEGER
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 1. Populate Types Master Table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_types_from_pokeapi()
RETURNS TABLE(
  inserted INTEGER,
  updated INTEGER,
  errors INTEGER
) AS $$
DECLARE
  type_record RECORD;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Process all type resources
  FOR type_record IN
    SELECT 
      resource_key,
      name,
      data
    FROM public.pokeapi_resources
    WHERE resource_type = 'type'
    ORDER BY resource_key::INTEGER
  LOOP
    BEGIN
      INSERT INTO public.types (
        type_id,
        name,
        damage_relations,
        game_indices,
        generation_id,
        move_damage_class_id,
        updated_at
      )
      VALUES (
        type_record.resource_key::INTEGER,
        COALESCE(type_record.data->>'name', type_record.name),
        type_record.data->'damage_relations',
        type_record.data->'game_indices',
        extract_id_from_pokeapi_url((type_record.data->'generation'->>'url')),
        extract_id_from_pokeapi_url((type_record.data->'move_damage_class'->>'url')),
        NOW()
      )
      ON CONFLICT (type_id) DO UPDATE SET
        name = EXCLUDED.name,
        damage_relations = EXCLUDED.damage_relations,
        game_indices = EXCLUDED.game_indices,
        generation_id = EXCLUDED.generation_id,
        move_damage_class_id = EXCLUDED.move_damage_class_id,
        updated_at = EXCLUDED.updated_at;
      
      IF FOUND THEN
        updated_count := updated_count + 1;
      ELSE
        inserted_count := inserted_count + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Error processing type %: %', type_record.resource_key, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT inserted_count, updated_count, error_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_types_from_pokeapi IS 'Populates types master table from synced pokeapi_resources JSONB data';

-- ============================================================================
-- 2. Populate Abilities Master Table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_abilities_from_pokeapi()
RETURNS TABLE(
  inserted INTEGER,
  updated INTEGER,
  errors INTEGER
) AS $$
DECLARE
  ability_record RECORD;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR ability_record IN
    SELECT 
      resource_key,
      name,
      data
    FROM public.pokeapi_resources
    WHERE resource_type = 'ability'
    ORDER BY resource_key::INTEGER
  LOOP
    BEGIN
      INSERT INTO public.abilities (
        ability_id,
        name,
        is_main_series,
        effect_entries,
        flavor_text_entries,
        generation_id,
        pokemon,
        updated_at
      )
      VALUES (
        ability_record.resource_key::INTEGER,
        COALESCE(ability_record.data->>'name', ability_record.name),
        COALESCE((ability_record.data->>'is_main_series')::BOOLEAN, true),
        ability_record.data->'effect_entries',
        ability_record.data->'flavor_text_entries',
        extract_id_from_pokeapi_url((ability_record.data->'generation'->>'url')),
        ability_record.data->'pokemon',
        NOW()
      )
      ON CONFLICT (ability_id) DO UPDATE SET
        name = EXCLUDED.name,
        is_main_series = EXCLUDED.is_main_series,
        effect_entries = EXCLUDED.effect_entries,
        flavor_text_entries = EXCLUDED.flavor_text_entries,
        generation_id = EXCLUDED.generation_id,
        pokemon = EXCLUDED.pokemon,
        updated_at = EXCLUDED.updated_at;
      
      IF FOUND THEN
        updated_count := updated_count + 1;
      ELSE
        inserted_count := inserted_count + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Error processing ability %: %', ability_record.resource_key, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT inserted_count, updated_count, error_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_abilities_from_pokeapi IS 'Populates abilities master table from synced pokeapi_resources JSONB data';

-- ============================================================================
-- 3. Populate Moves Master Table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_moves_from_pokeapi()
RETURNS TABLE(
  inserted INTEGER,
  updated INTEGER,
  errors INTEGER
) AS $$
DECLARE
  move_record RECORD;
  inserted_count INTEGER := 0;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR move_record IN
    SELECT 
      resource_key,
      name,
      data
    FROM public.pokeapi_resources
    WHERE resource_type = 'move'
    ORDER BY resource_key::INTEGER
  LOOP
    BEGIN
      INSERT INTO public.moves (
        move_id,
        name,
        accuracy,
        effect_chance,
        pp,
        priority,
        power,
        damage_class_id,
        type_id,
        target_id,
        effect_entries,
        flavor_text_entries,
        stat_changes,
        meta,
        generation_id,
        learned_by_pokemon,
        updated_at
      )
      VALUES (
        move_record.resource_key::INTEGER,
        COALESCE(move_record.data->>'name', move_record.name),
        (move_record.data->>'accuracy')::INTEGER,
        (move_record.data->>'effect_chance')::INTEGER,
        (move_record.data->>'pp')::INTEGER,
        (move_record.data->>'priority')::INTEGER,
        (move_record.data->>'power')::INTEGER,
        extract_id_from_pokeapi_url((move_record.data->'damage_class'->>'url')),
        extract_id_from_pokeapi_url((move_record.data->'type'->>'url')),
        extract_id_from_pokeapi_url((move_record.data->'target'->>'url')),
        move_record.data->'effect_entries',
        move_record.data->'flavor_text_entries',
        move_record.data->'stat_changes',
        move_record.data->'meta',
        extract_id_from_pokeapi_url((move_record.data->'generation'->>'url')),
        move_record.data->'learned_by_pokemon',
        NOW()
      )
      ON CONFLICT (move_id) DO UPDATE SET
        name = EXCLUDED.name,
        accuracy = EXCLUDED.accuracy,
        effect_chance = EXCLUDED.effect_chance,
        pp = EXCLUDED.pp,
        priority = EXCLUDED.priority,
        power = EXCLUDED.power,
        damage_class_id = EXCLUDED.damage_class_id,
        type_id = EXCLUDED.type_id,
        target_id = EXCLUDED.target_id,
        effect_entries = EXCLUDED.effect_entries,
        flavor_text_entries = EXCLUDED.flavor_text_entries,
        stat_changes = EXCLUDED.stat_changes,
        meta = EXCLUDED.meta,
        generation_id = EXCLUDED.generation_id,
        learned_by_pokemon = EXCLUDED.learned_by_pokemon,
        updated_at = EXCLUDED.updated_at;
      
      IF FOUND THEN
        updated_count := updated_count + 1;
      ELSE
        inserted_count := inserted_count + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Error processing move %: %', move_record.resource_key, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT inserted_count, updated_count, error_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_moves_from_pokeapi IS 'Populates moves master table from synced pokeapi_resources JSONB data';

-- ============================================================================
-- 4. Populate Pokemon Types Junction Table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_pokemon_types_from_pokeapi()
RETURNS TABLE(
  inserted INTEGER,
  errors INTEGER
) AS $$
DECLARE
  pokemon_record RECORD;
  type_item JSONB;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Clear existing data (optional - comment out if you want incremental updates)
  -- DELETE FROM public.pokemon_types;
  
  FOR pokemon_record IN
    SELECT 
      resource_key,
      data
    FROM public.pokeapi_resources
    WHERE resource_type = 'pokemon'
    ORDER BY resource_key::INTEGER
  LOOP
    BEGIN
      -- Extract types from Pokemon data
      IF pokemon_record.data->'types' IS NOT NULL THEN
        FOR type_item IN SELECT * FROM jsonb_array_elements(pokemon_record.data->'types')
        LOOP
          INSERT INTO public.pokemon_types (
            pokemon_id,
            type_id,
            slot
          )
          VALUES (
            pokemon_record.resource_key::INTEGER,
            extract_id_from_pokeapi_url(type_item->'type'->>'url'),
            (type_item->>'slot')::INTEGER
          )
          ON CONFLICT (pokemon_id, type_id, slot) DO NOTHING;
          
          inserted_count := inserted_count + 1;
        END LOOP;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Error processing Pokemon % types: %', pokemon_record.resource_key, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT inserted_count, error_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_pokemon_types_from_pokeapi IS 'Populates pokemon_types junction table from synced pokeapi_resources JSONB data';

-- ============================================================================
-- 5. Populate Pokemon Abilities Junction Table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_pokemon_abilities_from_pokeapi()
RETURNS TABLE(
  inserted INTEGER,
  errors INTEGER
) AS $$
DECLARE
  pokemon_record RECORD;
  ability_item JSONB;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR pokemon_record IN
    SELECT 
      resource_key,
      data
    FROM public.pokeapi_resources
    WHERE resource_type = 'pokemon'
    ORDER BY resource_key::INTEGER
  LOOP
    BEGIN
      -- Extract abilities from Pokemon data
      IF pokemon_record.data->'abilities' IS NOT NULL THEN
        FOR ability_item IN SELECT * FROM jsonb_array_elements(pokemon_record.data->'abilities')
        LOOP
          INSERT INTO public.pokemon_abilities (
            pokemon_id,
            ability_id,
            is_hidden,
            slot
          )
          VALUES (
            pokemon_record.resource_key::INTEGER,
            extract_id_from_pokeapi_url(ability_item->'ability'->>'url'),
            COALESCE((ability_item->>'is_hidden')::BOOLEAN, false),
            (ability_item->>'slot')::INTEGER
          )
          ON CONFLICT (pokemon_id, ability_id, slot) DO NOTHING;
          
          inserted_count := inserted_count + 1;
        END LOOP;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Error processing Pokemon % abilities: %', pokemon_record.resource_key, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT inserted_count, error_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_pokemon_abilities_from_pokeapi IS 'Populates pokemon_abilities junction table from synced pokeapi_resources JSONB data';

-- ============================================================================
-- 6. Populate Pokemon Moves Junction Table
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_pokemon_moves_from_pokeapi()
RETURNS TABLE(
  inserted INTEGER,
  errors INTEGER
) AS $$
DECLARE
  pokemon_record RECORD;
  move_item JSONB;
  version_detail JSONB;
  inserted_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  FOR pokemon_record IN
    SELECT 
      resource_key,
      data
    FROM public.pokeapi_resources
    WHERE resource_type = 'pokemon'
    ORDER BY resource_key::INTEGER
  LOOP
    BEGIN
      -- Extract moves from Pokemon data
      IF pokemon_record.data->'moves' IS NOT NULL THEN
        FOR move_item IN SELECT * FROM jsonb_array_elements(pokemon_record.data->'moves')
        LOOP
          -- Each move has version_group_details array
          IF move_item->'version_group_details' IS NOT NULL THEN
            FOR version_detail IN SELECT * FROM jsonb_array_elements(move_item->'version_group_details')
            LOOP
              INSERT INTO public.pokemon_moves (
                pokemon_id,
                move_id,
                version_group_id,
                move_learn_method_id,
                level_learned_at,
                "order"
              )
              VALUES (
                pokemon_record.resource_key::INTEGER,
                extract_id_from_pokeapi_url(move_item->'move'->>'url'),
                extract_id_from_pokeapi_url(version_detail->'version_group'->>'url'),
                extract_id_from_pokeapi_url(version_detail->'move_learn_method'->>'url'),
                (version_detail->>'level_learned_at')::INTEGER,
                NULL -- order field not in PokéAPI data
              )
              ON CONFLICT (pokemon_id, move_id, version_group_id, move_learn_method_id, level_learned_at) DO NOTHING;
              
              inserted_count := inserted_count + 1;
            END LOOP;
          END IF;
        END LOOP;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE WARNING 'Error processing Pokemon % moves: %', pokemon_record.resource_key, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT inserted_count, error_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_pokemon_moves_from_pokeapi IS 'Populates pokemon_moves junction table from synced pokeapi_resources JSONB data';

-- ============================================================================
-- 7. Master Function: Populate All Master Tables
-- ============================================================================

CREATE OR REPLACE FUNCTION public.populate_all_master_tables_from_pokeapi()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  types_result RECORD;
  abilities_result RECORD;
  moves_result RECORD;
  pokemon_types_result RECORD;
  pokemon_abilities_result RECORD;
  pokemon_moves_result RECORD;
BEGIN
  -- Populate master tables
  SELECT * INTO types_result FROM public.populate_types_from_pokeapi();
  SELECT * INTO abilities_result FROM public.populate_abilities_from_pokeapi();
  SELECT * INTO moves_result FROM public.populate_moves_from_pokeapi();
  
  -- Populate junction tables
  SELECT * INTO pokemon_types_result FROM public.populate_pokemon_types_from_pokeapi();
  SELECT * INTO pokemon_abilities_result FROM public.populate_pokemon_abilities_from_pokeapi();
  SELECT * INTO pokemon_moves_result FROM public.populate_pokemon_moves_from_pokeapi();
  
  -- Build result summary
  result := jsonb_build_object(
    'types', jsonb_build_object(
      'inserted', types_result.inserted,
      'updated', types_result.updated,
      'errors', types_result.errors
    ),
    'abilities', jsonb_build_object(
      'inserted', abilities_result.inserted,
      'updated', abilities_result.updated,
      'errors', abilities_result.errors
    ),
    'moves', jsonb_build_object(
      'inserted', moves_result.inserted,
      'updated', moves_result.updated,
      'errors', moves_result.errors
    ),
    'pokemon_types', jsonb_build_object(
      'inserted', pokemon_types_result.inserted,
      'errors', pokemon_types_result.errors
    ),
    'pokemon_abilities', jsonb_build_object(
      'inserted', pokemon_abilities_result.inserted,
      'errors', pokemon_abilities_result.errors
    ),
    'pokemon_moves', jsonb_build_object(
      'inserted', pokemon_moves_result.inserted,
      'errors', pokemon_moves_result.errors
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_all_master_tables_from_pokeapi IS 'Populates all master tables and junction tables from synced pokeapi_resources JSONB data';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.populate_types_from_pokeapi() TO service_role;
GRANT EXECUTE ON FUNCTION public.populate_abilities_from_pokeapi() TO service_role;
GRANT EXECUTE ON FUNCTION public.populate_moves_from_pokeapi() TO service_role;
GRANT EXECUTE ON FUNCTION public.populate_pokemon_types_from_pokeapi() TO service_role;
GRANT EXECUTE ON FUNCTION public.populate_pokemon_abilities_from_pokeapi() TO service_role;
GRANT EXECUTE ON FUNCTION public.populate_pokemon_moves_from_pokeapi() TO service_role;
GRANT EXECUTE ON FUNCTION public.populate_all_master_tables_from_pokeapi() TO service_role;
