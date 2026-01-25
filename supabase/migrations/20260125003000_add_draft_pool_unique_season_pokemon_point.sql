-- Add unique index to support upserts by (season_id, pokemon_name, point_value)
CREATE UNIQUE INDEX IF NOT EXISTS idx_draft_pool_season_pokemon_point
ON public.draft_pool (season_id, pokemon_name, point_value);

-- Comment for clarity
COMMENT ON INDEX idx_draft_pool_season_pokemon_point IS 'Unique index to allow ON CONFLICT upserts by season, pokemon name, and point value';

