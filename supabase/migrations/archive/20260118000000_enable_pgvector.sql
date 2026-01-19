-- Enable pgvector extension for Open WebUI RAG functionality
-- This extension provides vector similarity search capabilities

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
    ) THEN
        RAISE EXCEPTION 'Failed to enable pgvector extension';
    END IF;
END $$;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'pgvector extension enabled successfully';
END $$;
