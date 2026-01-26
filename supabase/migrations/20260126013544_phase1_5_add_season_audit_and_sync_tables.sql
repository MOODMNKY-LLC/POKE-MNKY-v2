-- Phase 1.5: Season & Audit Enhancements
-- Adds draft windows, transaction audit, Notion mappings, API keys, and Discord guild config
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 4846-4903, 2280-2300)

-- Add draft window fields to seasons table
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS draft_open_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draft_close_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draft_points_budget INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS roster_size_min INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS roster_size_max INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS generation_format TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_seasons_draft_window ON public.seasons(draft_open_at, draft_close_at);

-- Transaction audit table for all coach transactions
CREATE TABLE IF NOT EXISTS public.transaction_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL,               -- 'coach_web' | 'discord_bot'
  actor_user_id UUID,                     -- auth.uid if web
  actor_discord_id TEXT,                  -- discord user snowflake if bot
  action TEXT NOT NULL,                   -- 'draft_pick', 'free_agency_transaction', etc.
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_audit_season_team ON public.transaction_audit(season_id, team_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_actor ON public.transaction_audit(actor_type, actor_discord_id);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_created ON public.transaction_audit(created_at DESC);

-- Notion mappings table for deterministic sync
CREATE TABLE IF NOT EXISTS public.notion_mappings (
  notion_page_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,              -- 'pokemon','role_tag','move','coach','team', etc.
  entity_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notion_mappings_entity ON public.notion_mappings(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notion_mappings_entity_id ON public.notion_mappings(entity_id);

-- API keys table for bot authentication
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);

-- Discord guild configuration table
CREATE TABLE IF NOT EXISTS public.discord_guild_config (
  guild_id TEXT PRIMARY KEY,                           -- Discord server ID (snowflake)
  default_season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
  admin_role_ids TEXT[] NOT NULL DEFAULT '{}',          -- optional: allowed Discord role IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discord_guild_config_season ON public.discord_guild_config(default_season_id);

-- Create updated_at trigger for discord_guild_config
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS trg_discord_guild_config_updated_at ON public.discord_guild_config;
  CREATE TRIGGER trg_discord_guild_config_updated_at
    BEFORE UPDATE ON public.discord_guild_config
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create updated_at trigger for seasons
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS seasons_set_updated_at ON public.seasons;
  CREATE TRIGGER seasons_set_updated_at 
    BEFORE UPDATE ON public.seasons
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Comments
COMMENT ON TABLE public.transaction_audit IS 'Complete audit trail for all coach transactions (draft picks, free agency, etc.)';
COMMENT ON COLUMN public.transaction_audit.actor_type IS 'Source of transaction: coach_web or discord_bot';
COMMENT ON TABLE public.notion_mappings IS 'Deterministic mapping between Notion page IDs and Supabase entity IDs for sync';
COMMENT ON TABLE public.api_keys IS 'API key management for bot authentication (keys stored as SHA256 hashes)';
COMMENT ON TABLE public.discord_guild_config IS 'Discord server configuration including default season and admin roles';
COMMENT ON COLUMN public.seasons.draft_open_at IS 'Draft window start time';
COMMENT ON COLUMN public.seasons.draft_close_at IS 'Draft window end time';
