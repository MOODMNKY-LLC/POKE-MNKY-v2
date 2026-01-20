alter table "public"."binary_data" drop constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" drop constraint "CHK_workflow_publish_history_event";

drop view if exists "public"."draft_pool_comprehensive";

drop view if exists "public"."draft_pool_with_showdown";

drop view if exists "public"."pokemon_with_all_data";

drop index if exists "public"."idx_draft_pool_tera_eligible";

drop index if exists "public"."idx_sheets_draft_pool_tera_banned";

-- Drop tera_captain_eligible column if it exists (will be re-added in later migration)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'draft_pool' 
    AND column_name = 'tera_captain_eligible'
  ) THEN
    ALTER TABLE "public"."draft_pool" DROP COLUMN "tera_captain_eligible";
  END IF;
END $$;

-- Alter is_tera_banned column if it exists (will be added in later migration)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sheets_draft_pool' 
    AND column_name = 'is_tera_banned'
  ) THEN
    ALTER TABLE "public"."sheets_draft_pool" ALTER COLUMN "is_tera_banned" DROP DEFAULT;
    ALTER TABLE "public"."sheets_draft_pool" ALTER COLUMN "is_tera_banned" DROP NOT NULL;
    ALTER TABLE "public"."sheets_draft_pool" ALTER COLUMN "is_tera_banned" SET DATA TYPE text USING "is_tera_banned"::text;
  END IF;
END $$;

alter table "public"."binary_data" add constraint "CHK_binary_data_sourceType" CHECK ((("sourceType")::text = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::text[]))) not valid;

alter table "public"."binary_data" validate constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" add constraint "CHK_workflow_publish_history_event" CHECK (((event)::text = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::text[]))) not valid;

alter table "public"."workflow_publish_history" validate constraint "CHK_workflow_publish_history_event";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public._get_service_role_key()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN NULLIF(current_setting('app.settings.service_role_key', true), '');
END;
$function$
;

CREATE OR REPLACE FUNCTION public._get_supabase_url()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.settings.supabase_url', true), ''),
    'https://chmrszrwlfeqovwxyrmt.supabase.co'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public._trigger_showdown_pokedex_ingest()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  supabase_url := public._get_supabase_url();
  service_role_key := public._get_service_role_key();
  
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL AND service_role_key != '' THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/ingest-showdown-pokedex',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb
    );
  ELSE
    RAISE WARNING 'ingest-showdown-pokedex skipped: Missing app.settings.supabase_url or app.settings.service_role_key';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.broadcast_showdown_sync_progress(phase text, current_count integer, total_count integer, message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  progress_percent integer;
  payload jsonb;
BEGIN
  -- Calculate progress percentage
  progress_percent := CASE 
    WHEN total_count > 0 THEN ROUND((current_count::numeric / total_count::numeric) * 100)
    ELSE 0
  END;

  -- Build payload
  payload := jsonb_build_object(
    'phase', phase,
    'current', current_count,
    'total', total_count,
    'progress', progress_percent,
    'message', COALESCE(message, phase || ': ' || current_count || '/' || total_count),
    'timestamp', NOW()
  );

  -- Try to use realtime.send() if available (production/hosted Supabase)
  -- Fall back to pg_notify for local development
  BEGIN
    -- Check if realtime extension exists
    IF EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'realtime'
    ) THEN
      PERFORM realtime.send(
        'showdown-pokedex-sync:progress',
        'progress_update',
        payload
      );
    ELSE
      -- Fallback to pg_notify for local development
      PERFORM pg_notify(
        'showdown_pokedex_sync_progress',
        payload::text
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback to pg_notify if realtime.send() fails
      PERFORM pg_notify(
        'showdown_pokedex_sync_progress',
        payload::text
      );
  END;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail - progress updates are non-critical
    -- Log error for debugging but don't throw
    RAISE WARNING 'Failed to broadcast progress: %', SQLERRM;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clear_showdown_pokedex_data()
 RETURNS TABLE(raw_count bigint, pokemon_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  raw_deleted BIGINT;
  pokemon_deleted BIGINT;
BEGIN
  -- Get counts before deletion
  SELECT COUNT(*) INTO raw_deleted FROM public.showdown_pokedex_raw;
  SELECT COUNT(*) INTO pokemon_deleted FROM public.pokemon_showdown;
  
  -- Delete all data (cascade will handle types/abilities)
  -- Delete from pokemon_showdown first (cascade deletes types/abilities)
  -- Use WHERE TRUE to satisfy Supabase's requirement for WHERE clause
  DELETE FROM public.pokemon_showdown WHERE TRUE;
  
  -- Delete from raw table
  DELETE FROM public.showdown_pokedex_raw WHERE TRUE;
  
  -- Return counts
  RETURN QUERY SELECT raw_deleted, pokemon_deleted;
END;
$function$
;

-- Create draft_pool_comprehensive view only if pokemon_unified exists
-- This view will be properly created in migration 20260120000019_create_unified_pokemon_views.sql
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'pokemon_unified'
  ) THEN
    CREATE OR REPLACE VIEW "public"."draft_pool_comprehensive" AS  
    SELECT dp.id,
      dp.pokemon_name,
      dp.point_value,
      dp.pokemon_id,
      dp.created_at,
      dp.updated_at,
      dp.season_id,
      dp.status,
      dp.drafted_by_team_id,
      dp.drafted_at,
      dp.draft_round,
      dp.draft_pick_number,
      dp.banned_reason,
      pu.sprite_front_default_path,
      pu.sprite_official_artwork_path,
      pu.pokeapi_types,
      pu.pokeapi_abilities,
      pu.generation,
      pu.base_experience,
      pu.height,
      pu.weight,
      pu.types,
      pu.abilities,
      pu.hp,
      pu.atk,
      pu.def,
      pu.spa,
      pu.spd,
      pu.spe,
      pu.showdown_tier,
      pu.base_species,
      pu.forme
     FROM (public.draft_pool dp
       LEFT JOIN public.pokemon_unified pu ON (((lower(dp.pokemon_name) = lower(pu.name)) OR (lower(replace(dp.pokemon_name, ' '::text, '-'::text)) = lower(pu.showdown_id)))));
  END IF;
END $$;


-- Create draft_pool_with_showdown view only if pokemon_showdown exists
-- This view will be properly created in migration 20260120000003_create_showdown_pokedex_tables.sql
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pokemon_showdown'
  ) THEN
    CREATE OR REPLACE VIEW "public"."draft_pool_with_showdown" AS  
    SELECT dp.id,
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
      ( SELECT json_agg(pt2.type ORDER BY pt2.slot) AS json_agg
             FROM public.pokemon_showdown_types pt2
            WHERE (pt2.showdown_id = ps.showdown_id)) AS types,
      ( SELECT json_agg(pa2.ability ORDER BY
                  CASE pa2.slot
                      WHEN '0'::text THEN 1
                      WHEN '1'::text THEN 2
                      WHEN 'H'::text THEN 3
                      ELSE 4
                  END) AS json_agg
             FROM public.pokemon_showdown_abilities pa2
            WHERE (pa2.showdown_id = ps.showdown_id)) AS abilities
     FROM (public.draft_pool dp
       LEFT JOIN public.pokemon_showdown ps ON (((lower(ps.name) = lower(dp.pokemon_name)) OR (lower(ps.name) = lower(replace(dp.pokemon_name, ' '::text, '-'::text))) OR (lower(ps.name) = lower(replace(dp.pokemon_name, ' '::text, ''::text))))))
    GROUP BY dp.id, dp.pokemon_name, dp.point_value, dp.season_id, dp.status, dp.pokemon_id, ps.showdown_id, ps.dex_num, ps.tier, ps.hp, ps.atk, ps.def, ps.spa, ps.spd, ps.spe, ps.base_species, ps.forme;
  END IF;
END $$;


CREATE OR REPLACE FUNCTION public.extract_id_from_pokeapi_url(url text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  -- PokéAPI URLs format: https://pokeapi.co/api/v2/{resource}/{id}/
  -- Extract the ID from the URL
  RETURN (
    SELECT (regexp_match(url, '/api/v2/[^/]+/(\d+)/'))[1]::INTEGER
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_showdown_entry_by_name(pokemon_name text)
 RETURNS TABLE(showdown_id text, dex_num integer, name text, tier text, hp integer, atk integer, def integer, spa integer, spd integer, spe integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

-- Skip creating get_pokemon_by_id function here - it will be created in migration 20260120000019_create_unified_pokemon_views.sql
-- This function depends on pokemon_unified which doesn't exist yet at this migration point

-- Create get_pokemon_by_name function only if pokemon_unified exists
-- This function will be properly created in migration 20260120000019_create_unified_pokemon_views.sql
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'pokemon_unified'
  ) THEN
    CREATE OR REPLACE FUNCTION public.get_pokemon_by_name(pokemon_name_param text)
     RETURNS TABLE(pokemon_id integer, name text, sprite_front_default_path text, sprite_official_artwork_path text, types jsonb, abilities jsonb, hp integer, atk integer, def integer, spa integer, spd integer, spe integer, showdown_tier text, generation integer, base_experience integer)
     LANGUAGE plpgsql
     STABLE
    AS $function$
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
    $function$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_pokemon_by_tier(tier_points integer)
 RETURNS TABLE(pokemon_name text, point_value integer, generation integer, pokemon_cache_id integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.generation,
    pc.pokemon_id as pokemon_cache_id
  FROM draft_pool dp
  LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
  WHERE dp.point_value = tier_points
    AND dp.status = 'available'::public.draft_pool_status  -- Updated from is_available = true
  ORDER BY dp.pokemon_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pokemon_for_draft(season_id_param uuid)
 RETURNS TABLE(id uuid, pokemon_name text, point_value integer, status text, pokemon_id integer, sprite_official_artwork_path text, types jsonb, abilities jsonb, hp integer, atk integer, def integer, spa integer, spd integer, spe integer, showdown_tier text, generation integer)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_showdown_pokedex_cron_status()
 RETURNS TABLE(job_name text, schedule text, active boolean, last_run timestamp with time zone, next_run timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    (SELECT MAX(jrd.start_time) FROM cron.job_run_details jrd WHERE jrd.jobid = j.jobid)::TIMESTAMPTZ AS last_run,
    NULL::TIMESTAMPTZ AS next_run  -- pg_cron doesn't provide next_run, would need to calculate from schedule
  FROM cron.job j
  WHERE j.jobname = 'ingest-showdown-pokedex-weekly';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ingest_showdown_pokedex_batch(pokedex_data jsonb, source_version text, fetched_at timestamp with time zone, etag text DEFAULT NULL::text)
 RETURNS TABLE(processed_count integer, error_count integer, errors jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.map_tier_to_point_value(tier text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  -- Map Showdown tiers to point values
  -- Higher tiers = higher points (more valuable)
  CASE
    -- Top tiers (18-20 points)
    WHEN tier IN ('Uber', 'AG') THEN RETURN 20;
    WHEN tier = 'OU' THEN RETURN 19;
    WHEN tier IN ('UUBL', 'OUBL') THEN RETURN 18;
    
    -- Upper tiers (15-17 points)
    WHEN tier = 'UU' THEN RETURN 17;
    WHEN tier = 'RUBL' THEN RETURN 16;
    WHEN tier = 'RU' THEN RETURN 15;
    
    -- Mid tiers (12-14 points)
    WHEN tier = 'NUBL' THEN RETURN 14;
    WHEN tier = 'NU' THEN RETURN 13;
    WHEN tier = 'PUBL' THEN RETURN 12;
    
    -- Lower tiers (9-11 points)
    WHEN tier = 'PU' THEN RETURN 11;
    WHEN tier = 'ZUBL' THEN RETURN 10;
    WHEN tier = 'ZU' THEN RETURN 9;
    
    -- Bottom tiers (6-8 points)
    WHEN tier = 'LC' THEN RETURN 8;
    WHEN tier = 'NFE' THEN RETURN 7;
    WHEN tier = 'Untiered' THEN RETURN 6;
    
    -- Very low tiers (3-5 points)
    WHEN tier IN ('Illegal', 'Unreleased', 'CAP') THEN RETURN NULL; -- Exclude
    WHEN tier IS NULL THEN RETURN 5; -- No tier data
    
    -- Default for unknown tiers
    ELSE RETURN 5;
  END CASE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_showdown_id_to_name(showdown_id text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.pgmq_public_delete(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE
  deleted BOOLEAN;
BEGIN
  -- Call pgmq.delete() function
  SELECT pgmq.delete(queue_name, message_id) INTO deleted;
  RETURN COALESCE(deleted, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgmq_public_read(queue_name text, sleep_seconds integer DEFAULT 0, n integer DEFAULT 1)
 RETURNS TABLE(msg_id bigint, read_ct integer, enqueued_at timestamp with time zone, vt timestamp with time zone, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  -- Call pgmq.read() function
  RETURN QUERY
  SELECT 
    m.msg_id,
    m.read_ct,
    m.enqueued_at,
    m.vt,
    m.message
  FROM pgmq.read(queue_name, sleep_seconds, n) m;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pgmq_public_send_batch(queue_name text, messages jsonb[], sleep_seconds integer DEFAULT 0)
 RETURNS TABLE(msg_id bigint, enqueued_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  -- Call pgmq.send_batch() function
  RETURN QUERY
  SELECT 
    m.msg_id,
    m.enqueued_at
  FROM pgmq.send_batch(queue_name, messages, sleep_seconds) m;
END;
$function$
;

-- Skip creating pokemon_with_all_data view here - it will be created in migration 20260120000019_create_unified_pokemon_views.sql
-- This view depends on pokemon_unified which doesn't exist yet at this migration point


CREATE OR REPLACE FUNCTION public.populate_abilities_from_pokeapi()
 RETURNS TABLE(inserted integer, updated integer, errors integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.populate_all_master_tables_from_pokeapi()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.populate_draft_pool_from_showdown_tiers(p_season_id uuid, p_exclude_illegal boolean DEFAULT true, p_exclude_forms boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_point_value INTEGER;
  v_pokemon RECORD;
BEGIN
  -- Loop through pokemon_unified view
  FOR v_pokemon IN
    SELECT DISTINCT
      pu.pokemon_id,
      pu.name,
      pu.showdown_tier,
      pu.generation,
      pu.showdown_id,
      pu.base_species,
      pu.forme,
      pu.is_nonstandard
    FROM pokemon_unified pu
    WHERE pu.pokemon_id IS NOT NULL
      AND pu.name IS NOT NULL
      AND (NOT p_exclude_illegal OR pu.showdown_tier != 'Illegal')
      AND (NOT p_exclude_forms OR pu.forme IS NULL)
      AND pu.showdown_tier IS NOT NULL
    ORDER BY pu.pokemon_id
  LOOP
    -- Map tier to point value
    v_point_value := public.map_tier_to_point_value(v_pokemon.showdown_tier);
    
    -- Skip if tier maps to NULL (illegal/unreleased)
    IF v_point_value IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Insert or update draft pool entry
    INSERT INTO draft_pool (
      pokemon_name,
      point_value,
      season_id,
      status,
      pokemon_id,
      generation
    )
    VALUES (
      v_pokemon.name,
      v_point_value,
      p_season_id,
      'available',
      v_pokemon.pokemon_id,
      v_pokemon.generation
    )
    ON CONFLICT (season_id, pokemon_name, point_value)
    DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      generation = EXCLUDED.generation,
      updated_at = NOW()
    WHERE draft_pool.pokemon_id IS DISTINCT FROM EXCLUDED.pokemon_id
       OR draft_pool.generation IS DISTINCT FROM EXCLUDED.generation;
    
    -- Count updates vs inserts
    IF FOUND THEN
      IF (SELECT COUNT(*) FROM draft_pool 
          WHERE season_id = p_season_id 
          AND pokemon_name = v_pokemon.name 
          AND point_value = v_point_value) = 1 THEN
        v_inserted := v_inserted + 1;
      ELSE
        v_updated := v_updated + 1;
      END IF;
    ELSE
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped,
    'total_processed', v_inserted + v_updated + v_skipped,
    'season_id', p_season_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.populate_moves_from_pokeapi()
 RETURNS TABLE(inserted integer, updated integer, errors integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.populate_pokemon_abilities_from_pokeapi()
 RETURNS TABLE(inserted integer, errors integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.populate_pokemon_moves_from_pokeapi()
 RETURNS TABLE(inserted integer, errors integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.populate_pokemon_types_from_pokeapi()
 RETURNS TABLE(inserted integer, errors integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.populate_types_from_pokeapi()
 RETURNS TABLE(inserted integer, updated integer, errors integer)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

-- Skip creating search_pokemon function here - it will be created in migration 20260120000019_create_unified_pokemon_views.sql
-- This function depends on pokemon_unified which doesn't exist yet at this migration point

CREATE OR REPLACE FUNCTION public.unschedule_showdown_pokedex_cron()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM cron.unschedule('ingest-showdown-pokedex-weekly');
END;
$function$
;


