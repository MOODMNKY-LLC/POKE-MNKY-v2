-- Cleanup unused Pokemon tables
-- Removes empty tables created for PokeAPI cloning strategy that was abandoned
-- Date: 2026-01-18

-- Drop empty Pokemon relationship tables
-- These tables were created for comprehensive PokeAPI data cloning but never populated
-- We're keeping only: pokemon (used by team_rosters FK), pokemon_cache, pokepedia_pokemon

DROP TABLE IF EXISTS pokemon_comprehensive CASCADE;
DROP TABLE IF EXISTS pokemon_species CASCADE;
DROP TABLE IF EXISTS pokemon_types CASCADE;
DROP TABLE IF EXISTS pokemon_stats CASCADE;
DROP TABLE IF EXISTS pokemon_abilities CASCADE;
DROP TABLE IF EXISTS pokemon_moves CASCADE;
DROP TABLE IF EXISTS pokemon_forms CASCADE;
DROP TABLE IF EXISTS pokemon_egg_groups CASCADE;
DROP TABLE IF EXISTS pokemon_items CASCADE;
DROP TABLE IF EXISTS pokemon_location_areas CASCADE;
DROP TABLE IF EXISTS pokemon_colors CASCADE;
DROP TABLE IF EXISTS pokemon_habitats CASCADE;
DROP TABLE IF EXISTS pokemon_shapes CASCADE;

-- Drop potentially unused PokeAPI resource tables
-- Verify these aren't used before uncommenting:
-- DROP TABLE IF EXISTS pokeapi_resource_cache CASCADE;
-- DROP TABLE IF EXISTS pokeapi_resources CASCADE;
-- DROP TABLE IF EXISTS pokeathlon_stats CASCADE;
-- DROP TABLE IF EXISTS pokedexes CASCADE;
-- DROP TABLE IF EXISTS pokepedia_assets CASCADE;

-- Verify critical tables still exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pokemon') THEN
        RAISE EXCEPTION 'pokemon table missing! This table is required for team_rosters FK.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pokemon_cache') THEN
        RAISE EXCEPTION 'pokemon_cache table missing! This table contains populated data.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pokepedia_pokemon') THEN
        RAISE EXCEPTION 'pokepedia_pokemon table missing! This table contains populated data.';
    END IF;
    
    RAISE NOTICE 'Cleanup complete. Critical tables verified.';
END $$;

-- Verify team_rosters FK constraint still exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'team_rosters_pokemon_id_fkey'
    ) THEN
        RAISE WARNING 'team_rosters FK constraint to pokemon not found. Verify manually.';
    END IF;
END $$;
