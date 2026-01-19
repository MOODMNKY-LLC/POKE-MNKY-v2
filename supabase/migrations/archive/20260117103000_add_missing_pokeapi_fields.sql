-- ============================================================================
-- Migration: Add Missing PokeAPI Fields
-- ============================================================================
-- Purpose: Add missing fields to reference tables to match PokeAPI structure 100%
-- Date: 2026-01-17
-- 
-- This migration ensures all tables have complete field coverage matching
-- the PokeAPI endpoint responses exactly.
-- ============================================================================

-- ============================================================================
-- 1. abilities table
-- ============================================================================
-- Missing: effect_changes

ALTER TABLE abilities
ADD COLUMN IF NOT EXISTS effect_changes JSONB;

COMMENT ON COLUMN abilities.effect_changes IS 'Array of effect changes by version group from PokeAPI';

-- ============================================================================
-- 2. types table
-- ============================================================================
-- Missing: past_damage_relations, names, pokemon, moves, sprites

ALTER TABLE types
ADD COLUMN IF NOT EXISTS past_damage_relations JSONB,
ADD COLUMN IF NOT EXISTS names JSONB,
ADD COLUMN IF NOT EXISTS pokemon JSONB,
ADD COLUMN IF NOT EXISTS moves JSONB,
ADD COLUMN IF NOT EXISTS sprites JSONB;

COMMENT ON COLUMN types.past_damage_relations IS 'Historical damage relations from PokeAPI';
COMMENT ON COLUMN types.names IS 'Localized names array from PokeAPI';
COMMENT ON COLUMN types.pokemon IS 'Array of Pokemon that have this type from PokeAPI';
COMMENT ON COLUMN types.moves IS 'Array of moves of this type from PokeAPI';
COMMENT ON COLUMN types.sprites IS 'Type sprites from PokeAPI';

-- ============================================================================
-- 3. moves table
-- ============================================================================
-- Missing: contest_combos, contest_type_id, contest_effect_id, effect_changes,
--          names, past_values, super_contest_effect_id, machines

ALTER TABLE moves
ADD COLUMN IF NOT EXISTS contest_combos JSONB,
ADD COLUMN IF NOT EXISTS contest_type_id INTEGER,
ADD COLUMN IF NOT EXISTS contest_effect_id INTEGER,
ADD COLUMN IF NOT EXISTS effect_changes JSONB,
ADD COLUMN IF NOT EXISTS names JSONB,
ADD COLUMN IF NOT EXISTS past_values JSONB,
ADD COLUMN IF NOT EXISTS super_contest_effect_id INTEGER,
ADD COLUMN IF NOT EXISTS machines JSONB;

COMMENT ON COLUMN moves.contest_combos IS 'Contest combo data from PokeAPI';
COMMENT ON COLUMN moves.contest_type_id IS 'Contest type ID extracted from contest_type.url';
COMMENT ON COLUMN moves.contest_effect_id IS 'Contest effect ID extracted from contest_effect.url';
COMMENT ON COLUMN moves.effect_changes IS 'Effect changes by version group from PokeAPI';
COMMENT ON COLUMN moves.names IS 'Localized names array from PokeAPI';
COMMENT ON COLUMN moves.past_values IS 'Historical move values from PokeAPI';
COMMENT ON COLUMN moves.super_contest_effect_id IS 'Super contest effect ID extracted from super_contest_effect.url';
COMMENT ON COLUMN moves.machines IS 'TM/HM machine data from PokeAPI';

-- ============================================================================
-- 4. stats table
-- ============================================================================
-- Missing: affecting_moves, affecting_natures, characteristics, names

ALTER TABLE stats
ADD COLUMN IF NOT EXISTS affecting_moves JSONB,
ADD COLUMN IF NOT EXISTS affecting_natures JSONB,
ADD COLUMN IF NOT EXISTS characteristics JSONB,
ADD COLUMN IF NOT EXISTS names JSONB;

COMMENT ON COLUMN stats.affecting_moves IS 'Moves that affect this stat from PokeAPI';
COMMENT ON COLUMN stats.affecting_natures IS 'Natures that affect this stat from PokeAPI';
COMMENT ON COLUMN stats.characteristics IS 'Characteristic URLs from PokeAPI';
COMMENT ON COLUMN stats.names IS 'Localized names array from PokeAPI';

-- ============================================================================
-- 5. items table
-- ============================================================================
-- Missing: names, baby_trigger_for, machines

ALTER TABLE items
ADD COLUMN IF NOT EXISTS names JSONB,
ADD COLUMN IF NOT EXISTS baby_trigger_for JSONB,
ADD COLUMN IF NOT EXISTS machines JSONB;

COMMENT ON COLUMN items.names IS 'Localized names array from PokeAPI';
COMMENT ON COLUMN items.baby_trigger_for IS 'Evolution chain that uses this item as baby trigger from PokeAPI';
COMMENT ON COLUMN items.machines IS 'TM/HM machine data from PokeAPI';

-- ============================================================================
-- 6. generations table
-- ============================================================================
-- Missing: names, version_groups

ALTER TABLE generations
ADD COLUMN IF NOT EXISTS names JSONB,
ADD COLUMN IF NOT EXISTS version_groups JSONB;

COMMENT ON COLUMN generations.names IS 'Localized names array from PokeAPI';
COMMENT ON COLUMN generations.version_groups IS 'Version groups array from PokeAPI';

-- ============================================================================
-- Indexes for new foreign key columns (if needed)
-- ============================================================================

-- Note: contest_type_id, contest_effect_id, super_contest_effect_id in moves
-- are references to other tables that may not exist yet. We'll add indexes
-- but not foreign keys until those tables are confirmed.

CREATE INDEX IF NOT EXISTS idx_moves_contest_type ON moves(contest_type_id) WHERE contest_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moves_contest_effect ON moves(contest_effect_id) WHERE contest_effect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moves_super_contest_effect ON moves(super_contest_effect_id) WHERE super_contest_effect_id IS NOT NULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify all columns were added successfully
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    -- Check abilities
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'abilities' AND column_name = 'effect_changes'
    ) THEN
        missing_columns := array_append(missing_columns, 'abilities.effect_changes');
    END IF;
    
    -- Check types
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'types' AND column_name = 'past_damage_relations'
    ) THEN
        missing_columns := array_append(missing_columns, 'types.past_damage_relations');
    END IF;
    
    -- Check moves
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'moves' AND column_name = 'contest_combos'
    ) THEN
        missing_columns := array_append(missing_columns, 'moves.contest_combos');
    END IF;
    
    -- Check stats
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stats' AND column_name = 'affecting_moves'
    ) THEN
        missing_columns := array_append(missing_columns, 'stats.affecting_moves');
    END IF;
    
    -- Check items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'names'
    ) THEN
        missing_columns := array_append(missing_columns, 'items.names');
    END IF;
    
    -- Check generations
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'generations' AND column_name = 'names'
    ) THEN
        missing_columns := array_append(missing_columns, 'generations.names');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration incomplete. Missing columns: %', array_to_string(missing_columns, ', ');
    END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================
