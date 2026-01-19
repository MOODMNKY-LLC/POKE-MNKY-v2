# Admin Panel - Draft Session Management Requirements

**Date**: January 19, 2026  
**Priority**: High  
**Status**: 📋 Planning Required

---

## Overview

Create an admin panel section for configuring and initiating draft sessions per what our database and code expects. This will provide a user-friendly interface for managing draft sessions without requiring direct database access or API calls.

---

## Requirements Analysis

### Current Process (Manual)

**To create a draft session, admins currently need to**:
1. Ensure current season exists (`is_current = true`)
2. Ensure teams exist for that season (minimum 2 teams)
3. Call `POST /api/draft/create-session` API endpoint
4. Or run setup script: `pnpm exec tsx scripts/setup-draft-test-environment.ts`

**Problems**:
- ❌ Requires technical knowledge
- ❌ No UI for configuration
- ❌ No validation before creation
- ❌ No visibility into existing sessions
- ❌ No way to manage/complete sessions

---

## Admin Panel Requirements

### 1. Draft Session Management Page

**Route**: `/admin/draft/sessions` or `/dashboard/admin/draft-sessions`

**Features**:

#### 1.1 Current Session Status
- ✅ Display active draft session (if exists)
  - Session ID
  - Season name
  - Current round/pick
  - Current team's turn
  - Total teams
  - Started at timestamp
- ✅ Display session statistics
  - Total picks made
  - Picks remaining
  - Average pick time
  - Teams completed

#### 1.2 Create New Session
- ✅ Form to create draft session
  - **Season Selection**: Dropdown of seasons (defaults to current season)
  - **Team Selection**: Multi-select of teams for this season (defaults to all teams)
  - **Draft Type**: Radio buttons (Snake, Linear, Auction) - defaults to Snake
  - **Pick Time Limit**: Number input (seconds, defaults to 45)
  - **Auto-Draft Enabled**: Checkbox (defaults to false)
- ✅ Validation
  - Minimum 2 teams required
  - Season must exist
  - Teams must belong to selected season
  - Warn if active session already exists
- ✅ Action buttons
  - "Create Session" (primary)
  - "Cancel" (secondary)

#### 1.3 Manage Existing Sessions
- ✅ List all draft sessions (active, completed, cancelled)
- ✅ Filter by status
- ✅ Filter by season
- ✅ Actions per session:
  - **View Details**: Show full session info
  - **Complete Session**: Mark as completed
  - **Cancel Session**: Mark as cancelled
  - **Resume Session**: Reactivate paused session
  - **Delete Session**: Remove (with confirmation)

#### 1.4 Session Details View
- ✅ Full session information
  - Session metadata (ID, status, type, etc.)
  - Turn order display
  - Current turn highlighting
  - Pick history
  - Team budgets
  - Draft progress visualization

---

### 2. Prerequisites Management

#### 2.1 Season Management
- ✅ List all seasons
- ✅ Create new season
- ✅ Set season as current (`is_current = true`)
- ✅ Edit season details
- ✅ View season statistics

#### 2.2 Team Management
- ✅ List teams for selected season
- ✅ Create teams for season
- ✅ Edit team details
- ✅ Verify teams have coaches
- ✅ Team count validation (minimum 2)

#### 2.3 Draft Pool Status
- ✅ Check draft pool population
  - Total Pokemon available
  - Pokemon by point tier
  - Pokemon by generation
  - Missing pokemon_id mappings
- ✅ Link to draft pool management page

---

### 3. Draft Configuration

#### 3.1 Session Settings
- ✅ Draft type selection
- ✅ Pick time limit configuration
- ✅ Auto-draft settings
- ✅ Round configuration (default: 11 rounds)
- ✅ Budget configuration (default: 120 points)

#### 3.2 Team Order Management
- ✅ View turn order
- ✅ Manual turn order override (if needed)
- ✅ Shuffle turn order
- ✅ Custom order input

---

## Database Schema Reference

### Tables Used

**`seasons`**:
- `id` UUID (PK)
- `name` TEXT
- `is_current` BOOLEAN
- `start_date` DATE
- `end_date` DATE

**`teams`**:
- `id` UUID (PK)
- `name` TEXT
- `season_id` UUID (FK)
- `coach_id` UUID (FK)
- `division` TEXT
- `conference` TEXT

**`draft_sessions`**:
- `id` UUID (PK)
- `season_id` UUID (FK)
- `status` TEXT (`pending`, `active`, `paused`, `completed`, `cancelled`)
- `draft_type` TEXT (`snake`, `linear`, `auction`)
- `total_teams` INTEGER
- `total_rounds` INTEGER
- `current_round` INTEGER
- `current_pick_number` INTEGER
- `current_team_id` UUID (FK)
- `turn_order` JSONB (array of team UUIDs)
- `pick_time_limit_seconds` INTEGER
- `auto_draft_enabled` BOOLEAN
- `started_at` TIMESTAMPTZ
- `completed_at` TIMESTAMPTZ

**`draft_budgets`**:
- `team_id` UUID (FK)
- `season_id` UUID (FK)
- `total_points` INTEGER (default: 120)
- `spent_points` INTEGER
- `remaining_points` INTEGER

**`draft_pool`**:
- `pokemon_name` TEXT
- `point_value` INTEGER
- `season_id` UUID (FK)
- `status` ENUM (`available`, `drafted`, `banned`, `unavailable`)
- `pokemon_id` INTEGER (FK to `pokemon_cache`)

---

## API Endpoints to Use

### Existing Endpoints
- ✅ `GET /api/draft/status` - Get active session
- ✅ `POST /api/draft/create-session` - Create new session
- ✅ `GET /api/draft/available` - Get available Pokemon
- ✅ `GET /api/draft/team-status` - Get team budget

### New Endpoints Needed
- ⏳ `GET /api/admin/draft/sessions` - List all sessions
- ⏳ `GET /api/admin/draft/sessions/:id` - Get session details
- ⏳ `PATCH /api/admin/draft/sessions/:id` - Update session (status, etc.)
- ⏳ `DELETE /api/admin/draft/sessions/:id` - Delete session
- ⏳ `GET /api/admin/seasons` - List seasons
- ⏳ `POST /api/admin/seasons` - Create season
- ⏳ `PATCH /api/admin/seasons/:id` - Update season
- ⏳ `GET /api/admin/teams` - List teams for season
- ⏳ `GET /api/admin/draft/prerequisites` - Check prerequisites status

---

## UI Components Needed

### Shadcn Components
- ✅ `Card` - Container for sections
- ✅ `Table` - Session/team lists
- ✅ `Dialog` - Create/edit modals
- ✅ `Form` - Form handling
- ✅ `Select` - Dropdowns
- ✅ `Input` - Text inputs
- ✅ `Checkbox` - Boolean inputs
- ✅ `Button` - Actions
- ✅ `Badge` - Status indicators
- ✅ `Alert` - Warnings/errors
- ✅ `Tabs` - Organize sections

### MagicUI Components (Optional)
- ⏳ `AnimatedList` - Session list animations
- ⏳ `NumberTicker` - Statistics display
- ⏳ `BlurFade` - Smooth transitions

---

## Implementation Plan

### Phase 1: Basic Session Management
1. ✅ Create admin route: `/admin/draft/sessions`
2. ✅ List active/completed sessions
3. ✅ Create session form
4. ✅ Basic validation
5. ✅ Integration with existing API

### Phase 2: Prerequisites Management
1. ⏳ Season management UI
2. ⏳ Team management UI
3. ⏳ Prerequisites checker
4. ⏳ Validation warnings

### Phase 3: Advanced Features
1. ⏳ Session details view
2. ⏳ Session actions (complete, cancel, resume)
3. ⏳ Turn order management
4. ⏳ Statistics and analytics

### Phase 4: Polish
1. ⏳ Loading states
2. ⏳ Error handling
3. ⏳ Success notifications
4. ⏳ Mobile responsiveness

---

## User Flow

### Creating a Draft Session

```
Admin navigates to /admin/draft/sessions
    ↓
Page loads and checks prerequisites
    ↓
If prerequisites met:
  - Shows "Create Session" button
  - Displays current session (if exists)
    ↓
Admin clicks "Create Session"
    ↓
Form opens with:
  - Season selector (defaults to current)
  - Team multi-select (defaults to all)
  - Draft type (defaults to Snake)
  - Pick time limit (defaults to 45)
    ↓
Admin reviews and clicks "Create"
    ↓
Validation runs:
  - Season exists? ✅
  - At least 2 teams? ✅
  - No active session? ✅
    ↓
API call: POST /api/draft/create-session
    ↓
Success → Show success message, refresh list
Error → Show error message, highlight issues
```

### Managing Existing Sessions

```
Admin views session list
    ↓
Filters by status/season
    ↓
Clicks on session → Details view
    ↓
Available actions:
  - Complete (if active)
  - Cancel (if active/paused)
  - Resume (if paused)
  - Delete (with confirmation)
    ↓
Action confirmed → API call → Refresh list
```

---

## Validation Rules

### Before Creating Session

**Required**:
- ✅ Current season exists (`is_current = true`)
- ✅ At least 2 teams exist for season
- ✅ No active session exists for season

**Recommended**:
- ⚠️ Draft pool populated (at least some Pokemon available)
- ⚠️ Teams have coaches assigned
- ⚠️ Budgets initialized (auto-handled by API)

**Warnings**:
- ⚠️ Less than 20 teams (unusual but allowed)
- ⚠️ Draft pool empty or very small
- ⚠️ Teams missing coaches

---

## Error Handling

### Common Errors

**"No current season found"**:
- Show: "Please create a season first"
- Action: Link to season management

**"No teams found for this season"**:
- Show: "Please create teams for this season first"
- Action: Link to team management

**"Active draft session already exists"**:
- Show: "An active session already exists. Complete or cancel it first."
- Action: Link to existing session, show "Complete" button

**"At least 2 teams are required"**:
- Show: "You need at least 2 teams to create a draft session"
- Action: Link to team management

---

## Success Criteria

### Must Have
- ✅ Create draft session via UI
- ✅ View active/completed sessions
- ✅ Complete/cancel sessions
- ✅ Prerequisites validation
- ✅ Error handling

### Should Have
- ⏳ Session details view
- ⏳ Turn order visualization
- ⏳ Statistics display
- ⏳ Bulk operations

### Nice to Have
- ⏳ Session templates
- ⏳ Scheduled sessions
- ⏳ Email notifications
- ⏳ Export session data

---

## Related Documentation

- **API Endpoints**: `docs/API-ENDPOINTS-FOR-NEXTJS-APP.md`
- **Draft System**: `docs/DRAFT-SYSTEM-COMPREHENSIVE-UPDATE-PLAN.md`
- **Session Start Guide**: `docs/DRAFT-SESSION-START-GUIDE.md`
- **Troubleshooting**: `docs/DRAFT-SESSION-TROUBLESHOOTING.md`

---

## Next Steps

1. ⏳ Design UI mockups
2. ⏳ Create admin route structure
3. ⏳ Implement prerequisites checker
4. ⏳ Build create session form
5. ⏳ Add session list/management
6. ⏳ Test end-to-end flow
7. ⏳ Add error handling and validation
8. ⏳ Polish UI/UX

---

**Last Updated**: January 19, 2026  
**Status**: 📋 Planning - Ready for Implementation  
**Priority**: High - Needed for production use
