-- Security: stop PUBLIC/anon EXECUTE on admin/coach helper RPCs.
-- Already applied on production poke-mnky (chmrszrwlfeqovwxyrmt) 2026-11-14;
-- this file mirrors the prod ledger version/name for Deploy-to-production.
--
-- Rollback (emergency only):
--   GRANT EXECUTE ON FUNCTION public.is_admin(), public.is_coach_of_team(uuid) TO PUBLIC, anon;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_coach_of_team(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_coach_of_team(uuid) to authenticated, service_role;
