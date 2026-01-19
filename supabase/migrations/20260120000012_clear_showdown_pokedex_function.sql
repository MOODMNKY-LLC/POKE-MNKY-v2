-- Function to clear all Showdown pokedex data
-- This is more efficient than deleting row-by-row via API

CREATE OR REPLACE FUNCTION public.clear_showdown_pokedex_data()
RETURNS TABLE (
  raw_count BIGINT,
  pokemon_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Grant execute permissions to authenticated users (for admin panel)
GRANT EXECUTE ON FUNCTION public.clear_showdown_pokedex_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_showdown_pokedex_data() TO anon;

COMMENT ON FUNCTION public.clear_showdown_pokedex_data() IS 'Clear all Showdown pokedex data from database. Returns counts of deleted records.';
