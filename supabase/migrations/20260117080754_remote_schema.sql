set check_function_bodies = off;

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
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$function$
;


