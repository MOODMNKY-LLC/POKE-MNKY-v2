-- Add discord_roles to user_management_view for accurate coach/commissioner stats
-- Coaches count uses both profiles.role and discord_roles for Discord-synced accuracy
-- DROP first to avoid "cannot change name of view column" when adding new column
--
-- Wrapped in DO block: this migration runs before profiles is created (20260112),
-- so we only create the view if the table exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    DROP VIEW IF EXISTS public.user_management_view;

    CREATE VIEW public.user_management_view AS
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.role,
      p.team_id,
      t.name AS team_name,
      p.discord_id,
      p.discord_username,
      p.discord_roles,
      p.is_active,
      p.email_verified,
      p.onboarding_completed,
      p.created_at,
      p.updated_at,
      p.last_seen_at,
      au.email,
      au.last_sign_in_at,
      (SELECT COUNT(*) FROM public.user_activity_log WHERE user_id = p.id) AS activity_count,
      EXISTS (
        SELECT 1 FROM public.coaches c
        WHERE c.user_id = p.id
          AND (c.discord_user_id IS NOT NULL OR c.discord_id IS NOT NULL)
      ) AS coach_bot_linked
    FROM public.profiles p
    LEFT JOIN public.teams t ON p.team_id = t.id
    LEFT JOIN auth.users au ON p.id = au.id;

    GRANT SELECT ON public.user_management_view TO authenticated;

    COMMENT ON VIEW public.user_management_view IS 'User management; includes discord_roles for coach/commissioner stats sync with Discord and RBAC.';
  END IF;
END $$;
