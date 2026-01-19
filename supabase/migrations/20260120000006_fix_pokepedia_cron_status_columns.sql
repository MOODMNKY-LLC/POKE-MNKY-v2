-- Fix get_pokepedia_cron_status() - cron.job table doesn't have last_run/next_run columns
-- These need to be queried from cron.job_run_details or set to NULL

CREATE OR REPLACE FUNCTION public.get_pokepedia_cron_status()
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
  WHERE j.jobname IN ('pokepedia-worker', 'pokepedia-sprite-worker')
  ORDER BY j.jobname;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pokepedia_cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pokepedia_cron_status() TO anon;

COMMENT ON FUNCTION public.get_pokepedia_cron_status() IS 'Get status of Poképedia cron jobs - requires SECURITY DEFINER to access cron schema. last_run comes from job_run_details, next_run is NULL (not available in pg_cron)';
