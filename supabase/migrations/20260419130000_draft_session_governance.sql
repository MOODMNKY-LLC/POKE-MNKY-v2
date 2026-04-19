-- Draft session governance: mod/commissioner creates → admin approves before live (AAB Phase C)

ALTER TABLE public.draft_sessions
  ADD COLUMN IF NOT EXISTS governance_approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (governance_approval_status IN ('pending_admin', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.draft_sessions.governance_approval_status IS 'pending_admin until admin approves; then approved and session may go active.';
COMMENT ON COLUMN public.draft_sessions.created_by IS 'User who created the session (commissioner/mod workflow).';

UPDATE public.draft_sessions SET governance_approval_status = 'approved' WHERE governance_approval_status IS NULL;

-- Participant mode: coach picks vs spectator (per session)
CREATE TABLE IF NOT EXISTS public.draft_session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_session_id UUID NOT NULL REFERENCES public.draft_sessions (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'spectator' CHECK (mode IN ('spectator', 'participant')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (draft_session_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_session_attendance_session ON public.draft_session_attendance (draft_session_id);

ALTER TABLE public.draft_session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draft_session_attendance_select_own" ON public.draft_session_attendance;
CREATE POLICY "draft_session_attendance_select_own"
  ON public.draft_session_attendance FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "draft_session_attendance_upsert_own" ON public.draft_session_attendance;
CREATE POLICY "draft_session_attendance_upsert_own"
  ON public.draft_session_attendance FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "draft_session_attendance_update_own" ON public.draft_session_attendance;
CREATE POLICY "draft_session_attendance_update_own"
  ON public.draft_session_attendance FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
