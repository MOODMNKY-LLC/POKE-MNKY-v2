-- Security lockdown 2/3: user_management_view (auth.users exposure) and SECURITY DEFINER views
--
-- user_management_view joined auth.users (emails, last sign-in) and ran with the view owner's
-- rights, so any signed-in user could read every account's email. The admin Users page
-- (app/admin/users/page.tsx, browser client) still needs it, so instead of service_role-only:
--   * the rows now come from public.get_user_management_rows(), a SECURITY DEFINER function that
--     returns rows only to profiles.role = 'admin' (or service_role / direct DB sessions),
--   * the view itself becomes security_invoker and keeps the same name and columns,
--   * anon loses all access; authenticated gets SELECT only.

CREATE OR REPLACE FUNCTION public.get_user_management_rows()
 RETURNS TABLE(
   id uuid, username text, display_name text, avatar_url text, role text, team_id uuid,
   team_name text, discord_id text, discord_username text, discord_roles jsonb, is_active boolean,
   email_verified boolean, onboarding_completed boolean, created_at timestamp with time zone,
   updated_at timestamp with time zone, last_seen_at timestamp with time zone,
   email character varying, last_sign_in_at timestamp with time zone, activity_count bigint,
   coach_bot_linked boolean)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  SELECT p.id, p.username, p.display_name, p.avatar_url, p.role, p.team_id,
         t.name AS team_name, p.discord_id, p.discord_username, p.discord_roles,
         p.is_active, p.email_verified, p.onboarding_completed, p.created_at,
         p.updated_at, p.last_seen_at, au.email, au.last_sign_in_at,
         (SELECT count(*) FROM public.user_activity_log l WHERE l.user_id = p.id) AS activity_count,
         EXISTS (SELECT 1 FROM public.coaches c
                 WHERE c.user_id = p.id AND (c.discord_user_id IS NOT NULL OR c.discord_id IS NOT NULL)) AS coach_bot_linked
  FROM public.profiles p
  LEFT JOIN public.teams t ON p.team_id = t.id
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE auth.uid() IS NULL
     OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'admin');
$function$;

REVOKE ALL ON FUNCTION public.get_user_management_rows() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_management_rows() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.user_management_view
WITH (security_invoker = true) AS
SELECT r.id, r.username, r.display_name, r.avatar_url, r.role, r.team_id, r.team_name,
       r.discord_id, r.discord_username, r.discord_roles, r.is_active, r.email_verified,
       r.onboarding_completed, r.created_at, r.updated_at, r.last_seen_at,
       r.email::character varying(255) AS email, r.last_sign_in_at, r.activity_count,
       r.coach_bot_linked
FROM public.get_user_management_rows() r;

REVOKE ALL ON public.user_management_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_management_view TO authenticated;
GRANT ALL ON public.user_management_view TO service_role;

-- The other 22 SECURITY DEFINER views now run with the caller's rights (RLS applies).
-- Checked before the change: every base table of the standings/weekly/roster views used by the
-- site with the anon or user key (matches, teams, matchweeks, seasons, draft_picks, pokemon,
-- pokemon_stats, team_rosters) has a SELECT policy USING (true) for anon and authenticated.
-- draft_pool / pokemon_showdown* have no anon SELECT-true policy, so anon sees fewer rows through
-- draft_pool_* / pokemon_unified / pokemon_with_all_data; the app only reads those with service_role.
ALTER VIEW public.draft_pool_enriched SET (security_invoker = true);
ALTER VIEW public.v_team_record_playoff SET (security_invoker = true);
ALTER VIEW public.ownership_history SET (security_invoker = true);
ALTER VIEW public.v_strength_of_schedule_regular SET (security_invoker = true);
ALTER VIEW public.v_match_team_rows_regular SET (security_invoker = true);
ALTER VIEW public.v_team_record_regular SET (security_invoker = true);
ALTER VIEW public.v_active_win_streak_regular SET (security_invoker = true);
ALTER VIEW public.v_head_to_head_regular SET (security_invoker = true);
ALTER VIEW public.v_opponent_winpct_regular SET (security_invoker = true);
ALTER VIEW public.v_regular_team_rankings SET (security_invoker = true);
ALTER VIEW public.v_division_winners_regular SET (security_invoker = true);
ALTER VIEW public.v_playoff_seeds_5_12 SET (security_invoker = true);
ALTER VIEW public.v_playoff_seeds_top4 SET (security_invoker = true);
ALTER VIEW public.draft_pool_with_showdown SET (security_invoker = true);
ALTER VIEW public.pokemon_unified SET (security_invoker = true);
ALTER VIEW public.pokemon_with_all_data SET (security_invoker = true);
ALTER VIEW public.draft_pool_comprehensive SET (security_invoker = true);
ALTER VIEW public.v_team_rosters SET (security_invoker = true);
ALTER VIEW public.v_team_budget SET (security_invoker = true);
ALTER VIEW public.v_weekly_match_team_rows SET (security_invoker = true);
ALTER VIEW public.v_weekly_pokemon_leaders SET (security_invoker = true);
ALTER VIEW public.v_weekly_team_summary SET (security_invoker = true);
