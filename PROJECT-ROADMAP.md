# Pokemon Draft League - Project Roadmap & Progress Summary

## Executive Summary

**Project Name**: Average at Best Draft League - Pokemon Draft League Operating System  
**Status**: Development Phase (v0 → Production)  
**Current Version**: v1.0.0-beta  
**Last Updated**: January 2026

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

**Last Updated**: January 12, 2026  
**Next Review**: February 1, 2026
