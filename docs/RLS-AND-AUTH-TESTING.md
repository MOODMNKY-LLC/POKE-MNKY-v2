# RLS and Auth Testing Guide

This document describes how to test Row Level Security (RLS) policies and Discord OAuth (including role sync) so that production has safe multi-role access and reliable login.

## RLS test matrix

### Roles

- **Viewer**: Authenticated user, not in `admin_users`, not a coach of any team. Can read league data (teams, seasons, matches, draft_picks, etc.) and reference data (pokemon, moves, role_tags). Cannot write.
- **Coach**: Authenticated user linked to a coach record; `is_coach_of_team(team_id)` is true for at least one team. Can read everything a viewer can. Can submit draft picks and free agency transactions only for their own team (via RPCs; direct table writes are admin-only).
- **Admin**: User in `admin_users`. Can read/write admin tables and perform admin operations.

### Tables and expected access

| Table / area | Viewer | Coach | Admin |
|--------------|--------|--------|--------|
| `pokemon`, `moves`, `role_tags`, join tables | SELECT | SELECT | SELECT |
| `teams`, `seasons`, `season_teams`, `draft_pools`, `draft_pool_pokemon`, `matches`, `draft_picks` | SELECT | SELECT | SELECT + write |
| `coaches` | — | SELECT own row | SELECT + write |
| `profiles` | SELECT own | SELECT own | SELECT + write |
| `admin_users`, `api_keys`, `discord_guild_config`, `transaction_audit`, `notion_mappings` | — | — | SELECT + write |

Coach writes go through RPCs (`rpc_submit_draft_pick`, `rpc_free_agency_transaction`), which use `is_coach_of_team()` / `is_admin()` inside the function. Direct INSERT/UPDATE/DELETE on league tables are admin-only via RLS.

### Manual test steps

1. **Create test users** (Supabase Dashboard → Authentication, or CLI):
   - Viewer: e.g. `viewer@test.local` (no coach record, not in `admin_users`).
   - Coach: e.g. `coach@test.local` (create a coach row and team, link coach to this user_id).
   - Admin: e.g. `admin@test.local` (add to `admin_users`).

2. **Viewer** (anon key or authenticated as viewer):
   - SELECT from `teams`, `seasons`, `matches`, `draft_picks`, `pokemon` → should succeed.
   - INSERT/UPDATE/DELETE on `draft_picks`, `teams`, `matches` → should fail (RLS).

3. **Coach** (authenticated as coach):
   - Same reads as viewer → should succeed.
   - Call `rpc_submit_draft_pick` for their team → should succeed (if pool/budget allow).
   - Call `rpc_submit_draft_pick` for another team → should fail (FORBIDDEN).
   - Direct UPDATE on `draft_picks` → should fail (RLS).

4. **Admin** (authenticated as admin):
   - SELECT/INSERT/UPDATE/DELETE on admin tables and league tables → should succeed where policies allow.

5. **Run verification script** (optional):  
   `pnpm exec tsx scripts/verify-rls-policies.ts`  
   This lists tables with RLS enabled and their policies (read-only check).

## Discord OAuth and role sync

### End-to-end OAuth test

1. **Discord Developer Portal**: App has OAuth2 URL set to app’s callback (e.g. `https://<app>/auth/callback`). Redirect URL matches Supabase Auth provider config.
2. **Supabase Dashboard**: Authentication → Providers → Discord enabled, Client ID and Secret set.
3. **Login**: Open `/auth/login`, choose Discord, complete flow. User should land back in app with session.
4. **Profile**: After first login, a row in `profiles` (and optionally `coaches`) should exist; `discord_username` / `discord_id` populated if mapped.

### Role sync test

1. **Discord server**: Ensure bot is in the server and has a role used for “coach” (or “commissioner”). Note role ID.
2. **App config**: Map Discord role ID to app role (e.g. coach) in admin Discord config or `discord_roles` / `role_permissions`.
3. **Sync**: On login, app should sync roles (e.g. set `role` on profile or link to coach). Manual sync: use admin “Sync roles” or `/api/discord/sync-roles` if available.
4. **Verify**: Log in as a Discord user with that role; confirm profile/coach and permissions match (e.g. can use draft/free agency for their team).

### Checklist

- [ ] Discord OAuth login completes and returns to app.
- [ ] Profile created/updated after first login.
- [ ] Role sync runs on login (or manual sync) and matches Discord role.
- [ ] Coach can only perform draft/free agency for their own team (RPC + RLS).
- [ ] Viewer cannot write; admin can manage config and league data.

## References

- RLS policies: `supabase/migrations/20260126020002_phase2_3_create_rls_policies.sql`
- Helpers: `is_coach_of_team`, `is_admin` in `supabase/migrations/20260126013545_phase1_6_create_helper_functions_and_views.sql`
- Discord role sync: `lib/discord-role-sync.ts`, `lib/discord-role-mappings.ts`
