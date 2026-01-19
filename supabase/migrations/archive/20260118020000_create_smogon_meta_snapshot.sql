-- Migration: Create smogon_meta_snapshot table for Smogon competitive meta data
-- Date: 2026-01-18
-- Purpose: Store periodic snapshots of Smogon usage statistics and meta data

CREATE TABLE IF NOT EXISTS smogon_meta_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pokemon_name TEXT NOT NULL,
  format TEXT NOT NULL, -- 'gen9ou', 'gen9vgc2024', etc.
  generation INTEGER NOT NULL,
  tier TEXT, -- 'OU', 'UU', 'RU', etc.
  usage_rate DECIMAL(5,4), -- 0.0000 to 1.0000 (percentage as decimal)
  roles TEXT[], -- ['wallbreaker', 'pivot', 'sweeper', 'hazard_setter', etc.]
  common_moves JSONB, -- [{name: string, frequency: number}]
  common_items JSONB, -- [{name: string, frequency: number}]
  common_abilities JSONB, -- [{name: string, frequency: number}]
  common_evs JSONB, -- {hp: number, atk: number, def: number, spa: number, spd: number, spe: number}
  checks TEXT[], -- Pokemon that check this Pokemon
  counters TEXT[], -- Pokemon that counter this Pokemon
  source_date TIMESTAMPTZ NOT NULL, -- Date of the snapshot (e.g., '2024-12' for December 2024)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pokemon_name, format, source_date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_smogon_meta_pokemon ON smogon_meta_snapshot(pokemon_name);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_format ON smogon_meta_snapshot(format, generation);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_tier ON smogon_meta_snapshot(tier);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_source_date ON smogon_meta_snapshot(source_date DESC);

-- Index for GIN (Generalized Inverted Index) on JSONB columns for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_smogon_meta_moves ON smogon_meta_snapshot USING GIN(common_moves);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_items ON smogon_meta_snapshot USING GIN(common_items);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_abilities ON smogon_meta_snapshot USING GIN(common_abilities);

-- Index for array columns (roles, checks, counters)
CREATE INDEX IF NOT EXISTS idx_smogon_meta_roles ON smogon_meta_snapshot USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_checks ON smogon_meta_snapshot USING GIN(checks);
CREATE INDEX IF NOT EXISTS idx_smogon_meta_counters ON smogon_meta_snapshot USING GIN(counters);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_smogon_meta_snapshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_smogon_meta_snapshot_updated_at
  BEFORE UPDATE ON smogon_meta_snapshot
  FOR EACH ROW
  EXECUTE FUNCTION update_smogon_meta_snapshot_updated_at();

-- Comments for documentation
COMMENT ON TABLE smogon_meta_snapshot IS 'Stores periodic snapshots of Smogon competitive meta data including usage statistics, common sets, and strategic information';
COMMENT ON COLUMN smogon_meta_snapshot.format IS 'Smogon format identifier (e.g., gen9ou, gen9vgc2024, gen9uu)';
COMMENT ON COLUMN smogon_meta_snapshot.tier IS 'Competitive tier (OU, UU, RU, NU, PU, Ubers, etc.)';
COMMENT ON COLUMN smogon_meta_snapshot.usage_rate IS 'Usage percentage as decimal (0.0 to 1.0)';
COMMENT ON COLUMN smogon_meta_snapshot.source_date IS 'Date identifier for the snapshot (e.g., 2024-12 for December 2024)';
COMMENT ON COLUMN smogon_meta_snapshot.common_moves IS 'JSONB array of {name: string, frequency: number} for most common moves';
COMMENT ON COLUMN smogon_meta_snapshot.common_items IS 'JSONB array of {name: string, frequency: number} for most common items';
COMMENT ON COLUMN smogon_meta_snapshot.common_abilities IS 'JSONB array of {name: string, frequency: number} for most common abilities';
COMMENT ON COLUMN smogon_meta_snapshot.common_evs IS 'JSONB object with EV spread {hp, atk, def, spa, spd, spe}';
