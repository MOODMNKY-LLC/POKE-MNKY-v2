-- Update sync_jobs.triggered_by to include 'notion_webhook'
-- Allows tracking sync jobs triggered by Notion webhooks

-- Drop existing constraint
ALTER TABLE public.sync_jobs 
  DROP CONSTRAINT IF EXISTS sync_jobs_triggered_by_check;

-- Add new constraint with 'notion_webhook' option
ALTER TABLE public.sync_jobs 
  ADD CONSTRAINT sync_jobs_triggered_by_check 
  CHECK (triggered_by IN ('manual', 'cron', 'notion_webhook'));

COMMENT ON COLUMN public.sync_jobs.triggered_by IS 'Source that triggered the sync: manual (admin), cron (scheduled), or notion_webhook (real-time from Notion)';
