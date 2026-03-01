-- Update draft_pool point_value constraint to allow 2-20 (was 12-20)
-- Idempotent: only add constraint if missing and no rows violate it

ALTER TABLE public.draft_pool
  DROP CONSTRAINT IF EXISTS draft_pool_point_value_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'draft_pool_point_value_check'
      AND conrelid = 'public.draft_pool'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM public.draft_pool
    WHERE point_value < 2 OR point_value > 20
  ) THEN
    ALTER TABLE public.draft_pool
      ADD CONSTRAINT draft_pool_point_value_check
      CHECK (point_value >= 2 AND point_value <= 20);
    COMMENT ON CONSTRAINT draft_pool_point_value_check ON public.draft_pool IS
      'Point values range from 2 to 20 as per league draft rules';
  END IF;
END $$;
