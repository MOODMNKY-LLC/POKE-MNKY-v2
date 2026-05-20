# CURSOR_HANDOFF

Last updated: 2026-05-20 (implementation pass)

Purpose: living handoff doc for the next Cursor implementation pass. Keep this file updated as the plan evolves so the work can be resumed without re-discovering context.

## What I checked

- Repo code and live Supabase state.
- Core app surfaces, Discord integration, admin surfaces, and roadmap docs.
- Build verification: `pnpm build` passed.
- Test verification: `pnpm test:run` was blocked by an unrelated repo config issue in `open-webui/tsconfig.json` referencing missing `./.svelte-kit/tsconfig.json`.

## Product Shape

- The app has three distinct shells:
  - Public site shell for visitors and league-wide browsing.
  - Authenticated dashboard shell for coach/member workflows.
  - Admin shell for backoffice, sync, and operational tooling.
- The separation is directionally good, but there is still a lot of route duplication between the public and dashboard worlds.
- Some of that duplication is intentional because it lets the app present different levels of depth to different users.
- Some of it is not intentional and should be consolidated.

## Executive Read

- The app shell is strong and the visual language is coherent.
- Several core league views are real and data-driven.
- Some operational flows are still mocked, stubbed, or only partially wired.
- Discord integration exists, but the admin/control plane is not yet trustworthy enough to treat as finished.
- The biggest risk is security posture in Supabase, especially disabled RLS and sensitive exposures.

## What Feels Real Today

- Home, standings, teams, and insights are the healthiest surfaces.
- These pages have intentional layout, polish, and actual data flow.
- Key refs:
  - [`app/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/page.tsx)
  - [`app/standings/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/standings/page.tsx)
  - [`app/teams/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/teams/page.tsx)
  - [`app/insights/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/insights/page.tsx)
- Supabase live state shows a real current season:
  - `Season 7`
  - `season_id = AABPBL-Season-7-2027`
  - `is_current = true`
  - 12 teams
  - 1022 draft pool rows
- The data model still looks partially transitional:
  - `teams_with_coach_name = 12`
  - `teams_with_coach_id = 0`
  - `teams_with_team_name = 0`
  - `matches = 0`
  - `draft_sessions = 0`
  - `coach_applications = 0`

## Functional Status Snapshot

- Clearly functional and worth keeping:
  - Homepage, standings, team listing/detail, schedule, playoffs.
  - Dashboard overview, onboarding, league team, weekly matches, free agency, trade block, stats, activity, settings, profile.
  - Admin sync hub, draft sessions, Google Sheets config, Discord management shell, simulation controls.
  - Draft board and public team builder flows, even though they are split across route trees.
- Functional but needs cleanup or consolidation:
  - Duplicate team builder paths.
  - Duplicate draft paths.
  - Public Pokédex / Showdown / videos / calculator support surfaces.
  - Admin tabs and redirect routes.
- Presentational or placeholder-heavy:
  - Public `/matches` and `/matches/submit`.
  - Draft landing ticker in demo mode.
  - Discord bot status.
  - Coach application flow.
  - Some legacy integration panels in draft board management.

## Userflows By Role

### Guest / visitor

- Lands on the homepage and can move through public league browsing.
- Main public surfaces are standings, teams, schedule, playoffs, draft landing, Pokédex, Showdown, videos, and the AI/utility surfaces.
- The public header also exposes docs and test links, which is too much surface area for an unauthenticated visitor unless those pages are meant to be public diagnostics.

### Authenticated member / spectator

- Uses the dashboard shell, but not all coach-only actions are available.
- Can browse teams, draft-related planning surfaces, stats, settings, and general league context.
- The dashboard is useful for personal workflow, but some of the nav labels promise more than the underlying pages deliver.

### Coach

- The real coach workflow is in the dashboard shell.
- Core coach paths:
  - Dashboard overview.
  - Onboarding.
  - League team.
  - Draft planning / board / roster.
  - Weekly matches and battle plans.
  - Free agency.
  - Trade block.
  - Settings and profile.
- This is the strongest part of the app from a product standpoint.

### Commissioner / admin

- The admin shell is the backoffice.
- It covers league operations, sync, users, Discord, Google Sheets, simulation, draft sessions, draft board management, Pokémon catalog, Poképedia, and music.
- This is a large surface area, but not all of it is equally real.

## Userflows

### Auth and entry

- Login is Discord-first with a legacy email fallback.
- Key ref: [`app/auth/login/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/auth/login/page.tsx)
- The intent is clear, but the auth/onboarding story still feels split between current and legacy behavior.

### Coach onboarding

- Coach application exists, but it is still described and implemented like a stub rather than a polished intake pipeline.
- Key refs:
  - [`app/apply/coach/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/apply/coach/page.tsx)
  - [`app/apply/coach/apply-coach-form.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/apply/coach/apply-coach-form.tsx)

### Draft flow

- Draft landing page is visually convincing, but it is partly demo-driven.
- Key refs:
  - [`app/draft/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/draft/page.tsx)
  - [`components/draft/live-draft-ticker.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/components/draft/live-draft-ticker.tsx)
- Draft board exists and has real logic, but it is constrained by active session/current-season data.
- Key ref: [`app/draft/board/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/draft/board/page.tsx)

### Match reporting

- This is the most obvious gap in the main user journey.
- The matches list is mocked.
- Match submission is mocked and uses a fake success alert.
- Key refs:
  - [`app/matches/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/matches/page.tsx)
  - [`app/matches/submit/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/matches/submit/page.tsx)
- This means the full “record match -> persist -> update standings -> notify Discord” loop is not yet truly end-to-end.

### Weekly match planning

- The dashboard weekly-match flow is the real coach workflow, not the public matches page.
- It supports opponent context, roster context, and a saved battle plan that autosaves to the backend.
- Key refs:
  - [`app/dashboard/weekly-matches/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/dashboard/weekly-matches/page.tsx)
  - [`components/dashboard/weekly-matches/battle-plan-editor.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/components/dashboard/weekly-matches/battle-plan-editor.tsx)
- The public `/matches` route should be treated as a weak sibling until it either becomes real or is demoted.

### Insights / recap

- Weekly insights are one of the better product moments.
- They fetch live stats and recap content instead of using a fake shell.
- Key ref: [`app/insights/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/insights/page.tsx)

## Discord Integration

- There is real integration work here, not just placeholders.
- Signature-verified Discord interactions route exists.
  - [`app/api/discord/interactions/route.ts`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/api/discord/interactions/route.ts)
- Role sync route exists and is admin-gated.
  - [`app/api/discord/sync-roles/route.ts`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/api/discord/sync-roles/route.ts)
- The bot status endpoint is only a placeholder right now.
  - [`app/api/discord/bot-status/route.ts`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/api/discord/bot-status/route.ts)
- The Discord roles admin UI has a major gap: adding a mapping only updates local React state and does not persist the mapping yet.
  - [`components/admin/discord/discord-roles-tab.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/components/admin/discord/discord-roles-tab.tsx)
- Net: Discord is partially operational, but the admin UX currently overstates how finished it is.

## Route Relevance And Redundancy

### Core routes that matter

- Public browsing: `/`, `/standings`, `/teams`, `/schedule`, `/playoffs`.
- Coach workspace: `/dashboard`, `/dashboard/onboarding`, `/dashboard/league-team`, `/dashboard/draft`, `/dashboard/draft/board`, `/dashboard/draft/roster`, `/dashboard/weekly-matches`, `/dashboard/free-agency`, `/dashboard/trade-block`, `/dashboard/settings`, `/dashboard/profile`.
- Admin operations: `/admin`, `/admin/league`, `/admin/sync`, `/admin/discord`, `/admin/google-sheets`, `/admin/draft/sessions`, `/admin/draft-board-management`, `/admin/users`.

### Adjacent but still relevant

- `/draft` and `/draft/board` are useful public-facing draft surfaces.
- `/pokedex`, `/showdown`, `/videos`, `/calc`, and `/mvp` are competitive support tools, but they are not the core league flow.
- They should stay only if they serve the league directly. Right now some of them feel like feature orbit rather than a tight product spine.

### Development and test surfaces

- `/docs/api`, `/test-mcp`, `/test/mcp-rest-api`, and similar routes are tooling surfaces.
- These should not be treated as user-facing product pages unless we explicitly want public diagnostics.

### Duplicated or overlapping flows

- Team Builder exists in both `/teams/builder` and `/dashboard/teams/builder`.
  - The logic is almost the same.
  - One saves and stays in the public team library flow.
  - The dashboard version saves and routes back to the dashboard team list.
- Draft planning exists in both `/draft/*` and `/dashboard/draft/*`.
  - Public draft pages emphasize the league event and live board.
  - Dashboard draft pages emphasize the coach's private planning workflow.
  - That split can work, but it needs to stay intentional.
- Profile exists in both `/profile` and `/dashboard/profile`.
  - The dashboard version is just a redirect to the profile sheet.
  - That should be treated as one source of truth, not two product pages.
- Match surfaces are split between public `/matches` and dashboard weekly matches.
  - The dashboard version is the real one.
  - The public version is still mocked.
- There are several admin redirect pages that just forward to hash tabs in `/admin/discord`.
  - That is fine for navigation, but it adds to route count without adding new function.

## UI / UX Assessment

- Strong points:
  - Coherent visual system.
  - The league-control-room vibe is consistent.
  - Home, standings, teams, and insights feel intentional.
  - The app is responsive in structure and generally readable.
- Weak points:
  - Mocked screens are easy to spot once you hit them.
  - Some pages imply “live ops” before the back end is actually ready.
  - Draft and admin areas are more aspirational than finished.
  - There is some debug noise and placeholder language that should be stripped out as part of hardening.
  - Several nav links point at routes that do not exist or are not the intended source of truth.
- Practical UX takeaway:
  - The app currently sells the vision well, but the trust signal drops on the operational paths.

## Closed in implementation pass (2026-05-20)

- OAuth callback restored: `app/auth/callback/route.ts`
- `/dashboard/team` links → `/dashboard/league-team`; `YourTeamsSection` `useRouter()` fixed
- Match reporting E2E: `lib/match-result-complete.ts`, `POST /api/matches/submit`, wired `/matches` + dashboard submit/history
- Discord role mappings: `discord_role_mappings` migration + `GET/POST/DELETE /api/admin/discord/role-mappings`
- Bot status: real Discord API health in `app/api/discord/bot-status`
- Draft landing ticker: live data via `seasonId` (no `demoMode`)
- Security audit doc: [docs/SUPABASE-SECURITY-AUDIT-2026.md](docs/SUPABASE-SECURITY-AUDIT-2026.md) (read-only; no RLS rollout)
- README roadmap link → `temp/PROJECT-ROADMAP.md`

## Concrete Gaps Found (remaining)

- `/dashboard/team` was linked from multiple places (fixed → `/dashboard/league-team`).
  - Examples:
    - [`app/calc/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/calc/page.tsx:81)
    - [`app/dashboard/weekly-matches/page.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/app/dashboard/weekly-matches/page.tsx:516)
- `components/dashboard/your-teams-section.tsx` calls `router.refresh()` without defining `router`.
  - That is a runtime bug when the current-team toggle path is used.
  - Reference: [`components/dashboard/your-teams-section.tsx`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/components/dashboard/your-teams-section.tsx:36)
- The public team builder and dashboard team builder are close enough that one should probably become the canonical implementation.
- The public matches page is still a mock even though it looks like a real product surface.
- The Discord bot status view is still a soft placeholder, not a real health check.
- The draft board management page explicitly says Notion and n8n are legacy-only, which is good honesty but also a sign that the operational stack is in transition.
- The public header exposes a lot of sidecar tooling, including docs and test routes, which is probably too much for the main audience.

## Supabase / Security

This is the highest-priority risk area.

- Critical: RLS is disabled on 74 tables.
- Critical: `public.user_management_view` may expose `auth.users` data to anon.
- Warning: many `SECURITY DEFINER` views and functions are callable by authenticated users.
- Warning: `auth_leaked_password_protection` is disabled.
- I did not modify the database; this was read-only assessment.

Suggested next work in Supabase:

- Audit and enable RLS on any table that should not be broadly readable.
- Review `public.user_management_view` and any other auth-adjacent views for accidental leakage.
- Narrow `SECURITY DEFINER` usage to only the functions that absolutely need it.
- Review whether current admin endpoints and RPCs have the right auth gates.

## Roadmap Fit

- Overall: directionally right, but operationally behind.
- Approximate fit:
  - Public shell / brand / IA: 80-90% on target
  - Read-only league views: 70-80% on target
  - Live operational workflows: 40-50% on target
  - Security / production readiness: 20-30% on target
  - Overall: about 60-70% on target
- The biggest mismatch is between the polished UI and the unfinished live workflows.
- The roadmap should be treated as “mostly visible in the UI, not yet fully backed by production-grade flows.”

## What Should Happen Next In Cursor

1. Fix broken nav and runtime bugs first.
   - Remove or correct `/dashboard/team` links.
   - Fix `YourTeamsSection` so the current-team action actually works.
2. Decide the canonical route per feature.
   - Pick one team builder.
   - Pick one profile flow.
   - Decide whether public matches should exist at all, and if so, make them real.
3. Tighten the coach workflow.
   - Make sure the dashboard weekly-matches flow, draft tabs, and free agency are the actual primary paths.
4. Clean up admin trust signals.
   - Replace placeholder bot health with a real check.
   - Persist Discord role mappings.
   - Remove or clearly label legacy-only surfaces.
5. Harden Supabase before expanding functionality.
   - RLS, auth-adjacent views, and SECURITY DEFINER surface area need a real audit.

## Documentation Drift

- README points to a roadmap file that does not exist:
  - [`README.md`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/README.md)
- Current roadmap/status docs that should be kept aligned:
  - [`docs/DEVELOPMENT-ROADMAP-PRIORITIZED.md`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/docs/DEVELOPMENT-ROADMAP-PRIORITIZED.md)
  - [`docs/CURRENT-STATUS-SUMMARY.md`](/home/moodmnky/.openclaw/workspace/POKE-MNKY/docs/CURRENT-STATUS-SUMMARY.md)

## Recommended Next Implementation Targets

1. Make match reporting real end-to-end.
   - Replace mocked match lists and submit flows with live persistence and validation.
   - Connect the submit path to standings updates and Discord notifications.
2. Finish Discord role mapping persistence.
   - Add the missing API/storage layer behind the admin UI.
   - Make the status view reflect real readiness rather than token presence.
3. Harden the draft experience.
   - Remove demo-mode assumptions from the landing page.
   - Make the board and ticker gracefully reflect actual session state.
4. Audit and tighten Supabase security.
   - Prioritize RLS, auth-adjacent views, and admin RPC exposure.
5. Clean up docs so roadmap and current status match reality.
   - Fix stale links.
   - Keep this handoff doc updated as the implementation plan changes.

## Cursor Working Agreement

- Treat this file as the live handoff between discovery and implementation.
- Update it when the plan changes, when a major gap is closed, or when a new blocker is found.
- Keep it factual and implementation-oriented.
- If a choice is still open, record the tradeoff here instead of letting context disappear.
