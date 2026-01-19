-- Function to check if resources already exist before enqueueing
-- This allows the seed function to skip resources that have already been synced

CREATE OR REPLACE FUNCTION public.check_existing_pokeapi_resources(
  resource_urls TEXT[]
)
RETURNS TABLE (
  url TEXT,
  already_exists BOOLEAN,
  resource_type TEXT,
  resource_key TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH url_parts AS (
    SELECT 
      url,
      -- Extract resource_type from URL: https://pokeapi.co/api/v2/pokemon/25/
      (string_to_array(regexp_replace(url, '^https?://[^/]+/', ''), '/'))[2] AS resource_type,
      -- Extract resource_key from URL
      (string_to_array(regexp_replace(url, '^https?://[^/]+/', ''), '/'))[3] AS resource_key
    FROM unnest(resource_urls) AS url
  )
  SELECT 
    up.url,
    CASE 
      WHEN pr.id IS NOT NULL THEN true
      ELSE false
    END AS already_exists,
    up.resource_type,
    up.resource_key
  FROM url_parts up
  LEFT JOIN public.pokeapi_resources pr 
    ON pr.resource_type = up.resource_type 
    AND pr.resource_key = up.resource_key;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_existing_pokeapi_resources TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_existing_pokeapi_resources TO anon;
GRANT EXECUTE ON FUNCTION public.check_existing_pokeapi_resources TO service_role;

COMMENT ON FUNCTION public.check_existing_pokeapi_resources IS 'Checks which URLs from an array already exist in pokeapi_resources. Returns exists=true for resources that have already been synced.';
