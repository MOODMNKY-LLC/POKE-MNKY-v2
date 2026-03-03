-- Grant supabase_auth_admin execute on mcp_access_token_hook
-- Required for Auth custom access token hook (pg-functions://postgres/public/mcp_access_token_hook)
-- Without this, "Error running hook URI" occurs when MCP or OAuth uses the hook
--
-- To disable the hook instead: Supabase Dashboard → Authentication → Hooks → disable Custom Access Token

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'mcp_access_token_hook'
  ) THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.mcp_access_token_hook(jsonb) TO supabase_auth_admin;
    REVOKE EXECUTE ON FUNCTION public.mcp_access_token_hook(jsonb) FROM authenticated;
    REVOKE EXECUTE ON FUNCTION public.mcp_access_token_hook(jsonb) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.mcp_access_token_hook(jsonb) FROM public;
  END IF;
END $$;
