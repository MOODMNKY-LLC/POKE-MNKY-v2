-- Enhanced Sync Jobs table for Comprehensive Pokepedia sync
-- Supports chunked processing via Edge Functions

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sync_jobs'
  ) THEN
    ALTER TABLE public.sync_jobs
      ADD COLUMN IF NOT EXISTS sync_type TEXT CHECK (sync_type IN ('pokepedia', 'pokemon_cache', 'google_sheets')),
      ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('critical', 'standard', 'low')) DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS phase TEXT, -- 'master', 'additional', 'pokemon', 'evolution'
      ADD COLUMN IF NOT EXISTS current_chunk INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS chunk_size INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS start_id INTEGER,
      ADD COLUMN IF NOT EXISTS end_id INTEGER,
      ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ DEFAULT NOW();

    -- Update existing sync_jobs to have sync_type
    UPDATE public.sync_jobs 
    SET sync_type = 'pokemon_cache' 
    WHERE sync_type IS NULL AND job_type IN ('full', 'incremental');

    -- Create index for active sync jobs
    CREATE INDEX IF NOT EXISTS idx_sync_jobs_active ON public.sync_jobs(status, sync_type) 
    WHERE status = 'running';

    -- Create index for heartbeat monitoring
    CREATE INDEX IF NOT EXISTS idx_sync_jobs_heartbeat ON public.sync_jobs(last_heartbeat) 
    WHERE status = 'running';
  END IF;
END $$;

-- Functions will be created in a later migration after sync_jobs table exists
-- See migration that creates sync_jobs table for function definitions

-- Enable Realtime for sync_jobs (conditional - deferred until sync_jobs exists)
-- These operations will be performed in a later migration after sync_jobs table is created
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_schema = 'public' AND table_name = 'sync_jobs'
--   ) THEN
--     ALTER PUBLICATION supabase_realtime ADD TABLE sync_jobs;
--     
--     COMMENT ON TABLE public.sync_jobs IS 'Tracks sync operations for Pokepedia, Pokemon cache, and Google Sheets';
--     COMMENT ON COLUMN public.sync_jobs.phase IS 'Current sync phase: master, additional, pokemon, evolution';
--     COMMENT ON COLUMN public.sync_jobs.current_chunk IS 'Current chunk being processed';
--     COMMENT ON COLUMN public.sync_jobs.progress_percent IS 'Progress percentage (0-100)';
--     COMMENT ON COLUMN public.sync_jobs.last_heartbeat IS 'Last update timestamp for monitoring';
--   END IF;
-- END $$;
