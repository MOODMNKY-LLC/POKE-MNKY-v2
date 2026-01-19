alter table "public"."binary_data" drop constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" drop constraint "CHK_workflow_publish_history_event";

alter table "public"."binary_data" add constraint "CHK_binary_data_sourceType" CHECK ((("sourceType")::text = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::text[]))) not valid;

alter table "public"."binary_data" validate constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" add constraint "CHK_workflow_publish_history_event" CHECK (((event)::text = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::text[]))) not valid;

alter table "public"."workflow_publish_history" validate constraint "CHK_workflow_publish_history_event";

set check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION public.get_available_pokemon_for_free_agency(p_season_id uuid, p_min_points integer, p_max_points integer, p_generation integer, p_search text)
 RETURNS TABLE(pokemon_id integer, pokemon_name text, point_value integer, generation integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    dp.pokemon_id,
    dp.pokemon_name,
    dp.point_value,
    dp.generation
  FROM sheets_draft_pool dp
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
  FROM sheets_draft_pool dp
  LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
  WHERE dp.point_value = tier_points
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pokepedia_cron_status()
 RETURNS TABLE(job_name text, schedule text, active boolean, last_run timestamp with time zone, next_run timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
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

CREATE OR REPLACE FUNCTION public.match_documents(query_embedding public.vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE (filter = '{}' OR d.metadata @> filter)
  ORDER BY d.embedding <=> query_embedding
  LIMIT COALESCE(match_count, 50); -- default to 50 if match_count is NULL
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

CREATE OR REPLACE FUNCTION public.unschedule_pokepedia_cron()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM cron.unschedule('pokepedia-worker');
  PERFORM cron.unschedule('pokepedia-sprite-worker');
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


