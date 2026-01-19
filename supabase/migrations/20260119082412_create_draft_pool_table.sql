-- ============================================================================
-- Migration: Create draft_pool table
-- ============================================================================
-- Purpose: Create the formal draft_pool table for the app with simplified structure
--          This table contains: point_value, pokemon_name, pokemon_id
-- Date: 2026-01-19
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."draft_pool" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pokemon_name" "text" NOT NULL,
    "point_value" integer NOT NULL,
    "pokemon_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "draft_pool_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "draft_pool_point_value_check" CHECK ((("point_value" >= 1) AND ("point_value" <= 20))),
    CONSTRAINT "draft_pool_pokemon_id_fkey" FOREIGN KEY ("pokemon_id") REFERENCES "public"."pokemon_cache"("pokemon_id") ON DELETE SET NULL
);

ALTER TABLE "public"."draft_pool" OWNER TO "postgres";

-- Create indexes
CREATE INDEX "idx_draft_pool_point_value" ON "public"."draft_pool" USING "btree" ("point_value");
CREATE INDEX "idx_draft_pool_pokemon_id" ON "public"."draft_pool" USING "btree" ("pokemon_id") WHERE ("pokemon_id" IS NOT NULL);
CREATE INDEX "idx_draft_pool_pokemon_name" ON "public"."draft_pool" USING "btree" ("pokemon_name");

-- Create unique constraint on pokemon_name + point_value combination
CREATE UNIQUE INDEX "draft_pool_pokemon_name_point_value_key" ON "public"."draft_pool" USING "btree" ("pokemon_name", "point_value");

-- Enable RLS
ALTER TABLE "public"."draft_pool" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Draft pool is viewable by authenticated users" ON "public"."draft_pool" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "Draft pool is insertable by service role" ON "public"."draft_pool" FOR INSERT TO "service_role" WITH CHECK (true);
CREATE POLICY "Draft pool is updatable by service role" ON "public"."draft_pool" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);
CREATE POLICY "Draft pool is deletable by service role" ON "public"."draft_pool" FOR DELETE TO "service_role" USING (true);

-- Grant permissions
GRANT ALL ON TABLE "public"."draft_pool" TO "anon";
GRANT ALL ON TABLE "public"."draft_pool" TO "authenticated";
GRANT ALL ON TABLE "public"."draft_pool" TO "service_role";

-- Add comments
COMMENT ON TABLE "public"."draft_pool" IS 'Formal draft pool table for the app - contains Pokemon available for drafting with point values';
COMMENT ON COLUMN "public"."draft_pool"."pokemon_name" IS 'Name of the Pokemon';
COMMENT ON COLUMN "public"."draft_pool"."point_value" IS 'Point value for drafting (1-20)';
COMMENT ON COLUMN "public"."draft_pool"."pokemon_id" IS 'Pokemon ID from pokemon_cache for sprite URLs and enhanced data';
COMMENT ON CONSTRAINT "draft_pool_point_value_check" ON "public"."draft_pool" IS 'Point values range from 1 to 20 as per league draft rules';
