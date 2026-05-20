-- Backfill pokemon_master from legacy draft_pool (board was seeded; master registry was never populated).
-- Safe to re-run: upserts on slug (name-g{generation}).

INSERT INTO public.pokemon_master (
  national_dex,
  name,
  slug,
  generation,
  primary_type,
  secondary_type,
  default_draft_points,
  is_legendary,
  is_mythical,
  is_paradox
)
SELECT DISTINCT ON (lower(trim(src.pokemon_name)), src.generation)
  COALESCE(NULLIF(pu.dex_num, 0), NULLIF(ps.dex_num, 0), 0) AS national_dex,
  trim(src.pokemon_name) AS name,
  lower(regexp_replace(trim(src.pokemon_name), '[^a-zA-Z0-9]+', '-', 'g')) || '-g' || src.generation AS slug,
  src.generation,
  COALESCE(lower(pu.type_primary), t1.type, 'normal') AS primary_type,
  COALESCE(lower(pu.type_secondary), t2.type) AS secondary_type,
  src.point_value AS default_draft_points,
  false AS is_legendary,
  false AS is_mythical,
  false AS is_paradox
FROM (
  SELECT
    pokemon_name,
    generation,
    MAX(point_value) AS point_value
  FROM public.draft_pool
  WHERE generation IS NOT NULL AND trim(pokemon_name) <> ''
  GROUP BY pokemon_name, generation
) src
LEFT JOIN public.pokemon_unified pu
  ON lower(trim(pu.name)) = lower(trim(src.pokemon_name))
LEFT JOIN public.pokemon_showdown ps
  ON ps.showdown_id = lower(regexp_replace(trim(src.pokemon_name), '\s+', '', 'g'))
LEFT JOIN public.pokemon_showdown_types t1
  ON t1.showdown_id = ps.showdown_id AND t1.slot = 1
LEFT JOIN public.pokemon_showdown_types t2
  ON t2.showdown_id = ps.showdown_id AND t2.slot = 2
WHERE COALESCE(NULLIF(pu.dex_num, 0), NULLIF(ps.dex_num, 0), 0) > 0
ORDER BY lower(trim(src.pokemon_name)), src.generation
ON CONFLICT (slug) DO UPDATE SET
  national_dex = EXCLUDED.national_dex,
  name = EXCLUDED.name,
  generation = EXCLUDED.generation,
  primary_type = EXCLUDED.primary_type,
  secondary_type = EXCLUDED.secondary_type,
  default_draft_points = COALESCE(EXCLUDED.default_draft_points, public.pokemon_master.default_draft_points),
  updated_at = now();

COMMENT ON TABLE public.pokemon_master IS 'Canonical Pokemon registry; backfilled from draft_pool + pokepedia/showdown. Admin Generate reads this table.';
