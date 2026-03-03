-- Add coach_bot_linked and discord_roles to user_management_view
-- coach_bot_linked: admins can see if /whoami will work for a user
-- discord_roles: for Discord-synced coach/commissioner stats (from 20250303)
--
-- DROP first: CREATE OR REPLACE cannot add columns in the middle (PostgreSQL
-- maps by position, so adding discord_roles before is_active would rename is_active).

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

COMMENT ON VIEW public.user_management_view IS 'User management; includes discord_roles and coach_bot_linked for Discord sync and /whoami.';
