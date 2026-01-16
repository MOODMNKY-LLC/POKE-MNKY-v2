# In-App Drafting Workflow - Research Plan

> **Goal**: Design and implement a complete in-app drafting system to replace Google Sheets dependency
> **Status**: Research Phase - Plan Presented

---

## 🎯 Research Themes

### Theme 1: Current Architecture & Tech Stack Analysis
**Key Questions:**
- How does Google Sheets integration currently work?
- What authentication patterns are used (service account, OAuth)?
- How is data synced between Sheets and Supabase?
- What are the current sync patterns and limitations?

**Aspects to Analyze:**
- Google Sheets API usage (`node-google-spreadsheet`, `googleapis`)
- Service account authentication flow
- Sync job patterns (`sync_jobs` table, `google-sheets-sync.ts`)
- Data transformation and parsing logic

**Expected Research Approach:**
- Review `lib/google-sheets-sync.ts` and related parsers
- Analyze `app/api/sync/google-sheets/route.ts`
- Examine database schema for sync tracking
- Understand current limitations and pain points

---

### Theme 2: Drafting System Assessment
**Key Questions:**
- What drafting functionality already exists?
- How does the DraftSystem class work?
- What API endpoints are available?
- What's missing for a complete in-app experience?

**Aspects to Analyze:**
- `lib/draft-system.ts` - Core drafting logic
- API routes: `/api/draft/pick`, `/api/draft/status`, `/api/draft/available`
- Database schema: `draft_sessions`, `draft_pool`, `team_rosters`, `draft_budgets`
- Discord bot draft commands (`/draft`, `/draft-status`, `/draft-available`)

**Expected Research Approach:**
- Review DraftSystem class methods and logic
- Analyze API route implementations
- Examine database schema relationships
- Identify gaps in current implementation

---

### Theme 3: Free Agency System Design
**Key Questions:**
- How does free agency currently work (Google Sheets)?
- What's the N8N workflow design for automation?
- How should free agency work in-app?
- What validation and rules need to be enforced?

**Aspects to Analyze:**
- Current Google Sheets free agency flow (F2:G11, D2:E11)
- Master Data Sheet update logic
- N8N workflow design and implementation
- League rules: budget (120pts), roster size (8-10), transaction limits (10 F/A moves)
- Transaction types: replacement, addition, drop-only

**Expected Research Approach:**
- Review free agency documentation (`DRAFT-AND-FREE-AGENCY-LOGIC-VERIFIED.md`)
- Analyze N8N workflow design
- Design in-app free agency UI and API
- Plan transaction validation logic

---

### Theme 4: Integration Points & Real-time Requirements
**Key Questions:**
- How should Supabase Realtime be used for draft room?
- What Discord bot enhancements are needed?
- How should N8N workflows integrate with in-app system?
- What real-time updates are needed?

**Aspects to Analyze:**
- Supabase Realtime patterns (`broadcast`, `presence`)
- Discord bot command structure
- N8N workflow triggers and webhooks
- Real-time draft room requirements (turn notifications, pick updates)

**Expected Research Approach:**
- Review Realtime implementation patterns (`.cursor/rules/use-realtime.mdc`)
- Analyze Discord bot architecture
- Design real-time draft room with Supabase Realtime
- Plan Discord bot enhancements for draft notifications

---

### Theme 5: Frontend UI & User Experience
**Key Questions:**
- What frontend components exist for drafting?
- What UI patterns should be used?
- How should the draft room look and function?
- What user experience is needed for coaches?

**Aspects to Analyze:**
- Existing UI components and patterns
- Shadcn UI component library usage
- Real-time UI patterns (RealtimeChat, RealtimeAvatarStack)
- Draft room layout and interaction design

**Expected Research Approach:**
- Search for existing draft UI components
- Review UI component patterns (`components/realtime/`)
- Design draft room UI mockup
- Plan user interaction flows

---

## 🔍 Research Execution Plan

### Phase 1: Initial Landscape Analysis
**Tools**: Codebase search, file reading
**Focus**: Understand current state comprehensively
**Deliverables**: 
- Architecture overview
- Current system capabilities
- Identified gaps and limitations

### Phase 2: Deep Investigation
**Tools**: Sequential Thinking, codebase analysis
**Focus**: Deep dive into each theme
**Deliverables**:
- Detailed analysis per theme
- Integration patterns identified
- Technical requirements documented

### Phase 3: Knowledge Integration
**Tools**: Sequential Thinking, documentation creation
**Focus**: Synthesize findings into implementation plan
**Deliverables**:
- Complete architecture design
- Implementation roadmap
- Technical specifications

---

## 📋 Expected Deliverables

1. **Current State Analysis Document**
   - Architecture overview
   - Existing capabilities
   - Gaps and limitations

2. **In-App Drafting System Design**
   - Complete workflow design
   - Database schema enhancements
   - API endpoint specifications
   - Frontend component designs

3. **Free Agency System Design**
   - In-app free agency workflow
   - Transaction validation logic
   - Integration with N8N (if needed)
   - Database schema for tracking

4. **Real-time Draft Room Design**
   - Supabase Realtime implementation
   - UI/UX design
   - Discord bot integration
   - Notification system

5. **Implementation Roadmap**
   - Phased implementation plan
   - Priority ordering
   - Dependencies identified
   - Testing strategy

---

**Status**: Research plan presented - Awaiting approval to proceed with deep investigation cycles.
