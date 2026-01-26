# Teams Sidebar Group - Comprehensive Breakdown

## Executive Summary

This document provides a comprehensive analysis of all team-related functionality in the POKE MNKY application to inform the design of the "Teams" sidebar groups in the dashboard.

**Critical Architecture Understanding:**
POKE MNKY has **two distinct team concepts**:

1. **General Teams** (`showdown_teams`) - Available to all users, for casual/showdown use
   - No coach status required
   - Used for fun, practice, showdown integration
   - Can optionally link to league teams
   - Stock teams available to all

2. **League/Drafted Teams** (`teams` + `draft_picks`) - Bound by league rules
   - Coaches only (assigned to teams)
   - Official competition teams
   - Draft picks, free agency, trades
   - Bound by roster limits, draft budget, league rules

**Sidebar Structure:**
- **Teams** section (all users) - General/showdown teams
- **My League Team** section (coaches only) - Drafted/league teams

See `docs/TEAMS-ARCHITECTURE-ANALYSIS.md` for complete architecture details.

---

## 1. Current Team-Related Pages & Routes

### Public Pages (Available to All Users)
- **`/teams`** - Team directory listing all teams
  - Shows teams grouped by division
  - Displays team name, coach, division, conference
  - Links to individual team pages
  
- **`/teams/[id]`** - Individual team detail page
  - Shows team information (name, coach, division, conference)
  - Displays team roster with Pokemon
  - Shows recent matches (last 5)
  - Team statistics and performance

- **`/teams/builder`** - Team builder tool
  - Available to all users (coach role recommended)
  - Build teams with draft budget (120 points)
  - Type coverage analysis
  - Moveset recommendations
  - Pokemon selection with point costs

### Dashboard Pages (Coach-Specific)
- **`/dashboard/free-agency`** - Free agency management
  - View available Pokemon
  - Submit free agency transactions
  - View transaction history
  - AI assistant for free agency decisions
  - Team status and budget tracking

- **`/dashboard/team`** - Team management (NOT YET CREATED)
  - Would show coach's own team
  - Roster management
  - Team information

- **`/dashboard/team/builder`** - Team builder (NOT YET CREATED)
  - Similar to `/teams/builder` but coach-specific

- **`/dashboard/team/stats`** - Team statistics (NOT YET CREATED)
  - Team performance metrics
  - Battle statistics
  - Roster analysis

---

## 2. Database Schema - Team-Related Tables

### Core Tables

**`teams`** table:
- `id` (UUID) - Primary key
- `name` / `team_name` - Team name
- `coach_id` - References `coaches.id`
- `coach_name` - Coach display name
- `division` - Division name (Kanto, Johto, Hoenn, Sinnoh)
- `conference` - Conference name (Lance, Leon)
- `season_id` - References `seasons.id`
- `division_id` - References `divisions.id`
- `franchise_key` - Stable identifier across seasons
- `wins`, `losses`, `differential` - Battle statistics
- `current_streak`, `streak_type` - Win/loss streak
- `strength_of_schedule` - Calculated metric
- `logo_url`, `theme` - Visual customization
- `created_at`, `updated_at` - Timestamps

**`team_rosters`** table:
- `id` (UUID) - Primary key
- `team_id` - References `teams.id`
- `pokemon_id` - References `pokemon.id`
- `draft_round` - Round when drafted
- `draft_order` - Order within round
- `draft_points` - Points spent on this Pokemon
- `season_id` - References `seasons.id`
- `created_at` - Timestamp

**`coaches`** table:
- `id` (UUID) - Primary key
- `user_id` - References `auth.users.id`
- `discord_id` - Discord user ID
- `discord_user_id` - Discord snowflake ID
- `coach_name` - Display name
- `discord_handle` - Discord username
- `showdown_username` - Showdown account
- `github_name`, `smogon_name` - External profiles
- `timezone` - Coach timezone
- `active` - Whether coach is active
- `notes` - Admin notes
- `created_at`, `updated_at` - Timestamps

**`draft_budgets`** table:
- `id` (UUID) - Primary key
- `team_id` - References `teams.id`
- `season_id` - References `seasons.id`
- `total_points` - Total budget (120 points)
- `spent_points` - Points already spent
- `remaining_points` - Available points
- `tera_budget` - Tera captain budget (15 points)
- `tera_spent` - Tera points spent

**`free_agency_transactions`** table:
- `id` (UUID) - Primary key
- `team_id` - References `teams.id`
- `season_id` - References `seasons.id`
- `pokemon_id` - References `pokemon.id`
- `transaction_type` - 'add' or 'drop'
- `draft_points_cost` - Points cost
- `status` - 'pending', 'approved', 'rejected'
- `processed_at` - When transaction was processed
- `created_at` - Timestamp

---

## 3. Team-Related API Endpoints

### Team Management APIs
- **`GET /api/teams/[teamId]/roster`** - Get team roster
  - Returns roster with Pokemon details
  - Includes draft information

- **`POST /api/admin/assign-coach`** - Assign coach to team
  - Admin-only endpoint
  - Links coach to team

### Free Agency APIs
- **`GET /api/free-agency/available`** - Get available Pokemon
  - Lists Pokemon available for free agency
  - Filters by eligibility

- **`GET /api/free-agency/team-status`** - Get team free agency status
  - Returns team's transaction count
  - Shows remaining budget
  - Transaction limits

- **`POST /api/free-agency/submit`** - Submit free agency transaction
  - Add or drop Pokemon
  - Validates budget and eligibility

- **`GET /api/free-agency/transactions`** - Get transaction history
  - Lists all transactions for a team
  - Includes status and details

- **`POST /api/free-agency/process`** - Process transaction (admin)
  - Approve/reject transactions
  - Admin-only

### Showdown Team APIs
- **`GET /api/showdown/teams`** - Get Showdown teams
  - Lists teams from Showdown client
  - For sync purposes

- **`GET /api/showdown/teams/[id]`** - Get specific Showdown team
  - Team details from Showdown

- **`POST /api/showdown/validate-team`** - Validate team format
  - Validates team against roster
  - Checks eligibility

---

## 4. Team-Related Components

### Existing Components

**`components/admin/coach-assignment-section.tsx`**:
- Coach assignment UI
- Lists coaches and teams
- Assigns coaches to teams
- Used in `/admin/teams`

**`components/free-agency/transaction-form.tsx`**:
- Form for submitting free agency transactions
- Add/drop Pokemon selection
- Budget validation

**`components/free-agency/available-pokemon-browser.tsx`**:
- Browse available Pokemon
- Filter and search
- Shows eligibility and costs

**`components/free-agency/transaction-history.tsx`**:
- Display transaction history
- Shows status and details

**`components/profile/coach-card.tsx`**:
- Displays coach's team information
- Shows team name, logo, stats
- Configurable by coach

**`components/profile/showdown-teams-section.tsx`**:
- Shows Showdown teams synced to profile
- Team library integration

**`components/showdown/team-validator.tsx`**:
- Validates team format
- Checks against roster

**`components/showdown/team-visual-display.tsx`**:
- Visual team display
- Shows Pokemon sprites

**`components/team-switcher.tsx`**:
- Team switcher for sidebar header
- Shows coach's team

---

## 5. Current Sidebar Structure

### Existing "My Team" Section (Coach-Only)
Currently shown only when `userProfile?.role === "coach" && userProfile?.team_id`:

```typescript
{
  title: "My Team",
  url: "/dashboard/team",
  icon: Users,
  items: [
    { title: "View Team", url: "/dashboard/team" },
    { title: "Team Builder", url: "/dashboard/team/builder" },
    { title: "Free Agency", url: "/dashboard/free-agency" },
    { title: "Team Stats", url: "/dashboard/team/stats" },
  ],
}
```

**Issues:**
- `/dashboard/team` page doesn't exist
- `/dashboard/team/builder` page doesn't exist
- `/dashboard/team/stats` page doesn't exist
- Only shows for coaches with `team_id`
- "Free Agency" is already accessible

---

## 6. Proposed Teams Sidebar Group Structure

### Option A: Public Teams Group (All Users)
```typescript
{
  title: "Teams",
  url: "/teams",
  icon: Users,
  items: [
    { title: "All Teams", url: "/teams" },
    { title: "Team Builder", url: "/teams/builder" },
    // Coach-specific items conditionally added below
  ],
}
```

**Pros:**
- Accessible to all users
- Public team directory
- Team builder available to everyone

**Cons:**
- May be redundant with public navigation
- Doesn't differentiate coach vs. spectator access

### Option B: Dashboard Teams Group (Coach-Focused)
```typescript
{
  title: "My Team",
  url: "/dashboard/team",
  icon: Users,
  items: [
    { title: "View Team", url: "/dashboard/team" },
    { title: "Roster", url: "/dashboard/team/roster" },
    { title: "Team Builder", url: "/dashboard/team/builder" },
    { title: "Free Agency", url: "/dashboard/free-agency" },
    { title: "Team Stats", url: "/dashboard/team/stats" },
  ],
}
```

**Pros:**
- Coach-specific functionality
- Clear separation from public pages
- Matches existing "My Team" concept

**Cons:**
- Requires creating missing pages
- Only visible to coaches

### Option C: Dashboard-Exclusive (User-Specific) - **SELECTED APPROACH**
```typescript
// Only shown when userProfile?.role === "coach" && userProfile?.team_id
{
  title: "My Team",
  url: "/dashboard/team",
  icon: Users,
  items: [
    { title: "View Team", url: "/dashboard/team" },
    { title: "My Roster", url: "/dashboard/team/roster" },
    { title: "Free Agency", url: "/dashboard/free-agency" },
    { title: "Team Stats", url: "/dashboard/team/stats" },
  ],
}
```

**Pros:**
- Clear separation: Dashboard = user-specific, Public = holistic league data
- Coach-focused functionality only
- No confusion between public and private features
- Matches dashboard's user-specific nature

**Cons:**
- Only visible to coaches (by design)
- Requires creating missing pages

**Note:** Public features like "All Teams" and "Team Builder" belong in the public site navigation, not the dashboard sidebar.

---

## 7. Missing Pages That Need Creation

### High Priority
1. **`/dashboard/team`** - Coach's team overview
   - Team information display
   - Quick stats
   - Links to roster, builder, stats
   - Similar to `/teams/[id]` but coach-specific

2. **`/dashboard/team/roster`** - Roster management
   - View current roster
   - Add/remove Pokemon (within budget)
   - Draft point tracking
   - Tera captain management

3. **`/dashboard/team/stats`** - Team statistics
   - Performance metrics
   - Battle statistics
   - Roster analysis
   - Type coverage charts

### Medium Priority
4. **`/dashboard/team/builder`** - Team builder (coach version)
   - Could redirect to `/teams/builder` with coach context
   - Or enhanced version with coach-specific features

---

## 8. Integration Points

### Profile Integration
- Coach card shows team information
- Profile sheet displays team data
- Team switcher in sidebar header (coaches)

### Free Agency Integration
- Already exists at `/dashboard/free-agency`
- Should be accessible from Teams group
- Transaction history and status

### Draft Integration
- Team rosters come from draft picks
- Draft budget affects roster management
- Point tracking for free agency

### Showdown Integration
- Showdown teams sync to profiles
- Team validation against roster
- Battle team management

---

## 9. Recommendations

### Immediate Actions
1. **Add "My Team" sidebar group** underneath Dashboard (coach-only)
2. **Exclude public items** (All Teams, Team Builder) - these belong in public navigation
3. **Include coach-specific items only** (View Team, My Roster, Free Agency, Team Stats)
4. **Create missing pages**:
   - `/dashboard/team` - Coach's team overview
   - `/dashboard/team/roster` - Roster management
   - `/dashboard/team/stats` - Team statistics

### Future Enhancements
- Team builder enhancements (coach-specific features)
- Roster visualization improvements
- Advanced team statistics
- Team comparison tools
- Trade proposal interface

---

## 10. Data Flow

### Team Data Sources
1. **Database**: `teams`, `team_rosters`, `coaches` tables
2. **Draft System**: Roster populated from draft picks
3. **Free Agency**: Transactions modify roster
4. **Showdown**: Teams synced from Showdown client
5. **Google Sheets**: Team data can be imported

### Access Patterns
- **Public**: Read-only team information
- **Coach**: Full team management (own team only)
- **Admin**: Full team management (all teams)

---

## Summary

The Teams sidebar groups in the dashboard should:

### 1. Teams Section (All Users)
**Purpose**: General/showdown teams for casual use
**Data Source**: `showdown_teams` table
**Items**:
- My Teams (`/dashboard/teams`)
- Team Library (`/dashboard/teams/library`)
- Create Team (`/dashboard/teams/create`)
- Team Builder (`/teams/builder`)

### 2. My League Team Section (Coaches Only)
**Purpose**: Drafted/league teams bound by rules
**Data Source**: `teams` + `draft_picks` tables
**Condition**: Only shown when `userProfile?.role === "coach" && userProfile?.team_id`
**Items**:
- View Team (`/dashboard/league-team`)
- Roster (`/dashboard/league-team/roster`)
- Free Agency (`/dashboard/free-agency`)
- Team Stats (`/dashboard/league-team/stats`)

### Key Distinctions
- **General Teams**: No coach status required, no rules, casual use
- **League Teams**: Coaches only, bound by draft/roster rules, official competition
- Both share same structure (Pokemon, moves, items) but different sources and purposes

**Architecture Principle:**
- **Dashboard** = User-specific, personalized features
- **General Teams** = Available to all users
- **League Teams** = Coaches only, official competition
