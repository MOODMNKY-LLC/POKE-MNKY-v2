-- ============================================================================
-- Drop Pokepedia Sync Functions
-- Removes all database functions related to the defunct pokepedia sync system
-- ============================================================================

-- Drop pokepedia-specific sync functions
DROP FUNCTION IF EXISTS public.get_pokepedia_sync_progress() CASCADE;
DROP FUNCTION IF EXISTS public.get_pokepedia_queue_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_pokepedia_cron_status() CASCADE;
DROP FUNCTION IF EXISTS public.broadcast_pokepedia_sync_progress() CASCADE;
DROP FUNCTION IF EXISTS public.notify_pokepedia_progress() CASCADE;
DROP FUNCTION IF EXISTS public.unschedule_pokepedia_cron() CASCADE;
DROP FUNCTION IF EXISTS public.check_existing_pokeapi_resources(TEXT[]) CASCADE;

-- Drop cron trigger functions (pokepedia-specific)
DROP FUNCTION IF EXISTS public._trigger_pokepedia_worker() CASCADE;
DROP FUNCTION IF EXISTS public._trigger_pokepedia_sprite_worker() CASCADE;

-- Note: pgmq_public_* functions are kept as they are generic wrappers
-- and may be used by other systems. They are not pokepedia-specific.

-- Note: pokepedia_resource_totals table is kept as it may contain useful data
-- and can be repurposed for the new sync system if needed.

-- Note: pokeapi_resources, pokepedia_pokemon tables are kept as they contain
-- the actual synced data and may be repurposed for the new sync system.

COMMENT ON SCHEMA public IS 'Pokepedia sync functions have been removed. New sync system pending.';
