drop function if exists "public"."match_documents"(query_embedding public.vector, match_count integer, filter jsonb);

alter table "public"."documents" drop constraint "documents_pkey";

drop index if exists "public"."documents_pkey";


  create table "public"."documents_old" (
    "id" bigint not null default nextval('public.documents_id_seq'::regclass),
    "content" text,
    "metadata" jsonb,
    "embedding" public.vector(1536)
      );



  create table "public"."upsertion_records" (
    "uuid" uuid not null default gen_random_uuid(),
    "key" text not null,
    "namespace" text not null,
    "updated_at" double precision not null,
    "group_id" text,
    "doc_id" text
      );


alter table "public"."documents" alter column "id" drop default;

alter table "public"."documents" alter column "id" set data type text using "id"::text;

alter sequence "public"."documents_id_seq" owned by "public"."documents_old"."id";

CREATE INDEX doc_id_index ON public.upsertion_records USING btree (doc_id);

CREATE UNIQUE INDEX documents_new_pkey ON public.documents USING btree (id);

CREATE INDEX group_id_index ON public.upsertion_records USING btree (group_id);

CREATE INDEX key_index ON public.upsertion_records USING btree (key);

CREATE INDEX namespace_index ON public.upsertion_records USING btree (namespace);

CREATE INDEX updated_at_index ON public.upsertion_records USING btree (updated_at);

CREATE UNIQUE INDEX upsertion_records_key_namespace_key ON public.upsertion_records USING btree (key, namespace);

CREATE UNIQUE INDEX upsertion_records_pkey ON public.upsertion_records USING btree (uuid);

CREATE UNIQUE INDEX documents_pkey ON public.documents_old USING btree (id);

alter table "public"."documents" add constraint "documents_new_pkey" PRIMARY KEY using index "documents_new_pkey";

alter table "public"."documents_old" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."upsertion_records" add constraint "upsertion_records_pkey" PRIMARY KEY using index "upsertion_records_pkey";

alter table "public"."upsertion_records" add constraint "upsertion_records_key_namespace_key" UNIQUE using index "upsertion_records_key_namespace_key";

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

CREATE OR REPLACE FUNCTION public.assign_coach_to_team(p_user_id uuid, p_team_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_coach_id UUID;
  v_team_id UUID;
  v_profile_display_name TEXT;
  v_profile_discord_id TEXT;
BEGIN
  SELECT display_name, discord_id INTO v_profile_display_name, v_profile_discord_id
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_profile_display_name IS NULL THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', p_user_id;
  END IF;

  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = p_user_id;

  IF v_coach_id IS NULL THEN
    INSERT INTO public.coaches (user_id, display_name, discord_id, discord_user_id, email)
    VALUES (p_user_id, v_profile_display_name, v_profile_discord_id, v_profile_discord_id, NULL)
    RETURNING id INTO v_coach_id;
  ELSE
    UPDATE public.coaches
    SET display_name = v_profile_display_name,
        discord_id = v_profile_discord_id,
        discord_user_id = v_profile_discord_id
    WHERE id = v_coach_id;
  END IF;

  IF p_team_id IS NOT NULL THEN
    SELECT id INTO v_team_id
    FROM public.teams
    WHERE id = p_team_id;

    IF v_team_id IS NULL THEN
      RAISE EXCEPTION 'Team not found: %', p_team_id;
    END IF;

    UPDATE public.teams
    SET coach_id = v_coach_id
    WHERE id = v_team_id AND (coach_id IS NULL OR coach_id = v_coach_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Team % is already assigned to another coach', p_team_id;
    END IF;
  ELSE
    SELECT t.id INTO v_team_id
    FROM public.teams t
    INNER JOIN public.seasons s ON t.season_id = s.id
    WHERE t.coach_id IS NULL
      AND s.is_current = true
    LIMIT 1;

    IF v_team_id IS NULL THEN
      RAISE EXCEPTION 'No unassigned teams available for current season. Please contact admin.';
    END IF;

    UPDATE public.teams
    SET coach_id = v_coach_id
    WHERE id = v_team_id;
  END IF;

  UPDATE public.profiles
  SET team_id = v_team_id
  WHERE id = p_user_id;

  RETURN v_coach_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.broadcast_draft_pick()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  session_id_val UUID;
BEGIN
  -- Get active session for team's season
  SELECT ds.id INTO session_id_val
  FROM draft_sessions ds
  JOIN teams t ON t.season_id = ds.season_id
  WHERE t.id = NEW.team_id
    AND ds.status = 'active'
  LIMIT 1;
  
  IF session_id_val IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'draft:' || session_id_val::text || ':picks',
      'INSERT',
      'team_rosters',
      'public',
      NEW,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.broadcast_draft_turn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.current_team_id IS DISTINCT FROM NEW.current_team_id THEN
    PERFORM realtime.broadcast_changes(
      'draft:' || NEW.id::text || ':turn',
      'UPDATE',
      'draft_sessions',
      'public',
      NEW,
      OLD
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.broadcast_pokemon_cache_sync_progress(phase text, current_count integer, total_count integer, message text DEFAULT NULL::text)
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
    IF EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'realtime'
    ) THEN
      PERFORM realtime.send(
        'pokemon-cache-sync:progress',
        'progress_update',
        payload
      );
    ELSE
      PERFORM pg_notify(
        'pokemon_cache_sync_progress',
        payload::text
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_notify(
        'pokemon_cache_sync_progress',
        payload::text
      );
  END;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to broadcast pokemon cache sync progress: %', SQLERRM;
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

CREATE OR REPLACE FUNCTION public.check_pokedex_sprites_bucket()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- This function can be called from application code to verify bucket exists
  -- Actual bucket existence check must be done via Storage API
  RETURN 'Bucket check must be done via Storage API. Use supabase.storage.listBuckets() to verify.';
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

CREATE OR REPLACE FUNCTION public.get_available_pokemon(p_season_id uuid)
 RETURNS TABLE(pokemon_id integer, pokemon_name text, point_value integer, generation integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_available_pokemon_for_free_agency(p_season_id, NULL, NULL, NULL, NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_available_pokemon_for_free_agency(p_season_id uuid, p_min_points integer DEFAULT NULL::integer, p_max_points integer DEFAULT NULL::integer, p_generation integer DEFAULT NULL::integer, p_search text DEFAULT NULL::text)
 RETURNS TABLE(pokemon_id integer, pokemon_name text, point_value integer, generation integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  has_is_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'draft_pool' AND column_name = 'is_available'
  ) INTO has_is_available;

  IF has_is_available THEN
    RETURN QUERY
    SELECT DISTINCT dp.pokemon_id, dp.pokemon_name, dp.point_value, dp.generation
    FROM public.draft_pool dp
    WHERE dp.is_available = true
      AND dp.pokemon_id IS NOT NULL
      AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
      AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
      AND (p_generation IS NULL OR dp.generation = p_generation)
      AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
      AND dp.pokemon_name NOT IN (
        SELECT p.name
        FROM public.team_rosters tr
        INNER JOIN public.teams t ON tr.team_id = t.id
        INNER JOIN public.pokemon p ON tr.pokemon_id = p.id
        WHERE t.season_id = p_season_id
          AND tr.pokemon_id IS NOT NULL
      )
    ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
  ELSE
    RETURN QUERY
    SELECT DISTINCT dp.pokemon_id, dp.pokemon_name, dp.point_value, dp.generation
    FROM public.draft_pool dp
    WHERE dp.status = 'available'
      AND dp.pokemon_id IS NOT NULL
      AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
      AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
      AND (p_generation IS NULL OR dp.generation = p_generation)
      AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
      AND dp.pokemon_name NOT IN (
        SELECT p.name
        FROM public.team_rosters tr
        INNER JOIN public.teams t ON tr.team_id = t.id
        INNER JOIN public.pokemon p ON tr.pokemon_id = p.id
        WHERE t.season_id = p_season_id
          AND tr.pokemon_id IS NOT NULL
      )
    ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_page_parents(page_id bigint)
 RETURNS TABLE(id bigint, parent_page_id bigint, path text, meta jsonb)
 LANGUAGE sql
AS $function$
  with recursive chain as (
    select *
    from nods_page
    where id = page_id

    union all

    select child.*
      from nods_page as child
      join chain on chain.parent_page_id = child.id
  )
  select id, parent_page_id, path, meta
  from chain;
$function$
;

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

CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  user_perms JSONB;
  role_perms JSONB;
  combined_perms JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO user_role, user_perms
  FROM public.profiles
  WHERE id = user_id;
  
  -- Get role's default permissions
  SELECT permissions INTO role_perms
  FROM public.role_permissions
  WHERE role = user_role;
  
  -- Combine permissions (custom permissions override role permissions)
  combined_perms = COALESCE(role_perms, '[]'::jsonb) || COALESCE(user_perms, '[]'::jsonb);
  
  RETURN combined_perms;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count
  FROM auth.users;
  
  -- If this is the first user, ensure they have admin role
  IF user_count = 1 THEN
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = NEW.id AND (role IS NULL OR role != 'admin');
  ELSE
    -- Otherwise, ensure default is spectator (if not already set)
    UPDATE public.profiles
    SET role = COALESCE(role, 'spectator')
    WHERE id = NEW.id AND role IS NULL;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_count INTEGER;
  default_role TEXT;
BEGIN
  -- Count existing users (including this one)
  SELECT COUNT(*) INTO user_count
  FROM auth.users;
  
  -- First user gets admin, others get spectator
  IF user_count = 1 THEN
    default_role := 'admin';
  ELSE
    default_role := 'spectator';
  END IF;
  
  INSERT INTO public.profiles (
    id, 
    display_name, 
    avatar_url, 
    email_verified, 
    discord_id, 
    discord_username, 
    discord_avatar,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'avatar_url',
    default_role
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_workflow_version()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
			BEGIN
				IF NEW."versionCounter" IS NOT DISTINCT FROM OLD."versionCounter" THEN
					NEW."versionCounter" = OLD."versionCounter" + 1;
				END IF;
				RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id text, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.match_page_sections(embedding public.vector, match_threshold double precision, match_count integer, min_content_length integer)
 RETURNS TABLE(id bigint, page_id bigint, slug text, heading text, content text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
#variable_conflict use_variable
begin
  return query
  select
    nods_page_section.id,
    nods_page_section.page_id,
    nods_page_section.slug,
    nods_page_section.heading,
    nods_page_section.content,
    (nods_page_section.embedding <#> embedding) * -1 as similarity
  from nods_page_section

  -- We only care about sections that have a useful amount of content
  where length(nods_page_section.content) >= min_content_length

  -- The dot product is negative because of a Postgres limitation, so we negate it
  and (nods_page_section.embedding <#> embedding) * -1 > match_threshold

  -- OpenAI embeddings are normalized to length 1, so
  -- cosine similarity and dot product will produce the same results.
  -- Using dot product which can be computed slightly faster.
  --
  -- For the different syntaxes, see https://github.com/pgvector/pgvector
  order by nods_page_section.embedding <#> embedding

  limit match_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_activity_feed_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  topic text;
  payload jsonb;
BEGIN
  topic := 'user:' || COALESCE(NEW.user_id::text, '');
  IF topic = 'user:' THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'id', NEW.id,
    'action', NEW.action,
    'resource_type', NEW.resource_type,
    'resource_id', NEW.resource_id,
    'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
    'created_at', NEW.created_at
  );

  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'realtime') THEN
      PERFORM realtime.send(topic, 'activity_created', payload);
    ELSE
      PERFORM pg_notify('user_activity_feed', payload::text);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_notify('user_activity_feed', payload::text);
  END;

  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.populate_showdown_pool_from_tiers(p_season_id uuid, p_exclude_illegal boolean DEFAULT true, p_exclude_forms boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_inserted INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_point_value INTEGER;
  v_pokemon RECORD;
  v_cache_id INTEGER;
BEGIN
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
    v_point_value := public.map_tier_to_point_value(v_pokemon.showdown_tier);
    IF v_point_value IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT pc.pokemon_id INTO v_cache_id
    FROM public.pokemon_cache pc
    WHERE LOWER(TRIM(pc.name)) = LOWER(TRIM(v_pokemon.name))
    LIMIT 1;

    INSERT INTO public.showdown_pool (
      pokemon_name,
      point_value,
      season_id,
      pokemon_id,
      generation
    )
    VALUES (
      v_pokemon.name,
      v_point_value,
      p_season_id,
      v_cache_id,
      v_pokemon.generation
    )
    ON CONFLICT (season_id, pokemon_name, point_value)
    DO UPDATE SET
      pokemon_id = EXCLUDED.pokemon_id,
      generation = EXCLUDED.generation,
      updated_at = NOW()
    WHERE showdown_pool.pokemon_id IS DISTINCT FROM EXCLUDED.pokemon_id
       OR showdown_pool.generation IS DISTINCT FROM EXCLUDED.generation;

    IF FOUND THEN
      IF (SELECT COUNT(*) FROM public.showdown_pool
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

CREATE OR REPLACE FUNCTION public.rpc_discord_submit_draft_pick(p_bot_key text, p_season_id uuid, p_discord_user_id text, p_pokemon_id uuid, p_draft_round integer DEFAULT NULL::integer, p_pick_number integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(team_id uuid, draft_pick_id uuid, points_snapshot integer, points_used integer, budget_remaining integer, slots_used integer, slots_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_open TIMESTAMPTZ;
  v_close TIMESTAMPTZ;
  v_coach_id UUID;
  v_team_id UUID;
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_points_snapshot INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
BEGIN
  IF NOT public.is_valid_api_key(p_bot_key, 'draft:submit') THEN
    RAISE EXCEPTION 'BOT_UNAUTHORIZED';
  END IF;

  SELECT draft_open_at, draft_close_at, draft_points_budget, roster_size_max
  INTO v_open, v_close, v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  IF v_open IS NULL OR v_close IS NULL THEN
    RAISE EXCEPTION 'DRAFT_WINDOW_NOT_CONFIGURED';
  END IF;

  IF NOT (v_now >= v_open AND v_now <= v_close) THEN
    RAISE EXCEPTION 'DRAFT_WINDOW_CLOSED';
  END IF;

  -- Resolve coach by discord_user_id (canonical) or discord_id (set by assign_coach_to_team)
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE active = true
    AND (discord_user_id = p_discord_user_id OR discord_id = p_discord_user_id)
  LIMIT 1;

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND_FOR_DISCORD';
  END IF;

  SELECT t.id INTO v_team_id
  FROM public.teams t
  JOIN public.season_teams st ON st.team_id = t.id
  WHERE st.season_id = p_season_id
    AND t.coach_id = v_coach_id
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND_FOR_COACH_IN_SEASON';
  END IF;

  SELECT id INTO v_pool_id
  FROM public.draft_pools
  WHERE season_id = p_season_id AND locked = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    SELECT included INTO v_included
    FROM public.draft_pool_pokemon
    WHERE draft_pool_id = v_pool_id AND pokemon_id = p_pokemon_id;

    IF v_included IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'POKEMON_NOT_IN_POOL';
    END IF;
  END IF;

  SELECT draft_points INTO v_points_snapshot
  FROM public.pokemon
  WHERE id = p_pokemon_id;

  IF v_points_snapshot IS NULL THEN
    RAISE EXCEPTION 'POKEMON_POINTS_MISSING';
  END IF;

  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id
    AND team_id = v_team_id
    AND status = 'active';

  IF v_points_used + v_points_snapshot > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  IF v_slots_used + 1 > v_roster_max THEN
    RAISE EXCEPTION 'ROSTER_FULL';
  END IF;

  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, v_team_id, p_pokemon_id,
    'draft', p_draft_round, p_pick_number,
    'active', CURRENT_DATE, v_points_snapshot, p_notes
  )
  RETURNING id INTO draft_pick_id;

  INSERT INTO public.transaction_audit (
    season_id, team_id,
    actor_type, actor_discord_id,
    action, payload
  ) VALUES (
    p_season_id, v_team_id,
    'discord_bot', p_discord_user_id,
    'draft_pick',
    jsonb_build_object(
      'pokemon_id', p_pokemon_id,
      'draft_round', p_draft_round,
      'pick_number', p_pick_number,
      'notes', p_notes
    )
  );

  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id
    AND team_id = v_team_id
    AND status = 'active';

  team_id := v_team_id;

  RETURN QUERY
  SELECT
    team_id,
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'POKEMON_ALREADY_OWNED';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_free_agency_transaction(p_season_id uuid, p_team_id uuid, p_drop_pokemon_id uuid, p_add_pokemon_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(dropped_pick_id uuid, added_pick_id uuid, added_points_snapshot integer, points_used integer, budget_remaining integer, slots_used integer, slots_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_drop_pick_id UUID;
  v_drop_points INTEGER;
  v_add_points INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
BEGIN
  -- AuthZ: Must be admin or coach of the team
  IF NOT (public.is_admin() OR public.is_coach_of_team(p_team_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Membership: Team must be in season
  IF NOT EXISTS (
    SELECT 1 FROM public.season_teams st 
    WHERE st.season_id = p_season_id AND st.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_IN_SEASON';
  END IF;

  -- Load season rules
  SELECT draft_points_budget, roster_size_max
  INTO v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  -- Lock + locate the active pick being dropped
  SELECT id, points_snapshot
  INTO v_drop_pick_id, v_drop_points
  FROM public.draft_picks
  WHERE season_id = p_season_id
    AND team_id = p_team_id
    AND pokemon_id = p_drop_pokemon_id
    AND status = 'active'
  FOR UPDATE;

  IF v_drop_pick_id IS NULL THEN
    RAISE EXCEPTION 'DROP_NOT_OWNED';
  END IF;

  -- Pool legality for add
  SELECT id INTO v_pool_id
  FROM public.draft_pools
  WHERE season_id = p_season_id AND locked = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    SELECT included INTO v_included
    FROM public.draft_pool_pokemon
    WHERE draft_pool_id = v_pool_id AND pokemon_id = p_add_pokemon_id;

    IF v_included IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'ADD_NOT_IN_POOL';
    END IF;
  END IF;

  -- Snapshot points for add
  SELECT draft_points INTO v_add_points 
  FROM public.pokemon 
  WHERE id = p_add_pokemon_id;
  
  IF v_add_points IS NULL THEN
    RAISE EXCEPTION 'ADD_POINTS_MISSING';
  END IF;

  -- Compute current totals
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  -- Hypothetical budget after swap
  IF (v_points_used - v_drop_points + v_add_points) > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  -- Execute atomic swap
  UPDATE public.draft_picks
  SET status = 'dropped',
      end_date = CURRENT_DATE,
      notes = COALESCE(notes, '') || CASE 
        WHEN p_notes IS NULL THEN '' 
        ELSE E'\n' || p_notes 
      END
  WHERE id = v_drop_pick_id;

  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, p_team_id, p_add_pokemon_id,
    'free_agency', 'active', CURRENT_DATE, v_add_points, p_notes
  )
  RETURNING id INTO added_pick_id;

  dropped_pick_id := v_drop_pick_id;
  added_points_snapshot := v_add_points;

  -- Return updated totals
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  RETURN QUERY
  SELECT
    dropped_pick_id,
    added_pick_id,
    added_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'ADD_ALREADY_OWNED';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rpc_submit_draft_pick(p_season_id uuid, p_team_id uuid, p_pokemon_id uuid, p_acquisition public.acquisition_type, p_draft_round integer DEFAULT NULL::integer, p_pick_number integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
 RETURNS TABLE(draft_pick_id uuid, points_snapshot integer, points_used integer, budget_remaining integer, slots_used integer, slots_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_budget INTEGER;
  v_roster_max INTEGER;
  v_points_snapshot INTEGER;
  v_points_used INTEGER;
  v_slots_used INTEGER;
  v_pool_id UUID;
  v_included BOOLEAN;
BEGIN
  -- AuthZ: Must be admin or coach of the team
  IF NOT (public.is_admin() OR public.is_coach_of_team(p_team_id)) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Membership: Team must be in season
  IF NOT EXISTS (
    SELECT 1 FROM public.season_teams st 
    WHERE st.season_id = p_season_id AND st.team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_NOT_IN_SEASON';
  END IF;

  -- Load season rules
  SELECT draft_points_budget, roster_size_max
  INTO v_budget, v_roster_max
  FROM public.seasons
  WHERE id = p_season_id;

  IF v_budget IS NULL THEN
    RAISE EXCEPTION 'SEASON_NOT_FOUND';
  END IF;

  -- Snapshot points from pokemon
  SELECT draft_points INTO v_points_snapshot 
  FROM public.pokemon 
  WHERE id = p_pokemon_id;
  
  IF v_points_snapshot IS NULL THEN
    RAISE EXCEPTION 'POKEMON_POINTS_MISSING';
  END IF;

  -- Pool check (if there is a locked pool for season)
  SELECT id INTO v_pool_id
  FROM public.draft_pools
  WHERE season_id = p_season_id AND locked = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pool_id IS NOT NULL THEN
    SELECT included INTO v_included
    FROM public.draft_pool_pokemon
    WHERE draft_pool_id = v_pool_id AND pokemon_id = p_pokemon_id;

    IF v_included IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'POKEMON_NOT_IN_POOL';
    END IF;
  END IF;

  -- Current totals (active picks only)
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  -- Budget/slots validations
  IF v_points_used + v_points_snapshot > v_budget THEN
    RAISE EXCEPTION 'BUDGET_EXCEEDED';
  END IF;

  IF v_slots_used + 1 > v_roster_max THEN
    RAISE EXCEPTION 'ROSTER_FULL';
  END IF;

  -- Insert (uniqueness guarded by uq_season_pokemon_unique)
  INSERT INTO public.draft_picks (
    season_id, team_id, pokemon_id,
    acquisition, draft_round, pick_number,
    status, start_date, points_snapshot, notes
  ) VALUES (
    p_season_id, p_team_id, p_pokemon_id,
    p_acquisition, p_draft_round, p_pick_number,
    'active', CURRENT_DATE, v_points_snapshot, p_notes
  )
  RETURNING id INTO draft_pick_id;

  -- Recompute after insert
  SELECT COALESCE(SUM(points_snapshot), 0), COALESCE(COUNT(*), 0)
  INTO v_points_used, v_slots_used
  FROM public.draft_picks
  WHERE season_id = p_season_id 
    AND team_id = p_team_id 
    AND status = 'active';

  RETURN QUERY
  SELECT
    draft_pick_id,
    v_points_snapshot,
    v_points_used,
    (v_budget - v_points_used),
    v_slots_used,
    (v_roster_max - v_slots_used);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'POKEMON_ALREADY_OWNED';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_roster_versions_for_week(p_season_id uuid, p_week_number integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r record;
  v_snapshot jsonb;
begin
  for r in
    select
      dp.team_id,
      jsonb_agg(
        jsonb_build_object(
          'pokemon_id', dp.pokemon_id,
          'points', dp.points_snapshot,
          'is_tera_captain', false,
          'tera_types', '[]'::jsonb
        )
      ) as snapshot
    from draft_picks dp
    where dp.season_id = p_season_id
      and dp.status = 'active'
    group by dp.team_id
  loop
    insert into team_roster_versions (
      team_id,
      season_id,
      week_number,
      snapshot
    ) values (
      r.team_id,
      p_season_id,
      p_week_number,
      r.snapshot
    )
    on conflict (team_id, season_id, week_number)
    do update set snapshot = excluded.snapshot;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.unschedule_showdown_pokedex_cron()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM cron.unschedule('ingest-showdown-pokedex-weekly');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_canonical_league_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_discord_roles(user_id uuid, roles jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    discord_roles = roles,
    updated_at = NOW()
  WHERE id = user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_showdown_client_teams_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_categories_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_formats_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_team_tags_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_permission(user_id uuid, required_permission text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
  role_permissions JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO user_role, user_permissions
  FROM public.profiles
  WHERE id = user_id;
  
  -- Admin has all permissions
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Get role's default permissions
  SELECT permissions INTO role_permissions
  FROM public.role_permissions
  WHERE role = user_role;
  
  -- Check if permission exists in role permissions or user's custom permissions
  RETURN (
    role_permissions ? required_permission OR
    user_permissions ? required_permission OR
    role_permissions ? '*' OR
    user_permissions ? '*'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_has_role_or_higher(user_id uuid, required_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Define role hierarchy (higher number = higher privilege)
  -- admin = 4, commissioner = 3, coach = 2, spectator = 1
  CASE user_role
    WHEN 'admin' THEN role_hierarchy := 4;
    WHEN 'commissioner' THEN role_hierarchy := 3;
    WHEN 'coach' THEN role_hierarchy := 2;
    WHEN 'spectator' THEN role_hierarchy := 1;
    ELSE role_hierarchy := 0;
  END CASE;
  
  CASE required_role
    WHEN 'admin' THEN required_hierarchy := 4;
    WHEN 'commissioner' THEN required_hierarchy := 3;
    WHEN 'coach' THEN required_hierarchy := 2;
    WHEN 'spectator' THEN required_hierarchy := 1;
    ELSE required_hierarchy := 0;
  END CASE;
  
  -- User has role if their hierarchy >= required hierarchy
  RETURN role_hierarchy >= required_hierarchy;
END;
$function$
;

grant delete on table "public"."documents_old" to "anon";

grant insert on table "public"."documents_old" to "anon";

grant references on table "public"."documents_old" to "anon";

grant select on table "public"."documents_old" to "anon";

grant trigger on table "public"."documents_old" to "anon";

grant truncate on table "public"."documents_old" to "anon";

grant update on table "public"."documents_old" to "anon";

grant delete on table "public"."documents_old" to "authenticated";

grant insert on table "public"."documents_old" to "authenticated";

grant references on table "public"."documents_old" to "authenticated";

grant select on table "public"."documents_old" to "authenticated";

grant trigger on table "public"."documents_old" to "authenticated";

grant truncate on table "public"."documents_old" to "authenticated";

grant update on table "public"."documents_old" to "authenticated";

grant delete on table "public"."documents_old" to "service_role";

grant insert on table "public"."documents_old" to "service_role";

grant references on table "public"."documents_old" to "service_role";

grant select on table "public"."documents_old" to "service_role";

grant trigger on table "public"."documents_old" to "service_role";

grant truncate on table "public"."documents_old" to "service_role";

grant update on table "public"."documents_old" to "service_role";

grant delete on table "public"."upsertion_records" to "anon";

grant insert on table "public"."upsertion_records" to "anon";

grant references on table "public"."upsertion_records" to "anon";

grant select on table "public"."upsertion_records" to "anon";

grant trigger on table "public"."upsertion_records" to "anon";

grant truncate on table "public"."upsertion_records" to "anon";

grant update on table "public"."upsertion_records" to "anon";

grant delete on table "public"."upsertion_records" to "authenticated";

grant insert on table "public"."upsertion_records" to "authenticated";

grant references on table "public"."upsertion_records" to "authenticated";

grant select on table "public"."upsertion_records" to "authenticated";

grant trigger on table "public"."upsertion_records" to "authenticated";

grant truncate on table "public"."upsertion_records" to "authenticated";

grant update on table "public"."upsertion_records" to "authenticated";

grant delete on table "public"."upsertion_records" to "service_role";

grant insert on table "public"."upsertion_records" to "service_role";

grant references on table "public"."upsertion_records" to "service_role";

grant select on table "public"."upsertion_records" to "service_role";

grant trigger on table "public"."upsertion_records" to "service_role";

grant truncate on table "public"."upsertion_records" to "service_role";

grant update on table "public"."upsertion_records" to "service_role";


