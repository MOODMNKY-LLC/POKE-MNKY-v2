-- Fix cron jobs to handle missing app.settings gracefully
-- In production, these settings need to be configured in Supabase Dashboard
-- This migration creates helper functions that cron jobs can call

-- Helper function to get Supabase URL with fallback
CREATE OR REPLACE FUNCTION public._get_supabase_url()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.settings.supabase_url', true), ''),
    'https://chmrszrwlfeqovwxyrmt.supabase.co'
  );
END;
$$;

-- Helper function to get service role key
CREATE OR REPLACE FUNCTION public._get_service_role_key()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN NULLIF(current_setting('app.settings.service_role_key', true), '');
END;
$$;

-- Note: To fix the cron job URL errors, configure these settings in Supabase Dashboard:
-- 1. Go to Database → Settings → Custom Config
-- 2. Add:
--    - app.settings.supabase_url = 'https://chmrszrwlfeqovwxyrmt.supabase.co'
--    - app.settings.service_role_key = '<your-service-role-key>'
--
-- Or update the cron jobs manually to use the helper functions above.
