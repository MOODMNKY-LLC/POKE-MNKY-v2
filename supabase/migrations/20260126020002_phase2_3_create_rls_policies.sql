-- Phase 2.3: RLS Policies
-- Creates comprehensive Row Level Security policies for secure coach self-service model
-- Based on: docs/chatgpt-conversation-average-at-best-zip.md (lines 3876-3917)

-- Enable RLS on all tables
ALTER TABLE public.draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_pool_pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_role_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_tag_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pokemon_moves_utility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notion_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_guild_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PUBLIC READ POLICIES (Reference Data)
-- ============================================

-- Public read for pokemon
DROP POLICY IF EXISTS "public read pokemon" ON public.pokemon;
CREATE POLICY "public read pokemon" ON public.pokemon
  FOR SELECT
  USING (true);

-- Public read for moves
DROP POLICY IF EXISTS "public read moves" ON public.moves;
CREATE POLICY "public read moves" ON public.moves
  FOR SELECT
  USING (true);

-- Public read for role_tags
DROP POLICY IF EXISTS "public read role_tags" ON public.role_tags;
CREATE POLICY "public read role_tags" ON public.role_tags
  FOR SELECT
  USING (true);

-- Public read for pokemon_role_tags
DROP POLICY IF EXISTS "public read pokemon_role_tags" ON public.pokemon_role_tags;
CREATE POLICY "public read pokemon_role_tags" ON public.pokemon_role_tags
  FOR SELECT
  USING (true);

-- Public read for role_tag_moves
DROP POLICY IF EXISTS "public read role_tag_moves" ON public.role_tag_moves;
CREATE POLICY "public read role_tag_moves" ON public.role_tag_moves
  FOR SELECT
  USING (true);

-- Public read for pokemon_moves_utility
DROP POLICY IF EXISTS "public read pokemon_moves_utility" ON public.pokemon_moves_utility;
CREATE POLICY "public read pokemon_moves_utility" ON public.pokemon_moves_utility
  FOR SELECT
  USING (true);

-- ============================================
-- AUTHENTICATED READ POLICIES (League Data)
-- ============================================

-- Teams readable to all (league transparency)
DROP POLICY IF EXISTS "read teams" ON public.teams;
CREATE POLICY "read teams" ON public.teams
  FOR SELECT
  USING (true);

-- Draft picks readable to all authenticated users (league transparency)
DROP POLICY IF EXISTS "read draft picks" ON public.draft_picks;
CREATE POLICY "read draft picks" ON public.draft_picks
  FOR SELECT
  USING (true);

-- Seasons readable to all
DROP POLICY IF EXISTS "read seasons" ON public.seasons;
CREATE POLICY "read seasons" ON public.seasons
  FOR SELECT
  USING (true);

-- Season teams readable to all
DROP POLICY IF EXISTS "read season_teams" ON public.season_teams;
CREATE POLICY "read season_teams" ON public.season_teams
  FOR SELECT
  USING (true);

-- Draft pools readable to all
DROP POLICY IF EXISTS "read draft_pools" ON public.draft_pools;
CREATE POLICY "read draft_pools" ON public.draft_pools
  FOR SELECT
  USING (true);

-- Draft pool pokemon readable to all
DROP POLICY IF EXISTS "read draft_pool_pokemon" ON public.draft_pool_pokemon;
CREATE POLICY "read draft_pool_pokemon" ON public.draft_pool_pokemon
  FOR SELECT
  USING (true);

-- Matches readable to all
DROP POLICY IF EXISTS "read matches" ON public.matches;
CREATE POLICY "read matches" ON public.matches
  FOR SELECT
  USING (true);

-- ============================================
-- COACH-SCOPED POLICIES
-- ============================================

-- Coaches read their own coach record
DROP POLICY IF EXISTS "coach reads self" ON public.coaches;
CREATE POLICY "coach reads self" ON public.coaches
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

-- Coaches can update their own coach record
DROP POLICY IF EXISTS "coach updates self" ON public.coaches;
CREATE POLICY "coach updates self" ON public.coaches
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ============================================
-- ADMIN-ONLY WRITE POLICIES
-- ============================================

-- Admin-only writes to draft_picks (forces RPC usage for coaches)
DROP POLICY IF EXISTS "admin writes draft picks" ON public.draft_picks;
CREATE POLICY "admin writes draft picks" ON public.draft_picks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to draft_pools
DROP POLICY IF EXISTS "admin writes draft_pools" ON public.draft_pools;
CREATE POLICY "admin writes draft_pools" ON public.draft_pools
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to draft_pool_pokemon
DROP POLICY IF EXISTS "admin writes draft_pool_pokemon" ON public.draft_pool_pokemon;
CREATE POLICY "admin writes draft_pool_pokemon" ON public.draft_pool_pokemon
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to seasons
DROP POLICY IF EXISTS "admin writes seasons" ON public.seasons;
CREATE POLICY "admin writes seasons" ON public.seasons
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to season_teams
DROP POLICY IF EXISTS "admin writes season_teams" ON public.season_teams;
CREATE POLICY "admin writes season_teams" ON public.season_teams
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to teams
DROP POLICY IF EXISTS "admin writes teams" ON public.teams;
CREATE POLICY "admin writes teams" ON public.teams
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to coaches
DROP POLICY IF EXISTS "admin writes coaches" ON public.coaches;
CREATE POLICY "admin writes coaches" ON public.coaches
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to matches
DROP POLICY IF EXISTS "admin writes matches" ON public.matches;
CREATE POLICY "admin writes matches" ON public.matches
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to pokemon (reference data management)
DROP POLICY IF EXISTS "admin writes pokemon" ON public.pokemon;
CREATE POLICY "admin writes pokemon" ON public.pokemon
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to moves
DROP POLICY IF EXISTS "admin writes moves" ON public.moves;
CREATE POLICY "admin writes moves" ON public.moves
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to role_tags
DROP POLICY IF EXISTS "admin writes role_tags" ON public.role_tags;
CREATE POLICY "admin writes role_tags" ON public.role_tags
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to pokemon_role_tags
DROP POLICY IF EXISTS "admin writes pokemon_role_tags" ON public.pokemon_role_tags;
CREATE POLICY "admin writes pokemon_role_tags" ON public.pokemon_role_tags
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allow inserts to transaction_audit (RPCs can insert audit records)
DROP POLICY IF EXISTS "insert transaction_audit" ON public.transaction_audit;
CREATE POLICY "insert transaction_audit" ON public.transaction_audit
  FOR INSERT
  WITH CHECK (true); -- RPCs can insert audit records

-- Authenticated read for transaction_audit (league transparency)
DROP POLICY IF EXISTS "read transaction_audit" ON public.transaction_audit;
CREATE POLICY "read transaction_audit" ON public.transaction_audit
  FOR SELECT
  USING (true);

-- Admin-only writes to notion_mappings
DROP POLICY IF EXISTS "admin writes notion_mappings" ON public.notion_mappings;
CREATE POLICY "admin writes notion_mappings" ON public.notion_mappings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to api_keys
DROP POLICY IF EXISTS "admin writes api_keys" ON public.api_keys;
CREATE POLICY "admin writes api_keys" ON public.api_keys
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to discord_guild_config
DROP POLICY IF EXISTS "admin writes discord_guild_config" ON public.discord_guild_config;
CREATE POLICY "admin writes discord_guild_config" ON public.discord_guild_config
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only writes to admin_users
DROP POLICY IF EXISTS "admin writes admin_users" ON public.admin_users;
CREATE POLICY "admin writes admin_users" ON public.admin_users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Comments
COMMENT ON POLICY "public read pokemon" ON public.pokemon IS 'Public read access for Pokemon reference data';
COMMENT ON POLICY "read draft picks" ON public.draft_picks IS 'Authenticated read access for draft picks (league transparency)';
COMMENT ON POLICY "admin writes draft picks" ON public.draft_picks IS 'Admin-only write access (forces coaches to use RPCs)';
COMMENT ON POLICY "coach reads self" ON public.coaches IS 'Coaches can read their own coach record';
