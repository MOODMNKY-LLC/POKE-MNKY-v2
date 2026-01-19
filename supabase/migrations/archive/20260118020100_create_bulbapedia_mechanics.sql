-- Migration: Create bulbapedia_mechanics table for curated Bulbapedia content
-- Date: 2026-01-18
-- Purpose: Store curated mechanics explanations from Bulbapedia (CC-BY-SA licensed)

CREATE TABLE IF NOT EXISTS bulbapedia_mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL, -- 'ability', 'move', 'mechanic', 'item'
  resource_name TEXT NOT NULL, -- 'Intimidate', 'Trick Room', 'Sleep', 'Leftovers'
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Normalized markdown/text content
  source_url TEXT NOT NULL, -- Original Bulbapedia URL
  generation INTEGER, -- Applicable generation(s), NULL means all generations
  tags TEXT[], -- ['battle', 'status', 'ability', 'weather', 'terrain', etc.]
  attribution TEXT NOT NULL DEFAULT 'Source: Bulbapedia (CC-BY-SA)', -- Attribution text
  curated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_type, resource_name)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bulbapedia_type_name ON bulbapedia_mechanics(resource_type, resource_name);
CREATE INDEX IF NOT EXISTS idx_bulbapedia_tags ON bulbapedia_mechanics USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bulbapedia_generation ON bulbapedia_mechanics(generation);
CREATE INDEX IF NOT EXISTS idx_bulbapedia_resource_type ON bulbapedia_mechanics(resource_type);

-- Full-text search index on content (for searching mechanics explanations)
CREATE INDEX IF NOT EXISTS idx_bulbapedia_content_search ON bulbapedia_mechanics USING GIN(to_tsvector('english', content));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulbapedia_mechanics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_bulbapedia_mechanics_updated_at
  BEFORE UPDATE ON bulbapedia_mechanics
  FOR EACH ROW
  EXECUTE FUNCTION update_bulbapedia_mechanics_updated_at();

-- Comments for documentation
COMMENT ON TABLE bulbapedia_mechanics IS 'Stores curated mechanics explanations from Bulbapedia (CC-BY-SA licensed)';
COMMENT ON COLUMN bulbapedia_mechanics.resource_type IS 'Type of resource: ability, move, mechanic, item';
COMMENT ON COLUMN bulbapedia_mechanics.resource_name IS 'Name of the resource (e.g., Intimidate, Trick Room, Sleep)';
COMMENT ON COLUMN bulbapedia_mechanics.content IS 'Normalized markdown/text content extracted from Bulbapedia';
COMMENT ON COLUMN bulbapedia_mechanics.source_url IS 'Original Bulbapedia URL for attribution';
COMMENT ON COLUMN bulbapedia_mechanics.generation IS 'Applicable generation (NULL means all generations)';
COMMENT ON COLUMN bulbapedia_mechanics.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN bulbapedia_mechanics.attribution IS 'Attribution text (required by CC-BY-SA license)';
