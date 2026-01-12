-- Fix sync_jobs table: Add missing columns that were skipped due to migration order
-- This migration runs after sync_jobs table is created (20260112104100)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sync_jobs'
  ) THEN
    -- Add columns if they don't exist (idempotent)
    ALTER TABLE public.sync_jobs
      ADD COLUMN IF NOT EXISTS sync_type TEXT CHECK (sync_type IN ('pokepedia', 'pokemon_cache', 'google_sheets')),
      ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('critical', 'standard', 'low')) DEFAULT 'standard',
      ADD COLUMN IF NOT EXISTS phase TEXT,
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

    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS idx_sync_jobs_active ON public.sync_jobs(status, sync_type) 
    WHERE status = 'running';

    CREATE INDEX IF NOT EXISTS idx_sync_jobs_heartbeat ON public.sync_jobs(last_heartbeat) 
    WHERE status = 'running';

    CREATE INDEX IF NOT EXISTS idx_sync_jobs_priority ON public.sync_jobs(priority, status, started_at)
    WHERE status = 'running';
  END IF;
END $$;
