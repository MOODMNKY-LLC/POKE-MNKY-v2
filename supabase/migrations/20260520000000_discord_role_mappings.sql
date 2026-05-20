-- Configurable Discord role → app role mappings (admin-managed)

CREATE TABLE IF NOT EXISTS public.discord_role_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_role_id TEXT NOT NULL,
  discord_role_name TEXT NOT NULL,
  app_role TEXT NOT NULL CHECK (app_role IN ('admin', 'commissioner', 'coach', 'spectator')),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (discord_role_id)
);

CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_app_role
  ON public.discord_role_mappings (app_role, priority DESC);

ALTER TABLE public.discord_role_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discord_role_mappings_admin_read"
  ON public.discord_role_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')
    )
  );

CREATE POLICY "discord_role_mappings_admin_write"
  ON public.discord_role_mappings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'commissioner')
    )
  );

COMMENT ON TABLE public.discord_role_mappings IS
  'Admin-configured Discord role name/id to app role mapping; used by role sync with static fallback.';
