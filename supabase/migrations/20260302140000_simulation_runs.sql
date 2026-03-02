-- Simulation runs table for tracking league simulation executions
-- Enables audit trail and repeatable runs for testing

CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN (
    'drafting',
    'regular_season',
    'playoffs',
    'completed',
    'failed',
    'reset'
  )),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulation_runs_season ON public.simulation_runs(season_id);
CREATE INDEX IF NOT EXISTS idx_simulation_runs_started ON public.simulation_runs(started_at DESC);

COMMENT ON TABLE public.simulation_runs IS 'Tracks league simulation executions for testing (draft through playoffs)';
COMMENT ON COLUMN public.simulation_runs.config IS 'JSON config: team_count, weeks, playoff_format, result_strategy';
