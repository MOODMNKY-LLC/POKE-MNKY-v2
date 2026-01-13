-- Migration: Add ETag cache table and optimize sync process
-- This enables conditional requests (If-None-Match) for bandwidth optimization
-- Also adds support for incremental sync tracking

-- Create ETag cache table for PokéAPI resources
CREATE TABLE IF NOT EXISTS public.pokeapi_resource_cache (
  url TEXT PRIMARY KEY,
  etag TEXT,
  last_modified TIMESTAMPTZ,
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  resource_name TEXT,
  data_hash TEXT, -- Optional: hash of data for validation
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups by resource type and ID
CREATE INDEX IF NOT EXISTS idx_pokeapi_cache_type_id 
  ON public.pokeapi_resource_cache(resource_type, resource_id);

-- Index for resource type lookups
CREATE INDEX IF NOT EXISTS idx_pokeapi_cache_type 
  ON public.pokeapi_resource_cache(resource_type);

-- Index for cleanup of old cache entries
CREATE INDEX IF NOT EXISTS idx_pokeapi_cache_updated 
  ON public.pokeapi_resource_cache(updated_at);

-- Add comment
COMMENT ON TABLE public.pokeapi_resource_cache IS 'ETag cache for PokéAPI resources to enable conditional requests and incremental sync';

-- Enable RLS (optional, but good practice)
ALTER TABLE public.pokeapi_resource_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role can manage cache" ON public.pokeapi_resource_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read cache
CREATE POLICY "Authenticated users can read cache" ON public.pokeapi_resource_cache
  FOR SELECT USING (auth.role() = 'authenticated');
