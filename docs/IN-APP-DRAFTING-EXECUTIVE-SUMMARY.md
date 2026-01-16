# In-App Drafting System - Executive Summary

> **Status**: ✅ Analysis Complete - Implementation Ready
> **Goal**: Replace Google Sheets dependency with full in-app drafting experience

---

## 🎯 Key Findings

### ✅ Backend is 80% Complete
- **DraftSystem class**: Fully implemented with all core methods
- **API routes**: Complete (`/api/draft/pick`, `/status`, `/available`, `/team-status`)
- **Database schema**: Complete (`draft_sessions`, `draft_pool`, `team_rosters`, `draft_budgets`)
- **Discord bot**: Basic draft commands exist

### ❌ Frontend is 0% Complete
- **No draft room page** (`/app/draft/page.tsx` doesn't exist)
- **No draft UI components** (DraftBoard, TeamRoster, TurnIndicator)
- **No real-time integration** (Supabase Realtime not connected)
- **No free agency UI** (Google Sheets only)

---

## 🏗️ Architecture Overview

### Current Flow (Google Sheets)
```
Google Sheets (Master Data Sheet)
  ↓
N8N Workflow (monitors F2:G11)
  ↓
Updates Master Data Sheet cells
  ↓
Draft Board reflects changes (via formulas)
```

### Proposed Flow (In-App)
```
Draft Room UI (/app/draft)
  ↓
API Routes (/api/draft/pick)
  ↓
DraftSystem.makePick()
  ↓
Supabase (team_rosters, draft_budgets)
  ↓
Supabase Realtime (broadcast to all users)
  ↓
All clients update in real-time
```

---

## 📋 Implementation Priority

### Phase 1: Draft Room (Highest Impact)
**Why First**: Enables complete in-app drafting experience
**Components**: Draft Room Page, DraftBoard, TeamRoster, TurnIndicator
**Timeline**: Week 1

### Phase 2: Real-time Integration
**Why Second**: Makes draft room truly live
**Components**: Supabase Realtime subscriptions, database triggers
**Timeline**: Week 1-2

### Phase 3: Free Agency System
**Why Third**: Eliminates Google Sheets dependency
**Components**: Free Agency UI, API endpoints, validation
**Timeline**: Week 2-3

### Phase 4: Discord Bot Enhancement
**Why Fourth**: Complements app with notifications
**Components**: Enhanced commands, notifications
**Timeline**: Week 3

---

## 🔗 Integration Strategy

### Supabase Realtime
- **Use**: `broadcast` for pick events and turn changes
- **Use**: `presence` for online users
- **Channels**: `draft:${sessionId}:picks`, `draft:${sessionId}:turn`, `draft:${sessionId}:users`
- **Triggers**: Database triggers for automatic broadcasts

### Discord Bot
- **Enhance**: Add turn notifications, draft room links
- **Add**: Free agency commands
- **Role**: Complement app, provide convenience

### N8N Workflow
- **Continue**: Google Sheets sync (backup)
- **Future**: Optional webhook integration
- **Migration**: Gradual transition, maintain compatibility

### Google Sheets
- **Keep**: For backup and legacy support
- **Enhance**: Reverse sync (Supabase → Sheets)
- **Use Case**: Export for offline access

---

## 📊 Database Enhancements Needed

### Free Agency Tables
```sql
-- Transaction tracking
CREATE TABLE free_agency_transactions (...)
-- Transaction count
CREATE TABLE team_transaction_counts (...)
```

### Realtime Triggers
```sql
-- Broadcast draft picks
CREATE TRIGGER draft_pick_broadcast ...
-- Broadcast turn changes
CREATE TRIGGER draft_turn_broadcast ...
```

---

## 🎨 UI/UX Design

### Draft Room Layout
- **Left Panel**: Draft Board (Pokemon grid with filters)
- **Right Panel**: Team Roster + Budget
- **Bottom**: Pick History + Chat
- **Top**: Turn Indicator + Timer

### Free Agency Layout
- **Current Roster**: List with drop buttons
- **Add Pokemon**: Search and select
- **Drop Pokemon**: Select from roster
- **Transaction Preview**: Validation before submit

---

## 🚀 Next Steps

1. **Create Draft Room Page** (`/app/draft/page.tsx`)
2. **Build Core Components** (DraftBoard, TeamRoster, TurnIndicator)
3. **Implement Real-time** (Supabase Realtime subscriptions)
4. **Build Free Agency UI** (`/app/free-agency/page.tsx`)
5. **Enhance Discord Bot** (notifications, commands)
6. **Test End-to-End** (draft flow, free agency flow)

---

**Status**: ✅ Ready to begin implementation
