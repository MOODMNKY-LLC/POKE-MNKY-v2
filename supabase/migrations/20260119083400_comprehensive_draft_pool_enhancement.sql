-- ============================================================================
-- Migration: Comprehensive Draft Pool Enhancement (Option B)
-- ============================================================================
-- Purpose: Enhance draft_pool table with season support, status enum,
--          draft tracking metadata, and audit trail
-- Date: 2026-01-19
-- ============================================================================

-- Step 1: Create status enum type
CREATE TYPE "public"."draft_pool_status" AS ENUM (
    'available',      -- Available to be drafted
    'drafted',        -- Has been drafted
    'banned',         -- Banned from draft (Pokemon of Ruin, etc.)
    'unavailable'     -- Unavailable for other reasons
);

-- Step 2: Add new columns (nullable initially for data migration)
ALTER TABLE "public"."draft_pool"
ADD COLUMN "season_id" uuid,
ADD COLUMN "status" "public"."draft_pool_status" DEFAULT 'available'::draft_pool_status,
ADD COLUMN "drafted_by_team_id" uuid,
ADD COLUMN "drafted_at" timestamp with time zone,
ADD COLUMN "draft_round" integer,
ADD COLUMN "draft_pick_number" integer,
ADD COLUMN "banned_reason" text;

-- Step 3: Migrate existing data
-- Set status based on is_available (assuming all current data is for a default season)
-- NOTE: You'll need to set season_id manually or via application logic
-- For now, we'll set a default or leave NULL (application should handle)
UPDATE "public"."draft_pool"
SET "status" = CASE 
    WHEN "is_available" = true THEN 'available'::draft_pool_status
    ELSE 'drafted'::draft_pool_status
END;

-- Step 4: Add foreign key constraints
ALTER TABLE "public"."draft_pool"
ADD CONSTRAINT "draft_pool_season_id_fkey" 
FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;

ALTER TABLE "public"."draft_pool"
ADD CONSTRAINT "draft_pool_drafted_by_team_id_fkey" 
FOREIGN KEY ("drafted_by_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

-- Step 5: Update unique constraint
-- Drop old constraint
ALTER TABLE "public"."draft_pool"
DROP CONSTRAINT IF EXISTS "draft_pool_pokemon_name_point_value_key";

-- Create partial unique index (allows NULL season_id during migration)
-- This will be replaced with a full constraint after season_id is populated
CREATE UNIQUE INDEX IF NOT EXISTS "draft_pool_season_pokemon_unique_partial" 
ON "public"."draft_pool" ("season_id", "pokemon_name") 
WHERE "season_id" IS NOT NULL;

-- Step 6: Add indexes for performance
CREATE INDEX "idx_draft_pool_season" ON "public"."draft_pool" USING "btree" ("season_id");
CREATE INDEX "idx_draft_pool_status" ON "public"."draft_pool" USING "btree" ("status") WHERE ("status" = 'available'::draft_pool_status);
CREATE INDEX "idx_draft_pool_drafted_by" ON "public"."draft_pool" USING "btree" ("drafted_by_team_id") WHERE ("drafted_by_team_id" IS NOT NULL);
CREATE INDEX "idx_draft_pool_draft_round" ON "public"."draft_pool" USING "btree" ("draft_round") WHERE ("draft_round" IS NOT NULL);
CREATE INDEX "idx_draft_pool_draft_pick" ON "public"."draft_pool" USING "btree" ("draft_pick_number") WHERE ("draft_pick_number" IS NOT NULL);

-- Step 7: Add check constraints
ALTER TABLE "public"."draft_pool"
ADD CONSTRAINT "draft_pool_draft_round_check" CHECK (("draft_round" >= 1)),
ADD CONSTRAINT "draft_pool_draft_pick_number_check" CHECK (("draft_pick_number" >= 1));

-- Step 8: Add column comments
COMMENT ON COLUMN "public"."draft_pool"."season_id" IS 'Season this draft pool belongs to. Required for multi-season support.';
COMMENT ON COLUMN "public"."draft_pool"."status" IS 'Current status: available (can be drafted), drafted (has been drafted), banned (excluded from draft), unavailable (other reasons)';
COMMENT ON COLUMN "public"."draft_pool"."drafted_by_team_id" IS 'Team that drafted this Pokemon. NULL if not yet drafted. Denormalized for fast queries.';
COMMENT ON COLUMN "public"."draft_pool"."drafted_at" IS 'Timestamp when Pokemon was drafted. NULL if not yet drafted.';
COMMENT ON COLUMN "public"."draft_pool"."draft_round" IS 'Draft round number (1-11). NULL if not yet drafted. Denormalized for fast queries.';
COMMENT ON COLUMN "public"."draft_pool"."draft_pick_number" IS 'Overall pick number in draft (1-220). NULL if not yet drafted. Denormalized for fast queries.';
COMMENT ON COLUMN "public"."draft_pool"."banned_reason" IS 'Reason why Pokemon is banned (if status = banned).';

-- Step 9: Update table comment
COMMENT ON TABLE "public"."draft_pool" IS 'Formal draft pool table for the app. Tracks Pokemon available for drafting with point values, status, and draft metadata. Supports multi-season with season_id.';

-- Step 10: Drop old is_available column (after migration is complete)
-- NOTE: This is commented out initially - uncomment after verifying migration
-- ALTER TABLE "public"."draft_pool" DROP COLUMN "is_available";

-- Step 11: Make season_id NOT NULL (after setting values)
-- NOTE: This will fail if any rows have NULL season_id
-- Uncomment after populating season_id for all rows
-- ALTER TABLE "public"."draft_pool" ALTER COLUMN "season_id" SET NOT NULL;
--
-- Step 12: Replace partial index with full constraint (after season_id is NOT NULL)
-- After making season_id NOT NULL, replace partial index with full constraint:
-- DROP INDEX IF EXISTS "draft_pool_season_pokemon_unique_partial";
-- ALTER TABLE "public"."draft_pool"
-- ADD CONSTRAINT "draft_pool_season_pokemon_unique" 
-- UNIQUE ("season_id", "pokemon_name");

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- IMPORTANT: Before making season_id NOT NULL:
-- 1. Populate season_id for all existing rows (set to current season)
-- 2. Verify no NULL values: SELECT COUNT(*) FROM draft_pool WHERE season_id IS NULL;
-- 3. Then uncomment the ALTER COLUMN statement above
--
-- IMPORTANT: Before dropping is_available:
-- 1. Verify status column is working correctly
-- 2. Update all application code to use status instead of is_available
-- 3. Then uncomment the DROP COLUMN statement above
-- ============================================================================
