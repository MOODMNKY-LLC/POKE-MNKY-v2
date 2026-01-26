# Average at Best Buildout Plan - Status Report
**Date**: 2026-01-26  
**Status**: Phases 1-4 Complete, Phases 5-8 In Progress/Not Started

---

## Executive Summary

**Completed Phases**: 1, 2, 3, 3.2, 4 (Database Schema, RPC Functions, Notion Setup, Notion Sync)  
**In Progress**: Phase 5 (API Endpoints - Partial)  
**Not Started**: Phase 6 (Discord Bot Commands), Phase 7 (Testing), Phase 8 (Documentation & Deployment)

---

## ✅ Phase 1: Database Schema Foundation - COMPLETE

### Status: ✅ All Migrations Created & Validated

**1.1 Pokémon Schema Expansion** ✅
- File: `supabase/migrations/20260126013540_phase1_1_expand_pokemon_schema.sql`
- All type-effectiveness multipliers, speed benchmarks, abilities, external naming fields added
- Indexes created on `slug`, `dex_number`, `draft_points`, `type1`, `type2`

**1.2 Role Tags & Moves System** ✅
- File: `supabase/migrations/20260126013541_phase1_2_create_role_tags_and_moves.sql`
- `role_tags`, `moves`, `pokemon_role_tags`, `role_tag_moves`, `pokemon_moves_utility` tables created
- Enums and constraints in place

**1.3 Draft System Enhancement** ✅
- File: `supabase/migrations/20260126013542_phase1_3_enhance_draft_system.sql`
- `draft_picks` enhanced with `points_snapshot`, `acquisition`, `status`, `draft_round`, `pick_number`
- `draft_pools` and `draft_pool_pokemon` tables created

**1.4 Coach & Team Enhancements** ✅
- File: `supabase/migrations/20260126013543_phase1_4_enhance_coaches_and_teams.sql`
- `discord_user_id` added to coaches, `franchise_key` added to teams
- `admin_users` table created

**1.5 Season & Audit Enhancements** ✅
- File: `supabase/migrations/20260126013544_phase1_5_add_season_audit_and_sync_tables.sql`
- `draft_open_at`, `draft_close_at` added to seasons
- `transaction_audit`, `notion_mappings`, `api_keys`, `discord_guild_config` tables created

**1.6 Helper Functions & Views** ✅
- File: `supabase/migrations/20260126013545_phase1_6_create_helper_functions_and_views.sql`
- `is_coach_of_team()`, `is_admin()`, `sha256_hex()`, `is_valid_api_key()` functions created
- `v_team_rosters` and `v_team_budget` views created

**Report**: `docs/PHASE1-IMPLEMENTATION-REPORT.md`

---

## ✅ Phase 2: RPC Functions & Security - COMPLETE

### Status: ✅ All Migrations Created & Validated

**2.1 Coach Self-Service RPCs** ✅
- File: `supabase/migrations/20260126020000_phase2_1_create_coach_self_service_rpcs.sql`
- `rpc_submit_draft_pick()` function with comprehensive validation
- `rpc_free_agency_transaction()` function with atomic drop+add

**2.2 Bot-Only RPCs** ✅
- File: `supabase/migrations/20260126020001_phase2_2_create_bot_rpcs.sql`
- `rpc_discord_submit_draft_pick()` function with bot key validation and audit logging

**2.3 RLS Policies** ✅
- File: `supabase/migrations/20260126020002_phase2_3_create_rls_policies.sql`
- Comprehensive RLS policies for all tables
- Public read for reference data, authenticated read for league data
- Coach-scoped policies, admin-only write policies

**Report**: `docs/PHASE2-IMPLEMENTATION-REPORT.md`

---

## ✅ Phase 3: Notion Database Setup - COMPLETE

### Status: ✅ All 9 Databases Created with Relations

**3.1 Notion Database Creation** ✅
- Moves Database (`fbfc9ef5-0114-4938-bd22-5ffe3328e9db`)
- Role Tags Database (`a4d3b4c2-e885-4a35-b83c-49882726c03d`)
- Pokemon Catalog Database (`6ecead11-a275-45e9-b2ed-10aa4ac76b5a`)
- Coaches Database
- Teams Database
- Seasons Database
- Draft Pools Database
- Draft Picks Database
- Matches Database

All databases have complete schemas, relations configured, and rollups/formulas set up.

**Report**: `docs/PHASE3-IMPLEMENTATION-REPORT.md`

**3.2 Notion Data Population Strategy** ✅
- File: `scripts/populate-notion-databases.ts`
- Complete import script using Notion API (`lib/notion/client.ts`)
- Supports batch creation, relation linking, `notion_mappings` updates
- Dry-run and scope-based import support

**Report**: `docs/PHASE3.2-AND-PHASE4-IMPLEMENTATION-REPORT.md`

---

## ✅ Phase 4: Notion Sync System - COMPLETE

### Status: ✅ All Endpoints & Worker Implemented

**4.1 Notion Sync API Endpoints** ✅
- `POST /api/sync/notion/pull` - Full sync endpoint
- `POST /api/sync/notion/pull/incremental` - Incremental sync endpoint
- `GET /api/sync/notion/status` - Job status monitoring
- All endpoints use `NOTION_SYNC_SECRET` authentication

**4.2 Notion Sync Worker Implementation** ✅
- File: `lib/sync/notion-sync-worker.ts`
- Complete sync worker using Notion API client
- Implements deterministic sync algorithm (Moves → Role Tags → Pokemon → Join Tables)
- Supports incremental sync with `last_edited_time` filtering
- Updates `notion_mappings` table for entity resolution

**4.3 Sync Job Management** ✅
- Uses existing `sync_jobs` table
- Job status tracking and error logging implemented

**Report**: `docs/PHASE3.2-AND-PHASE4-IMPLEMENTATION-REPORT.md`

**Missing (Optional)**:
- ⬜ `POST /api/sync/notion/push` - Push Supabase changes to Notion (optional)
- ⬜ `POST /api/webhooks/notion` - Notion webhook receiver (optional)

---

## 🟡 Phase 5: API Endpoint Implementation - PARTIAL

### Status: 🟡 Some Endpoints Exist, Need Enhancement

**5.1 Pokémon Search Endpoint Enhancement** 🟡
- **Current**: `app/api/pokemon/[name]/route.ts` exists but only handles single Pokemon lookup
- **Missing**:
  - ⬜ `GET /api/pokemon` endpoint with query parameters (`points_lte`, `points_gte`, `type1`, `type2`, `role`, `eligible`, `limit`)
  - ⬜ Role filtering (join with `pokemon_role_tags`)
  - ⬜ Defensive profile (weaknesses, resists, immunities) in response
  - ⬜ Roles array in response

**5.2 Team Roster Endpoint** ❌
- **Missing**: `GET /api/teams/{teamId}/roster` endpoint
- **Required**: Use `v_team_rosters` and `v_team_budget` views
- **File**: `app/api/teams/[teamId]/roster/route.ts` - **DOES NOT EXIST**

**5.3 Draft Pick Endpoint Enhancement** 🟡
- **Current**: `app/api/draft/pick/route.ts` exists but uses `DraftSystem` class
- **Missing**:
  - ⬜ Integration with `rpc_submit_draft_pick` RPC function
  - ⬜ Zod validation schema (`lib/validation/draft.ts`)
  - ⬜ RPC error mapper (`lib/supabase/rpc-error-map.ts`)
  - ⬜ Return updated budget information

**5.4 Free Agency Transaction Endpoint Enhancement** 🟡
- **Current**: `app/api/free-agency/submit/route.ts` exists but uses `FreeAgencySystem` class
- **Missing**:
  - ⬜ Integration with `rpc_free_agency_transaction` RPC function
  - ⬜ Zod validation schema
  - ⬜ RPC error mapper
  - ⬜ Return updated budget information

**5.5 Discord Bot Endpoints** ❌
- **Missing Endpoints**:
  - ⬜ `POST /api/discord/draft/pick` - Bot key auth, call `rpc_discord_submit_draft_pick`
  - ⬜ `GET /api/discord/draft/status` - Season status with draft window, coach linkage, team budget/slots
  - ⬜ `GET /api/discord/pokemon/search` - Pool-aware search, exclude owned, fast autocomplete
  - ⬜ `GET /api/discord/guild/config` - Get guild default season
  - ⬜ `POST /api/discord/guild/config` - Set guild default season, admin role validation
  - ⬜ `GET /api/discord/coach/whoami` - Coach profile lookup, team listing, season team resolution
  - ⬜ `POST /api/discord/notify/coverage` - Roster coverage analysis, Discord message posting

**Existing Discord Endpoints** (Not part of Phase 5.5):
- ✅ `/api/discord/bot` - Bot status
- ✅ `/api/discord/config` - Bot configuration
- ✅ `/api/discord/team` - Team lookup
- ✅ `/api/discord/roles` - Role management
- ✅ `/api/discord/link-account` - Account linking

---

## ❌ Phase 6: Discord Bot Commands - NOT STARTED

### Status: ❌ Most Commands Missing

**6.1 Enhanced `/pick` Command** ❌
- **Missing**: Command handler with autocomplete, guild default season support
- **File**: `lib/discord-commands/pick.ts` - **DOES NOT EXIST**
- **Required**:
  - ⬜ Make `season_id` optional (resolve from guild default)
  - ⬜ Pokémon autocomplete option
  - ⬜ Call `/api/discord/pokemon/search` for autocomplete
  - ⬜ Call `/api/discord/draft/pick` for submission
  - ⬜ Format response with budget/slots

**6.2 `/search` Command** ❌
- **Missing**: Command handler for Pokémon search
- **File**: `lib/discord-commands/search.ts` - **DOES NOT EXIST**
- **Required**:
  - ⬜ Pokémon name search with autocomplete
  - ⬜ Season-aware (guild default)
  - ⬜ Pool-aware (only legal Pokémon)
  - ⬜ Exclude owned
  - ⬜ Return formatted list with points and types

**6.3 `/draftstatus` Enhancement** ❌
- **Current**: May exist but needs enhancement
- **Missing**:
  - ⬜ Make `season_id` optional (guild default)
  - ⬜ Show draft window status
  - ⬜ Show coach linkage status
  - ⬜ Show team budget/slots
  - ⬜ Clear, readable output formatting

**6.4 `/whoami` Command** ❌
- **Missing**: Command handler for coach profile lookup
- **File**: `lib/discord-commands/whoami.ts` - **DOES NOT EXIST**
- **Required**:
  - ⬜ Show coach profile
  - ⬜ List all teams
  - ⬜ Show season team (if season provided)
  - ⬜ Optional `season_id` parameter

**6.5 Guild Configuration Commands** ❌
- **Missing**: `/setseason` and `/getseason` commands
- **Files**: `lib/discord-commands/setseason.ts`, `lib/discord-commands/getseason.ts` - **DO NOT EXIST**
- **Required**:
  - ⬜ `/setseason` - Admin-only, set guild default season
  - ⬜ `/getseason` - Show current guild default season

**6.6 `/coverage` Command** ❌
- **Missing**: Command handler for roster coverage analysis
- **File**: `lib/discord-commands/coverage.ts` - **DOES NOT EXIST**
- **Required**:
  - ⬜ Roster coverage analysis
  - ⬜ Check: hazard removal, hazard setting, cleric, recovery, speed control
  - ⬜ Post formatted report to channel
  - ⬜ Suggest available Pokémon for gaps

**Existing Commands** (Not part of Phase 6):
- ✅ `/calc` - Damage calculator (`lib/discord-commands/calc-command.ts`)
- ✅ `/free-agency-submit` - Submit free agency transactions (`lib/discord-commands/free-agency-submit.ts`)
- ✅ `/free-agency-status` - View team free agency status (`lib/discord-commands/free-agency-status.ts`)

---

## ❌ Phase 7: Testing & Validation - NOT STARTED

### Status: ❌ No Test Suite Created

**7.1 Database Testing** ❌
- ⬜ Test RPC functions with various scenarios (valid picks, budget violations, roster size violations, etc.)
- ⬜ Test RLS policies (coach read own data, coach cannot write directly, admin override, public read)
- ⬜ Test views (`v_team_rosters`, `v_team_budget` accuracy)
- ⬜ Test helper functions (`is_coach_of_team()`, `is_admin()`, `is_valid_api_key()`)

**7.2 API Endpoint Testing** ❌
- ⬜ Test all API endpoints (request validation, authentication/authorization, error handling, response formats)
- ⬜ Test Notion sync (full pull, incremental pull, error handling, job status tracking)
- ⬜ Test Discord bot endpoints (bot key authentication, guild config, draft pick submission, Pokémon search)

**7.3 Discord Bot Testing** ❌
- ⬜ Test all Discord commands (command registration, autocomplete functionality, error handling, message formatting)
- ⬜ Test guild default season (setting default, resolving from default, fallback behavior)
- ⬜ Test permission gating (admin commands, coach self-service)

**7.4 Notion Integration Testing** ❌
- ⬜ Test Notion database creation (schema correctness, relations, formulas/rollups)
- ⬜ Test Notion sync (data mapping accuracy, upsert logic, join table handling, incremental sync)

---

## ❌ Phase 8: Documentation & Deployment - NOT STARTED

### Status: ❌ Documentation Incomplete, Deployment Not Done

**8.1 Documentation** 🟡
- ✅ Implementation reports exist for Phases 1-4
- ⬜ Update API documentation (OpenAPI spec compliance, endpoint descriptions, request/response examples, error codes)
- ⬜ Create Notion sync guide (setup instructions, field mapping reference, sync workflow, troubleshooting)
- ⬜ Create Discord bot guide (command reference, setup instructions, permission configuration, guild default setup)
- ⬜ Update database schema documentation (table descriptions, RPC function documentation, RLS policy summary, view descriptions)

**8.2 Deployment Checklist** ❌
- ⬜ Run all migrations in production Supabase
- ⬜ Set environment variables (`NOTION_SYNC_SECRET`, `DISCORD_BOT_API_KEY`, `NOTION_API_KEY`)
- ⬜ Create Notion databases in production workspace
- ⬜ Populate initial data (Pokémon, Role Tags, Moves)
- ⬜ Configure Discord bot (register commands, set up guild defaults, test bot key)
- ⬜ Verify RLS policies in production
- ⬜ Test end-to-end workflows (draft pick via Discord, draft pick via web app, free agency transaction, Notion sync)

---

## Summary by Priority

### High Priority Remaining Tasks

1. **Phase 5.1**: Create/enhance `GET /api/pokemon` endpoint with role/type/points filtering
2. **Phase 5.2**: Create `GET /api/teams/{teamId}/roster` endpoint
3. **Phase 5.3**: Enhance `POST /api/draft/pick` to use `rpc_submit_draft_pick` RPC
4. **Phase 5.4**: Enhance `POST /api/free-agency/submit` to use `rpc_free_agency_transaction` RPC
5. **Phase 5.5**: Create all Discord bot API endpoints (7 endpoints)
6. **Phase 6.1**: Create enhanced `/pick` Discord command with autocomplete
7. **Phase 6.2**: Create `/search` Discord command
8. **Phase 6.3**: Enhance `/draftstatus` Discord command

### Medium Priority Remaining Tasks

1. **Phase 6.4**: Create `/whoami` Discord command
2. **Phase 6.5**: Create `/setseason` and `/getseason` Discord commands
3. **Phase 6.6**: Create `/coverage` Discord command
4. **Phase 7**: Create comprehensive test suite
5. **Phase 8**: Complete documentation and deployment

---

## Next Steps Recommendation

1. **Immediate**: Complete Phase 5 (API Endpoints) - This unblocks Phase 6 (Discord Bot Commands)
2. **Next**: Complete Phase 6 (Discord Bot Commands) - This completes the core functionality
3. **Then**: Phase 7 (Testing) - Validate everything works
4. **Finally**: Phase 8 (Documentation & Deployment) - Production readiness

---

**Generated**: 2026-01-26  
**Total Progress**: ~50% Complete (Phases 1-4 done, Phase 5 partial, Phases 6-8 not started)
