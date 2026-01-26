# Average at Best Draft League - Comprehensive Buildout Plan

**Date**: January 26, 2026  
**Source**: ChatGPT Conversation Analysis (`docs/chatgpt-conversation-average-at-best-zip.md`)  
**Status**: Planning Phase - Awaiting Review  
**Purpose**: Complete implementation roadmap for Notion integration, Supabase schema expansion, API endpoints, and Discord bot enhancements

---

## Executive Summary

This document provides a comprehensive, codebase-aware implementation plan for building out the Average at Best Draft League ecosystem based on the detailed specifications in the ChatGPT conversation document. The plan includes:

1. **Notion Database Schema** - Production-grade database design for league operations
2. **Supabase Schema Expansion** - PostgreSQL schema mirroring Notion design
3. **Notion Sync System** - Bidirectional sync between Notion and Supabase
4. **API Contract Implementation** - OpenAPI 3.1 specification endpoints
5. **Discord Bot Enhancements** - Coach self-service draft picks and transactions
6. **Validation & Security** - RLS policies, RPC functions, and audit trails

**Current State**: The project has a solid foundation with existing database tables, API endpoints, and Discord bot infrastructure. This plan builds upon that foundation to add the comprehensive league management system described in the conversation document.

---

## Current Project State Analysis

### ✅ What's Already Built

#### Database Schema (Supabase)
- **Core League Tables**: `teams`, `coaches`, `seasons`, `matches`, `team_rosters`, `draft_budgets`
- **Pokémon Data**: `pokemon`, `pokemon_cache`, `pokepedia_pokemon` (1,025+ cached)
- **Battle System**: `battle_sessions`, `battle_events`
- **User Management**: `profiles`, `role_permissions` (RBAC)
- **Sync Infrastructure**: `sync_jobs`, `sync_log`
- **Showdown Integration**: `showdown_rooms`, `showdown_client_teams`
- **Free Agency**: `free_agency_transactions`, `free_agency_waivers`
- **Video System**: `videos`, `video_feedback`, `video_tags`
- **Total**: 23+ tables with comprehensive migrations

#### API Endpoints (Next.js)
- **Draft System**: `/api/draft/pick`, `/api/draft/available`, `/api/draft/status`, `/api/draft/team-status`
- **Free Agency**: `/api/free-agency/available`, `/api/free-agency/submit`, `/api/free-agency/transactions`
- **Showdown**: `/api/showdown/create-room`, `/api/showdown/validate-team`, `/api/showdown/teams`
- **Discord**: `/api/discord/bot`, `/api/discord/config`, `/api/discord/team`, `/api/discord/roles`
- **Sync**: `/api/sync/google-sheets`, `/api/sync/pokemon`, `/api/sync/status`
- **Total**: 50+ endpoints operational

#### Discord Bot
- Basic command structure exists
- Some draft-related commands (`/draft`, `/draft-status`, `/draft-available`)
- Team lookup functionality
- Showdown account linking

#### Notion Integration
- Google Sheets → Notion sync exists (`scripts/sync-data-sheet-to-notion.ts`)
- Notion MCP server configured (OAuth)
- Basic database structure for GS Data Sheet sync

### ❌ What's Missing (From Conversation Document)

#### Database Schema Gaps
1. **Role Tags System**: `role_tags`, `pokemon_role_tags`, `role_tag_moves` tables
2. **Moves Reference Table**: `moves` table with full move data
3. **Draft Pools System**: `draft_pools`, `draft_pool_pokemon` (exists but may need enhancement)
4. **Draft Picks Enhancement**: `draft_picks` table with `points_snapshot`, `acquisition` enum, `status` enum
5. **Notion Mappings**: `notion_mappings` table for deterministic sync
6. **Transaction Audit**: `transaction_audit` table for coach self-service logging
7. **API Keys Management**: `api_keys` table for bot authentication
8. **Guild Config**: `discord_guild_config` table for default season per Discord server
9. **Pokémon Schema Expansion**: Type-effectiveness multipliers (18 columns), speed benchmarks, abilities, external naming fields
10. **Season Enhancements**: `draft_open_at`, `draft_close_at` for draft windows

#### API Endpoint Gaps
1. **Notion Sync Endpoints**: `/api/sync/notion/pull`, `/api/sync/notion/pull/incremental`, `/api/sync/notion/push`
2. **Notion Webhook**: `/api/webhooks/notion`
3. **Pokémon Search**: `/api/pokemon` with role/type/points filtering (exists but may need enhancement)
4. **Team Roster Endpoint**: `/api/teams/{teamId}/roster` with budget calculations
5. **Draft Pick Endpoint Enhancement**: Coach self-service with validation (exists but may need RPC integration)
6. **Free Agency Transaction**: `/api/free-agency/transaction` with atomic drop+add (exists but may need enhancement)
7. **Discord Draft Endpoints**: `/api/discord/draft/pick`, `/api/discord/draft/status`, `/api/discord/pokemon/search`
8. **Discord Guild Config**: `/api/discord/guild/config` (GET/POST)
9. **Coverage Check**: `/api/discord/notify/coverage`
10. **Coach WhoAmI**: `/api/discord/coach/whoami`

#### Discord Bot Command Gaps
1. **Enhanced `/pick`**: With autocomplete Pokémon selection, season resolution from guild default
2. **`/search`**: Pokémon search with autocomplete
3. **`/draftstatus`**: Enhanced with guild default season support
4. **`/whoami`**: Coach profile and team lookup
5. **`/setseason`**: Set default season for Discord server (admin)
6. **`/getseason`**: Show current default season
7. **`/coverage`**: Roster coverage analysis

#### Notion Database Gaps
1. **Pokémon Catalog Database**: Complete schema with all properties (stats, type-effectiveness, roles, moves)
2. **Role Tags Database**: Canonical taxonomy with category and mechanism
3. **Moves Database**: Reference table for utility moves
4. **Coaches Database**: Enhanced with Discord handles, Showdown usernames
5. **Teams Database**: Enhanced with franchise keys, rollups
6. **Seasons Database**: With draft pool snapshots
7. **Draft Pools Database**: Versioned pool snapshots
8. **Draft Picks Database**: Transactional roster records
9. **Matches Database**: Enhanced with Showdown room tracking

#### RPC Functions & Security Gaps
1. **Coach Self-Service RPCs**: `rpc_submit_draft_pick`, `rpc_free_agency_transaction`
2. **Bot-Only RPCs**: `rpc_discord_submit_draft_pick`
3. **Helper Functions**: `is_coach_of_team()`, `is_admin()`, `is_valid_api_key()`, `sha256_hex()`
4. **RLS Policies**: Comprehensive policies for coach self-service
5. **Views**: `v_team_rosters`, `v_team_budget`

---

## Implementation Phases

### Phase 1: Database Schema Foundation (Week 1-2)

**Goal**: Expand Supabase schema to match the production-grade design from the conversation document.

#### 1.1 Pokémon Schema Expansion
**Priority**: HIGH  
**Dependencies**: None

**Tasks**:
- [ ] Add type-effectiveness multiplier columns (18 columns: `vs_normal` through `vs_fairy`) to `pokemon` table
- [ ] Add speed benchmark columns (`speed_0_ev`, `speed_252_ev`, `speed_252_plus`)
- [ ] Add ability columns (`ability1`, `ability2`, `hidden_ability`)
- [ ] Add external naming fields (`github_name`, `smogon_name`, `pokemondb_name`, `smogon_url`, `pokemondb_url`)
- [ ] Add `species_name`, `form` enum, `slug` (unique), `eligible` boolean
- [ ] Add sprite URL columns (`sprite_primary_url`, `sprite_bw_url`, `sprite_serebii_url`, `sprite_home_url`)
- [ ] Create migration: `YYYYMMDDHHMMSS_expand_pokemon_schema.sql`

**Deliverables**:
- Migration file with all Pokémon schema enhancements
- Indexes on `slug`, `dex_number`, `draft_points`, `type1`, `type2`
- Formula columns for BST calculation (if using computed columns)

#### 1.2 Role Tags & Moves System
**Priority**: HIGH  
**Dependencies**: 1.1

**Tasks**:
- [ ] Create `role_tags` table with `name` (unique, format: "Category: Mechanism"), `category` enum, `mechanism`, `notes`
- [ ] Create `moves` table with `name`, `type`, `category`, `power`, `accuracy`, `pp`, `priority`, `tags` (text[])
- [ ] Create `pokemon_role_tags` join table (many-to-many)
- [ ] Create `role_tag_moves` join table (optional, for move linkage)
- [ ] Create `pokemon_moves_utility` join table (utility move associations)
- [ ] Create enum types: `role_category`, `pokemon_form`, `pokemon_type`
- [ ] Create migration: `YYYYMMDDHHMMSS_create_role_tags_and_moves.sql`

**Deliverables**:
- Complete role tags and moves schema
- Indexes on `role_tags.category`, `role_tags.name`
- Constraint: `role_tag_name_format_chk` ensuring "Category: Mechanism" format

#### 1.3 Draft System Enhancement
**Priority**: HIGH  
**Dependencies**: 1.1

**Tasks**:
- [ ] Enhance `draft_picks` table: add `points_snapshot`, `acquisition` enum, `status` enum, `draft_round`, `pick_number`
- [ ] Create `draft_pools` table (if not exists): `season_id`, `name`, `rules_notes`, `locked`
- [ ] Create `draft_pool_pokemon` table: `draft_pool_id`, `pokemon_id`, `included` boolean, `reason`
- [ ] Add unique constraint: `uq_season_pokemon_unique` on `(season_id, pokemon_id)` in `draft_picks`
- [ ] Create `season_teams` join table (if not exists)
- [ ] Create migration: `YYYYMMDDHHMMSS_enhance_draft_system.sql`

**Deliverables**:
- Enhanced draft picks table with snapshot support
- Draft pool versioning system
- Season-team membership tracking

#### 1.4 Coach & Team Enhancements
**Priority**: MEDIUM  
**Dependencies**: None

**Tasks**:
- [ ] Add `discord_user_id` to `coaches` table (indexed)
- [ ] Add `franchise_key` to `teams` table (unique)
- [ ] Ensure `coaches.user_id` references `auth.users(id)`
- [ ] Create `admin_users` table for admin role management
- [ ] Create migration: `YYYYMMDDHHMMSS_enhance_coaches_and_teams.sql`

**Deliverables**:
- Discord user ID mapping for coaches
- Franchise key support for teams
- Admin user management

#### 1.5 Season & Audit Enhancements
**Priority**: MEDIUM  
**Dependencies**: 1.3

**Tasks**:
- [ ] Add `draft_open_at`, `draft_close_at` to `seasons` table
- [ ] Create `transaction_audit` table: `season_id`, `team_id`, `actor_type`, `actor_user_id`, `actor_discord_id`, `action`, `payload` (jsonb)
- [ ] Create `notion_mappings` table: `notion_page_id`, `entity_type`, `entity_id`
- [ ] Create `api_keys` table: `key_hash`, `name`, `scopes`, `is_active`
- [ ] Create `discord_guild_config` table: `guild_id`, `default_season_id`, `admin_role_ids`
- [ ] Create migration: `YYYYMMDDHHMMSS_add_season_audit_and_sync_tables.sql`

**Deliverables**:
- Draft window support
- Transaction audit trail
- Notion sync mapping
- API key management
- Discord guild configuration

#### 1.6 Helper Functions & Views
**Priority**: HIGH  
**Dependencies**: 1.4, 1.5

**Tasks**:
- [ ] Create `is_coach_of_team(p_team_id uuid)` function
- [ ] Create `is_admin()` function
- [ ] Create `sha256_hex(p text)` function
- [ ] Create `is_valid_api_key(p_plaintext text, p_scope text)` function
- [ ] Create view `v_team_rosters` (active picks with points)
- [ ] Create view `v_team_budget` (budget calculations per team per season)
- [ ] Create migration: `YYYYMMDDHHMMSS_create_helper_functions_and_views.sql`

**Deliverables**:
- Security helper functions
- Computed views for team rosters and budgets

---

### Phase 2: RPC Functions & Security (Week 2-3)

**Goal**: Implement secure RPC functions for coach self-service transactions with comprehensive validation.

#### 2.1 Coach Self-Service RPCs
**Priority**: HIGH  
**Dependencies**: Phase 1 complete

**Tasks**:
- [ ] Create `rpc_submit_draft_pick()` function with validation:
  - AuthZ check (coach or admin)
  - Season membership check
  - Pool legality check
  - Uniqueness check
  - Budget/slots pre-check
  - Insert with points snapshot
  - Return updated budget
- [ ] Create `rpc_free_agency_transaction()` function with atomic drop+add:
  - AuthZ check
  - Drop ownership check
  - Add legality check
  - Budget validation
  - Atomic transaction (update drop, insert add)
  - Return updated budget
- [ ] Create migration: `YYYYMMDDHHMMSS_create_coach_self_service_rpcs.sql`

**Deliverables**:
- Secure RPC functions for coach transactions
- Comprehensive error handling
- Points snapshot preservation

#### 2.2 Bot-Only RPCs
**Priority**: HIGH  
**Dependencies**: 2.1, Phase 1.5

**Tasks**:
- [ ] Create `rpc_discord_submit_draft_pick()` function:
  - Bot key validation
  - Draft window validation
  - Coach resolution by Discord ID
  - Team resolution for season
  - Pool legality check
  - Budget/slots validation
  - Insert pick
  - Audit log entry
  - Return updated budget
- [ ] Create migration: `YYYYMMDDHHMMSS_create_bot_rpcs.sql`

**Deliverables**:
- Bot-only RPC for Discord draft picks
- Audit trail integration
- Draft window enforcement

#### 2.3 RLS Policies
**Priority**: HIGH  
**Dependencies**: 2.1

**Tasks**:
- [ ] Enable RLS on all tables
- [ ] Public read policies for reference data (`pokemon`, `moves`, `role_tags`)
- [ ] Authenticated read policies for league data
- [ ] Coach-scoped policies (read own coach record)
- [ ] Admin-only write policies for `draft_picks` (forces RPC usage)
- [ ] Grant execute permissions on RPCs to `authenticated`
- [ ] Create migration: `YYYYMMDDHHMMSS_create_rls_policies.sql`

**Deliverables**:
- Comprehensive RLS policy set
- Secure coach self-service model
- Admin override capabilities

---

### Phase 3: Notion Database Setup (Week 3-4)

**Goal**: Create production-grade Notion databases matching the schema design.

#### 3.1 Notion Database Creation
**Priority**: HIGH  
**Dependencies**: Phase 1 complete (for field mapping)

**Tasks**:
- [ ] **Use Notion MCP** to create databases:
  1. Pokémon Catalog (with all properties from mapping sheet)
  2. Role Tags (with category, mechanism, move relation)
  3. Moves (with type, category, power, accuracy, PP, priority, tags)
  4. Coaches (with Discord handle, Showdown username, etc.)
  5. Teams (with franchise key, coach relation, rollups)
  6. Seasons (with draft pool snapshot, draft window dates)
  7. Draft Pools (with Pokémon included/banned relations)
  8. Draft Picks (with season, team, Pokémon, acquisition type, status)
  9. Matches (with Showdown room tracking)
- [ ] Set up database relations (many-to-many, one-to-many)
- [ ] Configure rollups and formulas (budget calculations, slot counts)
- [ ] Create recommended views (Draft Board, Active Rosters, By Tier, etc.)

**Deliverables**:
- 9 Notion databases with complete schemas
- Proper relations and rollups configured
- Production-ready views

#### 3.2 Notion Data Population Strategy
**Priority**: MEDIUM  
**Dependencies**: 3.1

**Tasks**:
- [ ] Determine data source (Google Sheets "Backend Data" or Supabase export)
- [ ] Create import script using Notion MCP
- [ ] Populate Pokémon Catalog with all eligible Pokémon
- [ ] Populate Role Tags with canonical taxonomy
- [ ] Populate Moves with utility moves
- [ ] Link Pokémon to Role Tags and Moves
- [ ] Verify data quality (Internal Slug uniqueness, Role Tag format compliance)

**Deliverables**:
- Populated Notion databases
- Data quality verification
- Import scripts for future use

---

### Phase 4: Notion Sync System (Week 4-5)

**Goal**: Implement bidirectional sync between Notion and Supabase.

#### 4.1 Notion Sync API Endpoints
**Priority**: HIGH  
**Dependencies**: Phase 3 complete

**Tasks**:
- [ ] Create `POST /api/sync/notion/pull` endpoint:
  - Auth: `NOTION_SYNC_SECRET` bearer token
  - Scope-based sync (pokemon, role_tags, moves, coaches, teams, etc.)
  - Dry-run support
  - Enqueue sync job
  - Return job status
- [ ] Create `POST /api/sync/notion/pull/incremental` endpoint:
  - Since timestamp support
  - Incremental updates only
- [ ] Create `POST /api/sync/notion/push` endpoint (optional):
  - Push Supabase changes to Notion
  - Use when Supabase is canonical
- [ ] Create `POST /api/webhooks/notion` endpoint (optional):
  - Notion webhook receiver
  - Verify signature
  - Enqueue incremental pull
- [ ] Create route files: `app/api/sync/notion/pull/route.ts`, etc.

**Deliverables**:
- Notion sync API endpoints
- Job queue integration
- Webhook support (optional)

#### 4.2 Notion Sync Worker Implementation
**Priority**: HIGH  
**Dependencies**: 4.1

**Tasks**:
- [ ] Create sync worker script/function:
  - Read from Notion using Notion MCP or API
  - Map Notion properties to Supabase columns (using mapping sheet)
  - Upsert strategy:
    - Pokémon: by `slug`
    - Role Tags: by `name`
    - Moves: by `name`
  - Handle join tables (rebuild deterministically)
  - Update `notion_mappings` table
  - Handle errors gracefully
- [ ] Implement incremental sync logic:
  - Track last sync timestamp
  - Only process changed pages
  - Use `notion_mappings` for entity resolution
- [ ] Create worker file: `lib/sync/notion-sync-worker.ts`

**Deliverables**:
- Notion sync worker implementation
- Deterministic upsert logic
- Incremental sync support

#### 4.3 Sync Job Management
**Priority**: MEDIUM  
**Dependencies**: 4.1

**Tasks**:
- [ ] Enhance `sync_jobs` table usage (already exists)
- [ ] Create job status tracking
- [ ] Implement retry logic
- [ ] Create job monitoring endpoint: `GET /api/sync/notion/status`
- [ ] Add error logging and reporting

**Deliverables**:
- Sync job management system
- Status tracking and monitoring

---

### Phase 5: API Endpoint Implementation (Week 5-6)

**Goal**: Implement all API endpoints from the OpenAPI specification.

#### 5.1 Pokémon Search Endpoint Enhancement
**Priority**: HIGH  
**Dependencies**: Phase 1 complete

**Tasks**:
- [ ] Enhance `GET /api/pokemon` endpoint:
  - Add query parameters: `points_lte`, `points_gte`, `type1`, `type2`, `role`, `eligible`, `limit`
  - Implement role filtering (join with `pokemon_role_tags`)
  - Return defensive profile (weaknesses, resists, immunities)
  - Return roles array
  - Optimize queries with proper indexes
- [ ] Update route: `app/api/pokemon/route.ts`

**Deliverables**:
- Enhanced Pokémon search endpoint
- Role-based filtering
- Comprehensive response format

#### 5.2 Team Roster Endpoint
**Priority**: HIGH  
**Dependencies**: Phase 1.6 (views)

**Tasks**:
- [ ] Create `GET /api/teams/{teamId}/roster` endpoint:
  - Query parameter: `seasonId` (required)
  - Use `v_team_rosters` view for active picks
  - Use `v_team_budget` view for budget calculations
  - Return merged response with roster and budget
- [ ] Create route: `app/api/teams/[teamId]/roster/route.ts`

**Deliverables**:
- Team roster endpoint with budget calculations
- Uses database views for performance

#### 5.3 Draft Pick Endpoint Enhancement
**Priority**: HIGH  
**Dependencies**: Phase 2.1

**Tasks**:
- [ ] Enhance `POST /api/draft/pick` endpoint:
  - Use `rpc_submit_draft_pick` RPC function
  - Add Zod validation schema
  - Map RPC errors to HTTP responses
  - Return updated budget information
- [ ] Create validation: `lib/validation/draft.ts`
- [ ] Create error mapper: `lib/supabase/rpc-error-map.ts`
- [ ] Update route: `app/api/draft/pick/route.ts`

**Deliverables**:
- Enhanced draft pick endpoint
- RPC integration
- Comprehensive error handling

#### 5.4 Free Agency Transaction Endpoint Enhancement
**Priority**: HIGH  
**Dependencies**: Phase 2.1

**Tasks**:
- [ ] Enhance `POST /api/free-agency/transaction` endpoint:
  - Use `rpc_free_agency_transaction` RPC function
  - Add Zod validation schema
  - Map RPC errors to HTTP responses
  - Return updated budget information
- [ ] Update route: `app/api/free-agency/transaction/route.ts`

**Deliverables**:
- Enhanced free agency endpoint
- Atomic drop+add transaction
- Budget validation

#### 5.5 Discord Bot Endpoints
**Priority**: HIGH  
**Dependencies**: Phase 2.2

**Tasks**:
- [ ] Create `POST /api/discord/draft/pick` endpoint:
  - Bot key authentication
  - Call `rpc_discord_submit_draft_pick`
  - Return team budget info
- [ ] Create `GET /api/discord/draft/status` endpoint:
  - Season status with draft window
  - Coach linkage check
  - Team budget/slots
- [ ] Create `GET /api/discord/pokemon/search` endpoint:
  - Pool-aware search
  - Exclude owned Pokémon
  - Fast autocomplete support
- [ ] Create `GET /api/discord/guild/config` endpoint:
  - Get guild default season
- [ ] Create `POST /api/discord/guild/config` endpoint:
  - Set guild default season
  - Admin role validation
- [ ] Create `GET /api/discord/coach/whoami` endpoint:
  - Coach profile lookup
  - Team listing
  - Season team resolution
- [ ] Create `POST /api/discord/notify/coverage` endpoint:
  - Roster coverage analysis
  - Discord message posting
- [ ] Create route files in `app/api/discord/`

**Deliverables**:
- Complete Discord bot API endpoints
- Bot authentication
- Guild configuration support

---

### Phase 6: Discord Bot Commands (Week 6-7)

**Goal**: Implement enhanced Discord bot commands with autocomplete and guild defaults.

#### 6.1 Enhanced `/pick` Command
**Priority**: HIGH  
**Dependencies**: Phase 5.5

**Tasks**:
- [ ] Update `/pick` command:
  - Make `season_id` optional (resolve from guild default)
  - Add Pokémon autocomplete option
  - Call `/api/discord/pokemon/search` for autocomplete
  - Call `/api/discord/draft/pick` for submission
  - Format response with budget/slots
- [ ] Implement autocomplete handler:
  - Cache results (10s TTL)
  - Return top 25 matches
  - Format: "Pokémon Name (X pts) [Type1/Type2]"
- [ ] Update command: `bot/commands/pick.ts`

**Deliverables**:
- Enhanced `/pick` command with autocomplete
- Guild default season support
- User-friendly Pokémon selection

#### 6.2 `/search` Command
**Priority**: MEDIUM  
**Dependencies**: Phase 5.5

**Tasks**:
- [ ] Create `/search` command:
  - Pokémon name search
  - Season-aware (guild default)
  - Pool-aware (only legal Pokémon)
  - Exclude owned
  - Return formatted list with points and types
- [ ] Create command: `bot/commands/search.ts`

**Deliverables**:
- Pokémon search command
- Formatted results

#### 6.3 `/draftstatus` Enhancement
**Priority**: MEDIUM  
**Dependencies**: Phase 5.5

**Tasks**:
- [ ] Enhance `/draftstatus` command:
  - Make `season_id` optional (guild default)
  - Show draft window status
  - Show coach linkage status
  - Show team budget/slots
  - Format: Clear, readable output
- [ ] Update command: `bot/commands/draftstatus.ts`

**Deliverables**:
- Enhanced draft status command
- Guild default support

#### 6.4 `/whoami` Command
**Priority**: MEDIUM  
**Dependencies**: Phase 5.5

**Tasks**:
- [ ] Create `/whoami` command:
  - Show coach profile
  - List all teams
  - Show season team (if season provided)
  - Optional `season_id` parameter
- [ ] Create command: `bot/commands/whoami.ts`

**Deliverables**:
- Coach profile command
- Team listing

#### 6.5 Guild Configuration Commands
**Priority**: LOW  
**Dependencies**: Phase 5.5

**Tasks**:
- [ ] Create `/setseason` command:
  - Admin-only (Discord Administrator or configured role)
  - Set guild default season
  - Validate season exists
- [ ] Create `/getseason` command:
  - Show current guild default season
- [ ] Create commands: `bot/commands/setseason.ts`, `bot/commands/getseason.ts`

**Deliverables**:
- Guild configuration commands
- Admin permission gating

#### 6.6 `/coverage` Command
**Priority**: LOW  
**Dependencies**: Phase 5.5

**Tasks**:
- [ ] Create `/coverage` command:
  - Roster coverage analysis
  - Check: hazard removal, hazard setting, cleric, recovery, speed control
  - Post formatted report to channel
  - Suggest available Pokémon for gaps
- [ ] Create command: `bot/commands/coverage.ts`

**Deliverables**:
- Coverage analysis command
- Discord message posting

---

### Phase 7: Testing & Validation (Week 7-8)

**Goal**: Comprehensive testing of all components.

#### 7.1 Database Testing
**Priority**: HIGH

**Tasks**:
- [ ] Test RPC functions with various scenarios:
  - Valid draft picks
  - Budget violations
  - Roster size violations
  - Uniqueness violations
  - Pool legality violations
  - Draft window violations
- [ ] Test RLS policies:
  - Coach can read own data
  - Coach cannot write directly
  - Admin can override
  - Public read for reference data
- [ ] Test views:
  - `v_team_rosters` accuracy
  - `v_team_budget` calculations
- [ ] Test helper functions:
  - `is_coach_of_team()`
  - `is_admin()`
  - `is_valid_api_key()`

**Deliverables**:
- Test suite for database functions
- RLS policy verification
- View accuracy validation

#### 7.2 API Endpoint Testing
**Priority**: HIGH

**Tasks**:
- [ ] Test all API endpoints:
  - Request validation (Zod schemas)
  - Authentication/authorization
  - Error handling
  - Response formats
- [ ] Test Notion sync:
  - Full pull
  - Incremental pull
  - Error handling
  - Job status tracking
- [ ] Test Discord bot endpoints:
  - Bot key authentication
  - Guild config
  - Draft pick submission
  - Pokémon search

**Deliverables**:
- API endpoint test suite
- Integration tests

#### 7.3 Discord Bot Testing
**Priority**: MEDIUM

**Tasks**:
- [ ] Test all Discord commands:
  - Command registration
  - Autocomplete functionality
  - Error handling
  - Message formatting
- [ ] Test guild default season:
  - Setting default
  - Resolving from default
  - Fallback behavior
- [ ] Test permission gating:
  - Admin commands
  - Coach self-service

**Deliverables**:
- Discord bot test suite
- Command verification

#### 7.4 Notion Integration Testing
**Priority**: MEDIUM

**Tasks**:
- [ ] Test Notion database creation:
  - Schema correctness
  - Relations
  - Formulas/rollups
- [ ] Test Notion sync:
  - Data mapping accuracy
  - Upsert logic
  - Join table handling
  - Incremental sync

**Deliverables**:
- Notion integration tests
- Sync accuracy verification

---

### Phase 8: Documentation & Deployment (Week 8)

**Goal**: Complete documentation and production deployment.

#### 8.1 Documentation
**Priority**: HIGH

**Tasks**:
- [ ] Update API documentation:
  - OpenAPI spec (already exists in conversation doc)
  - Endpoint descriptions
  - Request/response examples
  - Error codes
- [ ] Create Notion sync guide:
  - Setup instructions
  - Field mapping reference
  - Sync workflow
  - Troubleshooting
- [ ] Create Discord bot guide:
  - Command reference
  - Setup instructions
  - Permission configuration
  - Guild default setup
- [ ] Update database schema documentation:
  - Table descriptions
  - RPC function documentation
  - RLS policy summary
  - View descriptions

**Deliverables**:
- Complete API documentation
- Notion sync guide
- Discord bot guide
- Database schema docs

#### 8.2 Deployment Checklist
**Priority**: HIGH

**Tasks**:
- [ ] Run all migrations in production Supabase
- [ ] Set environment variables:
  - `NOTION_SYNC_SECRET`
  - `DISCORD_BOT_API_KEY`
  - `NOTION_API_KEY` (if using direct API)
- [ ] Create Notion databases in production workspace
- [ ] Populate initial data (Pokémon, Role Tags, Moves)
- [ ] Configure Discord bot:
  - Register commands
  - Set up guild defaults
  - Test bot key
- [ ] Verify RLS policies in production
- [ ] Test end-to-end workflows:
  - Draft pick via Discord
  - Draft pick via web app
  - Free agency transaction
  - Notion sync

**Deliverables**:
- Production deployment
- Verification tests
- Operational readiness

---

## Implementation Details

### Database Schema Reference

See the conversation document for complete SQL schema. Key tables:

- **`pokemon`**: Expanded with type-effectiveness, speed benchmarks, abilities
- **`role_tags`**: Canonical taxonomy with "Category: Mechanism" format
- **`moves`**: Reference table for utility moves
- **`draft_picks`**: Enhanced with `points_snapshot`, `acquisition`, `status`
- **`draft_pools`**: Versioned pool snapshots per season
- **`transaction_audit`**: Complete audit trail for coach transactions
- **`notion_mappings`**: Deterministic Notion ↔ Supabase mapping

### API Contract Reference

See OpenAPI 3.1 specification in conversation document (lines ~2687-3434). Key endpoints:

- **Sync**: `/api/sync/notion/pull`, `/api/sync/notion/pull/incremental`
- **Pokémon**: `/api/pokemon` (enhanced with role/type filtering)
- **Teams**: `/api/teams/{teamId}/roster`
- **Draft**: `/api/draft/pick` (enhanced with RPC)
- **Free Agency**: `/api/free-agency/transaction` (enhanced with RPC)
- **Discord**: `/api/discord/draft/pick`, `/api/discord/pokemon/search`, `/api/discord/guild/config`

### Notion Field Mapping Reference

See conversation document (lines ~3449-3623) for complete mapping sheet. Key mappings:

- **Pokémon**: `Internal Slug` → `pokemon.slug` (upsert key)
- **Role Tags**: `Role Tag` → `role_tags.name` (must follow "Category: Mechanism" format)
- **Moves**: `Move Name` → `moves.name` (upsert key)
- **Type-effectiveness**: 18 `vs_*` columns map directly
- **Join tables**: Rebuild deterministically on sync

### Discord Bot Command Reference

See conversation document (lines ~5995-6477) for complete command implementations. Key commands:

- **`/pick`**: Draft pick with autocomplete (guild default season)
- **`/search`**: Pokémon search with autocomplete
- **`/draftstatus`**: Draft status with guild default
- **`/whoami`**: Coach profile lookup
- **`/setseason`**: Set guild default (admin)
- **`/getseason`**: Show guild default
- **`/coverage`**: Roster coverage analysis

---

## Risk Assessment & Mitigation

### High-Risk Areas

1. **Notion Sync Complexity**
   - **Risk**: Data mapping errors, sync failures
   - **Mitigation**: Comprehensive mapping sheet, incremental sync, error logging, dry-run support

2. **Coach Self-Service Security**
   - **Risk**: Unauthorized transactions, budget violations
   - **Mitigation**: RLS policies, RPC functions with validation, audit trail, bot key authentication

3. **Draft Window Enforcement**
   - **Risk**: Picks outside draft window
   - **Mitigation**: Database-level validation in RPC, clear error messages, audit logging

4. **Data Consistency**
   - **Risk**: Notion and Supabase out of sync
   - **Mitigation**: Deterministic mapping, `notion_mappings` table, incremental sync, conflict resolution

### Medium-Risk Areas

1. **Performance**
   - **Risk**: Slow autocomplete, slow sync
   - **Mitigation**: Caching (10s TTL), indexes, pagination, async job processing

2. **Discord Bot Rate Limits**
   - **Risk**: Command throttling
   - **Mitigation**: Rate limit handling, command queuing, error recovery

---

## Success Metrics

### Phase Completion Criteria

- **Phase 1**: All database migrations applied, indexes created, helper functions working
- **Phase 2**: RPC functions tested, RLS policies verified, security audit passed
- **Phase 3**: Notion databases created, relations configured, initial data populated
- **Phase 4**: Sync endpoints working, worker processing jobs, incremental sync tested
- **Phase 5**: All API endpoints implemented, OpenAPI spec compliance, error handling verified
- **Phase 6**: Discord commands registered, autocomplete working, guild defaults functional
- **Phase 7**: Test suite passing, integration tests successful, performance benchmarks met
- **Phase 8**: Documentation complete, production deployment successful, operational verification passed

### Operational Metrics

- **Sync Performance**: Notion → Supabase sync completes in < 5 minutes for full pull
- **API Response Time**: Pokémon search < 200ms, draft pick < 500ms
- **Discord Command Response**: Autocomplete < 100ms, command execution < 2s
- **Data Accuracy**: 100% mapping accuracy between Notion and Supabase
- **Security**: Zero unauthorized transactions, all RLS policies enforced

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize phases** based on business needs
3. **Set up development environment** for Notion MCP and Discord MCP testing
4. **Begin Phase 1** with database schema expansion
5. **Iterate** based on feedback and testing results

---

## Appendix: Conversation Document Reference

**Source File**: `docs/chatgpt-conversation-average-at-best-zip.md`

**Key Sections**:
- **Lines 158-976**: Notion database schema design
- **Lines 1940-2412**: Supabase SQL schema
- **Lines 2414-3434**: API contract (OpenAPI 3.1)
- **Lines 3449-3623**: Notion → Supabase field mapping
- **Lines 3662-4198**: Validation logic and RPC functions
- **Lines 4217-4338**: Discord message templates
- **Lines 4367-4811**: Next.js route handlers
- **Lines 4815-5290**: Bot-only RPC and Discord integration
- **Lines 5295-6477**: Last mile (autocomplete, search, guild defaults)

---

**Document Status**: Ready for Review  
**Last Updated**: January 26, 2026  
**Next Review**: After stakeholder feedback
