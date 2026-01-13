# Pokemon Draft League - Project Roadmap & Progress Summary

## Executive Summary

**Project Name**: Average at Best Draft League - Pokemon Draft League Operating System  
**Status**: Development Phase (v0 → Production)  
**Current Version**: v1.0.0-beta  
**Last Updated**: January 13, 2026

---

## Vision & Goals

### Core Mission
Transform a Discord-based Pokemon draft league with Google Sheets management into a comprehensive web application with:
- Showdown-accurate battle simulation
- AI-powered insights and automation
- Real-time collaboration features
- Discord-native workflows
- Self-service admin tools

### Success Metrics
- [ ] 100% of match results tracked in app (currently 0% - using Sheets)
- [ ] 20+ active coaches using team builder
- [ ] 5+ battles/week run through official battle system
- [ ] 90%+ role sync accuracy between Discord and app
- [ ] <2s page load times for all routes
- [ ] Zero data loss during Google Sheets → Supabase migration

---

## Current Status: What's Built

### ✅ Phase 1: Foundation & Core Pages (COMPLETE)

**Database Schema** ✅
- Enhanced PostgreSQL schema with 15+ tables
- Row Level Security (RLS) policies on all tables
- Seasons, conferences, divisions, teams
- Draft system with point budget tracking
- Match results with KO differential
- Battle sessions and event logs
- Sync logs for Google Sheets integration
- RBAC profiles with role_permissions

**Authentication & Authorization** ✅
- Supabase SSR authentication
- Discord OAuth integration (configured, pending testing)
- Cookie-based sessions
- Middleware protection for admin routes
- Profile creation on first login
- Basic role system (viewer/coach/admin)

**Public Pages** ✅
- Homepage with hero, stats, recent matches
- League standings (overall + divisional)
- Team directory and individual team pages
- Match schedule (weekly tabs)
- Playoff bracket visualization
- MVP leaderboard with kill statistics
- Pokedex with search and filtering

**Styling & Design** ✅
- Electric blue & gold color scheme
- Dark theme optimized for competitive sports aesthetic
- Fully responsive (mobile/tablet/desktop)
- 90+ Shadcn UI components installed
- Tailwind CSS v4 configuration
- Custom design tokens

**Google Sheets Integration** ⚠️ (Disabled in v0)
- node-google-spreadsheet package installed
- Sync logic implemented (`lib/google-sheets-sync.ts`)
- API endpoint created (`/api/sync/google-sheets`)
- Column mapping for 20-team league
- Mock data toggle for v0 preview compatibility

---

### ✅ Phase 2: AI & Battle Systems (COMPLETE)

**OpenAI Integration** ✅
- GPT-4.1 for constrained decisions (move selection, parsing)
- GPT-5.2 for deep reasoning (recaps, strategy, coaching)
- Model-specific API routes:
  - `/api/ai/pokedex` - Grounded Q&A with function calling
  - `/api/ai/weekly-recap` - Narrative generation
  - `/api/ai/coach` - Strategic team analysis
  - `/api/ai/parse-result` - Discord message → structured data
  - `/api/ai/sql` - Natural language → SQL queries

**Pokemon Data Management** ✅
- Pokenode-TS integration for PokéAPI access
- Supabase caching layer (`pokemon_cache` table)
- 30-day cache expiry with ETag support
- Type definitions for all Pokemon entities
- Move, ability, and stats lookup

**Battle Engine Foundation** ✅
- Showdown-inspired request-choice-update loop
- Battle state management in Supabase
- Legal move validation
- Turn-by-turn event logging
- AI opponent integration
- Battle API endpoints:
  - `/api/battle/create` - Initialize battle
  - `/api/battle/[id]/step` - Execute turn

**AI-Powered Pages** ✅
- Pokedex with AI assistant tab
- Insights dashboard (recaps, predictions, power rankings)
- Team builder with AI suggestions
- Match submission with AI parsing

---

### ✅ Phase 3: Discord & Admin Tools (COMPLETE)

**Discord Bot** ✅
- Discord.js v14 implementation
- Slash commands for league operations
- Role management commands (admin)
- Webhook notification system
- Startup script (`scripts/start-discord-bot.ts`)

**Discord Commands Implemented**:
- `/matchups` - View weekly schedule
- `/standings` - Top 10 standings
- `/schedule` - Upcoming matches
- `/pokemon` - Pokedex lookup
- `/result` - Submit match result (coaches)
- `/recap` - Generate AI weekly recap (admin)
- `/sync-roles` - Sync Discord → app roles (admin)

**Admin Dashboard** ✅
- Stats overview (teams, matches, users)
- Quick action cards
- Google Sheets sync button
- Platform Kit integration placeholder

**Platform Kit (Supabase UI)** ✅
- Embedded Supabase management console
- Database tab with AI-powered SQL generator
- Auth configuration tab
- User management tab
- Storage management tab
- Secrets/environment variables tab
- Real-time logs viewer
- Supabase Management API proxy

**Supabase UI Components** ✅
- Enhanced Auth UI with Discord provider
- Realtime avatar stack (online presence)
- Realtime cursors (collaborative editing)
- Realtime chat widget
- File upload dropzone

---

### ⚠️ Phase 4: Advanced Features (IN PROGRESS)

**Match Center** ✅
- Match list with status badges
- Result submission form
- AI-powered result parsing from Discord text
- Differential auto-calculation
- Commissioner review workflow (pending RLS policies)

**Team Builder** ✅
- Draft budget tracking
- Pokemon search and filtering
- Type coverage analysis
- Cost calculation
- Roster validation
- Save/load teams

**Role-Based Access Control** ⚠️ (Designed, not implemented)
- Profile roles: viewer, coach, admin
- Permission system architecture documented
- Discord role sync logic designed
- Automatic role assignment (pending Discord OAuth testing)
- RLS policies written but not fully tested

**Discord Role Sync** ⚠️ (Planned)
- Bidirectional sync: Discord ↔ App
- Role mapping configuration
- Automatic sync on login
- Manual sync command for admins
- Drift detection and resolution

---

## What's Missing or Incomplete

### 🚧 High Priority (Blockers for Production)

1. **Discord OAuth Testing & Role Sync**
   - Status: Configured but not tested in live environment
   - Needs: Discord Developer Portal app setup
   - Needs: Test with real Discord server
   - Needs: Verify role sync logic end-to-end

2. **Google Sheets Migration**
   - Status: Sync logic complete but disabled in v0
   - Needs: Deploy to Vercel to enable Google API
   - Needs: Run initial data import
   - Needs: Validate data integrity after import
   - Needs: Deprecate Google Sheets as source of truth

3. **Battle Engine Completion**
   - Status: Framework exists, mechanics incomplete
   - Needs: Implement full damage calculation
   - Needs: Add status effects (burn, paralysis, etc.)
   - Needs: Weather and terrain support
   - Needs: Priority move handling
   - Needs: Integration with @pkmn/engine or Showdown sim

4. **RLS Policy Testing**
   - Status: Policies written but not validated
   - Needs: Test each role's access (viewer, coach, admin)
   - Needs: Verify coaches can only edit their own teams
   - Needs: Ensure public read access works correctly

5. **Error Handling & Validation**
   - Status: Basic error handling in place
   - Needs: Comprehensive input validation (Zod schemas)
   - Needs: User-friendly error messages
   - Needs: Error logging (Sentry integration?)
   - Needs: Graceful degradation for offline mode

### 🔧 Medium Priority (UX & Polish)

6. **Loading States & Skeletons**
   - Status: Partial (only pokedex and insights have loading.tsx)
   - Needs: Loading skeletons for all pages
   - Needs: Optimistic UI updates
   - Needs: Proper Suspense boundaries

7. **Mobile Optimization**
   - Status: Responsive layouts exist
   - Needs: Touch gesture support (swipe for tabs)
   - Needs: Bottom navigation bar for mobile
   - Needs: Simplified tables for small screens
   - Needs: Test on real devices

8. **Search & Filtering**
   - Status: Basic search in Pokedex and teams
   - Needs: Advanced filters (type, division, record)
   - Needs: Search history
   - Needs: Autocomplete suggestions
   - Needs: Debounced search input

9. **Notifications**
   - Status: Toast notifications work, Discord webhooks implemented
   - Needs: Email notifications (Resend integration?)
   - Needs: In-app notification center
   - Needs: Notification preferences
   - Needs: Push notifications (web push API?)

10. **Analytics & Monitoring**
    - Status: Vercel Analytics installed
    - Needs: Custom event tracking
    - Needs: Performance monitoring
    - Needs: Error tracking (Sentry?)
    - Needs: User behavior analytics

### 💡 Low Priority (Future Enhancements)

11. **Advanced Battle Features**
    - Battle replay viewer (visual playback)
    - Spectator mode (watch live battles)
    - Battle commentary AI (real-time narration)
    - Tournament brackets with auto-scheduling

12. **Social Features**
    - User profiles with bio and achievements
    - Friend system
    - Direct messaging
    - Team-based chat channels

13. **Trading System**
    - Trade block listings
    - Trade proposals and negotiation
    - Commissioner approval workflow
    - Trade history and audit log

14. **Draft System**
    - Live draft room with timer
    - Auto-pick for absent coaches
    - Draft history replay
    - Mock draft simulator

15. **Content Management**
    - Blog/news system for announcements
    - Rules and format documentation pages
    - FAQ section
    - Video embed support

---

## Technical Debt & Known Issues

### 🐛 Bugs & Issues

1. **Supabase Client Import Inconsistency** ⚠️
   - Issue: Some files import `createServerClient`, others import `createClient`
   - Fix: Added export alias in `lib/supabase/server.ts` and `client.ts`
   - Status: Fixed

2. **Mock Data Toggle Scattered** ⚠️
   - Issue: `USE_MOCK_DATA` flag in multiple files
   - Risk: Easy to forget to update before deployment
   - Solution: Centralize toggle or use environment variable

3. **Google API in v0 Preview** ⚠️
   - Issue: `googleapis` and `node-google-spreadsheet` break preview
   - Workaround: Disabled imports, using mock data
   - Permanent fix: Deploy to Vercel for testing

4. **Console.log Statements** ⚠️
   - Issue: Debug logs still present (e.g., `[v0] ...` in pages)
   - Risk: Performance impact, security concern
   - Action: Remove before production

5. **Hardcoded Values** ⚠️
   - Issue: Some Discord server IDs, channel IDs hardcoded
   - Risk: Breaks if IDs change
   - Action: Move to environment variables

### 🔄 Refactoring Opportunities

1. **Duplicate Code**
   - Team roster display logic repeated in multiple pages
   - Standing calculation logic duplicated
   - Suggestion: Extract to shared components/utilities

2. **Large Files**
   - `lib/mock-data.ts` (500+ lines)
   - `lib/discord-bot.ts` (300+ lines)
   - Suggestion: Split into smaller modules

3. **Type Safety**
   - Some API responses lack TypeScript types
   - Database query results not fully typed
   - Suggestion: Generate types from Supabase schema

4. **Accessibility**
   - Missing ARIA labels on some interactive elements
   - Keyboard navigation needs testing
   - Color contrast ratios should be verified

---

## Deployment Checklist

### Pre-Production Tasks

- [ ] **Environment Variables Setup**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `DISCORD_BOT_TOKEN`
  - [ ] `DISCORD_CLIENT_ID`
  - [ ] `DISCORD_CLIENT_SECRET`
  - [ ] `DISCORD_GUILD_ID`
  - [ ] `OPENAI_API_KEY`
  - [ ] `GOOGLE_SHEETS_ID`
  - [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - [ ] `GOOGLE_PRIVATE_KEY`

- [ ] **Database Setup**
  - [ ] Run `scripts/001_create_schema.sql` in Supabase
  - [ ] Run `scripts/002_enhanced_schema.sql` in Supabase
  - [ ] Verify all tables created
  - [ ] Test RLS policies with different roles
  - [ ] Create admin user manually
  - [ ] Seed initial data (seasons, divisions, conferences)

- [ ] **Discord Setup**
  - [ ] Create Discord application in Developer Portal
  - [ ] Set bot permissions (Manage Roles, Send Messages, etc.)
  - [ ] Add bot to Discord server
  - [ ] Configure OAuth redirect URLs
  - [ ] Create server roles (@Commissioner, @Coach, @Spectator)
  - [ ] Test slash command registration

- [ ] **Supabase Auth Configuration**
  - [ ] Enable Discord provider in Supabase Auth settings
  - [ ] Add Discord OAuth credentials
  - [ ] Set redirect URLs
  - [ ] Configure session settings (expiry, refresh)
  - [ ] Test login flow end-to-end

- [ ] **Google Sheets Setup**
  - [ ] Create service account in Google Cloud Console
  - [ ] Download JSON key file
  - [ ] Share Google Sheet with service account email
  - [ ] Test sync endpoint in deployed environment
  - [ ] Verify data mapping accuracy

- [ ] **Code Cleanup**
  - [ ] Remove all `console.log("[v0] ...")` statements
  - [ ] Update `USE_MOCK_DATA` to `false` in all files
  - [ ] Remove commented-out code
  - [ ] Run ESLint and fix warnings
  - [ ] Run TypeScript type check

- [ ] **Testing**
  - [ ] Test all user flows (viewer, coach, admin)
  - [ ] Test Discord OAuth login
  - [ ] Test role sync (Discord → App)
  - [ ] Test match result submission
  - [ ] Test AI features (Pokedex, recaps, coach)
  - [ ] Test team builder with draft budget
  - [ ] Test admin dashboard and Platform Kit
  - [ ] Test Discord bot commands
  - [ ] Mobile device testing

- [ ] **Performance**
  - [ ] Lighthouse audit (target: 90+ scores)
  - [ ] Image optimization (use Next.js Image component)
  - [ ] Database query optimization (add indexes)
  - [ ] Enable Vercel Edge caching where appropriate
  - [ ] Test with large datasets (100+ teams, 1000+ matches)

- [ ] **Security**
  - [ ] Verify no secrets in client-side code
  - [ ] Test RLS policies with different users
  - [ ] Enable CORS restrictions
  - [ ] Set up rate limiting (Upstash Redis?)
  - [ ] Review API endpoint authentication

- [ ] **Documentation**
  - [ ] Update README.md with deployment instructions
  - [ ] Create USER_GUIDE.md for coaches
  - [ ] Create ADMIN_GUIDE.md for commissioners
  - [ ] Document API endpoints (if needed for external tools)
  - [ ] Update .cursorrules with production patterns

### Deployment Steps

1. **Vercel Deployment**
   - [ ] Connect GitHub repo to Vercel
   - [ ] Configure environment variables in Vercel dashboard
   - [ ] Deploy main branch
   - [ ] Test deployed app
   - [ ] Set up custom domain (if applicable)

2. **Discord Bot Deployment**
   - [ ] Deploy bot to separate service (Railway, Render, or Heroku)
   - [ ] Ensure bot stays online (process manager like PM2)
   - [ ] Monitor bot uptime
   - [ ] Set up restart on crash

3. **Database Migration**
   - [ ] Run Google Sheets sync endpoint
   - [ ] Verify all data imported correctly
   - [ ] Check standings calculations
   - [ ] Validate team rosters
   - [ ] Confirm match history accuracy

4. **User Onboarding**
   - [ ] Post announcement in Discord
   - [ ] Share login instructions
   - [ ] Guide coaches through first login
   - [ ] Demonstrate team builder
   - [ ] Show how to submit results

---

## Roadmap: Next 3 Months

### Month 1: Production Launch

**Week 1-2: Pre-Launch**
- Complete Discord OAuth testing
- Deploy to Vercel (staging environment)
- Run Google Sheets migration
- Test with small group of beta users
- Fix critical bugs

**Week 3: Soft Launch**
- Open to all league members
- Monitor for errors and issues
- Gather user feedback
- Iterate on UX pain points

**Week 4: Stabilization**
- Address bug reports
- Optimize performance
- Polish UI based on feedback
- Document known issues

### Month 2: Feature Completion

**Week 5-6: Battle System**
- Complete battle engine mechanics
- Integrate @pkmn/engine or Showdown sim
- Test with sample battles
- Add battle replay viewer

**Week 7: Trading System**
- Build trade block UI
- Implement trade proposals
- Add commissioner approval flow
- Test end-to-end

**Week 8: Polish & UX**
- Add loading states everywhere
- Improve mobile experience
- Implement advanced search/filters
- Add notification center

### Month 3: Advanced Features

**Week 9-10: Live Draft**
- Build draft room interface
- Implement real-time draft updates
- Add draft timer and auto-pick
- Test with mock draft

**Week 11: Analytics & Insights**
- Add advanced stats pages
- Implement performance charts
- Build power rankings algorithm
- Create season retrospective views

**Week 12: Content & Community**
- Add news/blog system
- Create rules documentation pages
- Build user profiles with achievements
- Implement social features (friends, DMs)

---

## Long-Term Vision (6-12 Months)

### Q2 2026: Multi-Season Support
- Season archives
- Historical stats comparison
- Hall of Fame
- Season-over-season trends

### Q3 2026: Multi-League Platform
- Support multiple leagues in one app
- League discovery and registration
- Template system for league creation
- White-label options

### Q4 2026: Competitive Features
- ELO rating system
- Matchmaking algorithm
- Ladder/ranked system
- Global leaderboards

### 2027: Mobile Apps
- React Native iOS/Android apps
- Push notifications
- Offline mode
- Mobile-first battle interface

---

## Success Metrics & KPIs

### User Engagement
- [ ] Daily Active Users (DAU): Target 50+
- [ ] Weekly Active Users (WAU): Target 100+
- [ ] Average session duration: Target 10+ minutes
- [ ] Retention rate (30-day): Target 70%+

### Feature Adoption
- [ ] Match results submitted via app: Target 80%+
- [ ] Teams managed via app: Target 100%
- [ ] AI feature usage: Target 30%+ of users
- [ ] Discord bot command usage: Target 50+ commands/week

### Technical Performance
- [ ] Page load time (p95): < 2 seconds
- [ ] API response time (p95): < 500ms
- [ ] Error rate: < 1%
- [ ] Uptime: 99.9%+

### Business/Community Health
- [ ] User satisfaction: Target 4.5/5 stars
- [ ] Active leagues using platform: Target 1 → 5
- [ ] Reduce commissioner workload: Target 50% time savings

---

## Dependencies & Integrations

### Current Dependencies
- **Next.js 16** - Framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Shadcn UI** - Component library
- **Supabase** - Database, auth, realtime
- **OpenAI** - GPT-4.1 & GPT-5.2 for AI features
- **Discord.js** - Discord bot
- **Pokenode-TS** - PokéAPI wrapper
- **node-google-spreadsheet** - Google Sheets sync
- **@pkmn/engine** - Battle simulation (planned)

### Potential Future Integrations
- **Sentry** - Error tracking
- **Resend** - Email notifications
- **Upstash Redis** - Rate limiting and caching
- **Stripe** - Payments (for premium features?)
- **Vercel Cron** - Scheduled jobs (weekly recaps, etc.)

---

## Tools & Resources Roadmap

### Overview

The project now includes local development tools and resources to reduce dependency on external APIs and improve development workflow:

1. **Local PokeAPI Instance** (`tools/pokeapi-local`) - Docker-based local API
2. **PokeAPI Sprites Repository** (`resources/sprites`) - Comprehensive sprite collection
3. **PokeAPI API Data** (`resources/api-data`) - Static JSON data + JSON Schema (baseline dataset)
4. **Ditto** (`tools/ditto`) - Tool for meta operations over PokéAPI data (clone, analyze, transform)

### Local PokeAPI Instance (`tools/pokeapi-local`)

#### Current Status ✅
- Docker Compose setup complete
- All containers running (app, db, cache, web, graphql-engine)
- Database populated with all Pokemon data
- Accessible at `http://localhost/api/v2/`
- GraphQL console at `http://localhost:8080`

#### Next Steps & Use Cases

**Phase 1: Development Integration** (Immediate)
- [ ] **Create new sync scripts** using local PokeAPI
  - Bulk import scripts for initial data seeding
  - Incremental sync scripts with ETag caching
  - Queue-based sync system integration
- [ ] **Configure Edge Functions** to use local instance
  - Set `POKEAPI_BASE_URL` secret for local development
  - Test Edge Functions with local API
  - Verify queue system works with local instance
- [ ] **Development workflow documentation**
  - Quick start guide for new developers
  - Troubleshooting common issues
  - Performance comparison (local vs production)

**Phase 2: Advanced Features** (Short-term)
- [ ] **Custom data modifications**
  - Add custom Pokemon variants for league
  - Modify stats for draft league balance
  - Create league-specific metadata
- [ ] **GraphQL integration**
  - Explore GraphQL API for complex queries
  - Build GraphQL-based sync tools
  - Create GraphQL resolvers for custom data
- [ ] **Data export/backup**
  - Export Pokemon data to JSON/SQL
  - Create backup scripts for local database
  - Version control for custom modifications

**Phase 3: Production Optimization** (Medium-term)
- [ ] **Hybrid sync strategy**
  - Use local instance for bulk imports
  - Use production API for incremental updates
  - Implement smart routing based on operation type
- [ ] **Performance testing**
  - Benchmark local vs production API
  - Test rate limiting scenarios
  - Measure sync performance improvements
- [ ] **CI/CD integration**
  - Use local instance in test environments
  - Automated data validation against local API
  - Pre-deployment data consistency checks

**Phase 4: Advanced Tooling** (Long-term)
- [ ] **Custom API endpoints**
  - Create league-specific endpoints
  - Add caching layers
  - Implement custom filtering/sorting
- [ ] **Data analytics**
  - Analyze Pokemon usage patterns
  - Generate draft statistics
  - Create predictive models
- [ ] **Multi-instance support**
  - Run multiple local instances for testing
  - A/B testing with different data sets
  - Staging environment with production-like data

### PokeAPI Sprites Repository (`resources/sprites`)

#### Current Status ✅
- Repository cloned to `resources/sprites`
- 59,000+ sprite files available
- All generations (I-IX) included
- Multiple variants (shiny, female, back, etc.)
- Official artwork, icons, and items

#### Next Steps & Use Cases

**Phase 1: Sprite Integration** (Immediate)
- [ ] **CDN/Static hosting setup**
  - Configure Next.js to serve sprites from `public/` or CDN
  - Set up Vercel Blob Storage or Supabase Storage
  - Create sprite URL helper functions
- [ ] **Sprite loading optimization**
  - Implement lazy loading for sprites
  - Create sprite preloading strategies
  - Add sprite caching headers
- [ ] **Sprite selection logic**
  - Create utility to select best sprite variant
  - Support for generation-specific sprites
  - Fallback chain for missing sprites

**Phase 2: Enhanced Features** (Short-term)
- [ ] **Sprite API endpoints**
  - Create API routes for sprite serving
  - Add sprite metadata endpoints
  - Implement sprite search/filtering
- [ ] **Sprite management tools**
  - Script to sync sprites to Supabase Storage
  - Sprite validation and integrity checks
  - Sprite update automation
- [ ] **Custom sprite support**
  - Add league-specific custom sprites
  - Support for team logos/branding
  - Custom shiny variants

**Phase 3: Advanced Sprite Features** (Medium-term)
- [ ] **Sprite optimization**
  - Image compression and optimization
  - WebP/AVIF format conversion
  - Sprite atlasing for performance
- [ ] **Sprite analytics**
  - Track sprite usage patterns
  - Identify unused sprites
  - Performance metrics for sprite loading
- [ ] **Sprite variants system**
  - Dynamic sprite selection based on context
  - User preferences for sprite styles
  - Theme-based sprite selection

**Phase 4: Integration Features** (Long-term)
- [ ] **Sprite editor tools**
  - Web-based sprite editor
  - Custom sprite upload interface
  - Sprite versioning system
- [ ] **Sprite API integration**
  - Replace external sprite URLs with local
  - Implement sprite proxy for external requests
  - Create sprite CDN with edge caching
- [ ] **Advanced sprite features**
  - Animated sprite support
  - Sprite effects and overlays
  - Sprite customization for teams

### Ditto (`tools/ditto`)

#### Current Status ✅
- Repository cloned to `tools/ditto`
- Docker installation with `docker-compose.yml` and `Dockerfile`
- Python-based tool for meta operations over PokéAPI data
- Commands available: `clone`, `analyze`, `transform`
- **Primary Role**: Foundation Load engine for Poképedia bulk data ingestion

#### Poképedia Integration Use Case

Ditto is the **critical tool** for Phase A "Foundation Load" - the one-time bulk import of all PokéAPI data into Supabase. This approach:
- Respects PokeAPI fair use policies (official recommended tool)
- Avoids rate limits during bulk import
- Provides complete REST v2 corpus for offline development
- Generates JSON schema for validation and TypeScript types

#### Next Steps & Use Cases

**Phase 1: Foundation Load - Bulk Data Ingestion** (Immediate - IN PROGRESS)
- [x] **Install ditto** in `tools/ditto` with Docker support
- [x] **Verify local PokeAPI** is running and accessible
- [x] **Create import scripts** for api-data and ditto data
  - `scripts/import-api-data.ts` - Baseline dataset import
  - `scripts/import-ditto-data.ts` - Comprehensive data import
  - `scripts/build-pokepedia-projections.ts` - Projection table builder
  - `scripts/mirror-sprites-to-storage.ts` - Sprite uploader
- [ ] **Run ditto clone** against local PokeAPI instance
  - Clone complete REST v2 corpus to `tools/ditto/data/`
  - All endpoints: pokemon, moves, abilities, types, items, etc.
  - Store as JSON files organized by resource type
  - **Status**: Clone in progress (1 resource type completed)
- [ ] **Generate JSON schema** with `ditto analyze`
  - Create schema for data validation
  - Use for TypeScript type generation
  - Validate data integrity before import
- [ ] **Import baseline data** from api-data
  - Run `pnpm tsx scripts/import-api-data.ts`
  - Fast baseline import (no network calls)
  - Populates `pokeapi_resources` table
- [ ] **Import comprehensive data** from ditto
  - Run `pnpm tsx scripts/import-ditto-data.ts` after clone completes
  - Upserts will update existing records
  - Complete REST v2 corpus coverage
- [ ] **Build Projections** - Fast Query Tables
  - Run `pnpm tsx scripts/build-pokepedia-projections.ts`
  - Extract Pokemon data from `pokeapi_resources` JSONB
  - Build `pokepedia_pokemon` table with:
    - id, name, height, weight, base_experience
    - types, abilities (normalized)
    - "best sprite path" logic (official-artwork preferred)
  - Create indexes for fast UI queries
- [ ] **Mirror sprites** to Supabase Storage
  - Run `pnpm tsx scripts/mirror-sprites-to-storage.ts`
  - Upload to `pokedex-sprites` bucket
  - Track metadata in `pokepedia_assets` table

**Phase 2: Incremental Sync Setup** (Short-term)
- [ ] **Transition to queue-based sync**
  - After foundation load, switch to incremental updates
  - Use Supabase Queues (`pokepedia_ingest`) for delta ingestion
  - Schedule periodic refresh jobs
- [ ] **Data validation and monitoring**
  - Compare ditto-cloned data vs queue-synced data
  - Track data freshness and completeness
  - Alert on data inconsistencies
- [ ] **Selective re-cloning**
  - Use ditto for targeted endpoint updates
  - Re-clone specific resource types when needed
  - Maintain data versioning and audit trail

**Phase 3: Advanced Integration** (Medium-term)
- [ ] **Custom transformation pipeline**
  - Transform ditto data for league-specific needs
  - Merge with custom metadata (draft points, league rules)
  - Create enriched Pokemon records for draft system
- [ ] **Schema evolution**
  - Use ditto analyze for schema changes detection
  - Update TypeScript types automatically
  - Migrate existing data when schema changes
- [ ] **CI/CD integration**
  - Automated ditto runs in CI pipeline
  - Data validation in tests
  - Automated schema generation and type updates

**Phase 4: Advanced Features** (Long-term)
- [ ] **Custom ditto commands**
  - Create league-specific ditto extensions
  - Add custom data sources
  - Implement custom transformations
- [ ] **Data analytics**
  - Analyze cloned data for insights
  - Generate statistics and reports
  - Track data changes over time
- [ ] **Multi-source sync**
  - Sync from multiple PokeAPI instances
  - Merge data from different sources
  - Handle conflicts and duplicates

### PokeAPI API Data (`resources/api-data`)

#### Current Status ✅
- Repository cloned to `resources/api-data`
- Static JSON data available in `data/api/v2/`
- JSON Schema available in `data/schema/`
- 48+ endpoint types included (pokemon, moves, abilities, types, etc.)

#### Next Steps & Use Cases

**Phase 1: Baseline Dataset** (Immediate)
- [ ] **Use as initial seed** for Supabase import
  - Faster than ditto clone (no network calls needed)
  - Complete structured dataset ready to use
  - Import directly from `resources/api-data/data/api/v2/`
- [ ] **Schema validation**
  - Use JSON Schema from `data/schema/` for validation
  - Validate ditto-cloned data against schema
  - Generate TypeScript types from schema
- [ ] **Deterministic backfills**
  - Use api-data for repeatable imports
  - Track data versioning with git commits
  - Compare against ditto-cloned data for completeness

**Phase 2: Integration** (Short-term)
- [ ] **Hybrid import strategy**
  - Use api-data for baseline (fast)
  - Use ditto for comprehensive coverage
  - Merge and deduplicate data sources
- [ ] **Schema-driven development**
  - Generate Postgres table schemas from JSON Schema
  - Create TypeScript types automatically
  - Validate all imports against schema
- [ ] **Data comparison tools**
  - Compare api-data vs ditto-cloned data
  - Identify missing or updated resources
  - Track data freshness

**Phase 3: Advanced Features** (Medium-term)
- [ ] **Automated updates**
  - Pull api-data updates regularly
  - Track schema changes
  - Update TypeScript types automatically
- [ ] **Data quality checks**
  - Validate data integrity using schema
  - Compare structure across versions
  - Generate data quality reports

### PokeAPI Cries (`resources/cries`)

#### Current Status ✅
- Repository cloned to `resources/cries`
- Latest cries: 1,302+ OGG files (Generations 1-9)
- Legacy cries: 649 OGG files (historical)
- Files mapped by Pokémon ID for easy lookup

#### Next Steps & Use Cases

**Phase 1: Audio Integration** (Short-term)
- [ ] **Mirror to Supabase Storage**
  - Create `pokedex-cries` bucket
  - Upload latest and legacy cries
  - Preserve directory structure
  - Track metadata in `pokepedia_assets` table
- [ ] **CDN Access**
  - Serve cries via Supabase Storage CDN
  - Fast audio delivery for Poképedia features
  - Fallback to local files during development

**Phase 2: Feature Integration** (Medium-term)
- [ ] **Pokémon Detail Pages**
  - Play cry when viewing Pokémon information
  - Audio preview controls
  - Latest vs legacy cry comparison
- [ ] **Battle Simulations**
  - Play cries when Pokémon enter battle
  - Enhance battle experience with authentic audio
  - Sound effects integration
- [ ] **Interactive Features**
  - Click-to-play cry buttons
  - Audio galleries for Pokémon collections
  - Cry comparison tools

**Phase 3: Advanced Features** (Long-term)
- [ ] **Audio Analytics**
  - Track most-played cries
  - User preferences for audio
  - Audio quality metrics
- [ ] **Custom Audio**
  - Support for user-uploaded cries
  - Community audio contributions
  - Audio versioning and history

### Integration Opportunities

**Combined Workflows**
- [ ] **Unified sync system**
  - Use api-data for baseline (fast seeding)
  - Use ditto to clone comprehensive data from local PokeAPI
  - Transform and import to Supabase
  - Automatically fetch and cache sprites
  - Mirror cries to storage
  - Create complete Pokemon records with sprites and audio
- [ ] **Development tools**
  - Scripts that use api-data, ditto, local API, sprites, and cries
  - Data validation across all resources using JSON Schema
  - Comprehensive Pokemon data management (visual + audio)
- [ ] **Testing infrastructure**
  - Use api-data for test datasets (deterministic)
  - Use ditto to create custom test scenarios
  - Use local tools for integration testing
  - Mock external dependencies
  - Faster test execution
  - Audio testing with local cries

**Performance Benefits**
- [ ] **Reduced external dependencies**
  - No rate limits during development
  - Faster local development cycles
  - Offline development capability
- [ ] **Cost optimization**
  - Reduced API calls to production
  - Lower bandwidth usage
  - Better development experience
- [ ] **Data consistency**
  - Single source of truth with ditto clones
  - Version-controlled data
  - Reproducible builds

### Implementation Priority

**High Priority** (Next Sprint)
1. ✅ **Ditto Installation** - Complete (installed in `tools/ditto`)
2. ✅ **Local PokeAPI Running** - Verified and accessible
3. ✅ **API Data Repository** - Installed in `resources/api-data` (baseline dataset + schema)
4. 🔄 **Ditto Clone** - Currently running (Phase A Foundation Load)
5. ⏳ **Import to Supabase** - Import data (api-data baseline + ditto comprehensive) into `pokeapi_resources` table
6. ⏳ **Build Projections** - Create `pokepedia_pokemon` from canonical data
7. ⏳ **Set up sprite CDN/static hosting** - Mirror `resources/sprites` to Supabase Storage
8. ⏳ **Configure Edge Functions** - Set up for local development with local PokeAPI

**Medium Priority** (Next Month)
1. Sprite API endpoints
2. GraphQL integration with local PokeAPI
3. Sprite optimization and caching

**Low Priority** (Future)
1. Custom data modifications
2. Advanced sprite features
3. Multi-instance support

---

## Team & Resources

### Current Team
- **Developer**: Solo (v0 + Cursor AI assistance)
- **Commissioner/Product Owner**: League admin (TBD)
- **Beta Testers**: 5-10 league members

### Skills Needed
- **Backend**: Supabase, PostgreSQL, API design
- **Frontend**: React, Next.js, Tailwind
- **AI/ML**: OpenAI API, prompt engineering
- **DevOps**: Vercel deployment, Discord bot hosting
- **Design**: UI/UX for sports/gaming aesthetics

---

## Risk Assessment

### High Risk
1. **Google Sheets Migration Data Loss**
   - Mitigation: Backup sheet, test sync thoroughly, manual verification

2. **Discord Bot Downtime**
   - Mitigation: Deploy to reliable service, implement auto-restart, monitoring

3. **OpenAI API Costs**
   - Mitigation: Set spending limits, cache responses, use cheaper models where appropriate

4. **Battle Engine Complexity**
   - Mitigation: Use existing library (@pkmn/engine), start with simplified rules

### Medium Risk
5. **User Adoption Resistance**
   - Mitigation: Gradual rollout, clear user guides, responsive to feedback

6. **Performance Issues at Scale**
   - Mitigation: Database indexing, edge caching, load testing

7. **Role Sync Bugs**
   - Mitigation: Comprehensive testing, manual sync fallback, clear error messages

### Low Risk
8. **Design Inconsistencies**
   - Mitigation: Design system with Shadcn UI, code reviews

9. **Mobile Experience**
   - Mitigation: Responsive design from start, mobile device testing

---

## Conclusion

The Pokemon Draft League Operating System is 70% complete in terms of core functionality. The foundation is solid with authentication, database, AI integration, and Discord bot all implemented. The remaining 30% focuses on:

1. Production readiness (testing, deployment, migration)
2. Battle engine completion
3. UX polish and mobile optimization
4. Advanced features (trading, live draft)

With focused effort over the next 3 months, the app can be fully production-ready and serving the league's needs comprehensively.

---

## Change Log

### v1.0.1-beta (January 13, 2026)
- **Tools & Resources Integration**
  - Installed local PokeAPI instance (`tools/pokeapi-local`)
  - Cloned PokeAPI sprites repository (`resources/sprites`)
  - Created comprehensive roadmap for tools and resources
  - Removed legacy sync scripts (preparing for new sync system)
  - Updated documentation with new tooling information

### v1.0.0-beta (January 2026)
- Initial build with all core pages
- Supabase auth and database setup
- OpenAI integration (GPT-4.1 & GPT-5.2)
- Discord bot with slash commands
- Platform Kit integration
- Mock data for v0 preview

### v0.9.0 (Pre-release)
- Project planning and architecture
- Technology stack selection
- Design system creation

---

**Last Updated**: January 13, 2026  
**Next Review**: February 1, 2026

---

## Poképedia Ingestion Pipeline Status

### Current Phase: Foundation Load (Phase A)

**Status**: 🔄 In Progress

#### Completed ✅
- [x] Local PokeAPI instance installed and running (`tools/pokeapi-local`)
- [x] PokeAPI sprites repository cloned (`resources/sprites`)
- [x] Ditto tool installed (`tools/ditto`)
- [x] Local PokeAPI verified and accessible
- [x] Ditto clone process initiated

#### In Progress 🔄
- [ ] Ditto clone completing (running in background)
- [ ] Data validation and schema generation

#### Next Steps ⏳
- [ ] Import ditto data to `pokeapi_resources` table
- [ ] Mirror sprites to Supabase Storage (`pokedex-sprites` bucket)
- [ ] Build `pokepedia_pokemon` projections from canonical data
- [ ] Set up incremental sync with Supabase Queues

### Architecture Reference

See `temp/pokepedia-infra.md` for complete architecture details:
- Three data planes (canonical, projection, media)
- Ingestion strategy (ditto for bulk, queues for incremental)
- Sprite mirroring approach
- Best practices and fair use compliance
