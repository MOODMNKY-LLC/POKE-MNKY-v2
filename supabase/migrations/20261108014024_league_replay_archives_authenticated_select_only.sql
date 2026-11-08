-- Purpose: Harden table privileges on Phase 1 league replay archive tables.
-- Affected: public.league_replay_archives, league_replay_parse_runs,
--           league_match_replay_links (privileges only; no schema/RLS policy changes).
-- Context: Production default privileges for role postgres on schema public grant
--          anon/authenticated/service_role ALL (arwdDxtm) on newly created tables.
--          Migration 20261107102017 revoked anon and GRANTed SELECT to authenticated,
--          but GRANT is additive — leftover INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER
--          from default ACLs remained. RLS does not govern TRUNCATE.
-- Notes: Does NOT alter ALTER DEFAULT PRIVILEGES / database-wide defaults.
--        Reasserts intended service_role DML (select/insert/update/delete) without
--        truncate/trigger. Owner unchanged. Do not enable REPLAY_INGEST from this file.

revoke all on table public.league_replay_archives from public;
revoke all on table public.league_replay_archives from anon;
revoke all on table public.league_replay_archives from authenticated;
revoke all on table public.league_replay_archives from service_role;

revoke all on table public.league_replay_parse_runs from public;
revoke all on table public.league_replay_parse_runs from anon;
revoke all on table public.league_replay_parse_runs from authenticated;
revoke all on table public.league_replay_parse_runs from service_role;

revoke all on table public.league_match_replay_links from public;
revoke all on table public.league_match_replay_links from anon;
revoke all on table public.league_match_replay_links from authenticated;
revoke all on table public.league_match_replay_links from service_role;

-- authenticated: SELECT only (row filter still via RLS policies)
grant select on table public.league_replay_archives to authenticated;
grant select on table public.league_replay_parse_runs to authenticated;
grant select on table public.league_match_replay_links to authenticated;

-- service_role: intended API DML (bypasses RLS); no truncate/trigger
grant select, insert, update, delete on table public.league_replay_archives to service_role;
grant select, insert, update, delete on table public.league_replay_parse_runs to service_role;
grant select, insert, update, delete on table public.league_match_replay_links to service_role;
