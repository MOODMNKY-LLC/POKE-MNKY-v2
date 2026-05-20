# Supabase Security Audit (read-only)

**Date:** 2026-05-20  
**Scope:** Development project via Supabase MCP (`get_advisors`, targeted SQL). **No migrations applied** in this pass (per implementation plan).

## Executive summary

The remote database mixes **POKE MNKY league tables** (many with RLS enabled in migrations) with **third-party schemas** (e.g. n8n workflow tables in `public` without RLS). Supabase security advisors report **critical** exposure on `public.user_management_view` (auth.users leakage to `anon`). A full RLS rollout for every table in `public` is deferred; this document is the remediation backlog.

## Critical findings

### 1. `user_management_view` and auth.users exposure

- **Advisor:** `auth_users_exposed` (ERROR)
- **Detail:** View `public.user_management_view` may expose `auth.users` to `anon` / `authenticated` via PostgREST.
- **Remediation:** [Supabase linter 0002](https://supabase.com/docs/guides/database/database-linter?lint=0002_auth_users_exposed)
- **Recommended actions (future wave):**
  - Revoke `GRANT SELECT` to `anon` on the view; restrict to `authenticated` + admin-only policy or security-barrier view.
  - Replace direct `auth.users` joins with a controlled RPC returning non-sensitive columns.
  - Re-run `get_advisors` after change.

### 2. Tables without RLS in `public`

Handoff noted ~74 tables without RLS. MCP `list_tables` / SQL on the linked project shows many **non-app** tables (n8n: `workflow_entity`, `credentials_entity`, etc.) without RLS.

**League-critical tables checked (2026-05-20):** `matches`, `teams`, `profiles`, `discord_webhooks`, `seasons`, `draft_pool`, `coach_applications`, `user_activity_log` — **all report `rls_enabled: true`** on the remote instance queried.

**Risk:** Coach match submit currently uses **service role** in `lib/match-result-complete.ts` because policies may not allow coach `INSERT` on `matches`. Before removing service role, add explicit RLS policies for `submit:results` coaches.

### 3. SECURITY DEFINER functions and views

- Numerous `SECURITY DEFINER` RPCs exist in migrations (draft, sync, admin).
- **Backlog:** Inventory each callable by `authenticated`; ensure `auth.uid()` checks inside function bodies.

### 4. Auth configuration

- Advisor may flag `auth_leaked_password_protection` disabled (see full `get_advisors` security export in Cursor MCP run).
- Enable in Supabase Dashboard → Authentication → Providers when ready for production.

## Phased remediation backlog

| Phase | Focus | Actions |
|-------|--------|---------|
| **P0** | Auth-adjacent views | Fix `user_management_view` grants; verify no `anon` read of emails |
| **P1** | Coach data paths | RLS on `matches` INSERT/UPDATE for coaches on their teams; reduce service-role use in app APIs |
| **P2** | Discord / webhooks | Confirm `discord_webhooks` readable only by admin; webhook URLs not in client bundles |
| **P3** | Non-app tables | Move n8n tables to separate schema or disable PostgREST exposure |
| **P4** | Hardening | Enable leaked-password protection; periodic `get_advisors` in CI |

## Verification commands (dev)

```bash
# Supabase MCP
# get_advisors type=security
# execute_sql: count RLS on league tables (see plan SQL)
```

## Related implementation (this repo wave)

- Match completion uses service role with server-side `assertCanSubmitMatch` — document until P1 RLS policies land.
- New table `discord_role_mappings` migration includes admin/commissioner RLS (local apply: `supabase db push` or MCP `apply_migration` after explicit approval).

## References

- [CURSOR_HANDOFF.md](../CURSOR_HANDOFF.md) — Supabase / Security section
- [create-rls-policies.mdc](../.cursor/rules/create-rls-policies.mdc)
- Migrations: `supabase/migrations/20260112104051_user_management_rbac.sql`, `20260126020002_phase2_3_create_rls_policies.sql`
