# POKE-MNKY v2 Update Brief

## Purpose
This document is a handoff brief for a Cursor agent. The goal is to evolve the current POKE-MNKY Next.js app toward the product direction described in `hand-offs/AAB App page.docx`, while preserving existing league functionality.

The app already has substantial foundation work in place. This update should be treated as a **product and architecture pass**, not a greenfield rebuild.

---

## Executive Summary

Current state:
- The app already supports a strong league core: homepage, dashboard, draft board, standings, teams, matches, free agency, AI assistants, Discord integration, Supabase-backed data, and admin tooling.
- There is an onboarding flow for coaches, draft session plumbing, draft pool tooling, and several admin surfaces.
- Google Sheets sync still exists and is still part of the operational model.

What the handoff doc wants:
- A more league-branded homepage
- A real coach application and approval workflow
- Better admin/mod governance for sessions and league operations
- A coach-specific Draft Room and draft/session experience
- A more explicit draft pool builder and season setup workflow
- Less reliance on Google Sheets as the primary operational surface

This is mostly an evolution of the current system, not a replacement.

### Implemented in app (May 2026 — see docs)

| Handoff theme | Status | Doc |
|---------------|--------|-----|
| Google Sheets → app-owned sync | Data tab teams sync, admin UI | `docs/GOOGLE-SHEETS-SYNC-GUIDE.md` |
| Draft pool builder in app | Generate / Publish, `pokemon_master` backfill | `docs/DRAFT-IN-APP-OPERATIONS.md` |
| Homepage countdown | Banner under nav, admin Countdown tab | `docs/SESSION-CHANGELOG-2026-05-19.md` |
| Coach claim team | Dashboard claim flow | `docs/SESSION-CHANGELOG-2026-05-19.md` |

Full session index: **[docs/SESSION-CHANGELOG-2026-05-19.md](../docs/SESSION-CHANGELOG-2026-05-19.md)**

---

## Product Direction From Handoff

The handoff doc `hand-offs/AAB App page.docx` describes the next major league UX layer:

1. Homepage
   - Full league name front and center, AAB only where space is tight
   - League-specific sections instead of generic platform marketing
   - Top weekly performers + top seasonal performers
   - Badge indicating what the scrolling section shows
   - Move standings, teams, schedule lower on the page
   - Remove generic “Complete Battle League Platform” language
   - Add current teams, standings, top performers, coaches, Pokémon, current week matchups
   - Add large countdown timer for next season/draft session
   - Add coach-specific Draft Room link

2. Coach application / approval flow
   - Apply-to-coach badge/link on homepage
   - Application form with general questions plus team name, age confirmation, 21+ checkbox, liability acknowledgment
   - Admin and Mod review queue
   - Approve, reject, hold, follow-up statuses
   - Review screen should show applicant info, Discord ID, answers, status, admin notes
   - Spectator-only approval can still be allowed even if coach approval is denied
   - Rejection reason dropdown

3. Admin / Mod controls
   - Add teams, add coaches, edit coach profiles, edit teams, edit Pokémon on teams
   - Create, assign, remove where needed
   - Promote coaches who also have mod roles
   - Separate page for mod/admin discussion, reviews, trades, admin-only notes

4. Draft sessions / seasonal drafting
   - Mods can create sessions
   - Admin approval required before sessions go live
   - Admin setup includes coach count, coach pool, drafting order, snake or linear
   - Spectators view only
   - Coaches get Join Draft
   - Admins and Mods can manage sessions live
   - AI fallback drafts missing coaches for first 6 rounds
   - AI should value hazards, removal, cores, not just raw power
   - Coach-only pre-draft Draft Room for rankings/preferences
   - Separate mock draft mode for coaches with configurable parameters

5. Draft pool / Pokédex / season setup
   - Column mapping from existing sheet matters, but the app should own the workflow
   - Draft pool supports multiple source sections merged together
   - Manual point editing after import
   - Banned status set by Mods/Admins during session creation
   - Source-based setup from tiers, generations, VGC, game availability
   - Default copy-forward from last season
   - Draft Pool Builder with source selection, searchable Pokémon list, manual point editor, availability/banned/locked controls, season notes, bulk edit, change history
   - Hidden/locked views for coaches should not bleed into free agency
   - Seasons should preserve pool when unchanged

6. Workflow philosophy
   - Mods help build and prepare
   - Admins keep final authority
   - Final publish always needs Admin approval
   - Goal is to move league setup out of Google Sheets and into the app

---

## Current Codebase Snapshot

### Main stack
- Next.js 16 app router
- Supabase backend
- Discord bot / role sync / slash commands
- AI assistants using MCP tools
- Google Sheets parsers and sync logic still present
- Draft system and free agency logic already exist

### Useful directories
- `app/` routes and pages
- `components/` UI and feature widgets
- `lib/` business logic, integrations, validation
- `supabase/migrations/` schema history and feature tables

---

## What Already Exists

### Homepage and public league pages
- `app/page.tsx` exists and already renders a polished marketing-style homepage
- `components/homepage-live-data.tsx` loads current standings and MVP Pokémon on demand
- Separate league pages exist for standings, schedule, teams, matches, pokedex, MVP, insights, etc.

### Dashboard and coach experience
- `app/dashboard/page.tsx` and nested dashboard routes exist
- `app/dashboard/draft/page.tsx` exists
- `components/dashboard/draft-tabs-section.tsx` shows planning, board, roster tabs
- `app/dashboard/onboarding/page.tsx` and `app/api/coach-onboarding/route.ts` implement a coach onboarding workflow
- `components/dashboard/onboarding-completion-card.tsx` and reset tooling exist

### Admin tooling
- `app/admin/page.tsx` exists and links to many admin tools
- Admin sections already exist for teams, users, Discord, sync, draft board management, Poképedia dashboard, simulation, music, playoffs, stats, trades, etc.
- `components/admin/*` includes draft wizard, season creation, coach assignment, Discord management, sync controls

### Draft system
- `app/draft/page.tsx` and `components/draft/*` provide a live draft board experience
- `app/api/draft/create-session/route.ts`, `app/api/draft/status/route.ts`, `app/api/draft/available/route.ts`, `app/api/draft/pick-by-name/route.ts`, and `app/api/draft/mock/run/route.ts` exist
- `lib/draft-system.ts` includes draft session creation and pick flow
- `lib/draft-pool/*` and `lib/google-sheets-parsers/draft-pool-parser.ts` support draft pool loading/import
- `supabase/migrations/20260112000000_create_draft_pool.sql` and `20260112000001_create_draft_sessions.sql` establish the core tables
- `supabase/migrations/20260106120000_extend_draft_sessions_config.sql` suggests session config is already extensible

### Free agency / trades / league logic
- Free agency modules and validation already exist
- Trade-offer API and approval flow already exist
- Transaction/pending move infrastructure exists
- League compliance and validation helpers already exist

### RBAC and Discord
- `lib/rbac.ts` defines admin / commissioner / coach / spectator roles and permission strings
- Discord role sync and mapping exist
- Several admin and coach flows already depend on these roles

### AI and MCP
- Draft assistant, free agency assistant, battle strategy assistant, and Pokédex assistant already exist
- MCP tools expose draft pool, team budgets, picks, and draft status
- AI draft analysis and assistant routes already exist

### Google Sheets dependency
- `lib/google-sheets.ts`, parsers, and sync routes still exist
- Google Sheets remains an active integration path, not merely historical

---

## Gaps Relative to the Handoff Doc

### 1) Homepage branding and structure
Current homepage is strong but still generic in tone.

Observed state:
- Uses “Average at Best Battle League Platform” and “Complete Battle League Platform” language
- Focuses on system capabilities, not the league as the center of gravity
- Live data exists, but the page does not yet surface the handoff’s new content architecture

Missing or incomplete:
- Full league name front and center
- Hand-off style sections for weekly/seasonal performers
- League-specific current info blocks
- Countdown timer for season/draft
- Coach-specific Draft Room link
- Apply-to-coach CTA

### 2) Coach application and review workflow
Current state is onboarding, not application.

Observed state:
- Coach onboarding tracks steps per user
- Some profile/RBAC syncing exists
- No evidence of a structured application entity, review queue, or moderator/admin decision screen

Missing:
- Application form with age/liability/team name fields
- Persistent application records
- Review status lifecycle: approved, rejected, hold, follow-up
- Admin/mod notes
- Rejection reasons
- Spectator-only approval path
- Admin/mod review UI

### 3) Draft session governance
Current state supports draft sessions, but governance looks incomplete.

Observed state:
- Draft sessions can be created
- Draft status can be read
- Mock draft route exists
- Draft board UI can render live state

Missing:
- Mod-created but admin-approved live session pipeline
- Explicit session roles, especially spectator-only vs join-draft
- Session approval state before go-live
- Admin control for live session configuration
- Live management workflow matching the handoff

### 4) Draft room and pre-draft planning
Current state has draft planning tabs and AI helpers.

Missing or unclear:
- A coach-only Draft Room with private planning data and values
- Explicit “to be drafted” lists or coach preferences storage
- Mock draft mode exposed as a dedicated coach tool with customizable session params
- A clear separation between coach planning and public/session mechanics

### 5) Draft pool builder
Current state has draft pool import/sync and some admin tooling.

Missing or unclear:
- A proper Draft Pool Builder UI with source merging and bulk edit
- Manual point editor workflow as a first-class admin experience
- Locked/banned/hidden state UX
- Season copy-forward as a deliberate workflow
- Change history / audit trail for pool edits
- Admin final publish gate

### 6) Google Sheets de-emphasis
Current state still relies on Sheets as an integration source and operational fallback.

Missing:
- App-owned season setup path
- Reduced dependency on Sheets as the primary editing surface
- Clear migration path from sheet-driven ops to app-driven ops

---

## Important Existing Files to Inspect Before Editing

### App / homepage
- `app/page.tsx`
- `components/homepage-live-data.tsx`
- `app/api/homepage/live-data/route.ts` if present

### Dashboard / coach experience
- `app/dashboard/page.tsx`
- `app/dashboard/draft/page.tsx`
- `app/dashboard/onboarding/page.tsx`
- `components/dashboard/draft-tabs-section.tsx`
- `components/dashboard/draft-planning-section.tsx`
- `components/dashboard/draft-board-section.tsx`
- `components/dashboard/onboarding-completion-card.tsx`
- `app/api/coach-onboarding/route.ts`
- `app/api/coach-onboarding/notion/route.ts`
- `app/api/coach-onboarding/reset/route.ts`

### Admin surfaces
- `app/admin/page.tsx`
- `app/admin/teams/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/draft-board-management/page.tsx`
- `app/admin/draft-pool-rules/page.tsx`
- `components/admin/create-draft-wizard.tsx`
- `components/admin/create-season-dialog.tsx`
- `components/admin/coach-assignment-section.tsx`
- `components/admin/discord-management-section.tsx`

### Draft system
- `app/draft/page.tsx`
- `app/api/draft/create-session/route.ts`
- `app/api/draft/status/route.ts`
- `app/api/draft/available/route.ts`
- `app/api/draft/mock/run/route.ts`
- `app/api/draft/pick-by-name/route.ts`
- `components/draft/*`
- `lib/draft-system.ts`
- `lib/draft-pool/*`

### RBAC and schema
- `lib/rbac.ts`
- `supabase/migrations/20260125000003_comprehensive_rbac_fix.sql`
- `supabase/migrations/20260301140000_coach_onboarding.sql`
- `supabase/migrations/20260112000000_create_draft_pool.sql`
- `supabase/migrations/20260112000001_create_draft_sessions.sql`
- `supabase/migrations/20260112000002_update_draft_pool_point_range.sql`
- `supabase/migrations/20260106000000_extend_draft_sessions_config.sql`

### Sheets + draft pool import
- `lib/google-sheets-parsers/draft-pool-parser.ts`
- `lib/draft-pool/import-service.ts`
- `lib/draft-pool/sync-service.ts`
- `lib/draft-pool/admin-utils.ts`
- `lib/google-sheets-sync.ts`

---

## Suggested Implementation Order

### Phase 1, highest leverage
1. Rewrite homepage IA and copy to match league-first direction
2. Add apply-to-coach CTA and foundation UI
3. Add a dedicated admin/mod review queue for applications

### Phase 2
4. Create a draft session approval workflow
5. Make the Draft Room coach-specific and private
6. Introduce better session role handling

### Phase 3
7. Build a real Draft Pool Builder UI
8. Add change history and season copy-forward
9. Tighten hidden/locked/banned semantics

### Phase 4
10. Reduce Google Sheets dependence by making app workflows primary
11. Keep Sheets sync as import/export support, not the main ops surface

---

## Implementation Notes and Constraints

- Preserve existing behavior unless explicitly replacing it.
- Do not break current coach onboarding, draft board, or free agency flows while introducing new ones.
- Favor additive migrations and additive routes/components.
- Keep RBAC consistent with the current role hierarchy: admin > commissioner > coach > spectator.
- If new statuses or workflows are introduced, make them explicit in both database and UI.
- If a feature has to be partially supported first, ship the skeleton with correct data shapes and route boundaries.
- Avoid hard-coding everything into page components. Put shared logic into `lib/` and reusable UI into `components/`.
- Maintain the current league's production-ish reality: this is not a clean rewrite, it is a controlled evolution.

---

## Proposed Data / Domain Additions

Likely missing domain objects to create or confirm:
- coach applications
- application review notes
- draft session approval state
- session roles / participant roles
- coach draft-room preferences / shortlist
- draft pool edit history / audit trail
- season pool snapshot / copy-forward metadata
- moderation notes / review board records

These may require migrations, APIs, and admin UI.

---

## Expected Cursor Agent Outcome

The Cursor agent should:
1. Inspect the referenced files above
2. Confirm what tables/routes/components already exist
3. Identify schema gaps before coding UI
4. Implement the first slice of the new league-first experience
5. Keep the system stable and incremental

The initial deliverable should likely be one of:
- homepage overhaul
- coach application MVP
- admin review queue MVP
- draft session approval skeleton

---

## Final Note

This codebase is already a working league platform with serious infrastructure. The handoff doc is not asking for a toy feature. It is asking for a broader operational layer that makes the app the primary home for league setup, approval, and season administration.

Treat this as a real product system, not a demo.
