-- ============================================================================
-- Migration: Add is_available column to draft_pool
-- ============================================================================
-- Purpose: Add is_available boolean to track whether a Pokemon can be drafted
--          This enables live updates during the draft process
-- Date: 2026-01-19
-- ============================================================================

-- Add is_available column with default true (all Pokemon start as available)
ALTER TABLE "public"."draft_pool" 
ADD COLUMN "is_available" boolean NOT NULL DEFAULT true;

-- Create index for efficient filtering of available Pokemon
CREATE INDEX "idx_draft_pool_is_available" ON "public"."draft_pool" USING "btree" ("is_available") WHERE ("is_available" = true);

-- Add comment
COMMENT ON COLUMN "public"."draft_pool"."is_available" IS 'Indicates whether the Pokemon is available to be drafted. Set to false when drafted.';
