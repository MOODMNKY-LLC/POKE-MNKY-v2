-- Coach applications queue (AAB hand-off Phase B)

CREATE TABLE IF NOT EXISTS public.coach_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 120),
  is_age_21_plus BOOLEAN NOT NULL DEFAULT false,
  liability_acknowledged BOOLEAN NOT NULL DEFAULT false,
  discord_username TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'hold', 'follow_up', 'approved', 'rejected')
  ),
  rejection_reason TEXT CHECK (
    rejection_reason IS NULL OR rejection_reason IN (
      'season_full',
      'no_current_draft',
      'not_enough_experience',
      'not_qualified',
      'other'
    )
  ),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  spectator_only_offer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_applications_status ON public.coach_applications (status);
CREATE INDEX IF NOT EXISTS idx_coach_applications_created ON public.coach_applications (created_at DESC);

ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach_applications_select_own_or_staff" ON public.coach_applications;
CREATE POLICY "coach_applications_select_own_or_staff"
  ON public.coach_applications FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'commissioner')
    )
  );

DROP POLICY IF EXISTS "coach_applications_insert_own" ON public.coach_applications;
CREATE POLICY "coach_applications_insert_own"
  ON public.coach_applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS "coach_applications_update_own_pending" ON public.coach_applications;
CREATE POLICY "coach_applications_update_own_pending"
  ON public.coach_applications FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() AND status = 'pending')
  WITH CHECK (applicant_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "coach_applications_update_staff" ON public.coach_applications;
CREATE POLICY "coach_applications_update_staff"
  ON public.coach_applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'commissioner')
    )
  );

COMMENT ON TABLE public.coach_applications IS 'Coach intake queue; one active application per Discord user.';
