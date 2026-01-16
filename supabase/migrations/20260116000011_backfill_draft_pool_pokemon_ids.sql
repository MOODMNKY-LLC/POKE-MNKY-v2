-- Backfill pokemon_id for draft_pool entries
-- Matches Pokemon names from draft_pool to pokepedia_pokemon to populate pokemon_id
-- pokepedia_pokemon.id is the pokemon_id (National Dex ID)

-- First try exact match with normalized names (space to hyphen)
UPDATE public.draft_pool dp
SET pokemon_id = pp.id
FROM public.pokepedia_pokemon pp
WHERE dp.pokemon_id IS NULL
  AND LOWER(REPLACE(dp.pokemon_name, ' ', '-')) = LOWER(pp.name);

-- For Pokemon that didn't match, try case-insensitive exact match
UPDATE public.draft_pool dp
SET pokemon_id = pp.id
FROM public.pokepedia_pokemon pp
WHERE dp.pokemon_id IS NULL
  AND LOWER(TRIM(dp.pokemon_name)) = LOWER(TRIM(pp.name));

-- For Pokemon that still didn't match, try fuzzy matching
-- This handles cases where names might have slight variations
UPDATE public.draft_pool dp
SET pokemon_id = (
  SELECT pp.id
  FROM public.pokepedia_pokemon pp
  WHERE dp.pokemon_id IS NULL
    AND (
      LOWER(pp.name) LIKE '%' || LOWER(REPLACE(dp.pokemon_name, ' ', '-')) || '%'
      OR LOWER(pp.name) LIKE '%' || LOWER(REPLACE(dp.pokemon_name, ' ', '')) || '%'
      OR LOWER(pp.name) LIKE '%' || LOWER(dp.pokemon_name) || '%'
    )
  LIMIT 1
)
WHERE dp.pokemon_id IS NULL;

-- Log results
DO $$
DECLARE
  total_count INTEGER;
  with_id_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.draft_pool;
  SELECT COUNT(*) INTO with_id_count FROM public.draft_pool WHERE pokemon_id IS NOT NULL;
  
  RAISE NOTICE 'Draft pool pokemon_id backfill complete: %/% entries now have pokemon_id', with_id_count, total_count;
END $$;
