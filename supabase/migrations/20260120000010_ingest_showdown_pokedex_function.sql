-- PostgreSQL function to ingest Showdown pokedex data server-side
-- This is more efficient than Edge Function as it runs directly in the database
-- Can process all 1,515 Pokémon in seconds without timeout issues

CREATE OR REPLACE FUNCTION ingest_showdown_pokedex_batch(
  pokedex_data JSONB,
  source_version TEXT,
  fetched_at TIMESTAMPTZ,
  etag TEXT DEFAULT NULL
)
RETURNS TABLE (
  processed_count INTEGER,
  error_count INTEGER,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pokemon_record JSONB;
  showdown_id TEXT;
  processed INTEGER := 0;
  error_count INTEGER := 0;
  error_list JSONB := '[]'::JSONB;
  evolution_data JSONB;
  type_record JSONB;
  ability_record JSONB;
BEGIN
  -- Process each Pokémon entry
  FOR showdown_id, pokemon_record IN SELECT * FROM jsonb_each(pokedex_data)
  LOOP
    BEGIN
      -- 1. Upsert raw JSON
      INSERT INTO public.showdown_pokedex_raw (
        showdown_id,
        payload,
        source_version,
        fetched_at,
        etag
      ) VALUES (
        showdown_id,
        pokemon_record,
        source_version,
        fetched_at,
        etag
      )
      ON CONFLICT (showdown_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        source_version = EXCLUDED.source_version,
        fetched_at = EXCLUDED.fetched_at,
        etag = EXCLUDED.etag;

      -- 2. Extract evolution data
      evolution_data := jsonb_build_object(
        'prevo', pokemon_record->'prevo',
        'evos', pokemon_record->'evos',
        'evoType', pokemon_record->'evoType',
        'evoMove', pokemon_record->'evoMove',
        'evoLevel', pokemon_record->'evoLevel',
        'evoCondition', pokemon_record->'evoCondition'
      );
      
      -- Remove null values
      evolution_data := evolution_data - 'null'::text;

      -- 3. Upsert pokemon_showdown
      INSERT INTO public.pokemon_showdown (
        showdown_id,
        dex_num,
        name,
        base_species,
        forme,
        is_nonstandard,
        tier,
        height_m,
        weight_kg,
        hp,
        atk,
        def,
        spa,
        spd,
        spe,
        evolution_data,
        updated_at
      ) VALUES (
        showdown_id,
        (pokemon_record->>'num')::INTEGER,
        COALESCE(pokemon_record->>'name', showdown_id),
        pokemon_record->>'baseSpecies',
        pokemon_record->>'forme',
        pokemon_record->>'isNonstandard',
        pokemon_record->>'tier',
        (pokemon_record->>'heightm')::NUMERIC,
        (pokemon_record->>'weightkg')::NUMERIC,
        (pokemon_record->'baseStats'->>'hp')::INTEGER,
        (pokemon_record->'baseStats'->>'atk')::INTEGER,
        (pokemon_record->'baseStats'->>'def')::INTEGER,
        (pokemon_record->'baseStats'->>'spa')::INTEGER,
        (pokemon_record->'baseStats'->>'spd')::INTEGER,
        (pokemon_record->'baseStats'->>'spe')::INTEGER,
        CASE WHEN evolution_data = '{}'::JSONB THEN NULL ELSE evolution_data END,
        fetched_at
      )
      ON CONFLICT (showdown_id) DO UPDATE SET
        dex_num = EXCLUDED.dex_num,
        name = EXCLUDED.name,
        base_species = EXCLUDED.base_species,
        forme = EXCLUDED.forme,
        is_nonstandard = EXCLUDED.is_nonstandard,
        tier = EXCLUDED.tier,
        height_m = EXCLUDED.height_m,
        weight_kg = EXCLUDED.weight_kg,
        hp = EXCLUDED.hp,
        atk = EXCLUDED.atk,
        def = EXCLUDED.def,
        spa = EXCLUDED.spa,
        spd = EXCLUDED.spd,
        spe = EXCLUDED.spe,
        evolution_data = EXCLUDED.evolution_data,
        updated_at = EXCLUDED.updated_at;

      -- 4. Delete existing types/abilities
      DELETE FROM public.pokemon_showdown_types WHERE pokemon_showdown_types.showdown_id = ingest_showdown_pokedex_batch.showdown_id;
      DELETE FROM public.pokemon_showdown_abilities WHERE pokemon_showdown_abilities.showdown_id = ingest_showdown_pokedex_batch.showdown_id;

      -- 5. Insert types
      IF pokemon_record->'types' IS NOT NULL THEN
        INSERT INTO public.pokemon_showdown_types (showdown_id, slot, type)
        SELECT 
          showdown_id,
          idx AS slot,
          type_value::TEXT AS type
        FROM jsonb_array_elements_text(pokemon_record->'types') WITH ORDINALITY AS t(type_value, idx)
        WHERE type_value IS NOT NULL;
      END IF;

      -- 6. Insert abilities
      IF pokemon_record->'abilities' IS NOT NULL THEN
        INSERT INTO public.pokemon_showdown_abilities (showdown_id, slot, ability)
        SELECT 
          showdown_id,
          slot_key::TEXT AS slot,
          ability_value::TEXT AS ability
        FROM jsonb_each_text(pokemon_record->'abilities') AS t(slot_key, ability_value)
        WHERE slot_key != 'S' AND ability_value IS NOT NULL;
      END IF;

      processed := processed + 1;

    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        error_list := error_list || jsonb_build_object(
          'showdown_id', showdown_id,
          'error', SQLERRM
        );
    END;
  END LOOP;

  RETURN QUERY SELECT processed, error_count, error_list;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION ingest_showdown_pokedex_batch(JSONB, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

COMMENT ON FUNCTION ingest_showdown_pokedex_batch IS 'Server-side batch ingestion of Showdown pokedex data - more efficient than Edge Function';
