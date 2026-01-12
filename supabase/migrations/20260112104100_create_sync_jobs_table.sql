-- Sync Jobs table for tracking Pokemon sync operations
-- Used by full-sync-pokemon.ts and incremental-sync-pokemon.ts

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL CHECK (job_type IN ('full', 'incremental')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'partial')),
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'cron')),
  pokemon_synced INTEGER DEFAULT 0,
  pokemon_failed INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_type_status ON public.sync_jobs(job_type, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON public.sync_jobs(started_at DESC);

-- Enable RLS
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read sync_jobs" ON public.sync_jobs FOR SELECT USING (true);

-- Authenticated users can insert/update sync jobs
CREATE POLICY "Authenticated insert sync_jobs" ON public.sync_jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update sync_jobs" ON public.sync_jobs FOR UPDATE USING (auth.role() = 'authenticated');
