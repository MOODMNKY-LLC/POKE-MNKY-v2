-- Fix permissions for get_showdown_pokedex_cron_status function
-- The function needs SECURITY DEFINER to access cron.job table
-- Note: cron.job table doesn't have last_run/next_run columns - get last_run from cron.job_run_details

CREATE OR REPLACE FUNCTION public.get_showdown_pokedex_cron_status()
RETURNS TABLE (
  job_name TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobname::TEXT AS job_name,
    j.schedule::TEXT,
    j.active,
    (SELECT MAX(jrd.start_time) FROM cron.job_run_details jrd WHERE jrd.jobid = j.jobid)::TIMESTAMPTZ AS last_run,
    NULL::TIMESTAMPTZ AS next_run  -- pg_cron doesn't provide next_run, would need to calculate from schedule
  FROM cron.job j
  WHERE j.jobname = 'ingest-showdown-pokedex-weekly';
END;
$$;

-- Grant execute permissions to authenticated users (for admin panel)
GRANT EXECUTE ON FUNCTION public.get_showdown_pokedex_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_showdown_pokedex_cron_status() TO anon;
