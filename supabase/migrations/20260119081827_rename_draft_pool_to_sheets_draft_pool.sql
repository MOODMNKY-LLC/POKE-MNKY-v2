-- ============================================================================
-- Migration: Rename draft_pool to sheets_draft_pool
-- ============================================================================
-- Purpose: Rename the table to sheets_draft_pool to reserve draft_pool
--          for the formal app table
-- Date: 2026-01-19
-- ============================================================================

-- Rename the table
ALTER TABLE "public"."draft_pool" RENAME TO "sheets_draft_pool";

-- Rename constraints
ALTER TABLE "public"."sheets_draft_pool" RENAME CONSTRAINT "draft_pool_pkey" TO "sheets_draft_pool_pkey";
ALTER TABLE "public"."sheets_draft_pool" RENAME CONSTRAINT "draft_pool_sheet_name_pokemon_name_point_value_key" TO "sheets_draft_pool_sheet_name_pokemon_name_point_value_key";
ALTER TABLE "public"."sheets_draft_pool" RENAME CONSTRAINT "draft_pool_generation_check" TO "sheets_draft_pool_generation_check";
ALTER TABLE "public"."sheets_draft_pool" RENAME CONSTRAINT "draft_pool_point_value_check" TO "sheets_draft_pool_point_value_check";
ALTER TABLE "public"."sheets_draft_pool" RENAME CONSTRAINT "draft_pool_pokemon_id_fkey" TO "sheets_draft_pool_pokemon_id_fkey";

-- Rename indexes
ALTER INDEX "public"."idx_draft_pool_available" RENAME TO "idx_sheets_draft_pool_available";
ALTER INDEX "public"."idx_draft_pool_generation" RENAME TO "idx_sheets_draft_pool_generation";
ALTER INDEX "public"."idx_draft_pool_point_value" RENAME TO "idx_sheets_draft_pool_point_value";
ALTER INDEX "public"."idx_draft_pool_pokemon_id" RENAME TO "idx_sheets_draft_pool_pokemon_id";
ALTER INDEX "public"."idx_draft_pool_pokemon_name" RENAME TO "idx_sheets_draft_pool_pokemon_name";
ALTER INDEX "public"."idx_draft_pool_sheet_name" RENAME TO "idx_sheets_draft_pool_sheet_name";

-- Drop old policies and create new ones with updated names
DROP POLICY IF EXISTS "Draft pool is deletable by service role" ON "public"."sheets_draft_pool";
DROP POLICY IF EXISTS "Draft pool is insertable by service role" ON "public"."sheets_draft_pool";
DROP POLICY IF EXISTS "Draft pool is updatable by service role" ON "public"."sheets_draft_pool";
DROP POLICY IF EXISTS "Draft pool is viewable by authenticated users" ON "public"."sheets_draft_pool";

CREATE POLICY "Sheets draft pool is deletable by service role" ON "public"."sheets_draft_pool" FOR DELETE TO "service_role" USING (true);
CREATE POLICY "Sheets draft pool is insertable by service role" ON "public"."sheets_draft_pool" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "Sheets draft pool is updatable by service role" ON "public"."sheets_draft_pool" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY "Sheets draft pool is viewable by authenticated users" ON "public"."sheets_draft_pool" FOR SELECT TO "authenticated" USING (true);

-- Update table comment
COMMENT ON TABLE "public"."sheets_draft_pool" IS 'Stores the complete list of Pokemon from Google Sheets Draft Board with their point values';

-- Update constraint comment
COMMENT ON CONSTRAINT "sheets_draft_pool_point_value_check" ON "public"."sheets_draft_pool" IS 'Point values range from 1 to 20 as per league draft rules';

-- Update functions that reference draft_pool
-- Drop and recreate functions to update table references
DROP FUNCTION IF EXISTS "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text");

CREATE FUNCTION "public"."get_available_pokemon_for_free_agency"("p_season_id" "uuid", "p_min_points" integer, "p_max_points" integer, "p_generation" integer, "p_search" "text") RETURNS TABLE("pokemon_id" integer, "pokemon_name" "text", "point_value" integer, "generation" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    dp.pokemon_id,
    dp.pokemon_name,
    dp.point_value,
    dp.generation
  FROM sheets_draft_pool dp
  WHERE dp.is_available = true
    AND dp.pokemon_id IS NOT NULL
    AND (p_min_points IS NULL OR dp.point_value >= p_min_points)
    AND (p_max_points IS NULL OR dp.point_value <= p_max_points)
    AND (p_generation IS NULL OR dp.generation = p_generation)
    AND (p_search IS NULL OR dp.pokemon_name ILIKE '%' || p_search || '%')
    AND dp.pokemon_id NOT IN (
      SELECT tr.pokemon_id
      FROM team_rosters tr
      INNER JOIN teams t ON tr.team_id = t.id
      WHERE t.season_id = p_season_id
        AND tr.pokemon_id IS NOT NULL
    )
  ORDER BY dp.point_value DESC, dp.pokemon_name ASC;
END;
$$;

DROP FUNCTION IF EXISTS "public"."get_pokemon_by_tier"("tier_points" integer);

CREATE FUNCTION "public"."get_pokemon_by_tier"("tier_points" integer) RETURNS TABLE("pokemon_name" "text", "point_value" integer, "generation" integer, "pokemon_cache_id" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.pokemon_name,
    dp.point_value,
    dp.generation,
    pc.pokemon_id as pokemon_cache_id
  FROM sheets_draft_pool dp
  LEFT JOIN pokemon_cache pc ON LOWER(pc.name) = LOWER(dp.pokemon_name)
  WHERE dp.point_value = tier_points
    AND dp.is_available = true
  ORDER BY dp.pokemon_name;
END;
$$;
