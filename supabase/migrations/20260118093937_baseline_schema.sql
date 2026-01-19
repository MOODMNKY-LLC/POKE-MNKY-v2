


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."assign_coach_to_team"("p_user_id" "uuid", "p_team_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_coach_id UUID;
  v_team_id UUID;
  v_profile_display_name TEXT;
  v_profile_email TEXT;
BEGIN
  -- Get profile info
  SELECT display_name, email INTO v_profile_display_name, v_profile_email
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF v_profile_display_name IS NULL THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', p_user_id;
  END IF;
  
  -- Get or create coach entry
  SELECT id INTO v_coach_id
  FROM public.coaches
  WHERE user_id = p_user_id;
  
  IF v_coach_id IS NULL THEN
    INSERT INTO public.coaches (user_id, display_name, email)
    VALUES (p_user_id, v_profile_display_name, v_profile_email)
    RETURNING id INTO v_coach_id;
  END IF;
  
  -- Assign to team
  IF p_team_id IS NOT NULL THEN
    -- Check if team exists and is available
    SELECT id INTO v_team_id
    FROM public.teams
    WHERE id = p_team_id;
    
    IF v_team_id IS NULL THEN
      RAISE EXCEPTION 'Team not found: %', p_team_id;
    END IF;
    
    -- Update team coach_id (only if not already assigned)
    UPDATE public.teams
    SET coach_id = v_coach_id
    WHERE id = v_team_id AND (coach_id IS NULL OR coach_id = v_coach_id);
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Team % is already assigned to another coach', p_team_id;
    END IF;
  ELSE
    -- Find unassigned team for current season
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
  
  -- Update profile team_id
  UPDATE public.profiles
  SET team_id = v_team_id
  WHERE id = p_user_id;
  
  RETURN v_coach_id;
END;
$$;


ALTER FUNCTION "public"."assign_coach_to_team"("p_user_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_coach_to_team"("p_user_id" "uuid", "p_team_id" "uuid") IS 'Assigns a user (coach) to a team. Creates coach entry if needed. If no team_id provided, assigns to first available team in current season.';



CREATE OR REPLACE FUNCTION "public"."broadcast_draft_pick"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."broadcast_draft_pick"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."broadcast_draft_turn"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."broadcast_draft_turn"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_showdown_team_pokemon_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.pokemon_count = jsonb_array_length(NEW.pokemon_data);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_showdown_team_pokemon_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_pokedex_sprites_bucket"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- This function can be called from application code to verify bucket exists
  -- Actual bucket existence check must be done via Storage API
  RETURN 'Bucket check must be done via Storage API. Use supabase.storage.listBuckets() to verify.';
END;
$$;


ALTER FUNCTION "public"."check_pokedex_sprites_bucket"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_pokedex_sprites_bucket"() IS 'Helper function to remind that bucket existence must be checked via Storage API. The pokedex-sprites bucket should be created with public: true for CDN delivery.';



DROP FUNCTION IF EXISTS "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text");

CREATE OR REPLACE FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer DEFAULT NULL::integer, "p_max_points" integer DEFAULT NULL::integer, "p_generation" integer DEFAULT NULL::integer, "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("pokemon_id" "uuid", "pokemon_name" "text", "point_value" integer, "generation" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    dp.pokemon_id,
    dp.pokemon_name,
    dp.point_value,
    dp.generation
  FROM draft_pool dp
  WHERE dp.is_available = true
    AND dp.pokemon_id IS NOT NULL
    AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
    AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
    AND (p_generation IS NULL OR dp.generation = p_generation)
    AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
    AND dp.pokemon_id NOT IN (
      SELECT tr.pokemon_id
      FROM team_rosters tr
      INNER JOIN teams t ON tr.team_id = t.id
      WHERE t.season_id = p_season_id
        AND tr.pokemon_id IS NOT NULL
    )
  ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text") IS 'Get Pokemon available for free agency (not on any roster in the season)';



CREATE OR REPLACE FUNCTION "public"."get_pokemon_by_tier"("tier_points" integer) RETURNS TABLE("pokemon_name" "text", "point_value" integer, "generation" integer, "pokemon_cache_id" integer)
    LANGUAGE "plpgsql"
    AS $$
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
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$$;


ALTER FUNCTION "public"."get_pokemon_by_tier"("tier_points" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pokepedia_cron_status"() RETURNS TABLE("job_name" "text", "schedule" "text", "active" boolean, "last_run" timestamp with time zone, "next_run" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    j.last_run,
    j.next_run
  FROM cron.job j
  WHERE j.jobname IN ('pokepedia-worker', 'pokepedia-sprite-worker')
  ORDER BY j.jobname;
END;
$$;


ALTER FUNCTION "public"."get_pokepedia_cron_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pokepedia_cron_status"() IS 'Get status of Poképedia cron jobs';



CREATE OR REPLACE FUNCTION "public"."get_pokepedia_queue_stats"() RETURNS TABLE("queue_name" "text", "queue_length" bigint, "oldest_message_age" interval)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  ingest_metrics RECORD;
  sprite_metrics RECORD;
BEGIN
  -- Get metrics for pokepedia_ingest queue
  SELECT 
    (pgmq.metrics('pokepedia_ingest')).queue_length,
    (pgmq.metrics('pokepedia_ingest')).oldest_msg_age
  INTO ingest_metrics;
  
  -- Get metrics for pokepedia_sprites queue
  SELECT 
    (pgmq.metrics('pokepedia_sprites')).queue_length,
    (pgmq.metrics('pokepedia_sprites')).oldest_msg_age
  INTO sprite_metrics;
  
  -- Return results
  RETURN QUERY
  SELECT 
    'pokepedia_ingest'::TEXT AS queue_name,
    COALESCE(ingest_metrics.queue_length, 0)::BIGINT AS queue_length,
    ingest_metrics.oldest_msg_age
  UNION ALL
  SELECT 
    'pokepedia_sprites'::TEXT AS queue_name,
    COALESCE(sprite_metrics.queue_length, 0)::BIGINT AS queue_length,
    sprite_metrics.oldest_msg_age;
END;
$$;


ALTER FUNCTION "public"."get_pokepedia_queue_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pokepedia_queue_stats"() IS 'Returns queue depth and age metrics for monitoring.';



CREATE OR REPLACE FUNCTION "public"."get_pokepedia_sync_progress"() RETURNS TABLE("resource_type" "text", "synced_count" bigint, "total_estimated" bigint, "progress_percent" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.resource_type,
    COUNT(*)::BIGINT AS synced_count,
    CASE 
      WHEN pr.resource_type = 'pokemon' THEN 1025
      WHEN pr.resource_type = 'pokemon-species' THEN 1025
      WHEN pr.resource_type = 'move' THEN 1000
      WHEN pr.resource_type = 'ability' THEN 400
      WHEN pr.resource_type = 'type' THEN 20
      WHEN pr.resource_type = 'item' THEN 2000
      ELSE 100
    END AS total_estimated,
    ROUND(
      (COUNT(*)::NUMERIC / 
       CASE 
         WHEN pr.resource_type = 'pokemon' THEN 1025
         WHEN pr.resource_type = 'pokemon-species' THEN 1025
         WHEN pr.resource_type = 'move' THEN 1000
         WHEN pr.resource_type = 'ability' THEN 400
         WHEN pr.resource_type = 'type' THEN 20
         WHEN pr.resource_type = 'item' THEN 2000
         ELSE 100
       END) * 100, 
      2
    ) AS progress_percent
  FROM public.pokeapi_resources pr
  GROUP BY pr.resource_type
  ORDER BY pr.resource_type;
END;
$$;


ALTER FUNCTION "public"."get_pokepedia_sync_progress"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_pokepedia_sync_progress"() IS 'Returns sync progress by resource type (synced vs estimated total).';



CREATE OR REPLACE FUNCTION "public"."get_team_transaction_count"("p_team_id" "uuid", "p_season_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(transaction_count, 0)
  INTO v_count
  FROM team_transaction_counts
  WHERE team_id = p_team_id
    AND season_id = p_season_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_team_transaction_count"("p_team_id" "uuid", "p_season_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_team_transaction_count"("p_team_id" "uuid", "p_season_id" "uuid") IS 'Get transaction count for a team in a season';



CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_user_permissions"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  profile_count INTEGER;
  discord_id_value TEXT;
  existing_profile_id UUID;
BEGIN
  -- Check if any profiles exist at all (for first user admin logic)
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles;
  
  -- Get discord_id from metadata
  discord_id_value := NEW.raw_user_meta_data->>'provider_id';
  
  -- Check if profile with this discord_id already exists
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE discord_id = discord_id_value
    AND discord_id IS NOT NULL
  LIMIT 1;
  
  -- If profile exists with same discord_id but different id, update it
  IF existing_profile_id IS NOT NULL AND existing_profile_id != NEW.id THEN
    UPDATE public.profiles
    SET 
      id = NEW.id, -- Link to new auth.users record
      display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, display_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
      discord_username = COALESCE(NEW.raw_user_meta_data->>'username', discord_username), -- FIXED: 'username' not 'user_name'
      discord_avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', discord_avatar),
      updated_at = NOW()
    WHERE id = existing_profile_id;
  -- If profile with this id already exists, update it
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    UPDATE public.profiles
    SET 
      display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, display_name),
      avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
      email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, email_verified),
      discord_id = COALESCE(discord_id_value, discord_id),
      discord_username = COALESCE(NEW.raw_user_meta_data->>'username', discord_username), -- FIXED: 'username' not 'user_name'
      discord_avatar = COALESCE(NEW.raw_user_meta_data->>'avatar_url', discord_avatar),
      updated_at = NOW()
    WHERE id = NEW.id;
  -- Otherwise, insert new profile
  ELSE
    INSERT INTO public.profiles (id, display_name, avatar_url, email_verified, discord_id, discord_username, discord_avatar, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.email_confirmed_at IS NOT NULL,
      discord_id_value,
      NEW.raw_user_meta_data->>'username', -- FIXED: 'username' not 'user_name'
      NEW.raw_user_meta_data->>'avatar_url',
      CASE WHEN profile_count = 0 THEN 'admin' ELSE 'viewer' END
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_workflow_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
			BEGIN
				IF NEW."versionCounter" IS NOT DISTINCT FROM OLD."versionCounter" THEN
					NEW."versionCounter" = OLD."versionCounter" + 1;
				END IF;
				RETURN NEW;
			END;
			$$;


ALTER FUNCTION "public"."increment_workflow_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mcp_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  client_id text;
  claims jsonb;
BEGIN
  -- Extract client_id from event (if present)
  client_id := event->>'client_id';
  
  -- Get existing claims (or create empty object)
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Add client_id to claims (if not already present)
  IF client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(client_id));
  END IF;
  
  -- Add MCP-specific claim to indicate this token is for MCP access
  claims := jsonb_set(claims, '{mcp_access}', to_jsonb(true));
  
  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;


ALTER FUNCTION "public"."mcp_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mcp_access_token_hook"("event" "jsonb") IS 'Custom access token hook for MCP server OAuth. Adds client_id and mcp_access claims to tokens issued via Supabase OAuth Server.';



CREATE OR REPLACE FUNCTION "public"."unschedule_pokepedia_cron"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM cron.unschedule('pokepedia-worker');
  PERFORM cron.unschedule('pokepedia-sprite-worker');
END;
$$;


ALTER FUNCTION "public"."unschedule_pokepedia_cron"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."unschedule_pokepedia_cron"() IS 'Unschedule all Poképedia cron jobs';



CREATE OR REPLACE FUNCTION "public"."update_bulbapedia_mechanics_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bulbapedia_mechanics_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_canonical_league_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_canonical_league_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_showdown_client_teams_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_showdown_client_teams_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_showdown_teams_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_showdown_teams_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_smogon_meta_snapshot_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_smogon_meta_snapshot_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_team_categories_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_team_categories_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_team_formats_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_team_formats_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_team_tags_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_team_tags_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("user_id" "uuid", "required_permission" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."user_has_permission"("user_id" "uuid", "required_permission" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_free_agency_transaction"("p_team_id" "uuid", "p_season_id" "uuid", "p_transaction_type" "text", "p_added_points" integer DEFAULT 0, "p_dropped_points" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_spent INTEGER;
  v_current_roster_size INTEGER;
  v_transaction_count INTEGER;
  v_new_total INTEGER;
  v_new_roster_size INTEGER;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_is_valid BOOLEAN := true;
BEGIN
  -- Get current roster stats
  SELECT 
    COALESCE(SUM(draft_points), 0),
    COUNT(*)
  INTO v_current_spent, v_current_roster_size
  FROM team_rosters
  WHERE team_id = p_team_id;

  -- Get transaction count
  SELECT get_team_transaction_count(p_team_id, p_season_id)
  INTO v_transaction_count;

  -- Calculate new totals
  v_new_total := v_current_spent - p_dropped_points + p_added_points;
  
  IF p_transaction_type = 'replacement' THEN
    v_new_roster_size := v_current_roster_size;
  ELSIF p_transaction_type = 'addition' THEN
    v_new_roster_size := v_current_roster_size + 1;
  ELSIF p_transaction_type = 'drop_only' THEN
    v_new_roster_size := v_current_roster_size - 1;
  ELSE
    v_new_roster_size := v_current_roster_size;
  END IF;

  -- Validation checks
  IF v_new_total > 120 THEN
    v_errors := array_append(v_errors, format('Budget exceeded: %s/120 points (%s over)', v_new_total, v_new_total - 120));
    v_is_valid := false;
  END IF;

  IF v_new_roster_size < 8 THEN
    v_errors := array_append(v_errors, format('Roster size would be %s, minimum is 8', v_new_roster_size));
    v_is_valid := false;
  END IF;

  IF v_new_roster_size > 10 THEN
    v_errors := array_append(v_errors, format('Roster size would be %s, maximum is 10', v_new_roster_size));
    v_is_valid := false;
  END IF;

  IF v_transaction_count >= 10 THEN
    v_errors := array_append(v_errors, 'Transaction limit reached (10 F/A moves per season)');
    v_is_valid := false;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'errors', v_errors,
    'new_roster_size', v_new_roster_size,
    'new_point_total', v_new_total,
    'transaction_count', v_transaction_count,
    'remaining_transactions', GREATEST(0, 10 - v_transaction_count)
  );
END;
$$;


ALTER FUNCTION "public"."validate_free_agency_transaction"("p_team_id" "uuid", "p_season_id" "uuid", "p_transaction_type" "text", "p_added_points" integer, "p_dropped_points" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_free_agency_transaction"("p_team_id" "uuid", "p_season_id" "uuid", "p_transaction_type" "text", "p_added_points" integer, "p_dropped_points" integer) IS 'Validate a free agency transaction before submission';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."abilities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "ability_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "is_main_series" boolean DEFAULT true,
    "effect_entries" "jsonb",
    "flavor_text_entries" "jsonb",
    "generation_id" integer,
    "pokemon" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "effect_changes" "jsonb"
);


ALTER TABLE "public"."abilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."abilities" IS 'Pokemon abilities master data';



COMMENT ON COLUMN "public"."abilities"."effect_changes" IS 'Array of effect changes by version group from PokeAPI';



CREATE TABLE IF NOT EXISTS "public"."annotation_tag_entity" (
    "id" character varying(16) NOT NULL,
    "name" character varying(24) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."annotation_tag_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth" (
    "id" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password" "text" NOT NULL,
    "active" boolean NOT NULL
);


ALTER TABLE "public"."auth" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_identity" (
    "userId" "uuid",
    "providerId" character varying(64) NOT NULL,
    "providerType" character varying(32) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."auth_identity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."auth_provider_sync_history" (
    "id" integer NOT NULL,
    "providerType" character varying(32) NOT NULL,
    "runMode" "text" NOT NULL,
    "status" "text" NOT NULL,
    "startedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "scanned" integer NOT NULL,
    "created" integer NOT NULL,
    "updated" integer NOT NULL,
    "disabled" integer NOT NULL,
    "error" "text"
);


ALTER TABLE "public"."auth_provider_sync_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."auth_provider_sync_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."auth_provider_sync_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."auth_provider_sync_history_id_seq" OWNED BY "public"."auth_provider_sync_history"."id";



CREATE TABLE IF NOT EXISTS "public"."battle_events" (
    "id" bigint NOT NULL,
    "battle_id" "uuid" NOT NULL,
    "turn" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."battle_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."battle_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."battle_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."battle_events_id_seq" OWNED BY "public"."battle_events"."id";



CREATE TABLE IF NOT EXISTS "public"."battle_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "match_id" "uuid",
    "format" "text" NOT NULL,
    "team_a_id" "uuid" NOT NULL,
    "team_b_id" "uuid" NOT NULL,
    "state" "jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "winner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "battle_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'complete'::"text", 'aborted'::"text"])))
);


ALTER TABLE "public"."battle_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."berries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "berry_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "growth_time" integer,
    "max_harvest" integer,
    "natural_gift_power" integer,
    "size" integer,
    "smoothness" integer,
    "soil_dryness" integer,
    "firmness_id" integer,
    "flavors" "jsonb",
    "item_id" integer,
    "natural_gift_type_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."berries" OWNER TO "postgres";


COMMENT ON TABLE "public"."berries" IS 'Berries that Pokemon can consume';



CREATE TABLE IF NOT EXISTS "public"."berry_firmnesses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "firmness_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "berries" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."berry_firmnesses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."berry_flavors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "flavor_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "berries" "jsonb",
    "contest_type_id" integer,
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."berry_flavors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."binary_data" (
    "fileId" "uuid" NOT NULL,
    "sourceType" character varying(50) NOT NULL,
    "sourceId" character varying(255) NOT NULL,
    "data" "bytea" NOT NULL,
    "mimeType" character varying(255),
    "fileName" character varying(255),
    "fileSize" integer NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CHK_binary_data_sourceType" CHECK ((("sourceType")::"text" = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::"text"[])))
);


ALTER TABLE "public"."binary_data" OWNER TO "postgres";


COMMENT ON COLUMN "public"."binary_data"."sourceType" IS 'Source the file belongs to, e.g. ''execution''';



COMMENT ON COLUMN "public"."binary_data"."sourceId" IS 'ID of the source, e.g. execution ID';



COMMENT ON COLUMN "public"."binary_data"."data" IS 'Raw, not base64 encoded';



COMMENT ON COLUMN "public"."binary_data"."fileSize" IS 'In bytes';



CREATE TABLE IF NOT EXISTS "public"."bulbapedia_mechanics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "generation" integer,
    "tags" "text"[],
    "attribution" "text" DEFAULT 'Source: Bulbapedia (CC-BY-SA)'::"text" NOT NULL,
    "curated_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bulbapedia_mechanics" OWNER TO "postgres";


COMMENT ON TABLE "public"."bulbapedia_mechanics" IS 'Stores curated mechanics explanations from Bulbapedia (CC-BY-SA licensed)';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."resource_type" IS 'Type of resource: ability, move, mechanic, item';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."resource_name" IS 'Name of the resource (e.g., Intimidate, Trick Room, Sleep)';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."content" IS 'Normalized markdown/text content extracted from Bulbapedia';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."source_url" IS 'Original Bulbapedia URL for attribution';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."generation" IS 'Applicable generation (NULL means all generations)';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."tags" IS 'Array of tags for categorization and filtering';



COMMENT ON COLUMN "public"."bulbapedia_mechanics"."attribution" IS 'Attribution text (required by CC-BY-SA license)';



CREATE TABLE IF NOT EXISTS "public"."canonical_league_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid",
    "intra_divisional_weight" numeric(3,2) DEFAULT 1.5 NOT NULL,
    "intra_conference_weight" numeric(3,2) DEFAULT 1.25 NOT NULL,
    "cross_conference_weight" numeric(3,2) DEFAULT 1.0 NOT NULL,
    "team_count" integer NOT NULL,
    "division_count" integer DEFAULT 4 NOT NULL,
    "conference_count" integer DEFAULT 2 NOT NULL,
    "playoff_teams" integer DEFAULT 12 NOT NULL,
    "ranking_criteria" "jsonb" DEFAULT '[{"priority": 1, "criterion": "win_percentage", "direction": "descending"}, {"priority": 2, "criterion": "losses", "direction": "ascending"}, {"priority": 3, "criterion": "point_differential", "direction": "descending"}, {"priority": 4, "criterion": "head_to_head", "direction": "better_record_wins"}, {"priority": 5, "criterion": "win_streak", "direction": "descending"}, {"priority": 6, "criterion": "strength_of_schedule", "direction": "descending"}, {"priority": 7, "criterion": "team_name_alphabetical", "direction": "ascending"}]'::"jsonb" NOT NULL,
    "win_streak_type" "text" DEFAULT 'active'::"text" NOT NULL,
    "win_streak_breaks_on_loss" boolean DEFAULT true NOT NULL,
    "h2h_applies_to_two_team_ties" boolean DEFAULT true NOT NULL,
    "h2h_applies_to_multi_team_ties" boolean DEFAULT true NOT NULL,
    "h2h_multi_team_method" "text" DEFAULT 'mini_table'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."canonical_league_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_league_config" IS 'Canonical league rules and constants configuration';



COMMENT ON COLUMN "public"."canonical_league_config"."intra_divisional_weight" IS 'Battle weight multiplier for intra-divisional matches (1.5x)';



COMMENT ON COLUMN "public"."canonical_league_config"."intra_conference_weight" IS 'Battle weight multiplier for intra-conference matches (1.25x)';



COMMENT ON COLUMN "public"."canonical_league_config"."cross_conference_weight" IS 'Battle weight multiplier for cross-conference matches (1.0x)';



COMMENT ON COLUMN "public"."canonical_league_config"."ranking_criteria" IS 'JSON array of ranking criteria in priority order';



COMMENT ON COLUMN "public"."canonical_league_config"."win_streak_type" IS 'Type of win streak: active (current consecutive) or best_ever (historical maximum)';



COMMENT ON COLUMN "public"."canonical_league_config"."h2h_multi_team_method" IS 'Method for H2H in multi-team ties: mini_table (record vs tied group) or direct_only (pairwise only)';



CREATE TABLE IF NOT EXISTS "public"."characteristics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "characteristic_id" integer NOT NULL,
    "gene_modulo" integer,
    "possible_values" "jsonb",
    "highest_stat_id" integer,
    "descriptions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."characteristics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat" (
    "id" character varying(255) NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "title" "text" NOT NULL,
    "chat" "text" NOT NULL,
    "share_id" character varying(255),
    "archived" boolean NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);


ALTER TABLE "public"."chat" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_hub_agents" (
    "id" "uuid" NOT NULL,
    "name" character varying(256) NOT NULL,
    "description" character varying(512),
    "systemPrompt" "text" NOT NULL,
    "ownerId" "uuid" NOT NULL,
    "credentialId" character varying(36),
    "provider" character varying(16) NOT NULL,
    "model" character varying(64) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "tools" json DEFAULT '[]'::json NOT NULL,
    "icon" json
);


ALTER TABLE "public"."chat_hub_agents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_hub_agents"."provider" IS 'ChatHubProvider enum: "openai", "anthropic", "google", "n8n"';



COMMENT ON COLUMN "public"."chat_hub_agents"."model" IS 'Model name used at the respective Model node, ie. "gpt-4"';



COMMENT ON COLUMN "public"."chat_hub_agents"."tools" IS 'Tools available to the agent as JSON node definitions';



CREATE TABLE IF NOT EXISTS "public"."chat_hub_messages" (
    "id" "uuid" NOT NULL,
    "sessionId" "uuid" NOT NULL,
    "previousMessageId" "uuid",
    "revisionOfMessageId" "uuid",
    "retryOfMessageId" "uuid",
    "type" character varying(16) NOT NULL,
    "name" character varying(128) NOT NULL,
    "content" "text" NOT NULL,
    "provider" character varying(16),
    "model" character varying(64),
    "workflowId" character varying(36),
    "executionId" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "agentId" "uuid",
    "status" character varying(16) DEFAULT 'success'::character varying NOT NULL,
    "attachments" json
);


ALTER TABLE "public"."chat_hub_messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_hub_messages"."type" IS 'ChatHubMessageType enum: "human", "ai", "system", "tool", "generic"';



COMMENT ON COLUMN "public"."chat_hub_messages"."provider" IS 'ChatHubProvider enum: "openai", "anthropic", "google", "n8n"';



COMMENT ON COLUMN "public"."chat_hub_messages"."model" IS 'Model name used at the respective Model node, ie. "gpt-4"';



COMMENT ON COLUMN "public"."chat_hub_messages"."agentId" IS 'ID of the custom agent (if provider is "custom-agent")';



COMMENT ON COLUMN "public"."chat_hub_messages"."status" IS 'ChatHubMessageStatus enum, eg. "success", "error", "running", "cancelled"';



COMMENT ON COLUMN "public"."chat_hub_messages"."attachments" IS 'File attachments for the message (if any), stored as JSON. Files are stored as base64-encoded data URLs.';



CREATE TABLE IF NOT EXISTS "public"."chat_hub_sessions" (
    "id" "uuid" NOT NULL,
    "title" character varying(256) NOT NULL,
    "ownerId" "uuid" NOT NULL,
    "lastMessageAt" timestamp(3) with time zone NOT NULL,
    "credentialId" character varying(36),
    "provider" character varying(16),
    "model" character varying(64),
    "workflowId" character varying(36),
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "agentId" "uuid",
    "agentName" character varying(128),
    "tools" json DEFAULT '[]'::json NOT NULL
);


ALTER TABLE "public"."chat_hub_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_hub_sessions"."provider" IS 'ChatHubProvider enum: "openai", "anthropic", "google", "n8n"';



COMMENT ON COLUMN "public"."chat_hub_sessions"."model" IS 'Model name used at the respective Model node, ie. "gpt-4"';



COMMENT ON COLUMN "public"."chat_hub_sessions"."agentId" IS 'ID of the custom agent (if provider is "custom-agent")';



COMMENT ON COLUMN "public"."chat_hub_sessions"."agentName" IS 'Cached name of the custom agent (if provider is "custom-agent")';



COMMENT ON COLUMN "public"."chat_hub_sessions"."tools" IS 'Tools available to the agent as JSON node definitions';



CREATE TABLE IF NOT EXISTS "public"."chatidtag" (
    "id" character varying(255) NOT NULL,
    "tag_name" character varying(255) NOT NULL,
    "chat_id" character varying(255) NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "timestamp" bigint NOT NULL
);


ALTER TABLE "public"."chatidtag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coaches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "discord_id" "text",
    "display_name" "text" NOT NULL,
    "email" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coaches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conferences" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contest_effects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contest_effect_id" integer NOT NULL,
    "appeal" integer,
    "jam" integer,
    "effect_entries" "jsonb",
    "flavor_text_entries" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contest_effects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contest_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contest_type_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "berry_flavor_id" integer,
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contest_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credentials_entity" (
    "name" character varying(128) NOT NULL,
    "data" "text" NOT NULL,
    "type" character varying(128) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "id" character varying(36) NOT NULL,
    "isManaged" boolean DEFAULT false NOT NULL,
    "isGlobal" boolean DEFAULT false NOT NULL,
    "isResolvable" boolean DEFAULT false NOT NULL,
    "resolvableAllowFallback" boolean DEFAULT false NOT NULL,
    "resolverId" character varying(16)
);


ALTER TABLE "public"."credentials_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_table" (
    "id" character varying(36) NOT NULL,
    "name" character varying(128) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."data_table" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_table_column" (
    "id" character varying(36) NOT NULL,
    "name" character varying(128) NOT NULL,
    "type" character varying(32) NOT NULL,
    "index" integer NOT NULL,
    "dataTableId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."data_table_column" OWNER TO "postgres";


COMMENT ON COLUMN "public"."data_table_column"."type" IS 'Expected: string, number, boolean, or date (not enforced as a constraint)';



COMMENT ON COLUMN "public"."data_table_column"."index" IS 'Column order, starting from 0 (0 = first column)';



CREATE TABLE IF NOT EXISTS "public"."discord_webhooks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "webhook_url" "text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discord_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "conference_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document" (
    "id" integer NOT NULL,
    "collection_name" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "title" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "content" "text",
    "user_id" character varying(255) NOT NULL,
    "timestamp" bigint NOT NULL
);


ALTER TABLE "public"."document" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."document_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."document_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."document_id_seq" OWNED BY "public"."document"."id";



CREATE TABLE IF NOT EXISTS "public"."draft_budgets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "total_points" integer DEFAULT 120,
    "spent_points" integer DEFAULT 0,
    "remaining_points" integer GENERATED ALWAYS AS (("total_points" - "spent_points")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."draft_budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."draft_pool" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_name" "text" NOT NULL,
    "point_value" integer NOT NULL,
    "is_available" boolean DEFAULT true,
    "generation" integer,
    "sheet_name" "text" NOT NULL,
    "sheet_row" integer,
    "sheet_column" "text",
    "extracted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pokemon_id" integer,
    CONSTRAINT "draft_pool_generation_check" CHECK ((("generation" >= 1) AND ("generation" <= 9))),
    CONSTRAINT "draft_pool_point_value_check" CHECK ((("point_value" >= 1) AND ("point_value" <= 20)))
);


ALTER TABLE "public"."draft_pool" OWNER TO "postgres";


COMMENT ON TABLE "public"."draft_pool" IS 'Stores the complete list of Pokemon available for drafting with their point values';



COMMENT ON COLUMN "public"."draft_pool"."pokemon_id" IS 'Pokemon ID from pokemon_cache/pokepedia_pokemon for sprite URLs and enhanced data';



COMMENT ON CONSTRAINT "draft_pool_point_value_check" ON "public"."draft_pool" IS 'Point values range from 1 to 20 as per league draft rules';



CREATE TABLE IF NOT EXISTS "public"."draft_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "season_id" "uuid",
    "session_name" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "draft_type" "text" DEFAULT 'snake'::"text",
    "total_teams" integer DEFAULT 20 NOT NULL,
    "total_rounds" integer DEFAULT 11 NOT NULL,
    "current_pick_number" integer DEFAULT 1,
    "current_team_id" "uuid",
    "current_round" integer DEFAULT 1,
    "turn_order" "jsonb" DEFAULT '[]'::"jsonb",
    "pick_time_limit_seconds" integer DEFAULT 45,
    "auto_draft_enabled" boolean DEFAULT false,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "draft_sessions_draft_type_check" CHECK (("draft_type" = ANY (ARRAY['snake'::"text", 'linear'::"text", 'auction'::"text"]))),
    CONSTRAINT "draft_sessions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."draft_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."draft_sessions" IS 'Manages active draft sessions, turn order, and current pick state';



CREATE TABLE IF NOT EXISTS "public"."dynamic_credential_entry" (
    "credential_id" character varying(16) NOT NULL,
    "subject_id" character varying(16) NOT NULL,
    "resolver_id" character varying(16) NOT NULL,
    "data" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."dynamic_credential_entry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dynamic_credential_resolver" (
    "id" character varying(16) NOT NULL,
    "name" character varying(128) NOT NULL,
    "type" character varying(128) NOT NULL,
    "config" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."dynamic_credential_resolver" OWNER TO "postgres";


COMMENT ON COLUMN "public"."dynamic_credential_resolver"."config" IS 'Encrypted resolver configuration (JSON encrypted as string)';



CREATE TABLE IF NOT EXISTS "public"."egg_groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "egg_group_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "pokemon_species" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."egg_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."egg_groups" IS 'Egg groups for Pokemon breeding';



CREATE TABLE IF NOT EXISTS "public"."encounter_condition_values" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_condition_value_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "condition_id" integer,
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."encounter_condition_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."encounter_conditions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_condition_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "values" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."encounter_conditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."encounter_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "encounter_method_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "order" integer,
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."encounter_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_destinations" (
    "id" "uuid" NOT NULL,
    "destination" "jsonb" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."event_destinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evolution_chains" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "evolution_chain_id" integer NOT NULL,
    "baby_trigger_item_id" integer,
    "chain_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."evolution_chains" OWNER TO "postgres";


COMMENT ON TABLE "public"."evolution_chains" IS 'Pokemon evolution chain data';



CREATE TABLE IF NOT EXISTS "public"."evolution_triggers" (
    "trigger_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "pokemon_species" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."evolution_triggers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."execution_annotation_tags" (
    "annotationId" integer NOT NULL,
    "tagId" character varying(24) NOT NULL
);


ALTER TABLE "public"."execution_annotation_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."execution_annotations" (
    "id" integer NOT NULL,
    "executionId" integer NOT NULL,
    "vote" character varying(6),
    "note" "text",
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."execution_annotations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."execution_annotations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."execution_annotations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."execution_annotations_id_seq" OWNED BY "public"."execution_annotations"."id";



CREATE TABLE IF NOT EXISTS "public"."execution_data" (
    "executionId" integer NOT NULL,
    "workflowData" json NOT NULL,
    "data" "text" NOT NULL,
    "workflowVersionId" character varying(36)
);


ALTER TABLE "public"."execution_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."execution_entity" (
    "id" integer NOT NULL,
    "finished" boolean NOT NULL,
    "mode" character varying NOT NULL,
    "retryOf" character varying,
    "retrySuccessId" character varying,
    "startedAt" timestamp(3) with time zone,
    "stoppedAt" timestamp(3) with time zone,
    "waitTill" timestamp(3) with time zone,
    "status" character varying NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "deletedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."execution_entity" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."execution_entity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."execution_entity_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."execution_entity_id_seq" OWNED BY "public"."execution_entity"."id";



CREATE TABLE IF NOT EXISTS "public"."execution_metadata" (
    "id" integer NOT NULL,
    "executionId" integer NOT NULL,
    "key" character varying(255) NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."execution_metadata" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."execution_metadata_temp_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."execution_metadata_temp_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."execution_metadata_temp_id_seq" OWNED BY "public"."execution_metadata"."id";



CREATE TABLE IF NOT EXISTS "public"."file" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "meta" "text" NOT NULL,
    "created_at" bigint NOT NULL
);


ALTER TABLE "public"."file" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folder" (
    "id" character varying(36) NOT NULL,
    "name" character varying(128) NOT NULL,
    "parentFolderId" character varying(36),
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."folder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folder_tag" (
    "folderId" character varying(36) NOT NULL,
    "tagId" character varying(36) NOT NULL
);


ALTER TABLE "public"."folder_tag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "meta" "text" NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "valves" "text",
    "is_active" boolean NOT NULL,
    "is_global" boolean NOT NULL
);


ALTER TABLE "public"."function" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gender_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "pokemon_species_details" "jsonb",
    "required_for_evolution" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."genders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "generation_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "abilities" "jsonb",
    "main_region_id" integer,
    "moves" "jsonb",
    "pokemon_species" "jsonb",
    "types" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "names" "jsonb",
    "version_groups" "jsonb"
);


ALTER TABLE "public"."generations" OWNER TO "postgres";


COMMENT ON TABLE "public"."generations" IS 'Pokemon generations master data';



COMMENT ON COLUMN "public"."generations"."names" IS 'Localized names array from PokeAPI';



COMMENT ON COLUMN "public"."generations"."version_groups" IS 'Version groups array from PokeAPI';



CREATE TABLE IF NOT EXISTS "public"."google_sheets_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "spreadsheet_id" "text" NOT NULL,
    "service_account_email" "text",
    "service_account_private_key" "text",
    "enabled" boolean DEFAULT true,
    "sync_schedule" "text" DEFAULT 'manual'::"text",
    "last_sync_at" timestamp with time zone,
    "last_sync_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "google_sheets_config_last_sync_status_check" CHECK (("last_sync_status" = ANY (ARRAY['success'::"text", 'error'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."google_sheets_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."growth_rates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "growth_rate_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "formula" "text",
    "descriptions" "jsonb",
    "levels" "jsonb",
    "pokemon_species" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."growth_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insights_by_period" (
    "id" integer NOT NULL,
    "metaId" integer NOT NULL,
    "type" integer NOT NULL,
    "value" bigint NOT NULL,
    "periodUnit" integer NOT NULL,
    "periodStart" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."insights_by_period" OWNER TO "postgres";


COMMENT ON COLUMN "public"."insights_by_period"."type" IS '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';



COMMENT ON COLUMN "public"."insights_by_period"."periodUnit" IS '0: hour, 1: day, 2: week';



ALTER TABLE "public"."insights_by_period" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."insights_by_period_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."insights_metadata" (
    "metaId" integer NOT NULL,
    "workflowId" character varying(36),
    "projectId" character varying(36),
    "workflowName" character varying(128) NOT NULL,
    "projectName" character varying(255) NOT NULL
);


ALTER TABLE "public"."insights_metadata" OWNER TO "postgres";


ALTER TABLE "public"."insights_metadata" ALTER COLUMN "metaId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."insights_metadata_metaId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."insights_raw" (
    "id" integer NOT NULL,
    "metaId" integer NOT NULL,
    "type" integer NOT NULL,
    "value" bigint NOT NULL,
    "timestamp" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."insights_raw" OWNER TO "postgres";


COMMENT ON COLUMN "public"."insights_raw"."type" IS '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';



ALTER TABLE "public"."insights_raw" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."insights_raw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."installed_nodes" (
    "name" character varying(200) NOT NULL,
    "type" character varying(200) NOT NULL,
    "latestVersion" integer DEFAULT 1 NOT NULL,
    "package" character varying(241) NOT NULL
);


ALTER TABLE "public"."installed_nodes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installed_packages" (
    "packageName" character varying(214) NOT NULL,
    "installedVersion" character varying(50) NOT NULL,
    "authorName" character varying(70),
    "authorEmail" character varying(70),
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."installed_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invalid_auth_token" (
    "token" character varying(512) NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE "public"."invalid_auth_token" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_attributes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_attribute_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "items" "jsonb",
    "names" "jsonb",
    "descriptions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_category_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "items" "jsonb",
    "names" "jsonb",
    "pocket_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_fling_effects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_fling_effect_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "effect_entries" "jsonb",
    "items" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_fling_effects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."item_pockets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_pocket_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "categories" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."item_pockets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "item_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "cost" integer,
    "fling_power" integer,
    "fling_effect_id" integer,
    "attributes" "jsonb",
    "category_id" integer,
    "effect_entries" "jsonb",
    "flavor_text_entries" "jsonb",
    "game_indices" "jsonb",
    "sprites" "jsonb",
    "held_by_pokemon" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "names" "jsonb",
    "baby_trigger_for" "jsonb",
    "machines" "jsonb"
);


ALTER TABLE "public"."items" OWNER TO "postgres";


COMMENT ON TABLE "public"."items" IS 'Pokemon items master data';



COMMENT ON COLUMN "public"."items"."names" IS 'Localized names array from PokeAPI';



COMMENT ON COLUMN "public"."items"."baby_trigger_for" IS 'Evolution chain that uses this item as baby trigger from PokeAPI';



COMMENT ON COLUMN "public"."items"."machines" IS 'TM/HM machine data from PokeAPI';



CREATE TABLE IF NOT EXISTS "public"."languages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "language_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "official" boolean DEFAULT false,
    "iso639" "text",
    "iso3166" "text",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."league_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "config_type" "text" NOT NULL,
    "section_title" "text" NOT NULL,
    "section_type" "text",
    "content" "text",
    "subsections" "jsonb" DEFAULT '[]'::"jsonb",
    "embedded_tables" "jsonb" DEFAULT '[]'::"jsonb",
    "sheet_name" "text",
    "extracted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "league_config_config_type_check" CHECK (("config_type" = ANY (ARRAY['rules'::"text", 'scoring'::"text", 'draft_settings'::"text", 'season_structure'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."league_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."league_config" IS 'Stores league rules and configuration parsed from Google Sheets';



CREATE TABLE IF NOT EXISTS "public"."location_areas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "location_area_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "game_index" integer,
    "location_id" integer,
    "encounter_method_rates" "jsonb",
    "pokemon_encounters" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."location_areas" OWNER TO "postgres";


COMMENT ON TABLE "public"."location_areas" IS 'Specific areas within locations with Pokemon encounters';



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "location_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "region_id" integer,
    "names" "jsonb",
    "game_indices" "jsonb",
    "areas" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."locations" IS 'Locations where Pokemon can be found';



CREATE TABLE IF NOT EXISTS "public"."machines" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "machine_id" integer NOT NULL,
    "item_id" integer,
    "move_id" integer,
    "version_group_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."machines" OWNER TO "postgres";


COMMENT ON TABLE "public"."machines" IS 'TMs and HMs that teach moves';



CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "week" integer NOT NULL,
    "team1_id" "uuid" NOT NULL,
    "team2_id" "uuid" NOT NULL,
    "winner_id" "uuid",
    "team1_score" integer DEFAULT 0,
    "team2_score" integer DEFAULT 0,
    "differential" integer DEFAULT 0,
    "is_playoff" boolean DEFAULT false,
    "playoff_round" "text",
    "played_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "matchweek_id" "uuid",
    "season_id" "uuid",
    "scheduled_time" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text",
    "replay_url" "text",
    "submitted_by" "uuid",
    "approved_by" "uuid",
    "notes" "text",
    "showdown_room_id" "text",
    "showdown_room_url" "text",
    CONSTRAINT "matches_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'disputed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."matches"."showdown_room_id" IS 'Showdown room identifier for battle tracking (e.g., battle-match-{match_id})';



COMMENT ON COLUMN "public"."matches"."showdown_room_url" IS 'Full URL to join Showdown battle room';



CREATE TABLE IF NOT EXISTS "public"."matchweeks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "week_number" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_playoff" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."matchweeks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memory" (
    "id" character varying(255) NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "updated_at" bigint NOT NULL,
    "created_at" bigint NOT NULL
);


ALTER TABLE "public"."memory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."migratehistory" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "migrated_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."migratehistory" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."migratehistory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."migratehistory_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migratehistory_id_seq" OWNED BY "public"."migratehistory"."id";



CREATE TABLE IF NOT EXISTS "public"."migrations" (
    "id" integer NOT NULL,
    "timestamp" bigint NOT NULL,
    "name" character varying NOT NULL
);


ALTER TABLE "public"."migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."migrations_id_seq" OWNED BY "public"."migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."model" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "base_model_id" "text",
    "name" "text" NOT NULL,
    "meta" "text" NOT NULL,
    "params" "text" NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL
);


ALTER TABLE "public"."model" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."move_ailments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_ailment_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "moves" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."move_ailments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."move_battle_styles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_battle_style_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."move_battle_styles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."move_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_category_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "moves" "jsonb",
    "descriptions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."move_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."move_damage_classes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_damage_class_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "descriptions" "jsonb",
    "moves" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."move_damage_classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."move_learn_methods" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_learn_method_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "descriptions" "jsonb",
    "names" "jsonb",
    "version_groups" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."move_learn_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."move_targets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_target_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "descriptions" "jsonb",
    "moves" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."move_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."moves" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "move_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "accuracy" integer,
    "effect_chance" integer,
    "pp" integer,
    "priority" integer,
    "power" integer,
    "damage_class_id" integer,
    "type_id" integer,
    "target_id" integer,
    "effect_entries" "jsonb",
    "flavor_text_entries" "jsonb",
    "stat_changes" "jsonb",
    "meta" "jsonb",
    "generation_id" integer,
    "learned_by_pokemon" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "contest_combos" "jsonb",
    "contest_type_id" integer,
    "contest_effect_id" integer,
    "effect_changes" "jsonb",
    "names" "jsonb",
    "past_values" "jsonb",
    "super_contest_effect_id" integer,
    "machines" "jsonb"
);


ALTER TABLE "public"."moves" OWNER TO "postgres";


COMMENT ON TABLE "public"."moves" IS 'Pokemon moves master data';



COMMENT ON COLUMN "public"."moves"."contest_combos" IS 'Contest combo data from PokeAPI';



COMMENT ON COLUMN "public"."moves"."contest_type_id" IS 'Contest type ID extracted from contest_type.url';



COMMENT ON COLUMN "public"."moves"."contest_effect_id" IS 'Contest effect ID extracted from contest_effect.url';



COMMENT ON COLUMN "public"."moves"."effect_changes" IS 'Effect changes by version group from PokeAPI';



COMMENT ON COLUMN "public"."moves"."names" IS 'Localized names array from PokeAPI';



COMMENT ON COLUMN "public"."moves"."past_values" IS 'Historical move values from PokeAPI';



COMMENT ON COLUMN "public"."moves"."super_contest_effect_id" IS 'Super contest effect ID extracted from super_contest_effect.url';



COMMENT ON COLUMN "public"."moves"."machines" IS 'TM/HM machine data from PokeAPI';



CREATE TABLE IF NOT EXISTS "public"."natures" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nature_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "decreased_stat_id" integer,
    "increased_stat_id" integer,
    "hates_flavor_id" integer,
    "likes_flavor_id" integer,
    "pokeathlon_stat_changes" "jsonb",
    "move_battle_style_preferences" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."natures" OWNER TO "postgres";


COMMENT ON TABLE "public"."natures" IS 'Pokemon natures affecting stat growth';



CREATE TABLE IF NOT EXISTS "public"."oauth_access_tokens" (
    "token" character varying NOT NULL,
    "clientId" character varying NOT NULL,
    "userId" "uuid" NOT NULL
);


ALTER TABLE "public"."oauth_access_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oauth_authorization_codes" (
    "code" character varying(255) NOT NULL,
    "clientId" character varying NOT NULL,
    "userId" "uuid" NOT NULL,
    "redirectUri" character varying NOT NULL,
    "codeChallenge" character varying NOT NULL,
    "codeChallengeMethod" character varying(255) NOT NULL,
    "expiresAt" bigint NOT NULL,
    "state" character varying,
    "used" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."oauth_authorization_codes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."oauth_authorization_codes"."expiresAt" IS 'Unix timestamp in milliseconds';



CREATE TABLE IF NOT EXISTS "public"."oauth_clients" (
    "id" character varying NOT NULL,
    "name" character varying(255) NOT NULL,
    "redirectUris" json NOT NULL,
    "grantTypes" json NOT NULL,
    "clientSecret" character varying(255),
    "clientSecretExpiresAt" bigint,
    "tokenEndpointAuthMethod" character varying(255) DEFAULT 'none'::character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."oauth_clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."oauth_clients"."tokenEndpointAuthMethod" IS 'Possible values: none, client_secret_basic or client_secret_post';



CREATE TABLE IF NOT EXISTS "public"."oauth_refresh_tokens" (
    "token" character varying(255) NOT NULL,
    "clientId" character varying NOT NULL,
    "userId" "uuid" NOT NULL,
    "expiresAt" bigint NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."oauth_refresh_tokens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."oauth_refresh_tokens"."expiresAt" IS 'Unix timestamp in milliseconds';



CREATE TABLE IF NOT EXISTS "public"."oauth_user_consents" (
    "id" integer NOT NULL,
    "userId" "uuid" NOT NULL,
    "clientId" character varying NOT NULL,
    "grantedAt" bigint NOT NULL
);


ALTER TABLE "public"."oauth_user_consents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."oauth_user_consents"."grantedAt" IS 'Unix timestamp in milliseconds';



ALTER TABLE "public"."oauth_user_consents" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."oauth_user_consents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."team_rosters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "pokemon_id" "uuid" NOT NULL,
    "draft_round" integer NOT NULL,
    "draft_order" integer NOT NULL,
    "draft_points" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "source" "text" DEFAULT 'draft'::"text",
    CONSTRAINT "team_rosters_source_check" CHECK (("source" = ANY (ARRAY['draft'::"text", 'free_agency'::"text", 'trade'::"text"])))
);


ALTER TABLE "public"."team_rosters" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."ownership_history" AS
 SELECT "pokemon_id",
    "team_id",
    'draft'::"text" AS "source",
    "draft_round",
    "draft_order",
    "created_at" AS "acquired_at"
   FROM "public"."team_rosters"
  WHERE ("draft_round" IS NOT NULL);


ALTER VIEW "public"."ownership_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pal_park_areas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pal_park_area_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "pokemon_encounters" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pal_park_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokeapi_resource_cache" (
    "url" "text" NOT NULL,
    "etag" "text",
    "last_modified" timestamp with time zone,
    "resource_type" "text" NOT NULL,
    "resource_id" integer,
    "resource_name" "text",
    "data_hash" "text",
    "cached_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokeapi_resource_cache" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokeapi_resource_cache" IS 'ETag cache for PokéAPI resources to enable conditional requests and incremental sync';



CREATE TABLE IF NOT EXISTS "public"."pokeapi_resources" (
    "id" bigint NOT NULL,
    "resource_type" "text" NOT NULL,
    "resource_key" "text" NOT NULL,
    "name" "text",
    "url" "text" NOT NULL,
    "data" "jsonb" NOT NULL,
    "etag" "text",
    "last_modified" "text",
    "fetched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokeapi_resources" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokeapi_resources" IS 'Canonical JSONB cache for all PokéAPI resources. Stores complete API responses for any endpoint.';



ALTER TABLE "public"."pokeapi_resources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pokeapi_resources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pokeathlon_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokeathlon_stat_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "affecting_natures" "jsonb",
    "names" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokeathlon_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokedexes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokedex_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "is_main_series" boolean DEFAULT false,
    "descriptions" "jsonb",
    "names" "jsonb",
    "pokemon_entries" "jsonb",
    "region_id" integer,
    "version_groups" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokedexes" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokedexes" IS 'Pokedex entries by region';



CREATE TABLE IF NOT EXISTS "public"."pokemon" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type1" "text",
    "type2" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_abilities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer,
    "ability_id" integer,
    "is_hidden" boolean DEFAULT false,
    "slot" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_abilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_abilities" IS 'Many-to-many relationship: Pokemon to Abilities';



CREATE TABLE IF NOT EXISTS "public"."pokemon_base_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer NOT NULL,
    "stat_id" integer,
    "base_stat" integer NOT NULL,
    "effort" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_base_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_base_stats" IS 'Pokemon base stats (HP, Attack, Defense, etc.) from comprehensive pokedex';



CREATE TABLE IF NOT EXISTS "public"."pokemon_cache" (
    "pokemon_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "types" "text"[] NOT NULL,
    "base_stats" "jsonb" NOT NULL,
    "abilities" "text"[] NOT NULL,
    "moves" "text"[] NOT NULL,
    "sprite_url" "text",
    "draft_cost" integer DEFAULT 10,
    "tier" "text",
    "payload" "jsonb" NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval),
    "sprites" "jsonb",
    "ability_details" "jsonb"[],
    "move_details" "jsonb"[],
    "evolution_chain" "jsonb",
    "regional_forms" "text"[],
    "hidden_ability" "text",
    "gender_rate" integer DEFAULT '-1'::integer,
    "generation" integer,
    "height" integer,
    "weight" integer,
    "base_experience" integer
);


ALTER TABLE "public"."pokemon_cache" OWNER TO "postgres";


COMMENT ON COLUMN "public"."pokemon_cache"."sprites" IS 'All sprite URLs: front, back, shiny, official artwork, etc.';



COMMENT ON COLUMN "public"."pokemon_cache"."ability_details" IS 'Ability descriptions and effects';



COMMENT ON COLUMN "public"."pokemon_cache"."move_details" IS 'Top 20 competitive moves with power/accuracy/category';



COMMENT ON COLUMN "public"."pokemon_cache"."evolution_chain" IS 'Evolution stages and conditions';



COMMENT ON COLUMN "public"."pokemon_cache"."regional_forms" IS 'Array of regional variant names (alolan, galarian, etc.)';



COMMENT ON COLUMN "public"."pokemon_cache"."hidden_ability" IS 'Hidden ability name if exists';



COMMENT ON COLUMN "public"."pokemon_cache"."gender_rate" IS '-1 for genderless, 0-8 for male-female ratio';



COMMENT ON COLUMN "public"."pokemon_cache"."generation" IS 'Pokemon generation (1-9)';



COMMENT ON COLUMN "public"."pokemon_cache"."height" IS 'Pokemon height in decimeters';



COMMENT ON COLUMN "public"."pokemon_cache"."weight" IS 'Pokemon weight in hectograms';



COMMENT ON COLUMN "public"."pokemon_cache"."base_experience" IS 'Base experience points gained when Pokemon is defeated';



CREATE TABLE IF NOT EXISTS "public"."pokemon_colors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "color_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "pokemon_species" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_colors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_comprehensive" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "base_experience" integer,
    "height" integer,
    "weight" integer,
    "order" integer,
    "is_default" boolean DEFAULT true,
    "location_area_encounters" "text",
    "sprites" "jsonb",
    "species_id" integer,
    "form_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cries" "jsonb",
    "past_types" "jsonb",
    "past_abilities" "jsonb",
    "game_indices" "jsonb",
    "forms" "jsonb"
);


ALTER TABLE "public"."pokemon_comprehensive" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_comprehensive" IS 'Individual Pokemon instances with basic data';



CREATE TABLE IF NOT EXISTS "public"."pokemon_egg_groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_species_id" integer NOT NULL,
    "egg_group_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_egg_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_forms" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "form_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "order" integer,
    "form_order" integer,
    "is_default" boolean DEFAULT false,
    "is_battle_only" boolean DEFAULT false,
    "is_mega" boolean DEFAULT false,
    "pokemon_id" integer,
    "version_group_id" integer,
    "form_names" "jsonb",
    "form_sprites" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_forms" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_forms" IS 'Pokemon form variations';



CREATE TABLE IF NOT EXISTS "public"."pokemon_habitats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "habitat_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "pokemon_species" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_habitats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer,
    "item_id" integer,
    "version_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_items" IS 'Many-to-many relationship: Pokemon to Held Items';



CREATE TABLE IF NOT EXISTS "public"."pokemon_location_areas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer NOT NULL,
    "location_area_id" integer NOT NULL,
    "version_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_location_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_moves" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer,
    "move_id" integer,
    "version_group_id" integer,
    "move_learn_method_id" integer,
    "level_learned_at" integer,
    "order" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_moves" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_moves" IS 'Many-to-many relationship: Pokemon to Moves';



CREATE TABLE IF NOT EXISTS "public"."pokemon_shapes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "shape_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "awesome_names" "jsonb",
    "names" "jsonb",
    "pokemon_species" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_shapes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pokemon_species" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "species_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "order" integer,
    "gender_rate" integer,
    "capture_rate" integer,
    "base_happiness" integer,
    "is_baby" boolean DEFAULT false,
    "is_legendary" boolean DEFAULT false,
    "is_mythical" boolean DEFAULT false,
    "hatch_counter" integer,
    "has_gender_differences" boolean DEFAULT false,
    "forms_switchable" boolean DEFAULT false,
    "growth_rate_id" integer,
    "habitat_id" integer,
    "generation_id" integer,
    "evolution_chain_id" integer,
    "color_id" integer,
    "shape_id" integer,
    "egg_groups" "jsonb",
    "flavor_text_entries" "jsonb",
    "form_descriptions" "jsonb",
    "genera" "jsonb",
    "names" "jsonb",
    "pal_park_encounters" "jsonb",
    "pokedex_numbers" "jsonb",
    "varieties" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "evolves_from_species_id" integer
);


ALTER TABLE "public"."pokemon_species" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_species" IS 'Pokemon species information including evolution, breeding, etc.';



CREATE TABLE IF NOT EXISTS "public"."pokemon_stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "pokemon_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "kills" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_stats" IS 'Match statistics: KOs scored by Pokemon per match';



COMMENT ON COLUMN "public"."pokemon_stats"."kills" IS 'Number of KOs scored by this Pokemon in this match';



CREATE TABLE IF NOT EXISTS "public"."pokemon_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_id" integer,
    "type_id" integer,
    "slot" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pokemon_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokemon_types" IS 'Many-to-many relationship: Pokemon to Types';



CREATE TABLE IF NOT EXISTS "public"."pokepedia_assets" (
    "id" bigint NOT NULL,
    "asset_kind" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" integer,
    "source_url" "text" NOT NULL,
    "bucket" "text" NOT NULL,
    "path" "text" NOT NULL,
    "content_type" "text",
    "bytes" integer,
    "sha256" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pokepedia_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokepedia_assets" IS 'Metadata for sprites stored in Supabase Storage. Tracks downloaded assets.';



ALTER TABLE "public"."pokepedia_assets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pokepedia_assets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pokepedia_pokemon" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "species_name" "text",
    "height" integer,
    "weight" integer,
    "base_experience" integer,
    "is_default" boolean,
    "sprite_front_default_path" "text",
    "sprite_official_artwork_path" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "types" "jsonb",
    "type_primary" "text",
    "type_secondary" "text",
    "base_stats" "jsonb",
    "total_base_stat" integer,
    "abilities" "jsonb",
    "ability_primary" "text",
    "ability_hidden" "text",
    "order" integer,
    "generation" integer,
    "cry_latest_path" "text",
    "cry_legacy_path" "text",
    "moves_count" integer,
    "forms_count" integer
);


ALTER TABLE "public"."pokepedia_pokemon" OWNER TO "postgres";


COMMENT ON TABLE "public"."pokepedia_pokemon" IS 'Fast projection table for Pokédex listing/search. Optimized for UI queries.';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."types" IS 'Array of type names (e.g., ["grass", "poison"])';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."type_primary" IS 'Primary type for fast filtering';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."type_secondary" IS 'Secondary type (nullable for single-type Pokemon)';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."base_stats" IS 'Base stats object: {hp, attack, defense, special_attack, special_defense, speed}';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."total_base_stat" IS 'Sum of all base stats (for sorting by total power)';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."abilities" IS 'Array of ability objects: [{name, is_hidden, slot}]';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."ability_primary" IS 'Primary ability name';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."ability_hidden" IS 'Hidden ability name (nullable)';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."order" IS 'National Dex order (for sorting)';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."generation" IS 'Generation number (1-9)';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."cry_latest_path" IS 'Path to latest cry audio file in storage';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."cry_legacy_path" IS 'Path to legacy cry audio file in storage';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."moves_count" IS 'Total number of moves this Pokemon can learn';



COMMENT ON COLUMN "public"."pokepedia_pokemon"."forms_count" IS 'Number of forms this Pokemon has';



CREATE TABLE IF NOT EXISTS "public"."processed_data" (
    "workflowId" character varying(36) NOT NULL,
    "context" character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."processed_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "display_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "role" "text" DEFAULT 'viewer'::"text" NOT NULL,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "team_id" "uuid",
    "discord_id" "text",
    "discord_username" "text",
    "discord_avatar" "text",
    "is_active" boolean DEFAULT true,
    "email_verified" boolean DEFAULT false,
    "onboarding_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_seen_at" timestamp with time zone,
    "showdown_username" "text",
    "showdown_account_synced" boolean DEFAULT false,
    "showdown_account_synced_at" timestamp with time zone,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'commissioner'::"text", 'coach'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."showdown_username" IS 'Showdown username synced from Supabase profile';



COMMENT ON COLUMN "public"."profiles"."showdown_account_synced" IS 'Whether Showdown account has been synced via loginserver';



COMMENT ON COLUMN "public"."profiles"."showdown_account_synced_at" IS 'Timestamp when Showdown account was last synced';



CREATE TABLE IF NOT EXISTS "public"."project" (
    "id" character varying(36) NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "icon" json,
    "description" character varying(512),
    "creatorId" "uuid"
);


ALTER TABLE "public"."project" OWNER TO "postgres";


COMMENT ON COLUMN "public"."project"."creatorId" IS 'ID of the user who created the project';



CREATE TABLE IF NOT EXISTS "public"."project_relation" (
    "projectId" character varying(36) NOT NULL,
    "userId" "uuid" NOT NULL,
    "role" character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."project_relation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prompt" (
    "id" integer NOT NULL,
    "command" character varying(255) NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "timestamp" bigint NOT NULL
);


ALTER TABLE "public"."prompt" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."prompt_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."prompt_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."prompt_id_seq" OWNED BY "public"."prompt"."id";



CREATE TABLE IF NOT EXISTS "public"."regions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "region_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "locations" "jsonb",
    "main_generation_id" integer,
    "names" "jsonb",
    "pokedexes" "jsonb",
    "version_groups" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."regions" OWNER TO "postgres";


COMMENT ON TABLE "public"."regions" IS 'Pokemon regions (Kanto, Johto, etc.)';



CREATE TABLE IF NOT EXISTS "public"."replayplayers" (
    "playerid" character varying(45) NOT NULL,
    "formatid" character varying(45) NOT NULL,
    "id" character varying(255) NOT NULL,
    "rating" bigint,
    "uploadtime" bigint NOT NULL,
    "private" smallint NOT NULL,
    "password" character varying(31),
    "format" character varying(255) NOT NULL,
    "players" character varying(255) NOT NULL
);


ALTER TABLE "public"."replayplayers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."replays" (
    "id" character varying(255) NOT NULL,
    "format" character varying(45) NOT NULL,
    "players" character varying(255) NOT NULL,
    "log" "text" NOT NULL,
    "inputlog" "text",
    "uploadtime" bigint NOT NULL,
    "views" bigint DEFAULT 0 NOT NULL,
    "formatid" character varying(45) NOT NULL,
    "rating" bigint,
    "private" bigint DEFAULT 0 NOT NULL,
    "password" character varying(31)
);


ALTER TABLE "public"."replays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role" (
    "slug" character varying(128) NOT NULL,
    "displayName" "text",
    "description" "text",
    "roleType" "text",
    "systemRole" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."role" OWNER TO "postgres";


COMMENT ON COLUMN "public"."role"."slug" IS 'Unique identifier of the role for example: "global:owner"';



COMMENT ON COLUMN "public"."role"."displayName" IS 'Name used to display in the UI';



COMMENT ON COLUMN "public"."role"."description" IS 'Text describing the scope in more detail of users';



COMMENT ON COLUMN "public"."role"."roleType" IS 'Type of the role, e.g., global, project, or workflow';



COMMENT ON COLUMN "public"."role"."systemRole" IS 'Indicates if the role is managed by the system and cannot be edited';



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "role" "text" NOT NULL,
    "permissions" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "role_permissions_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'commissioner'::"text", 'coach'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_scope" (
    "roleSlug" character varying(128) NOT NULL,
    "scopeSlug" character varying(128) NOT NULL
);


ALTER TABLE "public"."role_scope" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scope" (
    "slug" character varying(128) NOT NULL,
    "displayName" "text",
    "description" "text"
);


ALTER TABLE "public"."scope" OWNER TO "postgres";


COMMENT ON COLUMN "public"."scope"."slug" IS 'Unique identifier of the scope for example: "project:create"';



COMMENT ON COLUMN "public"."scope"."displayName" IS 'Name used to display in the UI';



COMMENT ON COLUMN "public"."scope"."description" IS 'Text describing the scope in more detail of users';



CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_current" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" character varying(255) NOT NULL,
    "value" "text" NOT NULL,
    "loadOnStartup" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_credentials" (
    "credentialsId" character varying(36) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    "role" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."shared_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_workflow" (
    "workflowId" character varying(36) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    "role" "text" NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."shared_workflow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sheet_mappings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "config_id" "uuid" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "range" "text" DEFAULT 'A:Z'::"text",
    "enabled" boolean DEFAULT true,
    "sync_order" integer DEFAULT 0,
    "column_mapping" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sheet_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."showdown_client_teams" (
    "teamid" "text" NOT NULL,
    "ownerid" "text" NOT NULL,
    "team" "text" NOT NULL,
    "format" "text" NOT NULL,
    "title" "text" NOT NULL,
    "private" "text" DEFAULT ''::"text" NOT NULL,
    "views" integer DEFAULT 0 NOT NULL,
    "date" bigint DEFAULT (EXTRACT(epoch FROM "now"()))::bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."showdown_client_teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."showdown_client_teams" IS 'Pokémon Showdown client teams stored in Supabase PostgreSQL';



CREATE TABLE IF NOT EXISTS "public"."showdown_teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_name" "text" NOT NULL,
    "generation" integer,
    "format" "text",
    "folder_path" "text",
    "team_text" "text" NOT NULL,
    "canonical_text" "text" NOT NULL,
    "pokemon_data" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "team_id" "uuid",
    "coach_id" "uuid",
    "season_id" "uuid",
    "pokemon_count" integer DEFAULT 0 NOT NULL,
    "is_validated" boolean DEFAULT false,
    "validation_errors" "text"[],
    "source" "text",
    "tags" "text"[],
    "notes" "text",
    "original_filename" "text",
    "file_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "is_stock" boolean DEFAULT false,
    "user_tags" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."showdown_teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."showdown_teams" IS 'Stores Pokemon Showdown team exports with parsed data and metadata';



COMMENT ON COLUMN "public"."showdown_teams"."folder_path" IS 'Folder organization path (e.g., "OU/Offensive", "VGC/Rain Teams")';



COMMENT ON COLUMN "public"."showdown_teams"."team_text" IS 'Original team export text from Showdown';



COMMENT ON COLUMN "public"."showdown_teams"."canonical_text" IS 'Cleaned and prettified team export text';



COMMENT ON COLUMN "public"."showdown_teams"."pokemon_data" IS 'JSONB array of parsed Pokemon with all stats, moves, items, etc.';



COMMENT ON COLUMN "public"."showdown_teams"."is_validated" IS 'Whether team has been validated against roster and league rules';



COMMENT ON COLUMN "public"."showdown_teams"."validation_errors" IS 'Array of validation error messages if team is invalid';



COMMENT ON COLUMN "public"."showdown_teams"."is_stock" IS 'Whether this is a stock/pre-loaded team available to all users';



COMMENT ON COLUMN "public"."showdown_teams"."user_tags" IS 'User-defined tags for organizing teams (separate from system tags)';



CREATE TABLE IF NOT EXISTS "public"."smogon_meta_snapshot" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pokemon_name" "text" NOT NULL,
    "format" "text" NOT NULL,
    "generation" integer NOT NULL,
    "tier" "text",
    "usage_rate" numeric(5,4),
    "roles" "text"[],
    "common_moves" "jsonb",
    "common_items" "jsonb",
    "common_abilities" "jsonb",
    "common_evs" "jsonb",
    "checks" "text"[],
    "counters" "text"[],
    "source_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."smogon_meta_snapshot" OWNER TO "postgres";


COMMENT ON TABLE "public"."smogon_meta_snapshot" IS 'Stores periodic snapshots of Smogon competitive meta data including usage statistics, common sets, and strategic information';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."format" IS 'Smogon format identifier (e.g., gen9ou, gen9vgc2024, gen9uu)';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."tier" IS 'Competitive tier (OU, UU, RU, NU, PU, Ubers, etc.)';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."usage_rate" IS 'Usage percentage as decimal (0.0 to 1.0)';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."common_moves" IS 'JSONB array of {name: string, frequency: number} for most common moves';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."common_items" IS 'JSONB array of {name: string, frequency: number} for most common items';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."common_abilities" IS 'JSONB array of {name: string, frequency: number} for most common abilities';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."common_evs" IS 'JSONB object with EV spread {hp, atk, def, spa, spd, spe}';



COMMENT ON COLUMN "public"."smogon_meta_snapshot"."source_date" IS 'Date identifier for the snapshot (e.g., 2024-12 for December 2024)';



CREATE TABLE IF NOT EXISTS "public"."stats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "stat_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "is_battle_only" boolean DEFAULT false,
    "game_index" integer,
    "move_damage_class_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "affecting_moves" "jsonb",
    "affecting_natures" "jsonb",
    "characteristics" "jsonb",
    "names" "jsonb"
);


ALTER TABLE "public"."stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."stats" IS 'Pokemon stats master data';



COMMENT ON COLUMN "public"."stats"."affecting_moves" IS 'Moves that affect this stat from PokeAPI';



COMMENT ON COLUMN "public"."stats"."affecting_natures" IS 'Natures that affect this stat from PokeAPI';



COMMENT ON COLUMN "public"."stats"."characteristics" IS 'Characteristic URLs from PokeAPI';



COMMENT ON COLUMN "public"."stats"."names" IS 'Localized names array from PokeAPI';



CREATE TABLE IF NOT EXISTS "public"."super_contest_effects" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "super_contest_effect_id" integer NOT NULL,
    "appeal" integer,
    "flavor_text_entries" "jsonb",
    "moves" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."super_contest_effects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_jobs" (
    "job_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "job_type" "text" NOT NULL,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "triggered_by" "text" DEFAULT 'manual'::"text" NOT NULL,
    "pokemon_synced" integer DEFAULT 0,
    "pokemon_failed" integer DEFAULT 0,
    "error_log" "jsonb" DEFAULT '{}'::"jsonb",
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "sync_type" "text",
    "priority" "text" DEFAULT 'standard'::"text",
    "phase" "text",
    "current_chunk" integer DEFAULT 0,
    "total_chunks" integer DEFAULT 0,
    "chunk_size" integer DEFAULT 50,
    "start_id" integer,
    "end_id" integer,
    "progress_percent" numeric(5,2) DEFAULT 0,
    "estimated_completion" timestamp with time zone,
    "last_heartbeat" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['full'::"text", 'incremental'::"text"]))),
    CONSTRAINT "sync_jobs_priority_check" CHECK (("priority" = ANY (ARRAY['critical'::"text", 'standard'::"text", 'low'::"text"]))),
    CONSTRAINT "sync_jobs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text", 'partial'::"text"]))),
    CONSTRAINT "sync_jobs_sync_type_check" CHECK (("sync_type" = ANY (ARRAY['pokepedia'::"text", 'pokemon_cache'::"text", 'google_sheets'::"text"]))),
    CONSTRAINT "sync_jobs_triggered_by_check" CHECK (("triggered_by" = ANY (ARRAY['manual'::"text", 'cron'::"text"])))
);


ALTER TABLE "public"."sync_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sync_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "records_processed" integer DEFAULT 0,
    "error_message" "text",
    "synced_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag" (
    "id" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "user_id" character varying(255) NOT NULL,
    "data" "text"
);


ALTER TABLE "public"."tag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_entity" (
    "name" character varying(24) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "id" character varying(36) NOT NULL
);


ALTER TABLE "public"."tag_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_categories" (
    "category_id" "text" NOT NULL,
    "category_name" "text" NOT NULL,
    "description" "text",
    "icon_url" "text",
    "color" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_categories" IS 'Team category organization for browsing and filtering';



CREATE TABLE IF NOT EXISTS "public"."team_formats" (
    "format_id" "text" NOT NULL,
    "format_name" "text" NOT NULL,
    "generation" integer,
    "tier" "text",
    "category" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "description" "text",
    "rules_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_formats" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_formats" IS 'Pokémon Showdown format metadata and information';



CREATE TABLE IF NOT EXISTS "public"."team_tag_assignments" (
    "teamid" "text" NOT NULL,
    "tag_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_tag_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_tag_assignments" IS 'Many-to-many relationship between teams and tags';



CREATE TABLE IF NOT EXISTS "public"."team_tags" (
    "tag_id" "text" NOT NULL,
    "tag_name" "text" NOT NULL,
    "tag_type" "text" NOT NULL,
    "color" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_tags" IS 'Tags for categorizing teams by playstyle, strategy, etc.';



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "coach_name" "text" NOT NULL,
    "division" "text" NOT NULL,
    "conference" "text" NOT NULL,
    "wins" integer DEFAULT 0,
    "losses" integer DEFAULT 0,
    "differential" integer DEFAULT 0,
    "strength_of_schedule" numeric(4,3) DEFAULT 0,
    "logo_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "season_id" "uuid",
    "division_id" "uuid",
    "coach_id" "uuid",
    "current_streak" integer DEFAULT 0,
    "streak_type" "text",
    "avatar_url" "text",
    "banner_url" "text",
    CONSTRAINT "teams_streak_type_check" CHECK (("streak_type" = ANY (ARRAY['W'::"text", 'L'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."teams"."logo_url" IS 'Legacy team logo URL (deprecated, use avatar_url instead)';



COMMENT ON COLUMN "public"."teams"."avatar_url" IS 'Team avatar/logo URL (square, for profile cards and team listings)';



COMMENT ON COLUMN "public"."teams"."banner_url" IS 'Team banner URL (wide, for team detail pages)';



CREATE TABLE IF NOT EXISTS "public"."test_case_execution" (
    "id" character varying(36) NOT NULL,
    "testRunId" character varying(36) NOT NULL,
    "executionId" integer,
    "status" character varying NOT NULL,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "errorCode" character varying,
    "errorDetails" json,
    "metrics" json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "inputs" json,
    "outputs" json
);


ALTER TABLE "public"."test_case_execution" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_run" (
    "id" character varying(36) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "status" character varying NOT NULL,
    "errorCode" character varying,
    "errorDetails" json,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "metrics" json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."test_run" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tool" (
    "id" "text" NOT NULL,
    "user_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "specs" "text" NOT NULL,
    "meta" "text" NOT NULL,
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "valves" "text"
);


ALTER TABLE "public"."tool" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trade_listings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "pokemon_id" integer NOT NULL,
    "status" "text" DEFAULT 'available'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trade_listings_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'pending'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."trade_listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trade_offers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "listing_id" "uuid" NOT NULL,
    "offering_team_id" "uuid" NOT NULL,
    "offered_pokemon_id" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trade_offers_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."trade_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trade_transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "team_a_id" "uuid" NOT NULL,
    "team_b_id" "uuid" NOT NULL,
    "team_a_pokemon_id" integer NOT NULL,
    "team_b_pokemon_id" integer NOT NULL,
    "approved_by" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trade_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "damage_relations" "jsonb",
    "game_indices" "jsonb",
    "generation_id" integer,
    "move_damage_class_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "past_damage_relations" "jsonb",
    "names" "jsonb",
    "pokemon" "jsonb",
    "moves" "jsonb",
    "sprites" "jsonb"
);


ALTER TABLE "public"."types" OWNER TO "postgres";


COMMENT ON TABLE "public"."types" IS 'Pokemon types master data';



COMMENT ON COLUMN "public"."types"."past_damage_relations" IS 'Historical damage relations from PokeAPI';



COMMENT ON COLUMN "public"."types"."names" IS 'Localized names array from PokeAPI';



COMMENT ON COLUMN "public"."types"."pokemon" IS 'Array of Pokemon that have this type from PokeAPI';



COMMENT ON COLUMN "public"."types"."moves" IS 'Array of moves of this type from PokeAPI';



COMMENT ON COLUMN "public"."types"."sprites" IS 'Type sprites from PokeAPI';



CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255),
    "firstName" character varying(32),
    "lastName" character varying(32),
    "password" character varying(255),
    "personalizationAnswers" json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "settings" json,
    "disabled" boolean DEFAULT false NOT NULL,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" "text",
    "mfaRecoveryCodes" "text",
    "lastActiveAt" "date",
    "roleSlug" character varying(128) DEFAULT 'global:member'::character varying NOT NULL,
    "api_key" character varying(255),
    "created_at" bigint NOT NULL,
    "updated_at" bigint NOT NULL,
    "last_active_at" bigint NOT NULL,
    "info" "text",
    "oauth_sub" "text"
);


ALTER TABLE "public"."user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "metadata" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_api_keys" (
    "id" character varying(36) NOT NULL,
    "userId" "uuid" NOT NULL,
    "label" character varying(100) NOT NULL,
    "apiKey" character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "scopes" json,
    "audience" character varying DEFAULT 'public-api'::character varying NOT NULL
);


ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_management_view" AS
 SELECT "p"."id",
    "p"."username",
    "p"."display_name",
    "p"."avatar_url",
    "p"."role",
    "p"."team_id",
    "t"."name" AS "team_name",
    "p"."discord_id",
    "p"."discord_username",
    "p"."is_active",
    "p"."email_verified",
    "p"."onboarding_completed",
    "p"."created_at",
    "p"."updated_at",
    "p"."last_seen_at",
    "au"."email",
    "au"."last_sign_in_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."user_activity_log"
          WHERE ("user_activity_log"."user_id" = "p"."id")) AS "activity_count"
   FROM (("public"."profiles" "p"
     LEFT JOIN "public"."teams" "t" ON (("p"."team_id" = "t"."id")))
     LEFT JOIN "auth"."users" "au" ON (("p"."id" = "au"."id")));


ALTER VIEW "public"."user_management_view" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_match_team_rows_regular" AS
 SELECT "m"."season_id",
    "m"."id" AS "match_id",
    "m"."week",
    COALESCE("m"."played_at", "m"."created_at", "now"()) AS "played_at",
    false AS "is_playoffs",
    "m"."team1_id" AS "team_id",
    "m"."team2_id" AS "opponent_team_id",
    "m"."team1_score" AS "kills",
    "m"."team2_score" AS "deaths",
    COALESCE("m"."differential", ("m"."team1_score" - "m"."team2_score")) AS "differential",
        CASE
            WHEN ("m"."winner_id" = "m"."team1_id") THEN 1
            ELSE 0
        END AS "is_win",
        CASE
            WHEN ("m"."winner_id" = "m"."team1_id") THEN 0
            ELSE 1
        END AS "is_loss"
   FROM "public"."matches" "m"
  WHERE (("m"."is_playoff" = false) AND ("m"."status" = 'completed'::"text"))
UNION ALL
 SELECT "m"."season_id",
    "m"."id" AS "match_id",
    "m"."week",
    COALESCE("m"."played_at", "m"."created_at", "now"()) AS "played_at",
    false AS "is_playoffs",
    "m"."team2_id" AS "team_id",
    "m"."team1_id" AS "opponent_team_id",
    "m"."team2_score" AS "kills",
    "m"."team1_score" AS "deaths",
    COALESCE((- "m"."differential"), ("m"."team2_score" - "m"."team1_score")) AS "differential",
        CASE
            WHEN ("m"."winner_id" = "m"."team2_id") THEN 1
            ELSE 0
        END AS "is_win",
        CASE
            WHEN ("m"."winner_id" = "m"."team2_id") THEN 0
            ELSE 1
        END AS "is_loss"
   FROM "public"."matches" "m"
  WHERE (("m"."is_playoff" = false) AND ("m"."status" = 'completed'::"text"));


ALTER VIEW "public"."v_match_team_rows_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_active_win_streak_regular" AS
 WITH "ordered" AS (
         SELECT "r"."season_id",
            "r"."team_id",
            "r"."match_id",
            "r"."week",
            "r"."played_at",
            "r"."is_win",
            "row_number"() OVER (PARTITION BY "r"."season_id", "r"."team_id" ORDER BY "r"."week" DESC, "r"."played_at" DESC, "r"."match_id" DESC) AS "rn_desc"
           FROM "public"."v_match_team_rows_regular" "r"
        ), "first_loss_pos" AS (
         SELECT "ordered"."season_id",
            "ordered"."team_id",
            "min"("ordered"."rn_desc") FILTER (WHERE ("ordered"."is_win" = 0)) AS "first_nonwin_rn"
           FROM "ordered"
          GROUP BY "ordered"."season_id", "ordered"."team_id"
        )
 SELECT "o"."season_id",
    "o"."team_id",
        CASE
            WHEN ("max"("o"."rn_desc") IS NULL) THEN 0
            WHEN ("f"."first_nonwin_rn" IS NULL) THEN ("count"(*))::integer
            ELSE (GREATEST(("f"."first_nonwin_rn" - 1), (0)::bigint))::integer
        END AS "active_win_streak"
   FROM ("ordered" "o"
     LEFT JOIN "first_loss_pos" "f" ON ((("f"."season_id" = "o"."season_id") AND ("f"."team_id" = "o"."team_id"))))
  GROUP BY "o"."season_id", "o"."team_id", "f"."first_nonwin_rn";


ALTER VIEW "public"."v_active_win_streak_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_head_to_head_regular" AS
 SELECT "season_id",
    "team_id",
    "opponent_team_id",
    ("sum"("is_win"))::integer AS "h2h_wins",
    ("sum"("is_loss"))::integer AS "h2h_losses",
    (("sum"("is_win") + "sum"("is_loss")))::integer AS "h2h_games"
   FROM "public"."v_match_team_rows_regular" "r"
  GROUP BY "season_id", "team_id", "opponent_team_id";


ALTER VIEW "public"."v_head_to_head_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_team_record_regular" AS
 SELECT "t"."season_id",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name",
    "t"."conference",
    "t"."division",
    (COALESCE("sum"("r"."is_win"), (0)::bigint))::integer AS "wins",
    (COALESCE("sum"("r"."is_loss"), (0)::bigint))::integer AS "losses",
    (COALESCE("sum"("r"."kills"), (0)::bigint))::integer AS "kills",
    (COALESCE("sum"("r"."deaths"), (0)::bigint))::integer AS "deaths",
    (COALESCE("sum"("r"."differential"), (0)::bigint))::integer AS "differential"
   FROM ("public"."teams" "t"
     LEFT JOIN "public"."v_match_team_rows_regular" "r" ON ((("r"."season_id" = "t"."season_id") AND ("r"."team_id" = "t"."id"))))
  GROUP BY "t"."season_id", "t"."id", "t"."name", "t"."conference", "t"."division";


ALTER VIEW "public"."v_team_record_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_opponent_winpct_regular" AS
 SELECT "season_id",
    "team_id",
    "wins",
    "losses",
        CASE
            WHEN (("wins" + "losses") = 0) THEN (0.0)::double precision
            ELSE (("wins")::double precision / (("wins" + "losses"))::double precision)
        END AS "win_pct"
   FROM "public"."v_team_record_regular" "tr";


ALTER VIEW "public"."v_opponent_winpct_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_strength_of_schedule_regular" AS
 WITH "games" AS (
         SELECT "r"."season_id",
            "r"."team_id",
            "r"."opponent_team_id",
                CASE
                    WHEN ("t"."division" = "o_1"."division") THEN 1.5
                    WHEN ("t"."conference" = "o_1"."conference") THEN 1.25
                    ELSE 1.0
                END AS "weight"
           FROM (("public"."v_match_team_rows_regular" "r"
             JOIN "public"."teams" "t" ON ((("t"."id" = "r"."team_id") AND ("t"."season_id" = "r"."season_id"))))
             JOIN "public"."teams" "o_1" ON ((("o_1"."id" = "r"."opponent_team_id") AND ("o_1"."season_id" = "r"."season_id"))))
        ), "opp" AS (
         SELECT "v_opponent_winpct_regular"."season_id",
            "v_opponent_winpct_regular"."team_id",
            "v_opponent_winpct_regular"."win_pct"
           FROM "public"."v_opponent_winpct_regular"
        )
 SELECT "g"."season_id",
    "g"."team_id",
        CASE
            WHEN ("sum"("g"."weight") = (0)::numeric) THEN (0.0)::double precision
            ELSE ("sum"((("g"."weight")::double precision * "o"."win_pct")) / ("sum"("g"."weight"))::double precision)
        END AS "sos"
   FROM ("games" "g"
     JOIN "opp" "o" ON ((("o"."season_id" = "g"."season_id") AND ("o"."team_id" = "g"."opponent_team_id"))))
  GROUP BY "g"."season_id", "g"."team_id";


ALTER VIEW "public"."v_strength_of_schedule_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_regular_team_rankings" AS
 WITH "base" AS (
         SELECT "r"."season_id",
            "r"."team_id",
            "r"."team_name",
            "r"."conference",
            "r"."division",
            "r"."wins",
            "r"."losses",
            "r"."differential",
            COALESCE("s"."active_win_streak", 0) AS "active_win_streak",
            COALESCE("ss"."sos", (0.0)::double precision) AS "sos"
           FROM (("public"."v_team_record_regular" "r"
             LEFT JOIN "public"."v_active_win_streak_regular" "s" ON ((("s"."season_id" = "r"."season_id") AND ("s"."team_id" = "r"."team_id"))))
             LEFT JOIN "public"."v_strength_of_schedule_regular" "ss" ON ((("ss"."season_id" = "r"."season_id") AND ("ss"."team_id" = "r"."team_id"))))
        ), "tie_groups" AS (
         SELECT "base"."season_id",
            "base"."team_id",
            "base"."team_name",
            "base"."conference",
            "base"."division",
            "base"."wins",
            "base"."losses",
            "base"."differential",
            "base"."active_win_streak",
            "base"."sos",
            "dense_rank"() OVER (PARTITION BY "base"."season_id" ORDER BY "base"."wins" DESC, "base"."losses", "base"."differential" DESC) AS "tie_group_id"
           FROM "base"
        ), "h2h_within_tie" AS (
         SELECT "tg_1"."season_id",
            "tg_1"."tie_group_id",
            "tg_1"."team_id",
            (COALESCE("sum"("h"."h2h_wins"), (0)::bigint))::integer AS "tied_h2h_wins",
            (COALESCE("sum"("h"."h2h_losses"), (0)::bigint))::integer AS "tied_h2h_losses",
                CASE
                    WHEN ((COALESCE("sum"("h"."h2h_wins"), (0)::bigint) + COALESCE("sum"("h"."h2h_losses"), (0)::bigint)) = 0) THEN (0.0)::double precision
                    ELSE ((COALESCE("sum"("h"."h2h_wins"), (0)::bigint))::double precision / ((COALESCE("sum"("h"."h2h_wins"), (0)::bigint) + COALESCE("sum"("h"."h2h_losses"), (0)::bigint)))::double precision)
                END AS "tied_h2h_win_pct"
           FROM (("tie_groups" "tg_1"
             LEFT JOIN "public"."v_head_to_head_regular" "h" ON ((("h"."season_id" = "tg_1"."season_id") AND ("h"."team_id" = "tg_1"."team_id"))))
             LEFT JOIN "tie_groups" "opp" ON ((("opp"."season_id" = "tg_1"."season_id") AND ("opp"."tie_group_id" = "tg_1"."tie_group_id") AND ("opp"."team_id" = "h"."opponent_team_id"))))
          GROUP BY "tg_1"."season_id", "tg_1"."tie_group_id", "tg_1"."team_id"
        )
 SELECT "tg"."season_id",
    "tg"."team_id",
    "tg"."team_name",
    "tg"."conference",
    "tg"."division",
    "tg"."wins",
    "tg"."losses",
    "tg"."differential",
    "tg"."active_win_streak",
    "tg"."sos",
    "tg"."tie_group_id",
    "hw"."tied_h2h_wins",
    "hw"."tied_h2h_losses",
    "hw"."tied_h2h_win_pct",
    "row_number"() OVER (PARTITION BY "tg"."season_id" ORDER BY "tg"."wins" DESC, "tg"."losses", "tg"."differential" DESC, "hw"."tied_h2h_win_pct" DESC, "tg"."active_win_streak" DESC, "tg"."sos" DESC, "tg"."team_name") AS "league_rank"
   FROM ("tie_groups" "tg"
     LEFT JOIN "h2h_within_tie" "hw" ON ((("hw"."season_id" = "tg"."season_id") AND ("hw"."tie_group_id" = "tg"."tie_group_id") AND ("hw"."team_id" = "tg"."team_id"))));


ALTER VIEW "public"."v_regular_team_rankings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_division_winners_regular" AS
 WITH "ranked" AS (
         SELECT "v_regular_team_rankings"."season_id",
            "v_regular_team_rankings"."team_id",
            "v_regular_team_rankings"."team_name",
            "v_regular_team_rankings"."conference",
            "v_regular_team_rankings"."division",
            "v_regular_team_rankings"."wins",
            "v_regular_team_rankings"."losses",
            "v_regular_team_rankings"."differential",
            "v_regular_team_rankings"."active_win_streak",
            "v_regular_team_rankings"."sos",
            "v_regular_team_rankings"."tie_group_id",
            "v_regular_team_rankings"."tied_h2h_wins",
            "v_regular_team_rankings"."tied_h2h_losses",
            "v_regular_team_rankings"."tied_h2h_win_pct",
            "v_regular_team_rankings"."league_rank"
           FROM "public"."v_regular_team_rankings"
        )
 SELECT DISTINCT ON ("season_id", "division") "season_id",
    "division",
    "team_id",
    "team_name",
    "league_rank"
   FROM "ranked"
  ORDER BY "season_id", "division", "league_rank";


ALTER VIEW "public"."v_division_winners_regular" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_playoff_seeds_5_12" AS
 WITH "ranked" AS (
         SELECT "v_regular_team_rankings"."season_id",
            "v_regular_team_rankings"."team_id",
            "v_regular_team_rankings"."team_name",
            "v_regular_team_rankings"."conference",
            "v_regular_team_rankings"."division",
            "v_regular_team_rankings"."wins",
            "v_regular_team_rankings"."losses",
            "v_regular_team_rankings"."differential",
            "v_regular_team_rankings"."active_win_streak",
            "v_regular_team_rankings"."sos",
            "v_regular_team_rankings"."tie_group_id",
            "v_regular_team_rankings"."tied_h2h_wins",
            "v_regular_team_rankings"."tied_h2h_losses",
            "v_regular_team_rankings"."tied_h2h_win_pct",
            "v_regular_team_rankings"."league_rank"
           FROM "public"."v_regular_team_rankings"
        ), "winners" AS (
         SELECT "v_division_winners_regular"."season_id",
            "v_division_winners_regular"."team_id"
           FROM "public"."v_division_winners_regular"
        ), "remaining" AS (
         SELECT "r"."season_id",
            "r"."team_id",
            "r"."team_name",
            "r"."conference",
            "r"."division",
            "r"."wins",
            "r"."losses",
            "r"."differential",
            "r"."active_win_streak",
            "r"."sos",
            "r"."tie_group_id",
            "r"."tied_h2h_wins",
            "r"."tied_h2h_losses",
            "r"."tied_h2h_win_pct",
            "r"."league_rank"
           FROM ("ranked" "r"
             LEFT JOIN "winners" "w" ON ((("w"."season_id" = "r"."season_id") AND ("w"."team_id" = "r"."team_id"))))
          WHERE ("w"."team_id" IS NULL)
        ), "seeded" AS (
         SELECT "remaining"."season_id",
            "remaining"."team_id",
            "remaining"."team_name",
            "remaining"."conference",
            "remaining"."division",
            "remaining"."wins",
            "remaining"."losses",
            "remaining"."differential",
            "remaining"."active_win_streak",
            "remaining"."sos",
            "remaining"."tie_group_id",
            "remaining"."tied_h2h_wins",
            "remaining"."tied_h2h_losses",
            "remaining"."tied_h2h_win_pct",
            "remaining"."league_rank",
            "row_number"() OVER (PARTITION BY "remaining"."season_id" ORDER BY "remaining"."league_rank") AS "seed_in_remaining"
           FROM "remaining"
        )
 SELECT "season_id",
    "team_id",
    "team_name",
    ("seed_in_remaining" + 4) AS "seed"
   FROM "seeded"
  WHERE (("seed_in_remaining" >= 1) AND ("seed_in_remaining" <= 8));


ALTER VIEW "public"."v_playoff_seeds_5_12" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_playoff_seeds_top4" AS
 WITH "winners" AS (
         SELECT "r"."season_id",
            "r"."team_id",
            "r"."team_name",
            "r"."conference",
            "r"."division",
            "r"."wins",
            "r"."losses",
            "r"."differential",
            "r"."active_win_streak",
            "r"."sos",
            "r"."tie_group_id",
            "r"."tied_h2h_wins",
            "r"."tied_h2h_losses",
            "r"."tied_h2h_win_pct",
            "r"."league_rank"
           FROM ("public"."v_regular_team_rankings" "r"
             JOIN "public"."v_division_winners_regular" "w" ON ((("w"."season_id" = "r"."season_id") AND ("w"."team_id" = "r"."team_id"))))
        ), "seeded" AS (
         SELECT "winners"."season_id",
            "winners"."team_id",
            "winners"."team_name",
            "winners"."conference",
            "winners"."division",
            "winners"."wins",
            "winners"."losses",
            "winners"."differential",
            "winners"."active_win_streak",
            "winners"."sos",
            "winners"."tie_group_id",
            "winners"."tied_h2h_wins",
            "winners"."tied_h2h_losses",
            "winners"."tied_h2h_win_pct",
            "winners"."league_rank",
            "row_number"() OVER (PARTITION BY "winners"."season_id" ORDER BY "winners"."wins" DESC, "winners"."losses", "winners"."differential" DESC, "winners"."tied_h2h_win_pct" DESC, "winners"."active_win_streak" DESC, "winners"."sos" DESC, "winners"."team_name") AS "seed"
           FROM "winners"
        )
 SELECT "season_id",
    "team_id",
    "team_name",
    "conference",
    "division",
    "wins",
    "losses",
    "differential",
    "active_win_streak",
    "sos",
    "tie_group_id",
    "tied_h2h_wins",
    "tied_h2h_losses",
    "tied_h2h_win_pct",
    "league_rank",
    "seed"
   FROM "seeded"
  WHERE (("seed" >= 1) AND ("seed" <= 4));


ALTER VIEW "public"."v_playoff_seeds_top4" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variables" (
    "key" character varying(50) NOT NULL,
    "type" character varying(50) DEFAULT 'string'::character varying NOT NULL,
    "value" character varying(255),
    "id" character varying(36) NOT NULL,
    "projectId" character varying(36)
);


ALTER TABLE "public"."variables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."version_groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "version_group_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "order" integer,
    "generation_id" integer,
    "move_learn_methods" "jsonb",
    "pokedexes" "jsonb",
    "regions" "jsonb",
    "versions" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."version_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."versions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "version_id" integer NOT NULL,
    "name" "text" NOT NULL,
    "names" "jsonb",
    "version_group_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "parent_comment_id" "uuid",
    "content" "text" NOT NULL,
    "is_edited" boolean DEFAULT false,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_feedback" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rating" integer,
    "comment" "text",
    "reaction" "text",
    "is_edited" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "video_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "video_feedback_reaction_check" CHECK (("reaction" = ANY (ARRAY['like'::"text", 'dislike'::"text", 'love'::"text", 'funny'::"text", 'helpful'::"text", 'insightful'::"text"])))
);


ALTER TABLE "public"."video_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_tags" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "tagged_user_id" "uuid" NOT NULL,
    "tagged_by_user_id" "uuid" NOT NULL,
    "tag_type" "text" DEFAULT 'mention'::"text",
    "note" "text",
    "is_notified" boolean DEFAULT false,
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "video_tags_tag_type_check" CHECK (("tag_type" = ANY (ARRAY['mention'::"text", 'highlight'::"text", 'featured'::"text"])))
);


ALTER TABLE "public"."video_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."video_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"(),
    "watch_duration_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."video_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "youtube_video_id" "text" NOT NULL,
    "youtube_channel_id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "thumbnail_medium_url" "text",
    "thumbnail_high_url" "text",
    "published_at" timestamp with time zone NOT NULL,
    "duration" "text",
    "view_count" integer DEFAULT 0,
    "like_count" integer DEFAULT 0,
    "comment_count" integer DEFAULT 0,
    "youtube_url" "text" NOT NULL,
    "last_synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_entity" (
    "webhookPath" character varying NOT NULL,
    "method" character varying NOT NULL,
    "node" character varying NOT NULL,
    "webhookId" character varying,
    "pathLength" integer,
    "workflowId" character varying(36) NOT NULL
);


ALTER TABLE "public"."webhook_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_dependency" (
    "id" integer NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "workflowVersionId" integer NOT NULL,
    "dependencyType" character varying(32) NOT NULL,
    "dependencyKey" character varying(255) NOT NULL,
    "dependencyInfo" json,
    "indexVersionId" smallint DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE "public"."workflow_dependency" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workflow_dependency"."workflowVersionId" IS 'Version of the workflow';



COMMENT ON COLUMN "public"."workflow_dependency"."dependencyType" IS 'Type of dependency: "credential", "nodeType", "webhookPath", or "workflowCall"';



COMMENT ON COLUMN "public"."workflow_dependency"."dependencyKey" IS 'ID or name of the dependency';



COMMENT ON COLUMN "public"."workflow_dependency"."dependencyInfo" IS 'Additional info about the dependency, interpreted based on type';



COMMENT ON COLUMN "public"."workflow_dependency"."indexVersionId" IS 'Version of the index structure';



ALTER TABLE "public"."workflow_dependency" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."workflow_dependency_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."workflow_entity" (
    "name" character varying(128) NOT NULL,
    "active" boolean NOT NULL,
    "nodes" json NOT NULL,
    "connections" json NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "settings" json,
    "staticData" json,
    "pinData" json,
    "versionId" character(36) NOT NULL,
    "triggerCount" integer DEFAULT 0 NOT NULL,
    "id" character varying(36) NOT NULL,
    "meta" json,
    "parentFolderId" character varying(36) DEFAULT NULL::character varying,
    "isArchived" boolean DEFAULT false NOT NULL,
    "versionCounter" integer DEFAULT 1 NOT NULL,
    "description" "text",
    "activeVersionId" character varying(36)
);


ALTER TABLE "public"."workflow_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_history" (
    "versionId" character varying(36) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "authors" character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "nodes" json NOT NULL,
    "connections" json NOT NULL,
    "name" character varying(128),
    "autosaved" boolean DEFAULT false NOT NULL,
    "description" "text"
);


ALTER TABLE "public"."workflow_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_publish_history" (
    "id" integer NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "versionId" character varying(36) NOT NULL,
    "event" character varying(36) NOT NULL,
    "userId" "uuid",
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CHK_workflow_publish_history_event" CHECK ((("event")::"text" = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::"text"[])))
);


ALTER TABLE "public"."workflow_publish_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workflow_publish_history"."event" IS 'Type of history record: activated (workflow is now active), deactivated (workflow is now inactive)';



ALTER TABLE "public"."workflow_publish_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."workflow_publish_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."workflow_statistics" (
    "count" integer DEFAULT 0,
    "latestEvent" timestamp(3) with time zone,
    "name" character varying(128) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "rootCount" integer DEFAULT 0
);


ALTER TABLE "public"."workflow_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflows_tags" (
    "workflowId" character varying(36) NOT NULL,
    "tagId" character varying(36) NOT NULL
);


ALTER TABLE "public"."workflows_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."youtube_channels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "channel_id" "text" NOT NULL,
    "channel_handle" "text",
    "channel_name" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "subscriber_count" integer DEFAULT 0,
    "video_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "sync_enabled" boolean DEFAULT true,
    "last_synced_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."youtube_channels" OWNER TO "postgres";


ALTER TABLE ONLY "public"."auth_provider_sync_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."auth_provider_sync_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."battle_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."battle_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."document" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."document_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."execution_annotations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."execution_annotations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."execution_entity" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."execution_entity_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."execution_metadata" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."execution_metadata_temp_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."migratehistory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migratehistory_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."prompt" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."prompt_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."test_run"
    ADD CONSTRAINT "PK_011c050f566e9db509a0fadb9b9" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installed_packages"
    ADD CONSTRAINT "PK_08cc9197c39b028c1e9beca225940576fd1a5804" PRIMARY KEY ("packageName");



ALTER TABLE ONLY "public"."execution_metadata"
    ADD CONSTRAINT "PK_17a0b6284f8d626aae88e1c16e4" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_relation"
    ADD CONSTRAINT "PK_1caaa312a5d7184a003be0f0cb6" PRIMARY KEY ("projectId", "userId");



ALTER TABLE ONLY "public"."chat_hub_sessions"
    ADD CONSTRAINT "PK_1eafef1273c70e4464fec703412" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folder_tag"
    ADD CONSTRAINT "PK_27e4e00852f6b06a925a4d83a3e" PRIMARY KEY ("folderId", "tagId");



ALTER TABLE ONLY "public"."role"
    ADD CONSTRAINT "PK_35c9b140caaf6da09cfabb0d675" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_dependency"
    ADD CONSTRAINT "PK_52325e34cd7a2f0f67b0f3cad65" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invalid_auth_token"
    ADD CONSTRAINT "PK_5779069b7235b256d91f7af1a15" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."shared_workflow"
    ADD CONSTRAINT "PK_5ba87620386b847201c9531c58f" PRIMARY KEY ("workflowId", "projectId");



ALTER TABLE ONLY "public"."folder"
    ADD CONSTRAINT "PK_6278a41a706740c94c02e288df8" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_table_column"
    ADD CONSTRAINT "PK_673cb121ee4a8a5e27850c72c51" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annotation_tag_entity"
    ADD CONSTRAINT "PK_69dfa041592c30bbc0d4b84aa00" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oauth_refresh_tokens"
    ADD CONSTRAINT "PK_74abaed0b30711b6532598b0392" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "PK_7704a5add6baed43eef835f0bfb" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."execution_annotations"
    ADD CONSTRAINT "PK_7afcf93ffa20c4252869a7c6a23" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dynamic_credential_entry"
    ADD CONSTRAINT "PK_7bc73da3b8be7591696e14809d5" PRIMARY KEY ("credential_id", "subject_id", "resolver_id");



ALTER TABLE ONLY "public"."oauth_user_consents"
    ADD CONSTRAINT "PK_85b9ada746802c8993103470f05" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."migrations"
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installed_nodes"
    ADD CONSTRAINT "PK_8ebd28194e4f792f96b5933423fc439df97d9689" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."shared_credentials"
    ADD CONSTRAINT "PK_8ef3a59796a228913f251779cff" PRIMARY KEY ("credentialsId", "projectId");



ALTER TABLE ONLY "public"."test_case_execution"
    ADD CONSTRAINT "PK_90c121f77a78a6580e94b794bce" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "PK_978fa5caa3468f463dac9d92e69" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."execution_annotation_tags"
    ADD CONSTRAINT "PK_979ec03d31294cca484be65d11f" PRIMARY KEY ("annotationId", "tagId");



ALTER TABLE ONLY "public"."webhook_entity"
    ADD CONSTRAINT "PK_b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", "method");



ALTER TABLE ONLY "public"."insights_by_period"
    ADD CONSTRAINT "PK_b606942249b90cc39b0265f0575" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_history"
    ADD CONSTRAINT "PK_b6572dd6173e4cd06fe79937b58" PRIMARY KEY ("versionId");



ALTER TABLE ONLY "public"."dynamic_credential_resolver"
    ADD CONSTRAINT "PK_b76cfb088dcdaf5275e9980bb64" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scope"
    ADD CONSTRAINT "PK_bfc45df0481abd7f355d6187da1" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."oauth_clients"
    ADD CONSTRAINT "PK_c4759172d3431bae6f04e678e0d" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_publish_history"
    ADD CONSTRAINT "PK_c788f7caf88e91e365c97d6d04a" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_data"
    ADD CONSTRAINT "PK_ca04b9d8dc72de268fe07a65773" PRIMARY KEY ("workflowId", "context");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "PK_dc0fe14e6d9943f268e7b119f69ab8bd" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."oauth_access_tokens"
    ADD CONSTRAINT "PK_dcd71f96a5d5f4bf79e67d322bf" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."data_table"
    ADD CONSTRAINT "PK_e226d0001b9e6097cbfe70617cb" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "PK_ea8f538c94b6e352418254ed6474a81f" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insights_raw"
    ADD CONSTRAINT "PK_ec15125755151e3a7e00e00014f" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_hub_agents"
    ADD CONSTRAINT "PK_f39a3b36bbdf0e2979ddb21cf78" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insights_metadata"
    ADD CONSTRAINT "PK_f448a94c35218b6208ce20cf5a1" PRIMARY KEY ("metaId");



ALTER TABLE ONLY "public"."oauth_authorization_codes"
    ADD CONSTRAINT "PK_fb91ab932cfbd694061501cc20f" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."binary_data"
    ADD CONSTRAINT "PK_fc3691585b39408bb0551122af6" PRIMARY KEY ("fileId");



ALTER TABLE ONLY "public"."role_scope"
    ADD CONSTRAINT "PK_role_scope" PRIMARY KEY ("roleSlug", "scopeSlug");



ALTER TABLE ONLY "public"."oauth_user_consents"
    ADD CONSTRAINT "UQ_083721d99ce8db4033e2958ebb4" UNIQUE ("userId", "clientId");



ALTER TABLE ONLY "public"."data_table_column"
    ADD CONSTRAINT "UQ_8082ec4890f892f0bc77473a123" UNIQUE ("dataTableId", "name");



ALTER TABLE ONLY "public"."data_table"
    ADD CONSTRAINT "UQ_b23096ef747281ac944d28e8b0d" UNIQUE ("projectId", "name");



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e2" UNIQUE ("email");



ALTER TABLE ONLY "public"."abilities"
    ADD CONSTRAINT "abilities_ability_id_key" UNIQUE ("ability_id");



ALTER TABLE ONLY "public"."abilities"
    ADD CONSTRAINT "abilities_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."abilities"
    ADD CONSTRAINT "abilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auth_identity"
    ADD CONSTRAINT "auth_identity_pkey" PRIMARY KEY ("providerId", "providerType");



ALTER TABLE ONLY "public"."auth_provider_sync_history"
    ADD CONSTRAINT "auth_provider_sync_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_events"
    ADD CONSTRAINT "battle_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_sessions"
    ADD CONSTRAINT "battle_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."berries"
    ADD CONSTRAINT "berries_berry_id_key" UNIQUE ("berry_id");



ALTER TABLE ONLY "public"."berries"
    ADD CONSTRAINT "berries_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."berries"
    ADD CONSTRAINT "berries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."berry_firmnesses"
    ADD CONSTRAINT "berry_firmnesses_firmness_id_key" UNIQUE ("firmness_id");



ALTER TABLE ONLY "public"."berry_firmnesses"
    ADD CONSTRAINT "berry_firmnesses_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."berry_firmnesses"
    ADD CONSTRAINT "berry_firmnesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."berry_flavors"
    ADD CONSTRAINT "berry_flavors_flavor_id_key" UNIQUE ("flavor_id");



ALTER TABLE ONLY "public"."berry_flavors"
    ADD CONSTRAINT "berry_flavors_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."berry_flavors"
    ADD CONSTRAINT "berry_flavors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulbapedia_mechanics"
    ADD CONSTRAINT "bulbapedia_mechanics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulbapedia_mechanics"
    ADD CONSTRAINT "bulbapedia_mechanics_resource_type_resource_name_key" UNIQUE ("resource_type", "resource_name");



ALTER TABLE ONLY "public"."canonical_league_config"
    ADD CONSTRAINT "canonical_league_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characteristics"
    ADD CONSTRAINT "characteristics_characteristic_id_key" UNIQUE ("characteristic_id");



ALTER TABLE ONLY "public"."characteristics"
    ADD CONSTRAINT "characteristics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_discord_id_key" UNIQUE ("discord_id");



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conferences"
    ADD CONSTRAINT "conferences_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."conferences"
    ADD CONSTRAINT "conferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contest_effects"
    ADD CONSTRAINT "contest_effects_contest_effect_id_key" UNIQUE ("contest_effect_id");



ALTER TABLE ONLY "public"."contest_effects"
    ADD CONSTRAINT "contest_effects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contest_types"
    ADD CONSTRAINT "contest_types_contest_type_id_key" UNIQUE ("contest_type_id");



ALTER TABLE ONLY "public"."contest_types"
    ADD CONSTRAINT "contest_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."contest_types"
    ADD CONSTRAINT "contest_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credentials_entity"
    ADD CONSTRAINT "credentials_entity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discord_webhooks"
    ADD CONSTRAINT "discord_webhooks_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."discord_webhooks"
    ADD CONSTRAINT "discord_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_name_conference_id_key" UNIQUE ("name", "conference_id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document"
    ADD CONSTRAINT "document_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."draft_budgets"
    ADD CONSTRAINT "draft_budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."draft_budgets"
    ADD CONSTRAINT "draft_budgets_team_id_season_id_key" UNIQUE ("team_id", "season_id");



ALTER TABLE ONLY "public"."draft_pool"
    ADD CONSTRAINT "draft_pool_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."draft_pool"
    ADD CONSTRAINT "draft_pool_sheet_name_pokemon_name_point_value_key" UNIQUE ("sheet_name", "pokemon_name", "point_value");



ALTER TABLE ONLY "public"."draft_sessions"
    ADD CONSTRAINT "draft_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."egg_groups"
    ADD CONSTRAINT "egg_groups_egg_group_id_key" UNIQUE ("egg_group_id");



ALTER TABLE ONLY "public"."egg_groups"
    ADD CONSTRAINT "egg_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."egg_groups"
    ADD CONSTRAINT "egg_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encounter_condition_values"
    ADD CONSTRAINT "encounter_condition_values_encounter_condition_value_id_key" UNIQUE ("encounter_condition_value_id");



ALTER TABLE ONLY "public"."encounter_condition_values"
    ADD CONSTRAINT "encounter_condition_values_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."encounter_condition_values"
    ADD CONSTRAINT "encounter_condition_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encounter_conditions"
    ADD CONSTRAINT "encounter_conditions_encounter_condition_id_key" UNIQUE ("encounter_condition_id");



ALTER TABLE ONLY "public"."encounter_conditions"
    ADD CONSTRAINT "encounter_conditions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."encounter_conditions"
    ADD CONSTRAINT "encounter_conditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."encounter_methods"
    ADD CONSTRAINT "encounter_methods_encounter_method_id_key" UNIQUE ("encounter_method_id");



ALTER TABLE ONLY "public"."encounter_methods"
    ADD CONSTRAINT "encounter_methods_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."encounter_methods"
    ADD CONSTRAINT "encounter_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_destinations"
    ADD CONSTRAINT "event_destinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evolution_chains"
    ADD CONSTRAINT "evolution_chains_evolution_chain_id_key" UNIQUE ("evolution_chain_id");



ALTER TABLE ONLY "public"."evolution_chains"
    ADD CONSTRAINT "evolution_chains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evolution_triggers"
    ADD CONSTRAINT "evolution_triggers_pkey" PRIMARY KEY ("trigger_id");



ALTER TABLE ONLY "public"."execution_data"
    ADD CONSTRAINT "execution_data_pkey" PRIMARY KEY ("executionId");



ALTER TABLE ONLY "public"."genders"
    ADD CONSTRAINT "genders_gender_id_key" UNIQUE ("gender_id");



ALTER TABLE ONLY "public"."genders"
    ADD CONSTRAINT "genders_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."genders"
    ADD CONSTRAINT "genders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generations"
    ADD CONSTRAINT "generations_generation_id_key" UNIQUE ("generation_id");



ALTER TABLE ONLY "public"."generations"
    ADD CONSTRAINT "generations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."generations"
    ADD CONSTRAINT "generations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_sheets_config"
    ADD CONSTRAINT "google_sheets_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."growth_rates"
    ADD CONSTRAINT "growth_rates_growth_rate_id_key" UNIQUE ("growth_rate_id");



ALTER TABLE ONLY "public"."growth_rates"
    ADD CONSTRAINT "growth_rates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."growth_rates"
    ADD CONSTRAINT "growth_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_attributes"
    ADD CONSTRAINT "item_attributes_item_attribute_id_key" UNIQUE ("item_attribute_id");



ALTER TABLE ONLY "public"."item_attributes"
    ADD CONSTRAINT "item_attributes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."item_attributes"
    ADD CONSTRAINT "item_attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_categories"
    ADD CONSTRAINT "item_categories_item_category_id_key" UNIQUE ("item_category_id");



ALTER TABLE ONLY "public"."item_categories"
    ADD CONSTRAINT "item_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."item_categories"
    ADD CONSTRAINT "item_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_fling_effects"
    ADD CONSTRAINT "item_fling_effects_item_fling_effect_id_key" UNIQUE ("item_fling_effect_id");



ALTER TABLE ONLY "public"."item_fling_effects"
    ADD CONSTRAINT "item_fling_effects_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."item_fling_effects"
    ADD CONSTRAINT "item_fling_effects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."item_pockets"
    ADD CONSTRAINT "item_pockets_item_pocket_id_key" UNIQUE ("item_pocket_id");



ALTER TABLE ONLY "public"."item_pockets"
    ADD CONSTRAINT "item_pockets_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."item_pockets"
    ADD CONSTRAINT "item_pockets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_item_id_key" UNIQUE ("item_id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_language_id_key" UNIQUE ("language_id");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."league_config"
    ADD CONSTRAINT "league_config_config_type_section_title_key" UNIQUE ("config_type", "section_title");



ALTER TABLE ONLY "public"."league_config"
    ADD CONSTRAINT "league_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "location_areas_location_area_id_key" UNIQUE ("location_area_id");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "location_areas_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "location_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_location_id_key" UNIQUE ("location_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_machine_id_key" UNIQUE ("machine_id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matchweeks"
    ADD CONSTRAINT "matchweeks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matchweeks"
    ADD CONSTRAINT "matchweeks_season_id_week_number_key" UNIQUE ("season_id", "week_number");



ALTER TABLE ONLY "public"."migratehistory"
    ADD CONSTRAINT "migratehistory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."move_ailments"
    ADD CONSTRAINT "move_ailments_move_ailment_id_key" UNIQUE ("move_ailment_id");



ALTER TABLE ONLY "public"."move_ailments"
    ADD CONSTRAINT "move_ailments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."move_ailments"
    ADD CONSTRAINT "move_ailments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."move_battle_styles"
    ADD CONSTRAINT "move_battle_styles_move_battle_style_id_key" UNIQUE ("move_battle_style_id");



ALTER TABLE ONLY "public"."move_battle_styles"
    ADD CONSTRAINT "move_battle_styles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."move_battle_styles"
    ADD CONSTRAINT "move_battle_styles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."move_categories"
    ADD CONSTRAINT "move_categories_move_category_id_key" UNIQUE ("move_category_id");



ALTER TABLE ONLY "public"."move_categories"
    ADD CONSTRAINT "move_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."move_categories"
    ADD CONSTRAINT "move_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."move_damage_classes"
    ADD CONSTRAINT "move_damage_classes_move_damage_class_id_key" UNIQUE ("move_damage_class_id");



ALTER TABLE ONLY "public"."move_damage_classes"
    ADD CONSTRAINT "move_damage_classes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."move_damage_classes"
    ADD CONSTRAINT "move_damage_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."move_learn_methods"
    ADD CONSTRAINT "move_learn_methods_move_learn_method_id_key" UNIQUE ("move_learn_method_id");



ALTER TABLE ONLY "public"."move_learn_methods"
    ADD CONSTRAINT "move_learn_methods_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."move_learn_methods"
    ADD CONSTRAINT "move_learn_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."move_targets"
    ADD CONSTRAINT "move_targets_move_target_id_key" UNIQUE ("move_target_id");



ALTER TABLE ONLY "public"."move_targets"
    ADD CONSTRAINT "move_targets_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."move_targets"
    ADD CONSTRAINT "move_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_move_id_key" UNIQUE ("move_id");



ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_nature_id_key" UNIQUE ("nature_id");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pal_park_areas"
    ADD CONSTRAINT "pal_park_areas_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pal_park_areas"
    ADD CONSTRAINT "pal_park_areas_pal_park_area_id_key" UNIQUE ("pal_park_area_id");



ALTER TABLE ONLY "public"."pal_park_areas"
    ADD CONSTRAINT "pal_park_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."execution_entity"
    ADD CONSTRAINT "pk_e3e63bbf986767844bbe1166d4e" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_statistics"
    ADD CONSTRAINT "pk_workflow_statistics" PRIMARY KEY ("workflowId", "name");



ALTER TABLE ONLY "public"."workflows_tags"
    ADD CONSTRAINT "pk_workflows_tags" PRIMARY KEY ("workflowId", "tagId");



ALTER TABLE ONLY "public"."pokeapi_resource_cache"
    ADD CONSTRAINT "pokeapi_resource_cache_pkey" PRIMARY KEY ("url");



ALTER TABLE ONLY "public"."pokeapi_resources"
    ADD CONSTRAINT "pokeapi_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokeathlon_stats"
    ADD CONSTRAINT "pokeathlon_stats_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pokeathlon_stats"
    ADD CONSTRAINT "pokeathlon_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokeathlon_stats"
    ADD CONSTRAINT "pokeathlon_stats_pokeathlon_stat_id_key" UNIQUE ("pokeathlon_stat_id");



ALTER TABLE ONLY "public"."pokedexes"
    ADD CONSTRAINT "pokedexes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pokedexes"
    ADD CONSTRAINT "pokedexes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokedexes"
    ADD CONSTRAINT "pokedexes_pokedex_id_key" UNIQUE ("pokedex_id");



ALTER TABLE ONLY "public"."pokemon_abilities"
    ADD CONSTRAINT "pokemon_abilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_abilities"
    ADD CONSTRAINT "pokemon_abilities_pokemon_id_ability_id_slot_key" UNIQUE ("pokemon_id", "ability_id", "slot");



ALTER TABLE ONLY "public"."pokemon_cache"
    ADD CONSTRAINT "pokemon_cache_pkey" PRIMARY KEY ("pokemon_id");



ALTER TABLE ONLY "public"."pokemon_colors"
    ADD CONSTRAINT "pokemon_colors_color_id_key" UNIQUE ("color_id");



ALTER TABLE ONLY "public"."pokemon_colors"
    ADD CONSTRAINT "pokemon_colors_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pokemon_colors"
    ADD CONSTRAINT "pokemon_colors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_egg_groups"
    ADD CONSTRAINT "pokemon_egg_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_egg_groups"
    ADD CONSTRAINT "pokemon_egg_groups_pokemon_species_id_egg_group_id_key" UNIQUE ("pokemon_species_id", "egg_group_id");



ALTER TABLE ONLY "public"."pokemon_forms"
    ADD CONSTRAINT "pokemon_forms_form_id_key" UNIQUE ("form_id");



ALTER TABLE ONLY "public"."pokemon_forms"
    ADD CONSTRAINT "pokemon_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_habitats"
    ADD CONSTRAINT "pokemon_habitats_habitat_id_key" UNIQUE ("habitat_id");



ALTER TABLE ONLY "public"."pokemon_habitats"
    ADD CONSTRAINT "pokemon_habitats_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pokemon_habitats"
    ADD CONSTRAINT "pokemon_habitats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_items"
    ADD CONSTRAINT "pokemon_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_items"
    ADD CONSTRAINT "pokemon_items_pokemon_id_item_id_key" UNIQUE ("pokemon_id", "item_id");



ALTER TABLE ONLY "public"."pokemon_location_areas"
    ADD CONSTRAINT "pokemon_location_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_location_areas"
    ADD CONSTRAINT "pokemon_location_areas_pokemon_id_location_area_id_key" UNIQUE ("pokemon_id", "location_area_id");



ALTER TABLE ONLY "public"."pokemon_moves"
    ADD CONSTRAINT "pokemon_moves_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_moves"
    ADD CONSTRAINT "pokemon_moves_pokemon_id_move_id_version_group_id_move_lear_key" UNIQUE ("pokemon_id", "move_id", "version_group_id", "move_learn_method_id", "level_learned_at");



ALTER TABLE ONLY "public"."pokemon_comprehensive"
    ADD CONSTRAINT "pokemon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon"
    ADD CONSTRAINT "pokemon_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_comprehensive"
    ADD CONSTRAINT "pokemon_pokemon_id_key" UNIQUE ("pokemon_id");



ALTER TABLE ONLY "public"."pokemon_shapes"
    ADD CONSTRAINT "pokemon_shapes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pokemon_shapes"
    ADD CONSTRAINT "pokemon_shapes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_shapes"
    ADD CONSTRAINT "pokemon_shapes_shape_id_key" UNIQUE ("shape_id");



ALTER TABLE ONLY "public"."pokemon_species"
    ADD CONSTRAINT "pokemon_species_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."pokemon_species"
    ADD CONSTRAINT "pokemon_species_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_species"
    ADD CONSTRAINT "pokemon_species_species_id_key" UNIQUE ("species_id");



ALTER TABLE ONLY "public"."pokemon_base_stats"
    ADD CONSTRAINT "pokemon_stats_new_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_base_stats"
    ADD CONSTRAINT "pokemon_stats_new_pokemon_id_stat_id_key" UNIQUE ("pokemon_id", "stat_id");



ALTER TABLE ONLY "public"."pokemon_stats"
    ADD CONSTRAINT "pokemon_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_types"
    ADD CONSTRAINT "pokemon_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokemon_types"
    ADD CONSTRAINT "pokemon_types_pokemon_id_type_id_slot_key" UNIQUE ("pokemon_id", "type_id", "slot");



ALTER TABLE ONLY "public"."pokepedia_assets"
    ADD CONSTRAINT "pokepedia_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pokepedia_pokemon"
    ADD CONSTRAINT "pokepedia_pokemon_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_discord_id_key" UNIQUE ("discord_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "prompt_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."regions"
    ADD CONSTRAINT "regions_region_id_key" UNIQUE ("region_id");



ALTER TABLE ONLY "public"."replayplayers"
    ADD CONSTRAINT "replayplayers_pkey" PRIMARY KEY ("id", "playerid");



ALTER TABLE ONLY "public"."replays"
    ADD CONSTRAINT "replays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_key" UNIQUE ("role");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sheet_mappings"
    ADD CONSTRAINT "sheet_mappings_config_id_sheet_name_key" UNIQUE ("config_id", "sheet_name");



ALTER TABLE ONLY "public"."sheet_mappings"
    ADD CONSTRAINT "sheet_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."showdown_client_teams"
    ADD CONSTRAINT "showdown_client_teams_pkey" PRIMARY KEY ("teamid");



ALTER TABLE ONLY "public"."showdown_teams"
    ADD CONSTRAINT "showdown_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."smogon_meta_snapshot"
    ADD CONSTRAINT "smogon_meta_snapshot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."smogon_meta_snapshot"
    ADD CONSTRAINT "smogon_meta_snapshot_pokemon_name_format_source_date_key" UNIQUE ("pokemon_name", "format", "source_date");



ALTER TABLE ONLY "public"."stats"
    ADD CONSTRAINT "stats_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."stats"
    ADD CONSTRAINT "stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stats"
    ADD CONSTRAINT "stats_stat_id_key" UNIQUE ("stat_id");



ALTER TABLE ONLY "public"."super_contest_effects"
    ADD CONSTRAINT "super_contest_effects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."super_contest_effects"
    ADD CONSTRAINT "super_contest_effects_super_contest_effect_id_key" UNIQUE ("super_contest_effect_id");



ALTER TABLE ONLY "public"."sync_jobs"
    ADD CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("job_id");



ALTER TABLE ONLY "public"."sync_log"
    ADD CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_entity"
    ADD CONSTRAINT "tag_entity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_categories"
    ADD CONSTRAINT "team_categories_pkey" PRIMARY KEY ("category_id");



ALTER TABLE ONLY "public"."team_formats"
    ADD CONSTRAINT "team_formats_pkey" PRIMARY KEY ("format_id");



ALTER TABLE ONLY "public"."team_rosters"
    ADD CONSTRAINT "team_rosters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_rosters"
    ADD CONSTRAINT "team_rosters_team_id_pokemon_id_key" UNIQUE ("team_id", "pokemon_id");



ALTER TABLE ONLY "public"."team_tag_assignments"
    ADD CONSTRAINT "team_tag_assignments_pkey" PRIMARY KEY ("teamid", "tag_id");



ALTER TABLE ONLY "public"."team_tags"
    ADD CONSTRAINT "team_tags_pkey" PRIMARY KEY ("tag_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_listings"
    ADD CONSTRAINT "trade_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_offers"
    ADD CONSTRAINT "trade_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trade_transactions"
    ADD CONSTRAINT "trade_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."types"
    ADD CONSTRAINT "types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."types"
    ADD CONSTRAINT "types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."types"
    ADD CONSTRAINT "types_type_id_key" UNIQUE ("type_id");



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variables"
    ADD CONSTRAINT "variables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."version_groups"
    ADD CONSTRAINT "version_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."version_groups"
    ADD CONSTRAINT "version_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."version_groups"
    ADD CONSTRAINT "version_groups_version_group_id_key" UNIQUE ("version_group_id");



ALTER TABLE ONLY "public"."versions"
    ADD CONSTRAINT "versions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."versions"
    ADD CONSTRAINT "versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."versions"
    ADD CONSTRAINT "versions_version_id_key" UNIQUE ("version_id");



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_feedback"
    ADD CONSTRAINT "video_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_feedback"
    ADD CONSTRAINT "video_feedback_video_id_user_id_key" UNIQUE ("video_id", "user_id");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_video_id_tagged_user_id_tagged_by_user_id_key" UNIQUE ("video_id", "tagged_user_id", "tagged_by_user_id");



ALTER TABLE ONLY "public"."video_views"
    ADD CONSTRAINT "video_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_youtube_video_id_key" UNIQUE ("youtube_video_id");



ALTER TABLE ONLY "public"."workflow_entity"
    ADD CONSTRAINT "workflow_entity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."youtube_channels"
    ADD CONSTRAINT "youtube_channels_channel_id_key" UNIQUE ("channel_id");



ALTER TABLE ONLY "public"."youtube_channels"
    ADD CONSTRAINT "youtube_channels_pkey" PRIMARY KEY ("id");



CREATE INDEX "IDX_070b5de842ece9ccdda0d9738b" ON "public"."workflow_publish_history" USING "btree" ("workflowId", "versionId");



CREATE UNIQUE INDEX "IDX_14f68deffaf858465715995508" ON "public"."folder" USING "btree" ("projectId", "id");



CREATE UNIQUE INDEX "IDX_1d8ab99d5861c9388d2dc1cf73" ON "public"."insights_metadata" USING "btree" ("workflowId");



CREATE INDEX "IDX_1e31657f5fe46816c34be7c1b4" ON "public"."workflow_history" USING "btree" ("workflowId");



CREATE UNIQUE INDEX "IDX_1ef35bac35d20bdae979d917a3" ON "public"."user_api_keys" USING "btree" ("apiKey");



CREATE INDEX "IDX_56900edc3cfd16612e2ef2c6a8" ON "public"."binary_data" USING "btree" ("sourceType", "sourceId");



CREATE INDEX "IDX_5f0643f6717905a05164090dde" ON "public"."project_relation" USING "btree" ("userId");



CREATE UNIQUE INDEX "IDX_60b6a84299eeb3f671dfec7693" ON "public"."insights_by_period" USING "btree" ("periodStart", "type", "periodUnit", "metaId");



CREATE INDEX "IDX_61448d56d61802b5dfde5cdb00" ON "public"."project_relation" USING "btree" ("projectId");



CREATE UNIQUE INDEX "IDX_63d7bbae72c767cf162d459fcc" ON "public"."user_api_keys" USING "btree" ("userId", "label");



CREATE INDEX "IDX_8e4b4774db42f1e6dda3452b2a" ON "public"."test_case_execution" USING "btree" ("testRunId");



CREATE UNIQUE INDEX "IDX_97f863fa83c4786f1956508496" ON "public"."execution_annotations" USING "btree" ("executionId");



CREATE INDEX "IDX_99b3e329d13b7bb2fa9b6a43f5" ON "public"."dynamic_credential_entry" USING "btree" ("subject_id");



CREATE INDEX "IDX_9c9ee9df586e60bb723234e499" ON "public"."dynamic_credential_resolver" USING "btree" ("type");



CREATE UNIQUE INDEX "IDX_UniqueRoleDisplayName" ON "public"."role" USING "btree" ("displayName");



CREATE INDEX "IDX_a3697779b366e131b2bbdae297" ON "public"."execution_annotation_tags" USING "btree" ("tagId");



CREATE INDEX "IDX_a4ff2d9b9628ea988fa9e7d0bf" ON "public"."workflow_dependency" USING "btree" ("workflowId");



CREATE UNIQUE INDEX "IDX_ae51b54c4bb430cf92f48b623f" ON "public"."annotation_tag_entity" USING "btree" ("name");



CREATE INDEX "IDX_c1519757391996eb06064f0e7c" ON "public"."execution_annotation_tags" USING "btree" ("annotationId");



CREATE UNIQUE INDEX "IDX_cec8eea3bf49551482ccb4933e" ON "public"."execution_metadata" USING "btree" ("executionId", "key");



CREATE INDEX "IDX_chat_hub_messages_sessionId" ON "public"."chat_hub_messages" USING "btree" ("sessionId");



CREATE INDEX "IDX_chat_hub_sessions_owner_lastmsg_id" ON "public"."chat_hub_sessions" USING "btree" ("ownerId", "lastMessageAt" DESC, "id");



CREATE INDEX "IDX_d57808fe08b77464f6a88a2549" ON "public"."dynamic_credential_entry" USING "btree" ("resolver_id");



CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON "public"."test_run" USING "btree" ("workflowId");



CREATE INDEX "IDX_e48a201071ab85d9d09119d640" ON "public"."workflow_dependency" USING "btree" ("dependencyKey");



CREATE INDEX "IDX_e7fe1cfda990c14a445937d0b9" ON "public"."workflow_dependency" USING "btree" ("dependencyType");



CREATE INDEX "IDX_execution_entity_deletedAt" ON "public"."execution_entity" USING "btree" ("deletedAt");



CREATE INDEX "IDX_role_scope_scopeSlug" ON "public"."role_scope" USING "btree" ("scopeSlug");



CREATE INDEX "IDX_workflow_entity_name" ON "public"."workflow_entity" USING "btree" ("name");



CREATE UNIQUE INDEX "auth_id" ON "public"."auth" USING "btree" ("id");



CREATE UNIQUE INDEX "chat_id" ON "public"."chat" USING "btree" ("id");



CREATE UNIQUE INDEX "chat_share_id" ON "public"."chat" USING "btree" ("share_id");



CREATE UNIQUE INDEX "chatidtag_id" ON "public"."chatidtag" USING "btree" ("id");



CREATE UNIQUE INDEX "document_collection_name" ON "public"."document" USING "btree" ("collection_name");



CREATE UNIQUE INDEX "document_name" ON "public"."document" USING "btree" ("name");



CREATE UNIQUE INDEX "file_id" ON "public"."file" USING "btree" ("id");



CREATE UNIQUE INDEX "function_id" ON "public"."function" USING "btree" ("id");



CREATE INDEX "idx_07fde106c0b471d8cc80a64fc8" ON "public"."credentials_entity" USING "btree" ("type");



CREATE INDEX "idx_16f4436789e804e3e1c9eeb240" ON "public"."webhook_entity" USING "btree" ("webhookId", "method", "pathLength");



CREATE UNIQUE INDEX "idx_812eb05f7451ca757fb98444ce" ON "public"."tag_entity" USING "btree" ("name");



CREATE INDEX "idx_abilities_name_fts" ON "public"."abilities" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_battle_events_battle" ON "public"."battle_events" USING "btree" ("battle_id");



CREATE INDEX "idx_battle_sessions_match" ON "public"."battle_sessions" USING "btree" ("match_id");



CREATE INDEX "idx_berries_firmness" ON "public"."berries" USING "btree" ("firmness_id");



CREATE INDEX "idx_berries_name" ON "public"."berries" USING "btree" ("name");



CREATE INDEX "idx_berries_name_fts" ON "public"."berries" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_bulbapedia_content_search" ON "public"."bulbapedia_mechanics" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_bulbapedia_generation" ON "public"."bulbapedia_mechanics" USING "btree" ("generation");



CREATE INDEX "idx_bulbapedia_resource_type" ON "public"."bulbapedia_mechanics" USING "btree" ("resource_type");



CREATE INDEX "idx_bulbapedia_tags" ON "public"."bulbapedia_mechanics" USING "gin" ("tags");



CREATE INDEX "idx_bulbapedia_type_name" ON "public"."bulbapedia_mechanics" USING "btree" ("resource_type", "resource_name");



CREATE INDEX "idx_canonical_league_config_active" ON "public"."canonical_league_config" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "idx_canonical_league_config_one_active_per_season" ON "public"."canonical_league_config" USING "btree" ("season_id") WHERE ("is_active" = true);



CREATE INDEX "idx_canonical_league_config_season" ON "public"."canonical_league_config" USING "btree" ("season_id");



CREATE INDEX "idx_coaches_discord" ON "public"."coaches" USING "btree" ("discord_id");



CREATE INDEX "idx_draft_pool_available" ON "public"."draft_pool" USING "btree" ("is_available") WHERE ("is_available" = true);



CREATE INDEX "idx_draft_pool_generation" ON "public"."draft_pool" USING "btree" ("generation");



CREATE INDEX "idx_draft_pool_point_value" ON "public"."draft_pool" USING "btree" ("point_value");



CREATE INDEX "idx_draft_pool_pokemon_id" ON "public"."draft_pool" USING "btree" ("pokemon_id") WHERE ("pokemon_id" IS NOT NULL);



CREATE INDEX "idx_draft_pool_pokemon_name" ON "public"."draft_pool" USING "btree" ("pokemon_name");



CREATE INDEX "idx_draft_pool_sheet_name" ON "public"."draft_pool" USING "btree" ("sheet_name");



CREATE INDEX "idx_draft_sessions_current_team" ON "public"."draft_sessions" USING "btree" ("current_team_id");



CREATE INDEX "idx_draft_sessions_season" ON "public"."draft_sessions" USING "btree" ("season_id");



CREATE INDEX "idx_draft_sessions_status" ON "public"."draft_sessions" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_draft_sessions_unique_active_per_season" ON "public"."draft_sessions" USING "btree" ("season_id") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_evolution_triggers_name" ON "public"."evolution_triggers" USING "btree" ("name");



CREATE INDEX "idx_execution_entity_stopped_at_status_deleted_at" ON "public"."execution_entity" USING "btree" ("stoppedAt", "status", "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL));



CREATE INDEX "idx_execution_entity_wait_till_status_deleted_at" ON "public"."execution_entity" USING "btree" ("waitTill", "status", "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL));



CREATE INDEX "idx_execution_entity_workflow_id_started_at" ON "public"."execution_entity" USING "btree" ("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL));



CREATE INDEX "idx_google_sheets_config_enabled" ON "public"."google_sheets_config" USING "btree" ("enabled");



CREATE INDEX "idx_items_category" ON "public"."items" USING "btree" ("category_id");



CREATE INDEX "idx_items_name" ON "public"."items" USING "btree" ("name");



CREATE INDEX "idx_items_name_fts" ON "public"."items" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_league_config_section_type" ON "public"."league_config" USING "btree" ("section_type");



CREATE INDEX "idx_league_config_type" ON "public"."league_config" USING "btree" ("config_type");



CREATE INDEX "idx_location_areas_location" ON "public"."location_areas" USING "btree" ("location_id");



CREATE INDEX "idx_location_areas_name_fts" ON "public"."location_areas" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_locations_name_fts" ON "public"."locations" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_locations_region" ON "public"."locations" USING "btree" ("region_id");



CREATE INDEX "idx_machines_item" ON "public"."machines" USING "btree" ("item_id");



CREATE INDEX "idx_machines_move" ON "public"."machines" USING "btree" ("move_id");



CREATE INDEX "idx_matches_created_at_desc" ON "public"."matches" USING "btree" ("created_at" DESC NULLS LAST);



CREATE INDEX "idx_matches_playoff" ON "public"."matches" USING "btree" ("is_playoff");



CREATE INDEX "idx_matches_playoff_created_desc" ON "public"."matches" USING "btree" ("is_playoff", "created_at" DESC NULLS LAST) WHERE ("is_playoff" = false);



CREATE INDEX "idx_matches_showdown_room_id" ON "public"."matches" USING "btree" ("showdown_room_id") WHERE ("showdown_room_id" IS NOT NULL);



CREATE INDEX "idx_matches_team1_id" ON "public"."matches" USING "btree" ("team1_id") WHERE ("team1_id" IS NOT NULL);



CREATE INDEX "idx_matches_team2_id" ON "public"."matches" USING "btree" ("team2_id") WHERE ("team2_id" IS NOT NULL);



CREATE INDEX "idx_matches_week" ON "public"."matches" USING "btree" ("week");



CREATE INDEX "idx_matches_winner_id" ON "public"."matches" USING "btree" ("winner_id") WHERE ("winner_id" IS NOT NULL);



CREATE INDEX "idx_matchweeks_season" ON "public"."matchweeks" USING "btree" ("season_id");



CREATE INDEX "idx_moves_contest_effect" ON "public"."moves" USING "btree" ("contest_effect_id") WHERE ("contest_effect_id" IS NOT NULL);



CREATE INDEX "idx_moves_contest_type" ON "public"."moves" USING "btree" ("contest_type_id") WHERE ("contest_type_id" IS NOT NULL);



CREATE INDEX "idx_moves_name_fts" ON "public"."moves" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_moves_super_contest_effect" ON "public"."moves" USING "btree" ("super_contest_effect_id") WHERE ("super_contest_effect_id" IS NOT NULL);



CREATE INDEX "idx_natures_decreased_stat" ON "public"."natures" USING "btree" ("decreased_stat_id");



CREATE INDEX "idx_natures_increased_stat" ON "public"."natures" USING "btree" ("increased_stat_id");



CREATE INDEX "idx_natures_name" ON "public"."natures" USING "btree" ("name");



CREATE INDEX "idx_natures_name_fts" ON "public"."natures" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_pokeapi_cache_type" ON "public"."pokeapi_resource_cache" USING "btree" ("resource_type");



CREATE INDEX "idx_pokeapi_cache_type_id" ON "public"."pokeapi_resource_cache" USING "btree" ("resource_type", "resource_id");



CREATE INDEX "idx_pokeapi_cache_updated" ON "public"."pokeapi_resource_cache" USING "btree" ("updated_at");



CREATE INDEX "idx_pokemon_abilities_ability" ON "public"."pokemon_abilities" USING "btree" ("ability_id");



CREATE INDEX "idx_pokemon_abilities_pokemon" ON "public"."pokemon_abilities" USING "btree" ("pokemon_id");



CREATE INDEX "idx_pokemon_cache_cost" ON "public"."pokemon_cache" USING "btree" ("draft_cost");



CREATE INDEX "idx_pokemon_cache_generation" ON "public"."pokemon_cache" USING "btree" ("generation");



CREATE INDEX "idx_pokemon_cache_regional_forms" ON "public"."pokemon_cache" USING "gin" ("regional_forms");



CREATE INDEX "idx_pokemon_cache_tier" ON "public"."pokemon_cache" USING "btree" ("tier");



CREATE INDEX "idx_pokemon_egg_groups_egg_group" ON "public"."pokemon_egg_groups" USING "btree" ("egg_group_id");



CREATE INDEX "idx_pokemon_egg_groups_species" ON "public"."pokemon_egg_groups" USING "btree" ("pokemon_species_id");



CREATE INDEX "idx_pokemon_items_item" ON "public"."pokemon_items" USING "btree" ("item_id");



CREATE INDEX "idx_pokemon_items_pokemon" ON "public"."pokemon_items" USING "btree" ("pokemon_id");



CREATE INDEX "idx_pokemon_location_areas_location" ON "public"."pokemon_location_areas" USING "btree" ("location_area_id");



CREATE INDEX "idx_pokemon_location_areas_pokemon" ON "public"."pokemon_location_areas" USING "btree" ("pokemon_id");



CREATE INDEX "idx_pokemon_moves_move" ON "public"."pokemon_moves" USING "btree" ("move_id");



CREATE INDEX "idx_pokemon_moves_pokemon" ON "public"."pokemon_moves" USING "btree" ("pokemon_id");



CREATE INDEX "idx_pokemon_name_fts" ON "public"."pokemon_comprehensive" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_pokemon_species_evolution_chain" ON "public"."pokemon_species" USING "btree" ("evolution_chain_id");



CREATE INDEX "idx_pokemon_species_generation" ON "public"."pokemon_species" USING "btree" ("generation_id");



CREATE INDEX "idx_pokemon_species_name" ON "public"."pokemon_species" USING "btree" ("name");



CREATE INDEX "idx_pokemon_species_name_fts" ON "public"."pokemon_species" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_pokemon_stats_kills_desc" ON "public"."pokemon_stats" USING "btree" ("kills" DESC NULLS LAST) WHERE ("kills" > 0);



CREATE INDEX "idx_pokemon_stats_match" ON "public"."pokemon_stats" USING "btree" ("match_id");



CREATE INDEX "idx_pokemon_stats_pokemon" ON "public"."pokemon_base_stats" USING "btree" ("pokemon_id");



CREATE INDEX "idx_pokemon_stats_stat" ON "public"."pokemon_base_stats" USING "btree" ("stat_id");



CREATE INDEX "idx_pokemon_stats_team" ON "public"."pokemon_stats" USING "btree" ("team_id");



CREATE INDEX "idx_pokemon_types_pokemon" ON "public"."pokemon_types" USING "btree" ("pokemon_id");



CREATE INDEX "idx_pokemon_types_type" ON "public"."pokemon_types" USING "btree" ("type_id");



CREATE INDEX "idx_profiles_discord_id" ON "public"."profiles" USING "btree" ("discord_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_showdown_username" ON "public"."profiles" USING "btree" ("showdown_username");



CREATE UNIQUE INDEX "idx_profiles_showdown_username_unique" ON "public"."profiles" USING "btree" ("showdown_username") WHERE ("showdown_username" IS NOT NULL);



CREATE INDEX "idx_profiles_team_id" ON "public"."profiles" USING "btree" ("team_id");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_regions_name_fts" ON "public"."regions" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_replayplayers_formatid_playerid_rating" ON "public"."replayplayers" USING "btree" ("formatid", "playerid", "rating");



CREATE INDEX "idx_replayplayers_formatid_playerid_uploadtime" ON "public"."replayplayers" USING "btree" ("formatid", "playerid", "uploadtime");



CREATE INDEX "idx_replayplayers_playerid_rating" ON "public"."replayplayers" USING "btree" ("playerid", "rating");



CREATE INDEX "idx_replayplayers_playerid_uploadtime" ON "public"."replayplayers" USING "btree" ("playerid", "uploadtime");



CREATE INDEX "idx_replays_log_gin" ON "public"."replays" USING "gin" ("to_tsvector"('"english"'::"regconfig", "log"));



CREATE INDEX "idx_replays_private_formatid_rating" ON "public"."replays" USING "btree" ("private", "formatid", "rating");



CREATE INDEX "idx_replays_private_formatid_uploadtime" ON "public"."replays" USING "btree" ("private", "formatid", "uploadtime");



CREATE INDEX "idx_replays_private_uploadtime" ON "public"."replays" USING "btree" ("private", "uploadtime");



CREATE INDEX "idx_sheet_mappings_config" ON "public"."sheet_mappings" USING "btree" ("config_id");



CREATE INDEX "idx_sheet_mappings_order" ON "public"."sheet_mappings" USING "btree" ("config_id", "sync_order");



CREATE INDEX "idx_showdown_client_teams_date" ON "public"."showdown_client_teams" USING "btree" ("date" DESC);



CREATE INDEX "idx_showdown_client_teams_format" ON "public"."showdown_client_teams" USING "btree" ("format");



CREATE INDEX "idx_showdown_client_teams_ownerid" ON "public"."showdown_client_teams" USING "btree" ("ownerid");



CREATE INDEX "idx_showdown_teams_coach_id" ON "public"."showdown_teams" USING "btree" ("coach_id") WHERE ("coach_id" IS NOT NULL);



CREATE INDEX "idx_showdown_teams_created_at" ON "public"."showdown_teams" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_showdown_teams_deleted_at" ON "public"."showdown_teams" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_showdown_teams_folder_path" ON "public"."showdown_teams" USING "btree" ("folder_path") WHERE ("folder_path" IS NOT NULL);



CREATE INDEX "idx_showdown_teams_format" ON "public"."showdown_teams" USING "btree" ("format") WHERE ("format" IS NOT NULL);



CREATE INDEX "idx_showdown_teams_generation" ON "public"."showdown_teams" USING "btree" ("generation") WHERE ("generation" IS NOT NULL);



CREATE INDEX "idx_showdown_teams_is_stock" ON "public"."showdown_teams" USING "btree" ("is_stock") WHERE ("is_stock" = true);



CREATE INDEX "idx_showdown_teams_pokemon_data" ON "public"."showdown_teams" USING "gin" ("pokemon_data");



CREATE INDEX "idx_showdown_teams_search" ON "public"."showdown_teams" USING "gin" ("to_tsvector"('"english"'::"regconfig", ((COALESCE("team_name", ''::"text") || ' '::"text") || COALESCE("notes", ''::"text"))));



CREATE INDEX "idx_showdown_teams_season_id" ON "public"."showdown_teams" USING "btree" ("season_id") WHERE ("season_id" IS NOT NULL);



CREATE INDEX "idx_showdown_teams_tags" ON "public"."showdown_teams" USING "gin" ("tags");



CREATE INDEX "idx_showdown_teams_team_id" ON "public"."showdown_teams" USING "btree" ("team_id") WHERE ("team_id" IS NOT NULL);



CREATE INDEX "idx_smogon_meta_abilities" ON "public"."smogon_meta_snapshot" USING "gin" ("common_abilities");



CREATE INDEX "idx_smogon_meta_checks" ON "public"."smogon_meta_snapshot" USING "gin" ("checks");



CREATE INDEX "idx_smogon_meta_counters" ON "public"."smogon_meta_snapshot" USING "gin" ("counters");



CREATE INDEX "idx_smogon_meta_format" ON "public"."smogon_meta_snapshot" USING "btree" ("format", "generation");



CREATE INDEX "idx_smogon_meta_items" ON "public"."smogon_meta_snapshot" USING "gin" ("common_items");



CREATE INDEX "idx_smogon_meta_moves" ON "public"."smogon_meta_snapshot" USING "gin" ("common_moves");



CREATE INDEX "idx_smogon_meta_pokemon" ON "public"."smogon_meta_snapshot" USING "btree" ("pokemon_name");



CREATE INDEX "idx_smogon_meta_roles" ON "public"."smogon_meta_snapshot" USING "gin" ("roles");



CREATE INDEX "idx_smogon_meta_source_date" ON "public"."smogon_meta_snapshot" USING "btree" ("source_date" DESC);



CREATE INDEX "idx_smogon_meta_tier" ON "public"."smogon_meta_snapshot" USING "btree" ("tier");



CREATE INDEX "idx_sync_jobs_active" ON "public"."sync_jobs" USING "btree" ("status", "sync_type") WHERE ("status" = 'running'::"text");



CREATE INDEX "idx_sync_jobs_heartbeat" ON "public"."sync_jobs" USING "btree" ("last_heartbeat") WHERE ("status" = 'running'::"text");



CREATE INDEX "idx_sync_jobs_priority" ON "public"."sync_jobs" USING "btree" ("priority", "status", "started_at") WHERE ("status" = 'running'::"text");



CREATE INDEX "idx_sync_jobs_started_at" ON "public"."sync_jobs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sync_jobs_type_status" ON "public"."sync_jobs" USING "btree" ("job_type", "status");



CREATE INDEX "idx_team_categories_featured" ON "public"."team_categories" USING "btree" ("is_featured");



CREATE INDEX "idx_team_categories_sort" ON "public"."team_categories" USING "btree" ("sort_order");



CREATE INDEX "idx_team_formats_active" ON "public"."team_formats" USING "btree" ("is_active");



CREATE INDEX "idx_team_formats_category" ON "public"."team_formats" USING "btree" ("category");



CREATE INDEX "idx_team_formats_generation" ON "public"."team_formats" USING "btree" ("generation");



CREATE INDEX "idx_team_formats_tier" ON "public"."team_formats" USING "btree" ("tier");



CREATE INDEX "idx_team_rosters_pokemon" ON "public"."team_rosters" USING "btree" ("pokemon_id");



CREATE INDEX "idx_team_rosters_team" ON "public"."team_rosters" USING "btree" ("team_id");



CREATE INDEX "idx_team_tag_assignments_tag" ON "public"."team_tag_assignments" USING "btree" ("tag_id");



CREATE INDEX "idx_team_tag_assignments_teamid" ON "public"."team_tag_assignments" USING "btree" ("teamid");



CREATE INDEX "idx_team_tags_name" ON "public"."team_tags" USING "btree" ("tag_name");



CREATE INDEX "idx_team_tags_type" ON "public"."team_tags" USING "btree" ("tag_type");



CREATE INDEX "idx_teams_avatar_url" ON "public"."teams" USING "btree" ("avatar_url") WHERE ("avatar_url" IS NOT NULL);



CREATE INDEX "idx_teams_conference" ON "public"."teams" USING "btree" ("conference");



CREATE INDEX "idx_teams_division" ON "public"."teams" USING "btree" ("division");



CREATE INDEX "idx_teams_wins_desc" ON "public"."teams" USING "btree" ("wins" DESC NULLS LAST);



CREATE INDEX "idx_trade_listings_team" ON "public"."trade_listings" USING "btree" ("team_id");



CREATE INDEX "idx_types_name_fts" ON "public"."types" USING "gin" ("to_tsvector"('"english"'::"regconfig", "name"));



CREATE INDEX "idx_user_activity_action" ON "public"."user_activity_log" USING "btree" ("action");



CREATE INDEX "idx_user_activity_created_at" ON "public"."user_activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_activity_user_id" ON "public"."user_activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_video_comments_created_at" ON "public"."video_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_video_comments_parent_comment_id" ON "public"."video_comments" USING "btree" ("parent_comment_id");



CREATE INDEX "idx_video_comments_user_id" ON "public"."video_comments" USING "btree" ("user_id");



CREATE INDEX "idx_video_comments_video_id" ON "public"."video_comments" USING "btree" ("video_id");



CREATE INDEX "idx_video_feedback_created_at" ON "public"."video_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_video_feedback_rating" ON "public"."video_feedback" USING "btree" ("rating");



CREATE INDEX "idx_video_feedback_user_id" ON "public"."video_feedback" USING "btree" ("user_id");



CREATE INDEX "idx_video_feedback_video_id" ON "public"."video_feedback" USING "btree" ("video_id");



CREATE INDEX "idx_video_tags_is_notified" ON "public"."video_tags" USING "btree" ("is_notified") WHERE ("is_notified" = false);



CREATE INDEX "idx_video_tags_tagged_by_user_id" ON "public"."video_tags" USING "btree" ("tagged_by_user_id");



CREATE INDEX "idx_video_tags_tagged_user_id" ON "public"."video_tags" USING "btree" ("tagged_user_id");



CREATE INDEX "idx_video_tags_video_id" ON "public"."video_tags" USING "btree" ("video_id");



CREATE INDEX "idx_video_views_user_id" ON "public"."video_views" USING "btree" ("user_id");



CREATE INDEX "idx_video_views_video_id" ON "public"."video_views" USING "btree" ("video_id");



CREATE INDEX "idx_video_views_viewed_at" ON "public"."video_views" USING "btree" ("viewed_at" DESC);



CREATE INDEX "idx_videos_last_synced_at" ON "public"."videos" USING "btree" ("last_synced_at");



CREATE INDEX "idx_videos_published_at" ON "public"."videos" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_videos_youtube_channel_id" ON "public"."videos" USING "btree" ("youtube_channel_id");



CREATE INDEX "idx_videos_youtube_video_id" ON "public"."videos" USING "btree" ("youtube_video_id");



CREATE INDEX "idx_workflows_tags_workflow_id" ON "public"."workflows_tags" USING "btree" ("workflowId");



CREATE INDEX "idx_youtube_channels_channel_id" ON "public"."youtube_channels" USING "btree" ("channel_id");



CREATE INDEX "idx_youtube_channels_is_active" ON "public"."youtube_channels" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "memory_id" ON "public"."memory" USING "btree" ("id");



CREATE UNIQUE INDEX "model_id" ON "public"."model" USING "btree" ("id");



CREATE UNIQUE INDEX "pk_credentials_entity_id" ON "public"."credentials_entity" USING "btree" ("id");



CREATE UNIQUE INDEX "pk_tag_entity_id" ON "public"."tag_entity" USING "btree" ("id");



CREATE UNIQUE INDEX "pk_workflow_entity_id" ON "public"."workflow_entity" USING "btree" ("id");



CREATE INDEX "pokeapi_resources_data_gin" ON "public"."pokeapi_resources" USING "gin" ("data" "jsonb_path_ops");



CREATE INDEX "pokeapi_resources_type_name_idx" ON "public"."pokeapi_resources" USING "btree" ("resource_type", "name");



CREATE UNIQUE INDEX "pokeapi_resources_unique" ON "public"."pokeapi_resources" USING "btree" ("resource_type", "resource_key");



CREATE INDEX "pokeapi_resources_url_idx" ON "public"."pokeapi_resources" USING "btree" ("url");



CREATE UNIQUE INDEX "pokepedia_assets_bucket_path_unique" ON "public"."pokepedia_assets" USING "btree" ("bucket", "path");



CREATE INDEX "pokepedia_assets_resource_idx" ON "public"."pokepedia_assets" USING "btree" ("resource_type", "resource_id");



CREATE UNIQUE INDEX "pokepedia_assets_source_unique" ON "public"."pokepedia_assets" USING "btree" ("source_url");



CREATE INDEX "pokepedia_pokemon_abilities_gin" ON "public"."pokepedia_pokemon" USING "gin" ("abilities" "jsonb_path_ops");



CREATE INDEX "pokepedia_pokemon_ability_primary_idx" ON "public"."pokepedia_pokemon" USING "btree" ("ability_primary");



CREATE INDEX "pokepedia_pokemon_base_stats_gin" ON "public"."pokepedia_pokemon" USING "gin" ("base_stats" "jsonb_path_ops");



CREATE INDEX "pokepedia_pokemon_generation_idx" ON "public"."pokepedia_pokemon" USING "btree" ("generation");



CREATE INDEX "pokepedia_pokemon_name_idx" ON "public"."pokepedia_pokemon" USING "btree" ("name");



CREATE INDEX "pokepedia_pokemon_order_idx" ON "public"."pokepedia_pokemon" USING "btree" ("order");



CREATE INDEX "pokepedia_pokemon_species_name_idx" ON "public"."pokepedia_pokemon" USING "btree" ("species_name");



CREATE INDEX "pokepedia_pokemon_total_base_stat_idx" ON "public"."pokepedia_pokemon" USING "btree" ("total_base_stat");



CREATE INDEX "pokepedia_pokemon_type_primary_idx" ON "public"."pokepedia_pokemon" USING "btree" ("type_primary");



CREATE INDEX "pokepedia_pokemon_type_secondary_idx" ON "public"."pokepedia_pokemon" USING "btree" ("type_secondary");



CREATE INDEX "pokepedia_pokemon_types_gin" ON "public"."pokepedia_pokemon" USING "gin" ("types" "jsonb_path_ops");



CREATE INDEX "project_relation_role_idx" ON "public"."project_relation" USING "btree" ("role");



CREATE INDEX "project_relation_role_project_idx" ON "public"."project_relation" USING "btree" ("projectId", "role");



CREATE UNIQUE INDEX "prompt_command" ON "public"."prompt" USING "btree" ("command");



CREATE UNIQUE INDEX "tag_id" ON "public"."tag" USING "btree" ("id");



CREATE UNIQUE INDEX "tool_id" ON "public"."tool" USING "btree" ("id");



CREATE UNIQUE INDEX "user_api_key" ON "public"."user" USING "btree" ("api_key");



CREATE UNIQUE INDEX "user_id" ON "public"."user" USING "btree" ("id");



CREATE UNIQUE INDEX "user_oauth_sub" ON "public"."user" USING "btree" ("oauth_sub");



CREATE INDEX "user_role_idx" ON "public"."user" USING "btree" ("roleSlug");



CREATE UNIQUE INDEX "variables_global_key_unique" ON "public"."variables" USING "btree" ("key") WHERE ("projectId" IS NULL);



CREATE UNIQUE INDEX "variables_project_key_unique" ON "public"."variables" USING "btree" ("projectId", "key") WHERE ("projectId" IS NOT NULL);



CREATE OR REPLACE TRIGGER "canonical_league_config_updated_at" BEFORE UPDATE ON "public"."canonical_league_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_canonical_league_config_updated_at"();



CREATE OR REPLACE TRIGGER "draft_pick_broadcast" AFTER INSERT ON "public"."team_rosters" FOR EACH ROW WHEN (("new"."draft_round" IS NOT NULL)) EXECUTE FUNCTION "public"."broadcast_draft_pick"();



CREATE OR REPLACE TRIGGER "draft_turn_broadcast" AFTER UPDATE ON "public"."draft_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."broadcast_draft_turn"();



CREATE OR REPLACE TRIGGER "on_profile_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_calculate_showdown_team_pokemon_count" BEFORE INSERT OR UPDATE OF "pokemon_data" ON "public"."showdown_teams" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_showdown_team_pokemon_count"();



CREATE OR REPLACE TRIGGER "trigger_update_bulbapedia_mechanics_updated_at" BEFORE UPDATE ON "public"."bulbapedia_mechanics" FOR EACH ROW EXECUTE FUNCTION "public"."update_bulbapedia_mechanics_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_showdown_client_teams_updated_at" BEFORE UPDATE ON "public"."showdown_client_teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_showdown_client_teams_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_showdown_teams_updated_at" BEFORE UPDATE ON "public"."showdown_teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_showdown_teams_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_smogon_meta_snapshot_updated_at" BEFORE UPDATE ON "public"."smogon_meta_snapshot" FOR EACH ROW EXECUTE FUNCTION "public"."update_smogon_meta_snapshot_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_team_categories_updated_at" BEFORE UPDATE ON "public"."team_categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_categories_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_team_formats_updated_at" BEFORE UPDATE ON "public"."team_formats" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_formats_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_team_tags_updated_at" BEFORE UPDATE ON "public"."team_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_team_tags_updated_at"();



CREATE OR REPLACE TRIGGER "update_google_sheets_config_updated_at" BEFORE UPDATE ON "public"."google_sheets_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sheet_mappings_updated_at" BEFORE UPDATE ON "public"."sheet_mappings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_comments_updated_at" BEFORE UPDATE ON "public"."video_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_video_feedback_updated_at" BEFORE UPDATE ON "public"."video_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_videos_updated_at" BEFORE UPDATE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_youtube_channels_updated_at" BEFORE UPDATE ON "public"."youtube_channels" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "workflow_version_increment" BEFORE UPDATE ON "public"."workflow_entity" FOR EACH ROW EXECUTE FUNCTION "public"."increment_workflow_version"();



ALTER TABLE ONLY "public"."processed_data"
    ADD CONSTRAINT "FK_06a69a7032c97a763c2c7599464" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_entity"
    ADD CONSTRAINT "FK_08d6c67b7f722b0039d9d5ed620" FOREIGN KEY ("activeVersionId") REFERENCES "public"."workflow_history"("versionId") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."insights_metadata"
    ADD CONSTRAINT "FK_1d8ab99d5861c9388d2dc1cf733" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_history"
    ADD CONSTRAINT "FK_1e31657f5fe46816c34be7c1b4b" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_1f4998c8a7dec9e00a9ab15550e" FOREIGN KEY ("revisionOfMessageId") REFERENCES "public"."chat_hub_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_user_consents"
    ADD CONSTRAINT "FK_21e6c3c2d78a097478fae6aaefa" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insights_metadata"
    ADD CONSTRAINT "FK_2375a1eda085adb16b24615b69c" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_25c9736e7f769f3a005eef4b372" FOREIGN KEY ("retryOfMessageId") REFERENCES "public"."chat_hub_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."execution_metadata"
    ADD CONSTRAINT "FK_31d0b4c93fb85ced26f6005cda3" FOREIGN KEY ("executionId") REFERENCES "public"."execution_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_credentials"
    ADD CONSTRAINT "FK_416f66fc846c7c442970c094ccf" FOREIGN KEY ("credentialsId") REFERENCES "public"."credentials_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variables"
    ADD CONSTRAINT "FK_42f6c766f9f9d2edcc15bdd6e9b" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_agents"
    ADD CONSTRAINT "FK_441ba2caba11e077ce3fbfa2cd8" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_relation"
    ADD CONSTRAINT "FK_5f0643f6717905a05164090dde7" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_relation"
    ADD CONSTRAINT "FK_61448d56d61802b5dfde5cdb002" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insights_by_period"
    ADD CONSTRAINT "FK_6414cfed98daabbfdd61a1cfbc0" FOREIGN KEY ("metaId") REFERENCES "public"."insights_metadata"("metaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_authorization_codes"
    ADD CONSTRAINT "FK_64d965bd072ea24fb6da55468cd" FOREIGN KEY ("clientId") REFERENCES "public"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_6afb260449dd7a9b85355d4e0c9" FOREIGN KEY ("executionId") REFERENCES "public"."execution_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."insights_raw"
    ADD CONSTRAINT "FK_6e2e33741adef2a7c5d66befa4e" FOREIGN KEY ("metaId") REFERENCES "public"."insights_metadata"("metaId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_publish_history"
    ADD CONSTRAINT "FK_6eab5bd9eedabe9c54bd879fc40" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."oauth_access_tokens"
    ADD CONSTRAINT "FK_7234a36d8e49a1fa85095328845" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installed_nodes"
    ADD CONSTRAINT "FK_73f857fc5dce682cef8a99c11dbddbc969618951" FOREIGN KEY ("package") REFERENCES "public"."installed_packages"("packageName") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_access_tokens"
    ADD CONSTRAINT "FK_78b26968132b7e5e45b75876481" FOREIGN KEY ("clientId") REFERENCES "public"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_sessions"
    ADD CONSTRAINT "FK_7bc13b4c7e6afbfaf9be326c189" FOREIGN KEY ("credentialId") REFERENCES "public"."credentials_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."folder"
    ADD CONSTRAINT "FK_804ea52f6729e3940498bd54d78" FOREIGN KEY ("parentFolderId") REFERENCES "public"."folder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_credentials"
    ADD CONSTRAINT "FK_812c2852270da1247756e77f5a4" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_case_execution"
    ADD CONSTRAINT "FK_8e4b4774db42f1e6dda3452b2af" FOREIGN KEY ("testRunId") REFERENCES "public"."test_run"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_table_column"
    ADD CONSTRAINT "FK_930b6e8faaf88294cef23484160" FOREIGN KEY ("dataTableId") REFERENCES "public"."data_table"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder_tag"
    ADD CONSTRAINT "FK_94a60854e06f2897b2e0d39edba" FOREIGN KEY ("folderId") REFERENCES "public"."folder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."execution_annotations"
    ADD CONSTRAINT "FK_97f863fa83c4786f19565084960" FOREIGN KEY ("executionId") REFERENCES "public"."execution_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_agents"
    ADD CONSTRAINT "FK_9c61ad497dcbae499c96a6a78ba" FOREIGN KEY ("credentialId") REFERENCES "public"."credentials_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_hub_sessions"
    ADD CONSTRAINT "FK_9f9293d9f552496c40e0d1a8f80" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."execution_annotation_tags"
    ADD CONSTRAINT "FK_a3697779b366e131b2bbdae2976" FOREIGN KEY ("tagId") REFERENCES "public"."annotation_tag_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_workflow"
    ADD CONSTRAINT "FK_a45ea5f27bcfdc21af9b4188560" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_dependency"
    ADD CONSTRAINT "FK_a4ff2d9b9628ea988fa9e7d0bf8" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_user_consents"
    ADD CONSTRAINT "FK_a651acea2f6c97f8c4514935486" FOREIGN KEY ("clientId") REFERENCES "public"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_refresh_tokens"
    ADD CONSTRAINT "FK_a699f3ed9fd0c1b19bc2608ac53" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder"
    ADD CONSTRAINT "FK_a8260b0b36939c6247f385b8221" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."oauth_authorization_codes"
    ADD CONSTRAINT "FK_aa8d3560484944c19bdf79ffa16" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_acf8926098f063cdbbad8497fd1" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."oauth_refresh_tokens"
    ADD CONSTRAINT "FK_b388696ce4d8be7ffbe8d3e4b69" FOREIGN KEY ("clientId") REFERENCES "public"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_publish_history"
    ADD CONSTRAINT "FK_b4cfbc7556d07f36ca177f5e473" FOREIGN KEY ("versionId") REFERENCES "public"."workflow_history"("versionId") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_publish_history"
    ADD CONSTRAINT "FK_c01316f8c2d7101ec4fa9809267" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."execution_annotation_tags"
    ADD CONSTRAINT "FK_c1519757391996eb06064f0e7c8" FOREIGN KEY ("annotationId") REFERENCES "public"."execution_annotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."data_table"
    ADD CONSTRAINT "FK_c2a794257dee48af7c9abf681de" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_relation"
    ADD CONSTRAINT "FK_c6b99592dc96b0d836d7a21db91" FOREIGN KEY ("role") REFERENCES "public"."role"("slug");



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_chat_hub_messages_agentId" FOREIGN KEY ("agentId") REFERENCES "public"."chat_hub_agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_hub_sessions"
    ADD CONSTRAINT "FK_chat_hub_sessions_agentId" FOREIGN KEY ("agentId") REFERENCES "public"."chat_hub_agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dynamic_credential_entry"
    ADD CONSTRAINT "FK_d57808fe08b77464f6a88a25494" FOREIGN KEY ("resolver_id") REFERENCES "public"."dynamic_credential_resolver"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_run"
    ADD CONSTRAINT "FK_d6870d3b6e4c185d33926f423c8" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_workflow"
    ADD CONSTRAINT "FK_daa206a04983d47d0a9c34649ce" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder_tag"
    ADD CONSTRAINT "FK_dc88164176283de80af47621746" FOREIGN KEY ("tagId") REFERENCES "public"."tag_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_api_keys"
    ADD CONSTRAINT "FK_e131705cbbc8fb589889b02d457" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_e22538eb50a71a17954cd7e076c" FOREIGN KEY ("sessionId") REFERENCES "public"."chat_hub_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_case_execution"
    ADD CONSTRAINT "FK_e48965fac35d0f5b9e7f51d8c44" FOREIGN KEY ("executionId") REFERENCES "public"."execution_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_hub_messages"
    ADD CONSTRAINT "FK_e5d1fa722c5a8d38ac204746662" FOREIGN KEY ("previousMessageId") REFERENCES "public"."chat_hub_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dynamic_credential_entry"
    ADD CONSTRAINT "FK_e97db563e505ae5f57ca33ef221" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_hub_sessions"
    ADD CONSTRAINT "FK_e9ecf8ede7d989fcd18790fe36a" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "FK_eaea92ee7bfb9c1b6cd01505d56" FOREIGN KEY ("roleSlug") REFERENCES "public"."role"("slug");



ALTER TABLE ONLY "public"."role_scope"
    ADD CONSTRAINT "FK_role" FOREIGN KEY ("roleSlug") REFERENCES "public"."role"("slug") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_scope"
    ADD CONSTRAINT "FK_scope" FOREIGN KEY ("scopeSlug") REFERENCES "public"."scope"("slug") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auth_identity"
    ADD CONSTRAINT "auth_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id");



ALTER TABLE ONLY "public"."battle_events"
    ADD CONSTRAINT "battle_events_battle_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "public"."battle_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_sessions"
    ADD CONSTRAINT "battle_sessions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_sessions"
    ADD CONSTRAINT "battle_sessions_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_sessions"
    ADD CONSTRAINT "battle_sessions_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_sessions"
    ADD CONSTRAINT "battle_sessions_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."berries"
    ADD CONSTRAINT "berries_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("item_id");



ALTER TABLE ONLY "public"."berries"
    ADD CONSTRAINT "berries_natural_gift_type_id_fkey" FOREIGN KEY ("natural_gift_type_id") REFERENCES "public"."types"("type_id");



ALTER TABLE ONLY "public"."canonical_league_config"
    ADD CONSTRAINT "canonical_league_config_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."characteristics"
    ADD CONSTRAINT "characteristics_highest_stat_id_fkey" FOREIGN KEY ("highest_stat_id") REFERENCES "public"."stats"("stat_id");



ALTER TABLE ONLY "public"."coaches"
    ADD CONSTRAINT "coaches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conferences"
    ADD CONSTRAINT "conferences_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contest_types"
    ADD CONSTRAINT "contest_types_berry_flavor_id_fkey" FOREIGN KEY ("berry_flavor_id") REFERENCES "public"."berry_flavors"("flavor_id");



ALTER TABLE ONLY "public"."credentials_entity"
    ADD CONSTRAINT "credentials_entity_resolverId_foreign" FOREIGN KEY ("resolverId") REFERENCES "public"."dynamic_credential_resolver"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "public"."conferences"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."draft_budgets"
    ADD CONSTRAINT "draft_budgets_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."draft_budgets"
    ADD CONSTRAINT "draft_budgets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."draft_pool"
    ADD CONSTRAINT "draft_pool_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon_cache"("pokemon_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."encounter_condition_values"
    ADD CONSTRAINT "encounter_condition_values_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "public"."encounter_conditions"("encounter_condition_id");



ALTER TABLE ONLY "public"."evolution_chains"
    ADD CONSTRAINT "evolution_chains_baby_trigger_item_id_fkey" FOREIGN KEY ("baby_trigger_item_id") REFERENCES "public"."items"("item_id");



ALTER TABLE ONLY "public"."execution_data"
    ADD CONSTRAINT "execution_data_fk" FOREIGN KEY ("executionId") REFERENCES "public"."execution_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."execution_entity"
    ADD CONSTRAINT "fk_execution_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon_egg_groups"
    ADD CONSTRAINT "fk_pokemon_egg_groups_species" FOREIGN KEY ("pokemon_species_id") REFERENCES "public"."pokemon_species"("species_id");



ALTER TABLE ONLY "public"."pokemon_location_areas"
    ADD CONSTRAINT "fk_pokemon_location_areas_pokemon" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon_comprehensive"("pokemon_id");



ALTER TABLE ONLY "public"."webhook_entity"
    ADD CONSTRAINT "fk_webhook_entity_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_entity"
    ADD CONSTRAINT "fk_workflow_parent_folder" FOREIGN KEY ("parentFolderId") REFERENCES "public"."folder"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_statistics"
    ADD CONSTRAINT "fk_workflow_statistics_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows_tags"
    ADD CONSTRAINT "fk_workflows_tags_tag_id" FOREIGN KEY ("tagId") REFERENCES "public"."tag_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows_tags"
    ADD CONSTRAINT "fk_workflows_tags_workflow_id" FOREIGN KEY ("workflowId") REFERENCES "public"."workflow_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."google_sheets_config"
    ADD CONSTRAINT "google_sheets_config_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."location_areas"
    ADD CONSTRAINT "location_areas_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("location_id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("item_id");



ALTER TABLE ONLY "public"."machines"
    ADD CONSTRAINT "machines_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("move_id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."coaches"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_matchweek_id_fkey" FOREIGN KEY ("matchweek_id") REFERENCES "public"."matchweeks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."coaches"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_team1_id_fkey" FOREIGN KEY ("team1_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_team2_id_fkey" FOREIGN KEY ("team2_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matchweeks"
    ADD CONSTRAINT "matchweeks_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."moves"
    ADD CONSTRAINT "moves_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."types"("type_id");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_decreased_stat_id_fkey" FOREIGN KEY ("decreased_stat_id") REFERENCES "public"."stats"("stat_id");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_hates_flavor_id_fkey" FOREIGN KEY ("hates_flavor_id") REFERENCES "public"."berry_flavors"("flavor_id");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_increased_stat_id_fkey" FOREIGN KEY ("increased_stat_id") REFERENCES "public"."stats"("stat_id");



ALTER TABLE ONLY "public"."natures"
    ADD CONSTRAINT "natures_likes_flavor_id_fkey" FOREIGN KEY ("likes_flavor_id") REFERENCES "public"."berry_flavors"("flavor_id");



ALTER TABLE ONLY "public"."pokedexes"
    ADD CONSTRAINT "pokedexes_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("region_id");



ALTER TABLE ONLY "public"."pokemon_abilities"
    ADD CONSTRAINT "pokemon_abilities_ability_id_fkey" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("ability_id");



ALTER TABLE ONLY "public"."pokemon_egg_groups"
    ADD CONSTRAINT "pokemon_egg_groups_egg_group_id_fkey" FOREIGN KEY ("egg_group_id") REFERENCES "public"."egg_groups"("egg_group_id");



ALTER TABLE ONLY "public"."pokemon_items"
    ADD CONSTRAINT "pokemon_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("item_id");



ALTER TABLE ONLY "public"."pokemon_location_areas"
    ADD CONSTRAINT "pokemon_location_areas_location_area_id_fkey" FOREIGN KEY ("location_area_id") REFERENCES "public"."location_areas"("location_area_id");



ALTER TABLE ONLY "public"."pokemon_moves"
    ADD CONSTRAINT "pokemon_moves_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "public"."moves"("move_id");



ALTER TABLE ONLY "public"."pokemon_species"
    ADD CONSTRAINT "pokemon_species_evolves_from_species_id_fkey" FOREIGN KEY ("evolves_from_species_id") REFERENCES "public"."pokemon_species"("species_id");



ALTER TABLE ONLY "public"."pokemon_species"
    ADD CONSTRAINT "pokemon_species_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("generation_id");



ALTER TABLE ONLY "public"."pokemon_comprehensive"
    ADD CONSTRAINT "pokemon_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "public"."pokemon_species"("species_id");



ALTER TABLE ONLY "public"."pokemon_stats"
    ADD CONSTRAINT "pokemon_stats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon_base_stats"
    ADD CONSTRAINT "pokemon_stats_new_stat_id_fkey" FOREIGN KEY ("stat_id") REFERENCES "public"."stats"("stat_id");



ALTER TABLE ONLY "public"."pokemon_stats"
    ADD CONSTRAINT "pokemon_stats_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon_stats"
    ADD CONSTRAINT "pokemon_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pokemon_types"
    ADD CONSTRAINT "pokemon_types_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."types"("type_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "projects_creatorId_foreign" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sheet_mappings"
    ADD CONSTRAINT "sheet_mappings_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."google_sheets_config"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."showdown_teams"
    ADD CONSTRAINT "showdown_teams_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."showdown_teams"
    ADD CONSTRAINT "showdown_teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."showdown_teams"
    ADD CONSTRAINT "showdown_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_rosters"
    ADD CONSTRAINT "team_rosters_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_rosters"
    ADD CONSTRAINT "team_rosters_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_tag_assignments"
    ADD CONSTRAINT "team_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."team_tags"("tag_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_tag_assignments"
    ADD CONSTRAINT "team_tag_assignments_teamid_fkey" FOREIGN KEY ("teamid") REFERENCES "public"."showdown_client_teams"("teamid") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_listings"
    ADD CONSTRAINT "trade_listings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_offers"
    ADD CONSTRAINT "trade_offers_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."trade_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_offers"
    ADD CONSTRAINT "trade_offers_offering_team_id_fkey" FOREIGN KEY ("offering_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_transactions"
    ADD CONSTRAINT "trade_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."coaches"("id");



ALTER TABLE ONLY "public"."trade_transactions"
    ADD CONSTRAINT "trade_transactions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_transactions"
    ADD CONSTRAINT "trade_transactions_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trade_transactions"
    ADD CONSTRAINT "trade_transactions_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."version_groups"
    ADD CONSTRAINT "version_groups_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("generation_id");



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."video_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_comments"
    ADD CONSTRAINT "video_comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_feedback"
    ADD CONSTRAINT "video_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_feedback"
    ADD CONSTRAINT "video_feedback_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_tagged_by_user_id_fkey" FOREIGN KEY ("tagged_by_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_tagged_user_id_fkey" FOREIGN KEY ("tagged_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_tags"
    ADD CONSTRAINT "video_tags_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_views"
    ADD CONSTRAINT "video_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."video_views"
    ADD CONSTRAINT "video_views_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



CREATE POLICY "Abilities are viewable by everyone" ON "public"."abilities" FOR SELECT USING (true);



CREATE POLICY "Admins can delete profiles" ON "public"."profiles" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can modify role permissions" ON "public"."role_permissions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all activity" ON "public"."user_activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Allow all category operations" ON "public"."team_categories" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all client team operations" ON "public"."showdown_client_teams" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all format operations" ON "public"."team_formats" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all tag assignment operations" ON "public"."team_tag_assignments" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all tag operations" ON "public"."team_tags" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated insert on matches" ON "public"."matches" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated insert on pokemon_stats" ON "public"."pokemon_base_stats" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated insert on pokemon_stats" ON "public"."pokemon_stats" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated insert on sync_log" ON "public"."sync_log" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated insert on teams" ON "public"."teams" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated update on matches" ON "public"."matches" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated update on teams" ON "public"."teams" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow insert replayplayers" ON "public"."replayplayers" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert replays" ON "public"."replays" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read access on matches" ON "public"."matches" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on pokemon" ON "public"."pokemon" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on pokemon_stats" ON "public"."pokemon_base_stats" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on pokemon_stats" ON "public"."pokemon_stats" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on team_rosters" ON "public"."team_rosters" FOR SELECT USING (true);



CREATE POLICY "Allow public read access on teams" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to pokeapi_resources" ON "public"."pokeapi_resources" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to pokepedia_assets" ON "public"."pokepedia_assets" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to pokepedia_pokemon" ON "public"."pokepedia_pokemon" FOR SELECT USING (true);



CREATE POLICY "Allow public read on sync_log" ON "public"."sync_log" FOR SELECT USING (true);



CREATE POLICY "Allow read non-private replayplayers" ON "public"."replayplayers" FOR SELECT USING (("private" = 0));



CREATE POLICY "Allow read non-private replays" ON "public"."replays" FOR SELECT USING (("private" = 0));



CREATE POLICY "Allow update replays" ON "public"."replays" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can create video views" ON "public"."video_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "Authenticated delete google_sheets_config" ON "public"."google_sheets_config" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated delete sheet_mappings" ON "public"."sheet_mappings" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert battle_events" ON "public"."battle_events" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert battle_sessions" ON "public"."battle_sessions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert coaches" ON "public"."coaches" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert google_sheets_config" ON "public"."google_sheets_config" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert seasons" ON "public"."seasons" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert sheet_mappings" ON "public"."sheet_mappings" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated insert sync_jobs" ON "public"."sync_jobs" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated update battle_sessions" ON "public"."battle_sessions" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated update google_sheets_config" ON "public"."google_sheets_config" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated update sheet_mappings" ON "public"."sheet_mappings" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated update sync_jobs" ON "public"."sync_jobs" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can log activity" ON "public"."user_activity_log" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can read cache" ON "public"."pokeapi_resource_cache" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Canonical league config is manageable by service role" ON "public"."canonical_league_config" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Canonical league config is viewable by authenticated users" ON "public"."canonical_league_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Coaches create trade_offers" ON "public"."trade_offers" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "coaches"."user_id"
   FROM "public"."coaches"
  WHERE ("coaches"."id" IN ( SELECT "teams"."coach_id"
           FROM "public"."teams"
          WHERE ("teams"."id" = "trade_offers"."offering_team_id"))))));



CREATE POLICY "Coaches manage own trade_listings" ON "public"."trade_listings" USING (("auth"."uid"() IN ( SELECT "coaches"."user_id"
   FROM "public"."coaches"
  WHERE ("coaches"."id" IN ( SELECT "teams"."coach_id"
           FROM "public"."teams"
          WHERE ("teams"."id" = "trade_listings"."team_id"))))));



CREATE POLICY "Draft pool is deletable by service role" ON "public"."draft_pool" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Draft pool is insertable by service role" ON "public"."draft_pool" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Draft pool is updatable by service role" ON "public"."draft_pool" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Draft pool is viewable by authenticated users" ON "public"."draft_pool" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Draft sessions are insertable by service role" ON "public"."draft_sessions" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Draft sessions are updatable by service role" ON "public"."draft_sessions" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Draft sessions are viewable by everyone" ON "public"."draft_sessions" FOR SELECT USING (true);



CREATE POLICY "Evolution chains are viewable by everyone" ON "public"."evolution_chains" FOR SELECT USING (true);



CREATE POLICY "Generations are viewable by everyone" ON "public"."generations" FOR SELECT USING (true);



CREATE POLICY "Items are viewable by everyone" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "League config is insertable by service role" ON "public"."league_config" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "League config is updatable by service role" ON "public"."league_config" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "League config is viewable by authenticated users" ON "public"."league_config" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Moves are viewable by everyone" ON "public"."moves" FOR SELECT USING (true);



CREATE POLICY "Pokemon abilities are viewable by everyone" ON "public"."pokemon_abilities" FOR SELECT USING (true);



CREATE POLICY "Pokemon data is viewable by everyone" ON "public"."pokemon_comprehensive" FOR SELECT USING (true);



CREATE POLICY "Pokemon forms are viewable by everyone" ON "public"."pokemon_forms" FOR SELECT USING (true);



CREATE POLICY "Pokemon items are viewable by everyone" ON "public"."pokemon_items" FOR SELECT USING (true);



CREATE POLICY "Pokemon moves are viewable by everyone" ON "public"."pokemon_moves" FOR SELECT USING (true);



CREATE POLICY "Pokemon species is viewable by everyone" ON "public"."pokemon_species" FOR SELECT USING (true);



CREATE POLICY "Pokemon stats are viewable by everyone" ON "public"."pokemon_base_stats" FOR SELECT USING (true);



CREATE POLICY "Pokemon types are viewable by everyone" ON "public"."pokemon_types" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public read battle_events" ON "public"."battle_events" FOR SELECT USING (true);



CREATE POLICY "Public read battle_sessions" ON "public"."battle_sessions" FOR SELECT USING (true);



CREATE POLICY "Public read berries" ON "public"."berries" FOR SELECT USING (true);



CREATE POLICY "Public read coaches" ON "public"."coaches" FOR SELECT USING (true);



CREATE POLICY "Public read conferences" ON "public"."conferences" FOR SELECT USING (true);



CREATE POLICY "Public read divisions" ON "public"."divisions" FOR SELECT USING (true);



CREATE POLICY "Public read draft_budgets" ON "public"."draft_budgets" FOR SELECT USING (true);



CREATE POLICY "Public read evolution_triggers" ON "public"."evolution_triggers" FOR SELECT USING (true);



CREATE POLICY "Public read google_sheets_config" ON "public"."google_sheets_config" FOR SELECT USING (true);



CREATE POLICY "Public read items" ON "public"."items" FOR SELECT USING (true);



CREATE POLICY "Public read matchweeks" ON "public"."matchweeks" FOR SELECT USING (true);



CREATE POLICY "Public read natures" ON "public"."natures" FOR SELECT USING (true);



CREATE POLICY "Public read pokemon_cache" ON "public"."pokemon_cache" FOR SELECT USING (true);



CREATE POLICY "Public read seasons" ON "public"."seasons" FOR SELECT USING (true);



CREATE POLICY "Public read sheet_mappings" ON "public"."sheet_mappings" FOR SELECT USING (true);



CREATE POLICY "Public read sync_jobs" ON "public"."sync_jobs" FOR SELECT USING (true);



CREATE POLICY "Public read trade_listings" ON "public"."trade_listings" FOR SELECT USING (true);



CREATE POLICY "Public read trade_offers" ON "public"."trade_offers" FOR SELECT USING (true);



CREATE POLICY "Public read trade_transactions" ON "public"."trade_transactions" FOR SELECT USING (true);



CREATE POLICY "Public role permissions are viewable" ON "public"."role_permissions" FOR SELECT USING (true);



CREATE POLICY "Service role can manage Pokemon abilities" ON "public"."pokemon_abilities" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage Pokemon forms" ON "public"."pokemon_forms" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage Pokemon items" ON "public"."pokemon_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage Pokemon moves" ON "public"."pokemon_moves" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage Pokemon species" ON "public"."pokemon_species" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage Pokemon stats" ON "public"."pokemon_base_stats" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage Pokemon types" ON "public"."pokemon_types" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage abilities" ON "public"."abilities" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage berries" ON "public"."berries" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage berry_firmnesses" ON "public"."berry_firmnesses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage berry_flavors" ON "public"."berry_flavors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage cache" ON "public"."pokeapi_resource_cache" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage characteristics" ON "public"."characteristics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage contest_effects" ON "public"."contest_effects" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage contest_types" ON "public"."contest_types" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage egg_groups" ON "public"."egg_groups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage encounter_condition_values" ON "public"."encounter_condition_values" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage encounter_conditions" ON "public"."encounter_conditions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage encounter_methods" ON "public"."encounter_methods" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage evolution chains" ON "public"."evolution_chains" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage evolution_triggers" ON "public"."evolution_triggers" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage genders" ON "public"."genders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage generations" ON "public"."generations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage growth_rates" ON "public"."growth_rates" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage item_attributes" ON "public"."item_attributes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage item_categories" ON "public"."item_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage item_fling_effects" ON "public"."item_fling_effects" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage item_pockets" ON "public"."item_pockets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage items" ON "public"."items" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage languages" ON "public"."languages" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage location_areas" ON "public"."location_areas" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage locations" ON "public"."locations" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage machines" ON "public"."machines" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage move_ailments" ON "public"."move_ailments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage move_battle_styles" ON "public"."move_battle_styles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage move_categories" ON "public"."move_categories" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage move_damage_classes" ON "public"."move_damage_classes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage move_learn_methods" ON "public"."move_learn_methods" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage move_targets" ON "public"."move_targets" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage moves" ON "public"."moves" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage natures" ON "public"."natures" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage pal_park_areas" ON "public"."pal_park_areas" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokeathlon_stats" ON "public"."pokeathlon_stats" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokedexes" ON "public"."pokedexes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokemon_colors" ON "public"."pokemon_colors" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokemon_egg_groups" ON "public"."pokemon_egg_groups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokemon_habitats" ON "public"."pokemon_habitats" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokemon_location_areas" ON "public"."pokemon_location_areas" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage pokemon_shapes" ON "public"."pokemon_shapes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage regions" ON "public"."regions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage stats" ON "public"."stats" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage super_contest_effects" ON "public"."super_contest_effects" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage types" ON "public"."types" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage version_groups" ON "public"."version_groups" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage versions" ON "public"."versions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can write pokeapi_resources" ON "public"."pokeapi_resources" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can write pokepedia_assets" ON "public"."pokepedia_assets" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can write pokepedia_pokemon" ON "public"."pokepedia_pokemon" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role or authenticated insert pokemon_cache" ON "public"."pokemon_cache" FOR INSERT WITH CHECK ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Service role or authenticated update pokemon_cache" ON "public"."pokemon_cache" FOR UPDATE USING ((("auth"."role"() = 'service_role'::"text") OR ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Stats are viewable by everyone" ON "public"."stats" FOR SELECT USING (true);



CREATE POLICY "Types are viewable by everyone" ON "public"."types" FOR SELECT USING (true);



CREATE POLICY "Users can create comments" ON "public"."video_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create tags" ON "public"."video_tags" FOR INSERT WITH CHECK (("auth"."uid"() = "tagged_by_user_id"));



CREATE POLICY "Users can create their own feedback" ON "public"."video_feedback" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own teams" ON "public"."showdown_teams" FOR UPDATE USING (("coach_id" IN ( SELECT "coaches"."id"
   FROM "public"."coaches"
  WHERE ("coaches"."user_id" = "auth"."uid"())))) WITH CHECK (("deleted_at" IS NOT NULL));



CREATE POLICY "Users can delete tags they created" ON "public"."video_tags" FOR DELETE USING (("auth"."uid"() = "tagged_by_user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."video_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own feedback" ON "public"."video_feedback" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own teams" ON "public"."showdown_teams" FOR INSERT WITH CHECK (("coach_id" IN ( SELECT "coaches"."id"
   FROM "public"."coaches"
  WHERE ("coaches"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own teams" ON "public"."showdown_teams" FOR UPDATE USING ((("deleted_at" IS NULL) AND ("coach_id" IN ( SELECT "coaches"."id"
   FROM "public"."coaches"
  WHERE ("coaches"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own comments" ON "public"."video_comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own feedback" ON "public"."video_feedback" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own activity" ON "public"."user_activity_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own teams and stock teams" ON "public"."showdown_teams" FOR SELECT USING ((("deleted_at" IS NULL) AND (("coach_id" IN ( SELECT "coaches"."id"
   FROM "public"."coaches"
  WHERE ("coaches"."user_id" = "auth"."uid"()))) OR ("team_id" IN ( SELECT "teams"."id"
   FROM "public"."teams"
  WHERE ("teams"."coach_id" IN ( SELECT "coaches"."id"
           FROM "public"."coaches"
          WHERE ("coaches"."user_id" = "auth"."uid"()))))) OR (("is_stock" = true) AND ("auth"."uid"() IS NOT NULL)))));



CREATE POLICY "Video comments are viewable by everyone" ON "public"."video_comments" FOR SELECT USING (("is_deleted" = false));



CREATE POLICY "Video feedback is viewable by everyone" ON "public"."video_feedback" FOR SELECT USING (true);



CREATE POLICY "Video tags are viewable by everyone" ON "public"."video_tags" FOR SELECT USING (true);



CREATE POLICY "Video views are viewable by everyone" ON "public"."video_views" FOR SELECT USING (true);



CREATE POLICY "Videos are viewable by everyone" ON "public"."videos" FOR SELECT USING (true);



CREATE POLICY "Videos can be created by authenticated users" ON "public"."videos" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Videos can be updated by authenticated users" ON "public"."videos" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "YouTube channels are viewable by everyone" ON "public"."youtube_channels" FOR SELECT USING (true);



CREATE POLICY "YouTube channels can be created by authenticated users" ON "public"."youtube_channels" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "YouTube channels can be updated by authenticated users" ON "public"."youtube_channels" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."abilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."battle_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."battle_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."berries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "berries is viewable by everyone" ON "public"."berries" FOR SELECT USING (true);



ALTER TABLE "public"."berry_firmnesses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "berry_firmnesses is viewable by everyone" ON "public"."berry_firmnesses" FOR SELECT USING (true);



ALTER TABLE "public"."berry_flavors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "berry_flavors is viewable by everyone" ON "public"."berry_flavors" FOR SELECT USING (true);



ALTER TABLE "public"."canonical_league_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."characteristics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "characteristics is viewable by everyone" ON "public"."characteristics" FOR SELECT USING (true);



ALTER TABLE "public"."coaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contest_effects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contest_effects is viewable by everyone" ON "public"."contest_effects" FOR SELECT USING (true);



ALTER TABLE "public"."contest_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contest_types is viewable by everyone" ON "public"."contest_types" FOR SELECT USING (true);



ALTER TABLE "public"."discord_webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."draft_budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."draft_pool" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."draft_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."egg_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "egg_groups is viewable by everyone" ON "public"."egg_groups" FOR SELECT USING (true);



ALTER TABLE "public"."encounter_condition_values" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "encounter_condition_values is viewable by everyone" ON "public"."encounter_condition_values" FOR SELECT USING (true);



ALTER TABLE "public"."encounter_conditions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "encounter_conditions is viewable by everyone" ON "public"."encounter_conditions" FOR SELECT USING (true);



ALTER TABLE "public"."encounter_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "encounter_methods is viewable by everyone" ON "public"."encounter_methods" FOR SELECT USING (true);



ALTER TABLE "public"."evolution_chains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."evolution_triggers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "genders is viewable by everyone" ON "public"."genders" FOR SELECT USING (true);



ALTER TABLE "public"."generations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_sheets_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."growth_rates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "growth_rates is viewable by everyone" ON "public"."growth_rates" FOR SELECT USING (true);



ALTER TABLE "public"."item_attributes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_attributes is viewable by everyone" ON "public"."item_attributes" FOR SELECT USING (true);



ALTER TABLE "public"."item_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_categories is viewable by everyone" ON "public"."item_categories" FOR SELECT USING (true);



ALTER TABLE "public"."item_fling_effects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_fling_effects is viewable by everyone" ON "public"."item_fling_effects" FOR SELECT USING (true);



ALTER TABLE "public"."item_pockets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "item_pockets is viewable by everyone" ON "public"."item_pockets" FOR SELECT USING (true);



ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."languages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "languages is viewable by everyone" ON "public"."languages" FOR SELECT USING (true);



ALTER TABLE "public"."league_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "location_areas is viewable by everyone" ON "public"."location_areas" FOR SELECT USING (true);



ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations is viewable by everyone" ON "public"."locations" FOR SELECT USING (true);



ALTER TABLE "public"."machines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "machines is viewable by everyone" ON "public"."machines" FOR SELECT USING (true);



ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matchweeks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."move_ailments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "move_ailments is viewable by everyone" ON "public"."move_ailments" FOR SELECT USING (true);



ALTER TABLE "public"."move_battle_styles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "move_battle_styles is viewable by everyone" ON "public"."move_battle_styles" FOR SELECT USING (true);



ALTER TABLE "public"."move_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "move_categories is viewable by everyone" ON "public"."move_categories" FOR SELECT USING (true);



ALTER TABLE "public"."move_damage_classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "move_damage_classes is viewable by everyone" ON "public"."move_damage_classes" FOR SELECT USING (true);



ALTER TABLE "public"."move_learn_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "move_learn_methods is viewable by everyone" ON "public"."move_learn_methods" FOR SELECT USING (true);



ALTER TABLE "public"."move_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "move_targets is viewable by everyone" ON "public"."move_targets" FOR SELECT USING (true);



ALTER TABLE "public"."moves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."natures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "natures is viewable by everyone" ON "public"."natures" FOR SELECT USING (true);



ALTER TABLE "public"."pal_park_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pal_park_areas is viewable by everyone" ON "public"."pal_park_areas" FOR SELECT USING (true);



ALTER TABLE "public"."pokeapi_resource_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokeapi_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokeathlon_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokeathlon_stats is viewable by everyone" ON "public"."pokeathlon_stats" FOR SELECT USING (true);



ALTER TABLE "public"."pokedexes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokedexes is viewable by everyone" ON "public"."pokedexes" FOR SELECT USING (true);



ALTER TABLE "public"."pokemon" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_abilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_base_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_colors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokemon_colors is viewable by everyone" ON "public"."pokemon_colors" FOR SELECT USING (true);



ALTER TABLE "public"."pokemon_comprehensive" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_egg_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokemon_egg_groups is viewable by everyone" ON "public"."pokemon_egg_groups" FOR SELECT USING (true);



ALTER TABLE "public"."pokemon_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_habitats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokemon_habitats is viewable by everyone" ON "public"."pokemon_habitats" FOR SELECT USING (true);



ALTER TABLE "public"."pokemon_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_location_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokemon_location_areas is viewable by everyone" ON "public"."pokemon_location_areas" FOR SELECT USING (true);



ALTER TABLE "public"."pokemon_moves" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_shapes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pokemon_shapes is viewable by everyone" ON "public"."pokemon_shapes" FOR SELECT USING (true);



ALTER TABLE "public"."pokemon_species" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokemon_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokepedia_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pokepedia_pokemon" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."regions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "regions is viewable by everyone" ON "public"."regions" FOR SELECT USING (true);



ALTER TABLE "public"."replayplayers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."replays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sheet_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."showdown_client_teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."showdown_teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."super_contest_effects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "super_contest_effects is viewable by everyone" ON "public"."super_contest_effects" FOR SELECT USING (true);



ALTER TABLE "public"."sync_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_formats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_rosters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_tag_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_offers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trade_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."version_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "version_groups is viewable by everyone" ON "public"."version_groups" FOR SELECT USING (true);



ALTER TABLE "public"."versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "versions is viewable by everyone" ON "public"."versions" FOR SELECT USING (true);



ALTER TABLE "public"."video_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."youtube_channels" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."assign_coach_to_team"("p_user_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_coach_to_team"("p_user_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_coach_to_team"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."broadcast_draft_pick"() TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_draft_pick"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_draft_pick"() TO "service_role";



GRANT ALL ON FUNCTION "public"."broadcast_draft_turn"() TO "anon";
GRANT ALL ON FUNCTION "public"."broadcast_draft_turn"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."broadcast_draft_turn"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_showdown_team_pokemon_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_showdown_team_pokemon_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_showdown_team_pokemon_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_pokedex_sprites_bucket"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_pokedex_sprites_bucket"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_pokedex_sprites_bucket"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pokemon_by_tier"("tier_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pokemon_by_tier"("tier_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pokemon_by_tier"("tier_points" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pokepedia_cron_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pokepedia_cron_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pokepedia_cron_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pokepedia_queue_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pokepedia_queue_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pokepedia_queue_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pokepedia_sync_progress"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pokepedia_sync_progress"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pokepedia_sync_progress"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_transaction_count"("p_team_id" "uuid", "p_season_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_transaction_count"("p_team_id" "uuid", "p_season_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_transaction_count"("p_team_id" "uuid", "p_season_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_workflow_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_workflow_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_workflow_version"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mcp_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mcp_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."mcp_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."unschedule_pokepedia_cron"() TO "anon";
GRANT ALL ON FUNCTION "public"."unschedule_pokepedia_cron"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."unschedule_pokepedia_cron"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_bulbapedia_mechanics_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_bulbapedia_mechanics_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_bulbapedia_mechanics_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_canonical_league_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_canonical_league_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_canonical_league_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_showdown_client_teams_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_showdown_client_teams_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_showdown_client_teams_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_showdown_teams_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_showdown_teams_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_showdown_teams_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_smogon_meta_snapshot_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_smogon_meta_snapshot_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_smogon_meta_snapshot_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_categories_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_categories_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_categories_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_formats_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_formats_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_formats_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_team_tags_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_team_tags_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_team_tags_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "required_permission" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "required_permission" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_id" "uuid", "required_permission" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_free_agency_transaction"("p_team_id" "uuid", "p_season_id" "uuid", "p_transaction_type" "text", "p_added_points" integer, "p_dropped_points" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_free_agency_transaction"("p_team_id" "uuid", "p_season_id" "uuid", "p_transaction_type" "text", "p_added_points" integer, "p_dropped_points" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_free_agency_transaction"("p_team_id" "uuid", "p_season_id" "uuid", "p_transaction_type" "text", "p_added_points" integer, "p_dropped_points" integer) TO "service_role";



GRANT ALL ON TABLE "public"."abilities" TO "anon";
GRANT ALL ON TABLE "public"."abilities" TO "authenticated";
GRANT ALL ON TABLE "public"."abilities" TO "service_role";



GRANT ALL ON TABLE "public"."annotation_tag_entity" TO "anon";
GRANT ALL ON TABLE "public"."annotation_tag_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."annotation_tag_entity" TO "service_role";



GRANT ALL ON TABLE "public"."auth" TO "anon";
GRANT ALL ON TABLE "public"."auth" TO "authenticated";
GRANT ALL ON TABLE "public"."auth" TO "service_role";



GRANT ALL ON TABLE "public"."auth_identity" TO "anon";
GRANT ALL ON TABLE "public"."auth_identity" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_identity" TO "service_role";



GRANT ALL ON TABLE "public"."auth_provider_sync_history" TO "anon";
GRANT ALL ON TABLE "public"."auth_provider_sync_history" TO "authenticated";
GRANT ALL ON TABLE "public"."auth_provider_sync_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."auth_provider_sync_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auth_provider_sync_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auth_provider_sync_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."battle_events" TO "anon";
GRANT ALL ON TABLE "public"."battle_events" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."battle_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."battle_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."battle_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."battle_sessions" TO "anon";
GRANT ALL ON TABLE "public"."battle_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."berries" TO "anon";
GRANT ALL ON TABLE "public"."berries" TO "authenticated";
GRANT ALL ON TABLE "public"."berries" TO "service_role";



GRANT ALL ON TABLE "public"."berry_firmnesses" TO "anon";
GRANT ALL ON TABLE "public"."berry_firmnesses" TO "authenticated";
GRANT ALL ON TABLE "public"."berry_firmnesses" TO "service_role";



GRANT ALL ON TABLE "public"."berry_flavors" TO "anon";
GRANT ALL ON TABLE "public"."berry_flavors" TO "authenticated";
GRANT ALL ON TABLE "public"."berry_flavors" TO "service_role";



GRANT ALL ON TABLE "public"."binary_data" TO "anon";
GRANT ALL ON TABLE "public"."binary_data" TO "authenticated";
GRANT ALL ON TABLE "public"."binary_data" TO "service_role";



GRANT ALL ON TABLE "public"."bulbapedia_mechanics" TO "anon";
GRANT ALL ON TABLE "public"."bulbapedia_mechanics" TO "authenticated";
GRANT ALL ON TABLE "public"."bulbapedia_mechanics" TO "service_role";



GRANT ALL ON TABLE "public"."canonical_league_config" TO "anon";
GRANT ALL ON TABLE "public"."canonical_league_config" TO "authenticated";
GRANT ALL ON TABLE "public"."canonical_league_config" TO "service_role";



GRANT ALL ON TABLE "public"."characteristics" TO "anon";
GRANT ALL ON TABLE "public"."characteristics" TO "authenticated";
GRANT ALL ON TABLE "public"."characteristics" TO "service_role";



GRANT ALL ON TABLE "public"."chat" TO "anon";
GRANT ALL ON TABLE "public"."chat" TO "authenticated";
GRANT ALL ON TABLE "public"."chat" TO "service_role";



GRANT ALL ON TABLE "public"."chat_hub_agents" TO "anon";
GRANT ALL ON TABLE "public"."chat_hub_agents" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_hub_agents" TO "service_role";



GRANT ALL ON TABLE "public"."chat_hub_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_hub_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_hub_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_hub_sessions" TO "anon";
GRANT ALL ON TABLE "public"."chat_hub_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_hub_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."chatidtag" TO "anon";
GRANT ALL ON TABLE "public"."chatidtag" TO "authenticated";
GRANT ALL ON TABLE "public"."chatidtag" TO "service_role";



GRANT ALL ON TABLE "public"."coaches" TO "anon";
GRANT ALL ON TABLE "public"."coaches" TO "authenticated";
GRANT ALL ON TABLE "public"."coaches" TO "service_role";



GRANT ALL ON TABLE "public"."conferences" TO "anon";
GRANT ALL ON TABLE "public"."conferences" TO "authenticated";
GRANT ALL ON TABLE "public"."conferences" TO "service_role";



GRANT ALL ON TABLE "public"."contest_effects" TO "anon";
GRANT ALL ON TABLE "public"."contest_effects" TO "authenticated";
GRANT ALL ON TABLE "public"."contest_effects" TO "service_role";



GRANT ALL ON TABLE "public"."contest_types" TO "anon";
GRANT ALL ON TABLE "public"."contest_types" TO "authenticated";
GRANT ALL ON TABLE "public"."contest_types" TO "service_role";



GRANT ALL ON TABLE "public"."credentials_entity" TO "anon";
GRANT ALL ON TABLE "public"."credentials_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."credentials_entity" TO "service_role";



GRANT ALL ON TABLE "public"."data_table" TO "anon";
GRANT ALL ON TABLE "public"."data_table" TO "authenticated";
GRANT ALL ON TABLE "public"."data_table" TO "service_role";



GRANT ALL ON TABLE "public"."data_table_column" TO "anon";
GRANT ALL ON TABLE "public"."data_table_column" TO "authenticated";
GRANT ALL ON TABLE "public"."data_table_column" TO "service_role";



GRANT ALL ON TABLE "public"."discord_webhooks" TO "anon";
GRANT ALL ON TABLE "public"."discord_webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."discord_webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."document" TO "anon";
GRANT ALL ON TABLE "public"."document" TO "authenticated";
GRANT ALL ON TABLE "public"."document" TO "service_role";



GRANT ALL ON SEQUENCE "public"."document_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."document_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."document_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."draft_budgets" TO "anon";
GRANT ALL ON TABLE "public"."draft_budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."draft_budgets" TO "service_role";



GRANT ALL ON TABLE "public"."draft_pool" TO "anon";
GRANT ALL ON TABLE "public"."draft_pool" TO "authenticated";
GRANT ALL ON TABLE "public"."draft_pool" TO "service_role";



GRANT ALL ON TABLE "public"."draft_sessions" TO "anon";
GRANT ALL ON TABLE "public"."draft_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."draft_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."dynamic_credential_entry" TO "anon";
GRANT ALL ON TABLE "public"."dynamic_credential_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."dynamic_credential_entry" TO "service_role";



GRANT ALL ON TABLE "public"."dynamic_credential_resolver" TO "anon";
GRANT ALL ON TABLE "public"."dynamic_credential_resolver" TO "authenticated";
GRANT ALL ON TABLE "public"."dynamic_credential_resolver" TO "service_role";



GRANT ALL ON TABLE "public"."egg_groups" TO "anon";
GRANT ALL ON TABLE "public"."egg_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."egg_groups" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_condition_values" TO "anon";
GRANT ALL ON TABLE "public"."encounter_condition_values" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_condition_values" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_conditions" TO "anon";
GRANT ALL ON TABLE "public"."encounter_conditions" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_conditions" TO "service_role";



GRANT ALL ON TABLE "public"."encounter_methods" TO "anon";
GRANT ALL ON TABLE "public"."encounter_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."encounter_methods" TO "service_role";



GRANT ALL ON TABLE "public"."event_destinations" TO "anon";
GRANT ALL ON TABLE "public"."event_destinations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_destinations" TO "service_role";



GRANT ALL ON TABLE "public"."evolution_chains" TO "anon";
GRANT ALL ON TABLE "public"."evolution_chains" TO "authenticated";
GRANT ALL ON TABLE "public"."evolution_chains" TO "service_role";



GRANT ALL ON TABLE "public"."evolution_triggers" TO "anon";
GRANT ALL ON TABLE "public"."evolution_triggers" TO "authenticated";
GRANT ALL ON TABLE "public"."evolution_triggers" TO "service_role";



GRANT ALL ON TABLE "public"."execution_annotation_tags" TO "anon";
GRANT ALL ON TABLE "public"."execution_annotation_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."execution_annotation_tags" TO "service_role";



GRANT ALL ON TABLE "public"."execution_annotations" TO "anon";
GRANT ALL ON TABLE "public"."execution_annotations" TO "authenticated";
GRANT ALL ON TABLE "public"."execution_annotations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."execution_annotations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."execution_annotations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."execution_annotations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."execution_data" TO "anon";
GRANT ALL ON TABLE "public"."execution_data" TO "authenticated";
GRANT ALL ON TABLE "public"."execution_data" TO "service_role";



GRANT ALL ON TABLE "public"."execution_entity" TO "anon";
GRANT ALL ON TABLE "public"."execution_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."execution_entity" TO "service_role";



GRANT ALL ON SEQUENCE "public"."execution_entity_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."execution_entity_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."execution_entity_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."execution_metadata" TO "anon";
GRANT ALL ON TABLE "public"."execution_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."execution_metadata" TO "service_role";



GRANT ALL ON SEQUENCE "public"."execution_metadata_temp_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."execution_metadata_temp_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."execution_metadata_temp_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."file" TO "anon";
GRANT ALL ON TABLE "public"."file" TO "authenticated";
GRANT ALL ON TABLE "public"."file" TO "service_role";



GRANT ALL ON TABLE "public"."folder" TO "anon";
GRANT ALL ON TABLE "public"."folder" TO "authenticated";
GRANT ALL ON TABLE "public"."folder" TO "service_role";



GRANT ALL ON TABLE "public"."folder_tag" TO "anon";
GRANT ALL ON TABLE "public"."folder_tag" TO "authenticated";
GRANT ALL ON TABLE "public"."folder_tag" TO "service_role";



GRANT ALL ON TABLE "public"."function" TO "anon";
GRANT ALL ON TABLE "public"."function" TO "authenticated";
GRANT ALL ON TABLE "public"."function" TO "service_role";



GRANT ALL ON TABLE "public"."genders" TO "anon";
GRANT ALL ON TABLE "public"."genders" TO "authenticated";
GRANT ALL ON TABLE "public"."genders" TO "service_role";



GRANT ALL ON TABLE "public"."generations" TO "anon";
GRANT ALL ON TABLE "public"."generations" TO "authenticated";
GRANT ALL ON TABLE "public"."generations" TO "service_role";



GRANT ALL ON TABLE "public"."google_sheets_config" TO "anon";
GRANT ALL ON TABLE "public"."google_sheets_config" TO "authenticated";
GRANT ALL ON TABLE "public"."google_sheets_config" TO "service_role";



GRANT ALL ON TABLE "public"."growth_rates" TO "anon";
GRANT ALL ON TABLE "public"."growth_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."growth_rates" TO "service_role";



GRANT ALL ON TABLE "public"."insights_by_period" TO "anon";
GRANT ALL ON TABLE "public"."insights_by_period" TO "authenticated";
GRANT ALL ON TABLE "public"."insights_by_period" TO "service_role";



GRANT ALL ON SEQUENCE "public"."insights_by_period_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."insights_by_period_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."insights_by_period_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."insights_metadata" TO "anon";
GRANT ALL ON TABLE "public"."insights_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."insights_metadata" TO "service_role";



GRANT ALL ON SEQUENCE "public"."insights_metadata_metaId_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."insights_metadata_metaId_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."insights_metadata_metaId_seq" TO "service_role";



GRANT ALL ON TABLE "public"."insights_raw" TO "anon";
GRANT ALL ON TABLE "public"."insights_raw" TO "authenticated";
GRANT ALL ON TABLE "public"."insights_raw" TO "service_role";



GRANT ALL ON SEQUENCE "public"."insights_raw_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."insights_raw_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."insights_raw_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."installed_nodes" TO "anon";
GRANT ALL ON TABLE "public"."installed_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."installed_nodes" TO "service_role";



GRANT ALL ON TABLE "public"."installed_packages" TO "anon";
GRANT ALL ON TABLE "public"."installed_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."installed_packages" TO "service_role";



GRANT ALL ON TABLE "public"."invalid_auth_token" TO "anon";
GRANT ALL ON TABLE "public"."invalid_auth_token" TO "authenticated";
GRANT ALL ON TABLE "public"."invalid_auth_token" TO "service_role";



GRANT ALL ON TABLE "public"."item_attributes" TO "anon";
GRANT ALL ON TABLE "public"."item_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."item_attributes" TO "service_role";



GRANT ALL ON TABLE "public"."item_categories" TO "anon";
GRANT ALL ON TABLE "public"."item_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."item_categories" TO "service_role";



GRANT ALL ON TABLE "public"."item_fling_effects" TO "anon";
GRANT ALL ON TABLE "public"."item_fling_effects" TO "authenticated";
GRANT ALL ON TABLE "public"."item_fling_effects" TO "service_role";



GRANT ALL ON TABLE "public"."item_pockets" TO "anon";
GRANT ALL ON TABLE "public"."item_pockets" TO "authenticated";
GRANT ALL ON TABLE "public"."item_pockets" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."languages" TO "anon";
GRANT ALL ON TABLE "public"."languages" TO "authenticated";
GRANT ALL ON TABLE "public"."languages" TO "service_role";



GRANT ALL ON TABLE "public"."league_config" TO "anon";
GRANT ALL ON TABLE "public"."league_config" TO "authenticated";
GRANT ALL ON TABLE "public"."league_config" TO "service_role";



GRANT ALL ON TABLE "public"."location_areas" TO "anon";
GRANT ALL ON TABLE "public"."location_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."location_areas" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."machines" TO "anon";
GRANT ALL ON TABLE "public"."machines" TO "authenticated";
GRANT ALL ON TABLE "public"."machines" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."matchweeks" TO "anon";
GRANT ALL ON TABLE "public"."matchweeks" TO "authenticated";
GRANT ALL ON TABLE "public"."matchweeks" TO "service_role";



GRANT ALL ON TABLE "public"."memory" TO "anon";
GRANT ALL ON TABLE "public"."memory" TO "authenticated";
GRANT ALL ON TABLE "public"."memory" TO "service_role";



GRANT ALL ON TABLE "public"."migratehistory" TO "anon";
GRANT ALL ON TABLE "public"."migratehistory" TO "authenticated";
GRANT ALL ON TABLE "public"."migratehistory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migratehistory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migratehistory_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migratehistory_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."migrations" TO "anon";
GRANT ALL ON TABLE "public"."migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."migrations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."migrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."model" TO "anon";
GRANT ALL ON TABLE "public"."model" TO "authenticated";
GRANT ALL ON TABLE "public"."model" TO "service_role";



GRANT ALL ON TABLE "public"."move_ailments" TO "anon";
GRANT ALL ON TABLE "public"."move_ailments" TO "authenticated";
GRANT ALL ON TABLE "public"."move_ailments" TO "service_role";



GRANT ALL ON TABLE "public"."move_battle_styles" TO "anon";
GRANT ALL ON TABLE "public"."move_battle_styles" TO "authenticated";
GRANT ALL ON TABLE "public"."move_battle_styles" TO "service_role";



GRANT ALL ON TABLE "public"."move_categories" TO "anon";
GRANT ALL ON TABLE "public"."move_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."move_categories" TO "service_role";



GRANT ALL ON TABLE "public"."move_damage_classes" TO "anon";
GRANT ALL ON TABLE "public"."move_damage_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."move_damage_classes" TO "service_role";



GRANT ALL ON TABLE "public"."move_learn_methods" TO "anon";
GRANT ALL ON TABLE "public"."move_learn_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."move_learn_methods" TO "service_role";



GRANT ALL ON TABLE "public"."move_targets" TO "anon";
GRANT ALL ON TABLE "public"."move_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."move_targets" TO "service_role";



GRANT ALL ON TABLE "public"."moves" TO "anon";
GRANT ALL ON TABLE "public"."moves" TO "authenticated";
GRANT ALL ON TABLE "public"."moves" TO "service_role";



GRANT ALL ON TABLE "public"."natures" TO "anon";
GRANT ALL ON TABLE "public"."natures" TO "authenticated";
GRANT ALL ON TABLE "public"."natures" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_access_tokens" TO "anon";
GRANT ALL ON TABLE "public"."oauth_access_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_access_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_authorization_codes" TO "anon";
GRANT ALL ON TABLE "public"."oauth_authorization_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_authorization_codes" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_clients" TO "anon";
GRANT ALL ON TABLE "public"."oauth_clients" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_clients" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_refresh_tokens" TO "anon";
GRANT ALL ON TABLE "public"."oauth_refresh_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_refresh_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."oauth_user_consents" TO "anon";
GRANT ALL ON TABLE "public"."oauth_user_consents" TO "authenticated";
GRANT ALL ON TABLE "public"."oauth_user_consents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."oauth_user_consents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."oauth_user_consents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."oauth_user_consents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_rosters" TO "anon";
GRANT ALL ON TABLE "public"."team_rosters" TO "authenticated";
GRANT ALL ON TABLE "public"."team_rosters" TO "service_role";



GRANT ALL ON TABLE "public"."ownership_history" TO "anon";
GRANT ALL ON TABLE "public"."ownership_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ownership_history" TO "service_role";



GRANT ALL ON TABLE "public"."pal_park_areas" TO "anon";
GRANT ALL ON TABLE "public"."pal_park_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."pal_park_areas" TO "service_role";



GRANT ALL ON TABLE "public"."pokeapi_resource_cache" TO "anon";
GRANT ALL ON TABLE "public"."pokeapi_resource_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."pokeapi_resource_cache" TO "service_role";



GRANT ALL ON TABLE "public"."pokeapi_resources" TO "anon";
GRANT ALL ON TABLE "public"."pokeapi_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."pokeapi_resources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pokeapi_resources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pokeapi_resources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pokeapi_resources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pokeathlon_stats" TO "anon";
GRANT ALL ON TABLE "public"."pokeathlon_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."pokeathlon_stats" TO "service_role";



GRANT ALL ON TABLE "public"."pokedexes" TO "anon";
GRANT ALL ON TABLE "public"."pokedexes" TO "authenticated";
GRANT ALL ON TABLE "public"."pokedexes" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon" TO "anon";
GRANT ALL ON TABLE "public"."pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_abilities" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_abilities" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_abilities" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_base_stats" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_base_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_base_stats" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_cache" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_cache" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_colors" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_colors" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_colors" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_comprehensive" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_comprehensive" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_comprehensive" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_egg_groups" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_egg_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_egg_groups" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_forms" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_forms" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_habitats" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_habitats" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_habitats" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_items" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_items" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_items" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_location_areas" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_location_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_location_areas" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_moves" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_moves" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_moves" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_shapes" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_shapes" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_shapes" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_species" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_species" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_species" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_stats" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_stats" TO "service_role";



GRANT ALL ON TABLE "public"."pokemon_types" TO "anon";
GRANT ALL ON TABLE "public"."pokemon_types" TO "authenticated";
GRANT ALL ON TABLE "public"."pokemon_types" TO "service_role";



GRANT ALL ON TABLE "public"."pokepedia_assets" TO "anon";
GRANT ALL ON TABLE "public"."pokepedia_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."pokepedia_assets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pokepedia_assets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pokepedia_assets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pokepedia_assets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pokepedia_pokemon" TO "anon";
GRANT ALL ON TABLE "public"."pokepedia_pokemon" TO "authenticated";
GRANT ALL ON TABLE "public"."pokepedia_pokemon" TO "service_role";



GRANT ALL ON TABLE "public"."processed_data" TO "anon";
GRANT ALL ON TABLE "public"."processed_data" TO "authenticated";
GRANT ALL ON TABLE "public"."processed_data" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project" TO "anon";
GRANT ALL ON TABLE "public"."project" TO "authenticated";
GRANT ALL ON TABLE "public"."project" TO "service_role";



GRANT ALL ON TABLE "public"."project_relation" TO "anon";
GRANT ALL ON TABLE "public"."project_relation" TO "authenticated";
GRANT ALL ON TABLE "public"."project_relation" TO "service_role";



GRANT ALL ON TABLE "public"."prompt" TO "anon";
GRANT ALL ON TABLE "public"."prompt" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prompt_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prompt_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prompt_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."regions" TO "anon";
GRANT ALL ON TABLE "public"."regions" TO "authenticated";
GRANT ALL ON TABLE "public"."regions" TO "service_role";



GRANT ALL ON TABLE "public"."replayplayers" TO "anon";
GRANT ALL ON TABLE "public"."replayplayers" TO "authenticated";
GRANT ALL ON TABLE "public"."replayplayers" TO "service_role";



GRANT ALL ON TABLE "public"."replays" TO "anon";
GRANT ALL ON TABLE "public"."replays" TO "authenticated";
GRANT ALL ON TABLE "public"."replays" TO "service_role";



GRANT ALL ON TABLE "public"."role" TO "anon";
GRANT ALL ON TABLE "public"."role" TO "authenticated";
GRANT ALL ON TABLE "public"."role" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."role_scope" TO "anon";
GRANT ALL ON TABLE "public"."role_scope" TO "authenticated";
GRANT ALL ON TABLE "public"."role_scope" TO "service_role";



GRANT ALL ON TABLE "public"."scope" TO "anon";
GRANT ALL ON TABLE "public"."scope" TO "authenticated";
GRANT ALL ON TABLE "public"."scope" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."shared_credentials" TO "anon";
GRANT ALL ON TABLE "public"."shared_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."shared_workflow" TO "anon";
GRANT ALL ON TABLE "public"."shared_workflow" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_workflow" TO "service_role";



GRANT ALL ON TABLE "public"."sheet_mappings" TO "anon";
GRANT ALL ON TABLE "public"."sheet_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."sheet_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."showdown_client_teams" TO "anon";
GRANT ALL ON TABLE "public"."showdown_client_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."showdown_client_teams" TO "service_role";



GRANT ALL ON TABLE "public"."showdown_teams" TO "anon";
GRANT ALL ON TABLE "public"."showdown_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."showdown_teams" TO "service_role";



GRANT ALL ON TABLE "public"."smogon_meta_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."smogon_meta_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."smogon_meta_snapshot" TO "service_role";



GRANT ALL ON TABLE "public"."stats" TO "anon";
GRANT ALL ON TABLE "public"."stats" TO "authenticated";
GRANT ALL ON TABLE "public"."stats" TO "service_role";



GRANT ALL ON TABLE "public"."super_contest_effects" TO "anon";
GRANT ALL ON TABLE "public"."super_contest_effects" TO "authenticated";
GRANT ALL ON TABLE "public"."super_contest_effects" TO "service_role";



GRANT ALL ON TABLE "public"."sync_jobs" TO "anon";
GRANT ALL ON TABLE "public"."sync_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."sync_log" TO "anon";
GRANT ALL ON TABLE "public"."sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."tag" TO "anon";
GRANT ALL ON TABLE "public"."tag" TO "authenticated";
GRANT ALL ON TABLE "public"."tag" TO "service_role";



GRANT ALL ON TABLE "public"."tag_entity" TO "anon";
GRANT ALL ON TABLE "public"."tag_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_entity" TO "service_role";



GRANT ALL ON TABLE "public"."team_categories" TO "anon";
GRANT ALL ON TABLE "public"."team_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."team_categories" TO "service_role";



GRANT ALL ON TABLE "public"."team_formats" TO "anon";
GRANT ALL ON TABLE "public"."team_formats" TO "authenticated";
GRANT ALL ON TABLE "public"."team_formats" TO "service_role";



GRANT ALL ON TABLE "public"."team_tag_assignments" TO "anon";
GRANT ALL ON TABLE "public"."team_tag_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."team_tag_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."team_tags" TO "anon";
GRANT ALL ON TABLE "public"."team_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."team_tags" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."test_case_execution" TO "anon";
GRANT ALL ON TABLE "public"."test_case_execution" TO "authenticated";
GRANT ALL ON TABLE "public"."test_case_execution" TO "service_role";



GRANT ALL ON TABLE "public"."test_run" TO "anon";
GRANT ALL ON TABLE "public"."test_run" TO "authenticated";
GRANT ALL ON TABLE "public"."test_run" TO "service_role";



GRANT ALL ON TABLE "public"."tool" TO "anon";
GRANT ALL ON TABLE "public"."tool" TO "authenticated";
GRANT ALL ON TABLE "public"."tool" TO "service_role";



GRANT ALL ON TABLE "public"."trade_listings" TO "anon";
GRANT ALL ON TABLE "public"."trade_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_listings" TO "service_role";



GRANT ALL ON TABLE "public"."trade_offers" TO "anon";
GRANT ALL ON TABLE "public"."trade_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_offers" TO "service_role";



GRANT ALL ON TABLE "public"."trade_transactions" TO "anon";
GRANT ALL ON TABLE "public"."trade_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."trade_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."types" TO "anon";
GRANT ALL ON TABLE "public"."types" TO "authenticated";
GRANT ALL ON TABLE "public"."types" TO "service_role";



GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."user_api_keys" TO "anon";
GRANT ALL ON TABLE "public"."user_api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."user_api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."user_management_view" TO "anon";
GRANT ALL ON TABLE "public"."user_management_view" TO "authenticated";
GRANT ALL ON TABLE "public"."user_management_view" TO "service_role";



GRANT ALL ON TABLE "public"."v_match_team_rows_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_match_team_rows_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_match_team_rows_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_active_win_streak_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_active_win_streak_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_active_win_streak_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_head_to_head_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_head_to_head_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_head_to_head_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_team_record_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_team_record_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_team_record_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_opponent_winpct_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_opponent_winpct_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_opponent_winpct_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_strength_of_schedule_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_strength_of_schedule_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_strength_of_schedule_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_regular_team_rankings" TO "anon";
GRANT ALL ON TABLE "public"."v_regular_team_rankings" TO "authenticated";
GRANT ALL ON TABLE "public"."v_regular_team_rankings" TO "service_role";



GRANT ALL ON TABLE "public"."v_division_winners_regular" TO "anon";
GRANT ALL ON TABLE "public"."v_division_winners_regular" TO "authenticated";
GRANT ALL ON TABLE "public"."v_division_winners_regular" TO "service_role";



GRANT ALL ON TABLE "public"."v_playoff_seeds_5_12" TO "anon";
GRANT ALL ON TABLE "public"."v_playoff_seeds_5_12" TO "authenticated";
GRANT ALL ON TABLE "public"."v_playoff_seeds_5_12" TO "service_role";



GRANT ALL ON TABLE "public"."v_playoff_seeds_top4" TO "anon";
GRANT ALL ON TABLE "public"."v_playoff_seeds_top4" TO "authenticated";
GRANT ALL ON TABLE "public"."v_playoff_seeds_top4" TO "service_role";



GRANT ALL ON TABLE "public"."variables" TO "anon";
GRANT ALL ON TABLE "public"."variables" TO "authenticated";
GRANT ALL ON TABLE "public"."variables" TO "service_role";



GRANT ALL ON TABLE "public"."version_groups" TO "anon";
GRANT ALL ON TABLE "public"."version_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."version_groups" TO "service_role";



GRANT ALL ON TABLE "public"."versions" TO "anon";
GRANT ALL ON TABLE "public"."versions" TO "authenticated";
GRANT ALL ON TABLE "public"."versions" TO "service_role";



GRANT ALL ON TABLE "public"."video_comments" TO "anon";
GRANT ALL ON TABLE "public"."video_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."video_comments" TO "service_role";



GRANT ALL ON TABLE "public"."video_feedback" TO "anon";
GRANT ALL ON TABLE "public"."video_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."video_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."video_tags" TO "anon";
GRANT ALL ON TABLE "public"."video_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."video_tags" TO "service_role";



GRANT ALL ON TABLE "public"."video_views" TO "anon";
GRANT ALL ON TABLE "public"."video_views" TO "authenticated";
GRANT ALL ON TABLE "public"."video_views" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_entity" TO "anon";
GRANT ALL ON TABLE "public"."webhook_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_entity" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_dependency" TO "anon";
GRANT ALL ON TABLE "public"."workflow_dependency" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_dependency" TO "service_role";



GRANT ALL ON SEQUENCE "public"."workflow_dependency_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."workflow_dependency_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."workflow_dependency_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_entity" TO "anon";
GRANT ALL ON TABLE "public"."workflow_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_entity" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_history" TO "anon";
GRANT ALL ON TABLE "public"."workflow_history" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_history" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_publish_history" TO "anon";
GRANT ALL ON TABLE "public"."workflow_publish_history" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_publish_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."workflow_publish_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."workflow_publish_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."workflow_publish_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_statistics" TO "anon";
GRANT ALL ON TABLE "public"."workflow_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."workflows_tags" TO "anon";
GRANT ALL ON TABLE "public"."workflows_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."workflows_tags" TO "service_role";



GRANT ALL ON TABLE "public"."youtube_channels" TO "anon";
GRANT ALL ON TABLE "public"."youtube_channels" TO "authenticated";
GRANT ALL ON TABLE "public"."youtube_channels" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







