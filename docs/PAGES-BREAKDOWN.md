# Comprehensive Breakdown of POKE MNKY Pages

This document provides a thorough, evidence-based breakdown of all pages built in the application, organized by area. It traces how each page fits into the overall architecture (Next.js App Router, Supabase, RBAC) and how they support the league operations engine described in [CHATGPT-V3-UPDATE.md](../CHATGPT-V3-UPDATE.md) and the migrations recently aligned via `supabase db push`.

---

## 1. Application shell and navigation

The app uses a single root layout ([app/layout.tsx](../app/layout.tsx)) that provides theme (Fredoka, Permanent Marker, Geist Mono), ThemeProvider, ServiceWorkerRegistration, PWAInstallPrompt, ConditionalHeader, AssistantWrapper (unified AI popup), MobileMusicPlayer, Toaster, and Analytics. The ConditionalHeader hides the main site header on `/dashboard` so the dashboard uses its own sidebar. The AssistantWrapper makes the POKE MNKY AI assistant available app-wide with context-aware agent selection. Dashboard routes are wrapped by [app/dashboard/layout.tsx](../app/dashboard/layout.tsx), which provides SidebarProvider, AppSidebar, SidebarInset, DashboardDock, and TeraAssignmentModal. Navigation is defined in [components/app-sidebar.tsx](../components/app-sidebar.tsx): items are role-aware (e.g. "My League Team", "Free Agency", "Trade Block" only for coaches with `team_id`); all dashboard pages share the same sidebar and dock.

---

## 2. Public and unauthenticated pages

**Home ([app/page.tsx](../app/page.tsx))**  
Static hero with "Average at Best Battle League Platform", FeatureCard grid, PokemonShowcase, and HomepageLiveData (client) for on-demand live data. Primary CTAs: "Build Your Team" (→ `/teams/builder`) and "Explore Pokédex" (→ `/pokedex`). Badges for Supabase, Discord, AI. No auth required.

**Standings ([app/standings/page.tsx](../app/standings/page.tsx))**  
Server component. Fetches all teams from Supabase, groups by conference (Lance/Leon) and division (Kanto, Johto, Hoenn, Sinnoh). Renders TeamTable with rank, team name (link to `/teams/[id]`), coach, W/L/Diff/SoS. Public read; no auth.

**Teams list and team detail ([app/teams/page.tsx](../app/teams/page.tsx), [app/teams/[id]/page.tsx](../app/teams/[id]/page.tsx))**  
Teams index and per-team public profile. Team detail uses dynamic `[id]` to show a single team's info and link into deeper flows. Data from `teams` (and related) in Supabase.

**Team Builder (public) ([app/teams/builder/page.tsx](../app/teams/builder/page.tsx))**  
Public-facing team builder entry; may duplicate or link to dashboard builder. Used from homepage CTA.

**Profile (public) ([app/profile/page.tsx](../app/profile/page.tsx))**  
Public profile view; likely minimal or redirect when unauthenticated.

**Pokedex ([app/pokedex/page.tsx](../app/pokedex/page.tsx))**  
Client page. Loads Pokémon via getAllPokemonFromCache / searchPokemon (pokemon-utils), PokemonClient (pokenode-ts), and pokemon-details (species, evolution, flavor text, moves). Renders search, sort (id/name/generation), list, and detail panel with stats, evolution, moves. Includes PokedexChat (AI) for grounded Pokémon Q&A. No auth required.

**Showdown hub ([app/showdown/page.tsx](../app/showdown/page.tsx))**  
Client wrapper for ShowdownLanding. Entry point for battle/simulator features: team validator, team library, replay library, match lobby, replay detail. Data and links flow to `/showdown/team-validator`, `/showdown/team-library`, `/showdown/replay-library`, `/showdown/match-lobby`, `/showdown/replay/[id]`.

**Other public routes**  
Schedule ([app/schedule/page.tsx](../app/schedule/page.tsx)), Playoffs ([app/playoffs/page.tsx](../app/playoffs/page.tsx)), Matches list and submit ([app/matches/page.tsx](../app/matches/page.tsx), [app/matches/submit/page.tsx](../app/matches/submit/page.tsx)), Insights ([app/insights/page.tsx](../app/insights/page.tsx)), MVP ([app/mvp/page.tsx](../app/mvp/page.tsx)), Calc ([app/calc/page.tsx](../app/calc/page.tsx)), Videos ([app/videos/page.tsx](../app/videos/page.tsx)), Docs API ([app/docs/api/page.tsx](../app/docs/api/page.tsx)), Offline ([app/offline/page.tsx](../app/offline/page.tsx)). Each serves a specific feature (schedule view, playoff bracket, match submission, analytics, damage calc, PWA offline). OAuth consent at [app/oauth/consent/page.tsx](../app/oauth/consent/page.tsx). Test/MCP pages ([app/test/mcp-rest-api/page.tsx](../app/test/mcp-rest-api/page.tsx), [app/test-mcp/page.tsx](../app/test-mcp/page.tsx), [app/test-mcp-rest/page.tsx](../app/test-mcp-rest/page.tsx)) exist for tooling and can be excluded from user-facing docs.

---

## 3. Authentication

**Login ([app/auth/login/page.tsx](../app/auth/login/page.tsx))**  
Client page. Discord OAuth (redirect to `/auth/callback`) and email/password via Supabase. Handles `?error` and `?message` from callback. On success redirects to `/dashboard`. Uses PokemonSprite and league-themed layout.

---

## 4. Dashboard (authenticated)

All dashboard pages require auth (redirect to `/auth/login` if missing). Profile is loaded via getCurrentUserProfile (RBAC); coach-only pages also require `profile.role === "coach"` and `profile.team_id`.

**Dashboard root ([app/dashboard/page.tsx](../app/dashboard/page.tsx))**  
Server component. Loads current season (`seasons` where `is_current`), and for coaches: team (wins, losses, differential, division, conference, avatar, logo, coach_name), draft_budgets (total/spent/remaining), roster count from draft_picks, and next match (match_id, week, opponent, status). Renders overview cards, CoachCard (configurable), and role-specific content. Breadcrumbs and SidebarTrigger in header.

**My Stats ([app/dashboard/stats/page.tsx](../app/dashboard/stats/page.tsx))**  
Coach/team stats and performance metrics; data from teams, matches, draft_picks, and related tables.

**Activity ([app/dashboard/activity/page.tsx](../app/dashboard/activity/page.tsx))**  
Activity feed or audit trail for the user or team; likely uses activity/log tables and RLS.

**Teams (dashboard) ([app/dashboard/teams/page.tsx](../app/dashboard/teams/page.tsx))**  
"My Teams" list: general/showdown teams (not necessarily league-bound). Sub-routes: Library ([app/dashboard/teams/library/page.tsx](../app/dashboard/teams/library/page.tsx)), Create ([app/dashboard/teams/create/page.tsx](../app/dashboard/teams/create/page.tsx)), Builder ([app/dashboard/teams/builder/page.tsx](../app/dashboard/teams/builder/page.tsx)). Supports building and managing sets for Showdown or personal use.

**My League Team ([app/dashboard/league-team/page.tsx](../app/dashboard/league-team/page.tsx))**  
Coach-only. Fetches team (id, name, W/L, differential, division, conference, avatars, coach_name), current season, and roster count (draft_picks, active). Entry point for roster, free agency, trade block, and team stats. Directly supports the league-engine concept of "one official team per coach per season."

**Roster ([app/dashboard/league-team/roster/page.tsx](../app/dashboard/league-team/roster/page.tsx))**  
League roster view for the coach's team; tied to draft_picks and, with new migrations, to team_roster_versions for week-aware snapshots.

**Free Agency ([app/dashboard/free-agency/page.tsx](../app/dashboard/free-agency/page.tsx))**  
Client page. Loads profile (with team), current season, and for coaches: team status via `/api/free-agency/team-status`, and available Pokémon (from draft pool minus rostered). Renders TransactionForm (drop/add), AvailablePokemonBrowser, TransactionHistory, and FreeAgencyChat (AI). Implements the CHATGPT-V3-UPDATE free-agency pool: undrafted or dropped Pokémon, with moves scheduled for midnight Monday execution and reflected in future week snapshots.

**Trade Block ([app/dashboard/trade-block/page.tsx](../app/dashboard/trade-block/page.tsx))**  
Client page. Loads profile (team_id, team_name) and season. Renders TradeBlockSection (manage own block) and LeagueTradeBlockList (league-wide view). Supports the trade-block feature: coaches mark Pokémon available, others see the list and can initiate trade offers (handled by league_trade_offers and notifications). New tables: trade_block_entries, league_trade_offers.

**Team Stats ([app/dashboard/league-team/stats/page.tsx](../app/dashboard/league-team/stats/page.tsx))**  
League-team-level stats (performance, differential, etc.) for the coach's team.

**Draft Planning ([app/dashboard/draft/page.tsx](../app/dashboard/draft/page.tsx))**  
Draft preparation and strategy; may show draft order, budget, and links to board/roster.

**Draft Board ([app/draft/board/page.tsx](../app/draft/board/page.tsx) and [app/dashboard/draft/board/page.tsx](../app/dashboard/draft/board/page.tsx))**  
Server component (draft/board). Uses DraftSystem and service Supabase. Loads current season only, active draft session (optional), current user's team and budget (draft_budgets), available Pokémon (getAvailablePokemon), and drafted names. Renders DraftBoardPageClient. Draft board shows pool, point costs, and drafted state; aligned with draft_pool (status, season_id) and draft_budgets.

**My Roster (draft) ([app/dashboard/draft/roster/page.tsx](../app/dashboard/draft/roster/page.tsx))**  
Post-draft roster view for the coach; ties to draft_picks and roster versioning.

**Weekly Matches ([app/dashboard/weekly-matches/page.tsx](../app/dashboard/weekly-matches/page.tsx))**  
Server component. Parses `week` from searchParams (1–8). Fetches coach's matches for the season, opponent and match details per week. Renders WeekSelector, match cards, and WeeklyBattlePlanEditor. Supports weekly prep integrity: current week is fixed; future weeks can reflect pending transactions after migrations.

**Submit Result ([app/dashboard/weekly-matches/submit/page.tsx](../app/dashboard/weekly-matches/submit/page.tsx))**  
Match result submission flow; likely writes to matches and triggers notifications/Discord.

**Match History ([app/dashboard/weekly-matches/history/page.tsx](../app/dashboard/weekly-matches/history/page.tsx))**  
Historical list of the user's or team's matches.

**Profile (dashboard) ([app/dashboard/profile/page.tsx](../app/dashboard/profile/page.tsx))**  
Authenticated profile and possibly coach card configuration (ConfigurableCoachCard).

**Settings ([app/dashboard/settings/page.tsx](../app/dashboard/settings/page.tsx))**  
Account, notifications, preferences; may link to #notifications and #preferences.

**Damage Calculator ([app/calc/page.tsx](../app/calc/page.tsx))**  
Linked from sidebar (Sparkles). Damage calculation tool; may be used during draft or matchup prep.

---

## 5. Admin

Admin routes are client-side and guard by checking auth; they redirect to login if unauthenticated. They expose platform and league management.

**Admin root ([app/admin/page.tsx](../app/admin/page.tsx))**  
Client. Fetches user and counts (teams, matches, pokemon). Renders SupabaseManager, ShowdownPokedexSync, PokemonSyncControl, and collapsible sections. Uses PokeMnkyPremium avatar. No server-side admin RBAC in the page itself; relies on RLS and optional role checks elsewhere.

**Admin sub-pages** (all under [app/admin/](../app/admin/)): League ([app/admin/league/page.tsx](../app/admin/league/page.tsx)), Teams ([app/admin/teams/page.tsx](../app/admin/teams/page.tsx)), Users ([app/admin/users/page.tsx](../app/admin/users/page.tsx)), Matches ([app/admin/matches/page.tsx](../app/admin/matches/page.tsx)), Playoffs ([app/admin/playoffs/page.tsx](../app/admin/playoffs/page.tsx)), Draft sessions ([app/admin/draft/sessions/page.tsx](../app/admin/draft/sessions/page.tsx)), Draft Board Management ([app/admin/draft-board-management/page.tsx](../app/admin/draft-board-management/page.tsx)), Pokemon ([app/admin/pokemon/page.tsx](../app/admin/pokemon/page.tsx)), Pokepedia Dashboard ([app/admin/pokepedia-dashboard/page.tsx](../app/admin/pokepedia-dashboard/page.tsx)), Google Sheets ([app/admin/google-sheets/page.tsx](../app/admin/google-sheets/page.tsx)), Sync Logs ([app/admin/sync-logs/page.tsx](../app/admin/sync-logs/page.tsx)), Stats ([app/admin/stats/page.tsx](../app/admin/stats/page.tsx)), Music ([app/admin/music/page.tsx](../app/admin/music/page.tsx)), Discord hub ([app/admin/discord/page.tsx](../app/admin/discord/page.tsx)) with Bot, Config, Webhooks, Roles ([app/admin/discord/bot/page.tsx](../app/admin/discord/bot/page.tsx), [app/admin/discord/config/page.tsx](../app/admin/discord/config/page.tsx), [app/admin/discord/webhooks/page.tsx](../app/admin/discord/webhooks/page.tsx), [app/admin/discord/roles/page.tsx](../app/admin/discord/roles/page.tsx)). These cover league config, canonical league config, teams, users, matches, playoffs, draft sessions, draft pool/sheets, Pokémon and Showdown sync, Notion/Google Sheets, sync_log, analytics, music (tracks/playlists), and Discord bot/webhook/role management. The newly aligned migrations (pending_transactions, team_roster_versions, trade_block_entries, league_trade_offers, tera fields, season_rules, etc.) support commissioner workflows that can be surfaced here (e.g. approve trades, view pending transactions, roster versions).

---

## 6. Data and feature alignment with league engine

**Database usage**  
Pages read/write Supabase tables: teams, seasons, draft_pool, draft_budgets, draft_picks, matches, profiles, and (after the recent push) pending_transactions, team_roster_versions, trade_block_entries, league_trade_offers, plus tera and season rules. RLS and getCurrentUserProfile enforce role (admin, commissioner, coach, spectator) and team_id. Draft and free-agency logic use current season only (`is_current`).

**Midnight Monday execution**  
Free agency and trades are not applied immediately; they create rows in pending_transactions with execute_at (e.g. next Monday 12:00 AM EST). A backend job (or Edge Function) should execute these and update team_roster_versions and draft_pool availability. The Free Agency and Trade Block UIs are the coach-facing surface for creating and viewing these intents.

**Weekly roster snapshots**  
team_roster_versions (and any seed/versioning functions from migrations) support "current week locked, next week updated." Dashboard Weekly Matches and Roster pages can be wired to show roster state per week from team_roster_versions rather than live draft_picks/team_roster to preserve prep integrity.

**Trade flow**  
Trade Block page lists entries (trade_block_entries). Offers (league_trade_offers) with status (pending, rejected, accepted_pending_commissioner, approved, denied) and notifications are the next step; UI for "Trade" button and offer modal (up to 3 mons, point and Tera Captain highlighting) can live on the same or a dedicated offer page, with admin/commissioner approval surfacing in Admin.

---

## 7. Summary

The app has 69 page routes. Public pages (home, standings, teams, pokedex, showdown, schedule, playoffs, matches, insights, calc, videos, docs, offline) provide discovery and tools without auth. Auth is centralized at `/auth/login` (Discord + email). Dashboard pages (overview, stats, activity, teams, league team, roster, free agency, trade block, draft planning/board/roster, weekly matches submit/history, profile, settings) are the main coach experience and are aligned with the league engine: draft pool and budgets, free agency pool and pending transactions, trade block and offers, and (with new migrations) roster versioning and midnight execution. Admin pages cover league, teams, users, matches, playoffs, draft, sync, Discord, and music; they are the natural place to add commissioner approval and transaction monitoring. Together, these pages implement the structure described in CHATGPT-V3-UPDATE and supported by the schema now aligned via `supabase db push`.
