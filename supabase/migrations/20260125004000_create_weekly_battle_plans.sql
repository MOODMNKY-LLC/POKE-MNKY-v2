-- Weekly battle plans (private, per coach, per match)
-- Stores both freeform notes and structured JSON payload.

-- Required for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Ensure the standard updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.weekly_battle_plans (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

  -- Owner
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Linkage (match is canonical)
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  matchweek_id UUID REFERENCES public.matchweeks(id) ON DELETE SET NULL,
  week_number INTEGER,

  -- Content
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, match_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_battle_plans_user_id
  ON public.weekly_battle_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_battle_plans_user_match
  ON public.weekly_battle_plans(user_id, match_id);

CREATE INDEX IF NOT EXISTS idx_weekly_battle_plans_user_week
  ON public.weekly_battle_plans(user_id, week_number);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS on_weekly_battle_plan_updated ON public.weekly_battle_plans;
CREATE TRIGGER on_weekly_battle_plan_updated
  BEFORE UPDATE ON public.weekly_battle_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: private to the logged-in user
ALTER TABLE public.weekly_battle_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own weekly battle plans" ON public.weekly_battle_plans;
CREATE POLICY "Users can read own weekly battle plans"
  ON public.weekly_battle_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weekly battle plans" ON public.weekly_battle_plans;
CREATE POLICY "Users can insert own weekly battle plans"
  ON public.weekly_battle_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weekly battle plans" ON public.weekly_battle_plans;
CREATE POLICY "Users can update own weekly battle plans"
  ON public.weekly_battle_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weekly battle plans" ON public.weekly_battle_plans;
CREATE POLICY "Users can delete own weekly battle plans"
  ON public.weekly_battle_plans FOR DELETE
  USING (auth.uid() = user_id);

