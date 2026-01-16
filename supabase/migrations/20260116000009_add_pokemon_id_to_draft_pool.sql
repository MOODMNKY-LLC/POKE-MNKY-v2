-- Add pokemon_id column to draft_pool for better sprite support
-- Links draft_pool to pokemon_cache/pokepedia_pokemon for sprite URLs

ALTER TABLE public.draft_pool
  ADD COLUMN IF NOT EXISTS pokemon_id INTEGER REFERENCES public.pokemon_cache(pokemon_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_draft_pool_pokemon_id ON public.draft_pool(pokemon_id) WHERE pokemon_id IS NOT NULL;

-- Update existing rows: try to match pokemon_name to pokemon_cache
-- This will populate pokemon_id for existing draft pool entries
UPDATE public.draft_pool dp
SET pokemon_id = pc.pokemon_id
FROM public.pokemon_cache pc
WHERE dp.pokemon_id IS NULL
  AND LOWER(TRIM(dp.pokemon_name)) = LOWER(TRIM(pc.name))
  AND dp.pokemon_id IS NULL;

COMMENT ON COLUMN public.draft_pool.pokemon_id IS 'Pokemon ID from pokemon_cache/pokepedia_pokemon for sprite URLs and enhanced data';
