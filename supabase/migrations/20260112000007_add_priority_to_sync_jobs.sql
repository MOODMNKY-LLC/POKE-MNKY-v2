-- Add priority field to sync_jobs for progressive sync
-- Critical priority syncs first (master data + first 50 Pokemon)
-- Standard priority syncs in background (remaining Pokemon)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sync_jobs'
  ) THEN
    ALTER TABLE public.sync_jobs
      ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('critical', 'standard', 'low')) DEFAULT 'standard';

    -- Create index for priority-based job processing
    CREATE INDEX IF NOT EXISTS idx_sync_jobs_priority ON public.sync_jobs(priority, status, started_at)
    WHERE status = 'running';

    -- Update function to handle priority
    COMMENT ON COLUMN public.sync_jobs.priority IS 'Sync priority: critical (immediate), standard (background), low (low priority background)';
  END IF;
END $$;
