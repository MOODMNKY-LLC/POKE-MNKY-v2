-- Setup Cron Job for Pokepedia Sync
-- Runs every 5 minutes to process sync chunks

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job (commented out - uncomment after deployment)
-- Replace <project-ref> with your actual Supabase project reference
-- To enable, uncomment the following and run in Supabase Dashboard SQL Editor:
--
-- SELECT cron.schedule(
--   'sync-pokepedia-chunks',
--   '*/5 * * * *', -- Every 5 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/sync-pokepedia',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );

-- View scheduled cron jobs
-- SELECT * FROM cron.job;

-- Unschedule cron job (if needed)
-- SELECT cron.unschedule('sync-pokepedia-chunks');

COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for automatic Pokepedia sync';
