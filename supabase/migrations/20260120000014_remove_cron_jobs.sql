-- Remove all cron jobs
-- This unschedules pokepedia-worker, pokepedia-sprite-worker, and ingest-showdown-pokedex-weekly

-- Remove pokepedia-worker cron job
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'pokepedia-worker') THEN
    PERFORM cron.unschedule('pokepedia-worker');
    RAISE NOTICE 'Removed cron job: pokepedia-worker';
  END IF;
END $$;

-- Remove pokepedia-sprite-worker cron job
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'pokepedia-sprite-worker') THEN
    PERFORM cron.unschedule('pokepedia-sprite-worker');
    RAISE NOTICE 'Removed cron job: pokepedia-sprite-worker';
  END IF;
END $$;

-- Remove ingest-showdown-pokedex-weekly cron job
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'ingest-showdown-pokedex-weekly') THEN
    PERFORM cron.unschedule('ingest-showdown-pokedex-weekly');
    RAISE NOTICE 'Removed cron job: ingest-showdown-pokedex-weekly';
  END IF;
END $$;
