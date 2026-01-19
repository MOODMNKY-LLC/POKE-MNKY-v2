-- ============================================================================
-- Migration: Add MCP OAuth Custom Access Token Hook
-- ============================================================================
-- Purpose: Add custom claims to OAuth tokens for MCP server authentication
-- Date: 2026-01-18
-- 
-- This hook adds client_id and mcp_access claims to tokens issued via
-- Supabase OAuth Server, enabling MCP server to identify clients.
-- ============================================================================

-- ============================================================================
-- Custom Access Token Hook Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mcp_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_id text;
  claims jsonb;
BEGIN
  -- Extract client_id from event (if present)
  client_id := event->>'client_id';
  
  -- Get existing claims (or create empty object)
  claims := COALESCE(event->'claims', '{}'::jsonb);
  
  -- Add client_id to claims (if not already present)
  IF client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(client_id));
  END IF;
  
  -- Add MCP-specific claim to indicate this token is for MCP access
  claims := jsonb_set(claims, '{mcp_access}', to_jsonb(true));
  
  -- Return modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant execute permission to supabase_auth_admin (required for hooks)
GRANT EXECUTE ON FUNCTION public.mcp_access_token_hook TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.mcp_access_token_hook FROM authenticated, anon, public;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION public.mcp_access_token_hook IS 'Custom access token hook for MCP server OAuth. Adds client_id and mcp_access claims to tokens issued via Supabase OAuth Server.';
