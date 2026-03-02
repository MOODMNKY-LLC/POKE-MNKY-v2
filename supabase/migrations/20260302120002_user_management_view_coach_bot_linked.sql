-- Add coach_bot_linked to user_management_view so admins can see if /whoami will work for a user

CREATE OR REPLACE VIEW public.user_management_view AS
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

COMMENT ON VIEW public.user_management_view IS 'User management; coach_bot_linked true when coach row has discord_user_id or discord_id set for /whoami.';
