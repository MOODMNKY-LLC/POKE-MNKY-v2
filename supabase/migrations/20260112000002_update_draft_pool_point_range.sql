-- Update draft_pool point_value constraint to allow 2-20 (was 12-20)
-- This allows the full range of draft point values

ALTER TABLE public.draft_pool
  DROP CONSTRAINT IF EXISTS draft_pool_point_value_check;

ALTER TABLE public.draft_pool
  ADD CONSTRAINT draft_pool_point_value_check 
  CHECK (point_value >= 2 AND point_value <= 20);

COMMENT ON CONSTRAINT draft_pool_point_value_check ON public.draft_pool IS 
  'Point values range from 2 to 20 as per league draft rules';
