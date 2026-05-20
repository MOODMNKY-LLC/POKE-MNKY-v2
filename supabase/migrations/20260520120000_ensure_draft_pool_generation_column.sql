-- Re-add draft_pool.generation when removed by 20260119105458_remote_schema.
-- Required for Gen filters, enriched view, and populate_draft_pool_from_showdown_tiers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'draft_pool'
      AND column_name = 'generation'
  ) THEN
    ALTER TABLE public.draft_pool ADD COLUMN generation INTEGER;

    ALTER TABLE public.draft_pool
      ADD CONSTRAINT draft_pool_generation_check
      CHECK (generation IS NULL OR (generation >= 1 AND generation <= 9));

    CREATE INDEX IF NOT EXISTS idx_draft_pool_generation
      ON public.draft_pool (generation)
      WHERE generation IS NOT NULL;
  END IF;
END $$;
