-- Private Draft Room: per-coach shortlist / preferences (AAB Phase D)

CREATE TABLE IF NOT EXISTS public.draft_coach_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  shortlist JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  mock_draft_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_coach_preferences_season ON public.draft_coach_preferences (season_id);

ALTER TABLE public.draft_coach_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draft_coach_preferences_select_own" ON public.draft_coach_preferences;
CREATE POLICY "draft_coach_preferences_select_own"
  ON public.draft_coach_preferences FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "draft_coach_preferences_staff_all" ON public.draft_coach_preferences;
CREATE POLICY "draft_coach_preferences_staff_all"
  ON public.draft_coach_preferences FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')
    )
  );

DROP POLICY IF EXISTS "draft_coach_preferences_insert_own" ON public.draft_coach_preferences;
CREATE POLICY "draft_coach_preferences_insert_own"
  ON public.draft_coach_preferences FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "draft_coach_preferences_update_own" ON public.draft_coach_preferences;
CREATE POLICY "draft_coach_preferences_update_own"
  ON public.draft_coach_preferences FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

COMMENT ON TABLE public.draft_coach_preferences IS 'Coach-only pre-draft shortlist and mock draft prefs; not visible to other coaches.';
