-- Create Showdown replay tables for local replay storage
-- Converted from CockroachDB syntax to PostgreSQL

-- Replay players table (for searching replays by player)
CREATE TABLE IF NOT EXISTS public.replayplayers (
	playerid VARCHAR(45) NOT NULL,
	formatid VARCHAR(45) NOT NULL,
	id VARCHAR(255) NOT NULL,
	rating BIGINT NULL,
	uploadtime BIGINT NOT NULL,
	private SMALLINT NOT NULL,
	password VARCHAR(31) NULL,
	format VARCHAR(255) NOT NULL,
	players VARCHAR(255) NOT NULL,
	CONSTRAINT replayplayers_pkey PRIMARY KEY (id, playerid)
);

-- Indexes for replayplayers
CREATE INDEX IF NOT EXISTS idx_replayplayers_playerid_uploadtime ON public.replayplayers(playerid, uploadtime);
CREATE INDEX IF NOT EXISTS idx_replayplayers_playerid_rating ON public.replayplayers(playerid, rating);
CREATE INDEX IF NOT EXISTS idx_replayplayers_formatid_playerid_uploadtime ON public.replayplayers(formatid, playerid, uploadtime);
CREATE INDEX IF NOT EXISTS idx_replayplayers_formatid_playerid_rating ON public.replayplayers(formatid, playerid, rating);

-- Main replays table
CREATE TABLE IF NOT EXISTS public.replays (
	id VARCHAR(255) NOT NULL,
	format VARCHAR(45) NOT NULL,
	players VARCHAR(255) NOT NULL,
	log TEXT NOT NULL,
	inputlog TEXT NULL,
	uploadtime BIGINT NOT NULL,
	views BIGINT NOT NULL DEFAULT 0,
	formatid VARCHAR(45) NOT NULL,
	rating BIGINT NULL,
	private BIGINT NOT NULL DEFAULT 0,
	password VARCHAR(31) NULL,
	CONSTRAINT replays_pkey PRIMARY KEY (id)
);

-- Indexes for replays
CREATE INDEX IF NOT EXISTS idx_replays_private_uploadtime ON public.replays(private, uploadtime);
CREATE INDEX IF NOT EXISTS idx_replays_private_formatid_uploadtime ON public.replays(private, formatid, uploadtime);
CREATE INDEX IF NOT EXISTS idx_replays_private_formatid_rating ON public.replays(private, formatid, rating);

-- Full-text search index on log (for searching replay content)
-- Note: PostgreSQL full-text search requires a tsvector column
-- For now, we'll create a GIN index on the log text for pattern matching
-- Full full-text search can be added later if needed
CREATE INDEX IF NOT EXISTS idx_replays_log_gin ON public.replays USING gin(to_tsvector('english', log));

-- Enable RLS (Row Level Security) - adjust policies as needed
ALTER TABLE public.replayplayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replays ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies: allow public read access to non-private replays
-- Adjust these policies based on your security requirements

-- Policy for replayplayers: allow read access to non-private replays
CREATE POLICY "Allow read non-private replayplayers" ON public.replayplayers
	FOR SELECT
	USING (private = 0);

-- Policy for replays: allow read access to non-private replays
CREATE POLICY "Allow read non-private replays" ON public.replays
	FOR SELECT
	USING (private = 0);

-- Policy for replays: allow insert (for replay uploads)
-- Note: You may want to restrict this to authenticated users or specific services
CREATE POLICY "Allow insert replays" ON public.replays
	FOR INSERT
	WITH CHECK (true);

-- Policy for replayplayers: allow insert (for replay uploads)
CREATE POLICY "Allow insert replayplayers" ON public.replayplayers
	FOR INSERT
	WITH CHECK (true);

-- Policy for replays: allow update (for view counts, etc.)
CREATE POLICY "Allow update replays" ON public.replays
	FOR UPDATE
	USING (true)
	WITH CHECK (true);
