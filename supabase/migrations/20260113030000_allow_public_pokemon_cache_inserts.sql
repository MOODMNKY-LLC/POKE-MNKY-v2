-- Allow public inserts/updates to pokemon_cache for client-side caching
-- This is safe since pokemon_cache is just cached API data, not sensitive user data

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated insert pokemon_cache" ON public.pokemon_cache;
DROP POLICY IF EXISTS "Authenticated update pokemon_cache" ON public.pokemon_cache;

-- Allow public inserts (for client-side caching)
CREATE POLICY "Public insert pokemon_cache" ON public.pokemon_cache 
  FOR INSERT 
  WITH CHECK (true);

-- Allow public updates (for cache refreshes)
CREATE POLICY "Public update pokemon_cache" ON public.pokemon_cache 
  FOR UPDATE 
  USING (true);

-- Keep public read policy (already exists)
-- Public read is already allowed via "Public read pokemon_cache" policy
