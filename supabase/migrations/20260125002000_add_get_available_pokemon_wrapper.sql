-- Compatibility wrapper: old RPC name get_available_pokemon -> forwards to canonical function
CREATE OR REPLACE FUNCTION public.get_available_pokemon(
  p_season_id UUID
)
RETURNS TABLE (
  pokemon_id INTEGER,
  pokemon_name TEXT,
  point_value INTEGER,
  generation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_available_pokemon_for_free_agency(p_season_id, NULL, NULL, NULL, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_available_pokemon IS 'Compatibility wrapper forwarding to get_available_pokemon_for_free_agency(p_season_id, ...).';

