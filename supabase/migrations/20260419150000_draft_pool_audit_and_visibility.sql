-- Draft pool builder audit + draft vs FA visibility flags (AAB Phase E)

CREATE TABLE IF NOT EXISTS public.draft_pool_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_pool_id UUID NOT NULL REFERENCES public.draft_pools (id) ON DELETE CASCADE,
  editor_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  action TEXT NOT NULL DEFAULT 'update',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_draft_pool_edit_audit_pool ON public.draft_pool_edit_audit (draft_pool_id, created_at DESC);

ALTER TABLE public.draft_pool_edit_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draft_pool_edit_audit_staff" ON public.draft_pool_edit_audit;
CREATE POLICY "draft_pool_edit_audit_staff"
  ON public.draft_pool_edit_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')
    )
  );

DROP POLICY IF EXISTS "draft_pool_edit_audit_insert_staff" ON public.draft_pool_edit_audit;
CREATE POLICY "draft_pool_edit_audit_insert_staff"
  ON public.draft_pool_edit_audit FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')
    )
  );

-- Optional visibility split: hidden from coaches in draft UI but still in FA (or vice versa)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'draft_pool_pokemon'
  ) THEN
    ALTER TABLE public.draft_pool_pokemon
      ADD COLUMN IF NOT EXISTS hidden_from_draft_ui BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE public.draft_pool_pokemon
      ADD COLUMN IF NOT EXISTS hidden_from_free_agency BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.draft_pool_pokemon.hidden_from_draft_ui IS 'Excluded from coach-facing draft builder lists when true.';
    COMMENT ON COLUMN public.draft_pool_pokemon.hidden_from_free_agency IS 'Excluded from free agency flows when true.';
  END IF;
END $$;
