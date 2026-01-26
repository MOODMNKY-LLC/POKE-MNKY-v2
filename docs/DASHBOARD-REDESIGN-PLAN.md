# Player Dashboard Redesign Plan - `/dashboard` Overview Page

**Date**: January 25, 2026  
**Status**: 📋 Planning Phase  
**Target**: `/dashboard` (Overview Page)

---

## Executive Summary

The current dashboard at `/dashboard` is a basic placeholder with static cards and "coming soon" messages. This plan outlines a comprehensive redesign to transform it into a **data-rich, role-aware, personalized overview** that serves as the central hub for all players.

**Key Goals**:
1. **Personalized Experience** - Show relevant data based on user role (coach, viewer, admin)
2. **Real Data Integration** - Replace placeholders with actual database queries
3. **Action-Oriented** - Highlight what users need to do next
4. **Performance Optimized** - Fast loading with smart caching and materialized aggregates
5. **Responsive Design** - Works beautifully on all devices
6. **Weekly Match Planning Integration** - Connect dashboard to weekly battle planning workflow (per Matt's requirements)
7. **Opponent Intelligence** - Show next opponent context, Tera captains, and strategic data
8. **Standings Accuracy** - Ensure rankings match league comparator exactly (wins → losses → diff → H2H → streak → SoS → alpha)

---

## 0. Key Enhancements from Matt's Weekly Matches Requirements

This plan has been **upgraded** to integrate Matt's Weekly Matches planning feature requirements:

### 🎯 Critical Additions

1. **Opponent Intelligence Integration**:
   - Dashboard shows next match opponent with full context
   - Opponent stats (wins, losses, differential, win streak)
   - **Must reflect current state as of that week** (not projections)
   - Tera captains display with ⭐ indicator
   - Standings context (league rank, division rank)

2. **Weekly Battle Plans**:
   - Per-user, per-match private battle plans
   - Status indicator on dashboard
   - Link to full planning workspace (`/dashboard/weekly-matches`)
   - Integration with existing `weekly_battle_plans` table

3. **Performance Requirements**:
   - **Aggregates must be cached/materialized** (not recomputed per render)
   - Team stats cached per team per week
   - Standings cached per season
   - Win streaks materialized

4. **Standings Accuracy** (Critical):
   - **Must match league comparator exactly**:
     - Wins (desc) → Losses (asc) → Differential (desc) → H2H → Streak → SoS → Alpha
   - Use materialized view `v_regular_team_rankings`
   - Never calculate on-the-fly

5. **Tera Captain Authority**:
   - Must come from `team_rosters` metadata (not inferred)
   - Display with ⭐ visual indicator
   - Show Tera types for each captain

6. **Damage Calculator** (Future):
   - Scoped to week's teams only
   - **Requires Simeon's approval** before implementation
   - Link to `/calc` with pre-filtered teams

### 🔗 Integration Points

- **Dashboard Overview** → Shows summary, links to full planning
- **Weekly Matches Page** → Full opponent intelligence workspace
- **Shared Components** → Reusable opponent intelligence cards
- **Shared Utilities** → Opponent data fetching, standings calculation

---

## 1. Current State Analysis

### What Exists Now

**Current Dashboard (`app/dashboard/page.tsx`)**:
- ✅ Basic layout with sidebar
- ✅ Welcome message with user name
- ✅ 4 static cards (Profile, Draft, Quick Actions, League, Resources)
- ✅ DraftTabsSection component (working)
- ❌ "Recent Activity" - placeholder only
- ❌ "Quick Stats" - placeholder only
- ❌ No real data integration
- ❌ No role-based customization
- ❌ No team-specific information

**Available Components**:
- ✅ `DraftTabsSection` - Working draft interface
- ✅ `DraftPlanningSection` - Draft planning tools
- ✅ `DraftBoardSection` - Live draft board
- ✅ `DraftRosterSection` - Team roster display
- ✅ `WeeklyBattlePlanEditor` - Battle plan editor (saves to `weekly_battle_plans`)
- ✅ `WeekSelector` - Week selection component
- ✅ Various UI components (Cards, Badges, etc.)

**Existing Features to Integrate**:
- ✅ Weekly Matches page (`/dashboard/weekly-matches`) - Full opponent planning workspace
- ✅ Weekly battle plans saving (per-user, per-match, coach-only)
- ✅ Tera captain tracking and display
- ✅ Opponent intelligence cards (team info, stats, standings)

**Available Data Sources**:
- ✅ User profile (`profiles` table)
- ✅ Team information (`teams` table)
- ✅ Draft data (`draft_sessions`, `draft_pool`, `team_rosters`, `draft_budgets`)
- ✅ Match data (`matches` table)
- ✅ Standings (calculated from matches)
- ✅ Activity log (`user_activity_log` table)
- ✅ Season data (`seasons` table)
- ✅ **Weekly battle plans** (`weekly_battle_plans` table) - Per-user, per-match planning
- ✅ **Tera captain data** (`team_rosters` with `tera_captain` flag, `draft_pool.tera_captain_eligible`)
- ✅ **Matchweeks** (`matchweeks` table) - Week-by-week scheduling

**Available API Endpoints**:
- ✅ `/api/draft/status` - Draft session status
- ✅ `/api/draft/team-status` - Team draft status
- ✅ `/api/homepage/live-data` - Teams and top Pokémon
- ✅ Various other endpoints for matches, standings, etc.

### What's Missing

1. **Dashboard-Specific API Routes**:
   - `/api/dashboard/overview` - Aggregated dashboard data
   - `/api/dashboard/activity` - User activity feed
   - `/api/dashboard/stats` - User/team statistics

2. **Data Fetching Functions**:
   - Team performance metrics
   - Upcoming matches
   - Recent activity aggregation
   - League-wide statistics

3. **Dashboard Components**:
   - Activity feed component
   - Stats cards with real data
   - Upcoming matches widget
   - Team performance summary
   - Quick action cards (context-aware)

---

## 2. User Personas & Needs

### 2.1 Coach (Primary User)

**Context**: Assigned to a team, manages roster, submits matches

**Needs**:
- **Team Performance**: Wins/losses, standing position, recent results
- **Draft Status**: Current draft progress, budget remaining, next pick
- **Upcoming Matches**: Next opponent, match date, preparation needed
- **Roster Overview**: Current team composition, type coverage
- **Quick Actions**: Submit match result, manage roster, draft pick
- **Activity Feed**: Recent draft picks, match results, roster changes

**Priority Metrics**:
1. Team record (W-L-Differential)
2. Draft budget remaining
3. Next match opponent
4. Roster completeness
5. Recent activity

### 2.2 Viewer (Secondary User)

**Context**: Read-only access, follows league

**Needs**:
- **League Overview**: Top teams, standings summary
- **Recent Activity**: League-wide activity (draft picks, match results)
- **Quick Links**: Standings, schedule, teams
- **Personal Activity**: Their own activity log (if any)

**Priority Metrics**:
1. League standings summary
2. Recent match results
3. Draft progress
4. Top performers

### 2.3 Admin/Commissioner

**Context**: Manages league, needs oversight

**Needs**:
- **League Health**: Active users, pending actions, system status
- **Recent Activity**: All league activity
- **Quick Actions**: Admin panel links, sync operations
- **Statistics**: League-wide metrics

**Priority Metrics**:
1. Active users count
2. Pending match submissions
3. Draft progress
4. System health

---

## 3. Dashboard Architecture

### 3.1 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│   Dashboard Page (Server Component)                     │
│   - Fetches user profile                               │
│   - Determines user role                                │
│   - Loads initial data                                  │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│   Dashboard Overview API Route                          │
│   `/api/dashboard/overview`                            │
│   - Aggregates data from multiple sources              │
│   - Role-based filtering                                │
│   - Caching layer                                       │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│   Data Sources                                          │
│   - Supabase queries (teams, matches, draft)           │
│   - Calculated metrics (standings, stats)               │
│   - Activity log aggregation                           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Component Structure

```
app/dashboard/page.tsx (Server Component)
├── DashboardHeader (Welcome, user info)
├── CoachCard (Coaches only - NEW FEATURE)
│   └── Team avatar, name, stats, link to team page
├── DashboardStatsGrid (Role-based stat cards)
│   ├── CoachStats (Team performance, draft budget)
│   ├── ViewerStats (League overview)
│   └── AdminStats (System health)
├── DashboardSections (Conditional based on role)
│   ├── TeamPerformanceSection (Coaches only)
│   ├── UpcomingMatchesSection (Coaches only)
│   ├── DraftStatusSection (All users)
│   ├── RecentActivitySection (All users)
│   └── QuickActionsSection (Role-based)
└── DraftTabsSection (Existing - keep)
```

---

## 4. Dashboard Sections Design

### 4.1 Header Section

**Purpose**: Welcome user, show current context

**Content**:
- Personalized greeting: "Welcome back, {display_name}!"
- Current season indicator
- Quick status badge (e.g., "Draft Active", "Season 5")
- Last login time (optional)

**Design**:
- Large, friendly typography
- Subtle background gradient
- Season badge with icon

---

### 4.1.5 Coach Card Section (Coaches Only) - **NEW FEATURE**

**Purpose**: Prominently feature the coach's team card on dashboard overview

**Content**:
- **Full Coach Card Component** (`components/profile/coach-card.tsx`):
  - Team avatar (with upload capability)
  - Team name (editable inline)
  - Team stats grid:
    - Record (W-L)
    - Differential (+/-)
    - Division/Conference badges
  - Link to team page
  - **Read-only mode** for dashboard (no editing, or optional edit mode)

**Placement**:
- **Option A (Recommended)**: Full-width card immediately after header, before stats grid
- **Option B**: Sidebar-style card alongside stats grid (2-column layout)
- **Option C**: Compact version in stats grid (replaces one stat card)

**Design Considerations**:
- Use existing `CoachCard` component from `components/profile/coach-card.tsx`
- Can be read-only variant for dashboard (no edit functionality)
- Or full-featured with edit capabilities
- Responsive: Full-width on mobile, side-by-side on desktop

**Data Requirements**:
- Fetch team data via `profile.team_id`
- Join with `teams` table for full team info
- Include wins, losses, differential, division, conference
- Include avatar_url/logo_url for team image

**Implementation**:
```typescript
// In dashboard page (server component)
const team = profile.team_id 
  ? await supabase
      .from('teams')
      .select('*')
      .eq('id', profile.team_id)
      .single()
  : null

// Render coach card
{profile.role === 'coach' && team && (
  <CoachCard team={team} userId={profile.id} />
)}
```

**Benefits**:
- Immediate visibility of team status
- Quick access to team management
- Visual team identity on dashboard
- Consistent with profile page experience

---

### 4.2 Stats Grid (Top Cards)

**Layout**: 4-column grid (responsive: 2 cols on tablet, 1 on mobile)

#### For Coaches:

**Card 1: Team Record**
- **Value**: `{wins}-{losses}` (large)
- **Subtitle**: "Differential: {differential}"
- **Trend**: Up/down arrow vs last week
- **Action**: Link to team page
- **Icon**: Trophy

**Card 2: Draft Budget**
- **Value**: `{remaining_points} / {total_points}` (large)
- **Subtitle**: "{spent_points} points spent"
- **Visual**: Progress bar
- **Action**: Link to draft board
- **Icon**: ClipboardList

**Card 3: Next Match**
- **Value**: "vs {opponent_name}" (large)
- **Subtitle**: "{match_date}" or "This Week"
- **Status**: Pending/Completed
- **Action**: Link to match details
- **Icon**: Calendar

**Card 4: Roster Status**
- **Value**: "{roster_count} / {max_pokemon}" (large)
- **Subtitle**: "Draft picks made"
- **Visual**: Progress indicator
- **Action**: Link to roster
- **Icon**: Users

#### For Viewers:

**Card 1: League Standings**
- **Value**: "Top Team: {team_name}" (large)
- **Subtitle**: "{wins}-{losses} record"
- **Action**: Link to standings
- **Icon**: Trophy

**Card 2: Draft Progress**
- **Value**: "Round {current_round} / {total_rounds}" (large)
- **Subtitle**: "{total_picks} picks made"
- **Visual**: Progress bar
- **Action**: Link to draft board
- **Icon**: ClipboardList

**Card 3: Recent Matches**
- **Value**: "{recent_match_count} this week" (large)
- **Subtitle**: "Latest results"
- **Action**: Link to schedule
- **Icon**: Calendar

**Card 4: Top Performers**
- **Value**: "Top Pokémon: {pokemon_name}" (large)
- **Subtitle**: "{kills} KOs"
- **Action**: Link to insights
- **Icon**: BarChart3

#### For Admins:

**Card 1: Active Users**
- **Value**: "{active_user_count}" (large)
- **Subtitle**: "Logged in this week"
- **Icon**: Users

**Card 2: Pending Actions**
- **Value**: "{pending_count}" (large)
- **Subtitle**: "Match submissions pending"
- **Action**: Link to admin panel
- **Icon**: AlertCircle

**Card 3: Draft Status**
- **Value**: "Round {current_round}" (large)
- **Subtitle**: "{picks_remaining} picks remaining"
- **Icon**: ClipboardList

**Card 4: System Health**
- **Value**: "All Systems Operational" (large)
- **Subtitle**: "Last sync: {timestamp}"
- **Icon**: CheckCircle

---

### 4.3 Team Performance Section (Coaches Only)

**Purpose**: Show team's current season performance

**Content**:
- **Record Card**: Wins, Losses, Differential
- **Standing Position**: Division rank, Conference rank
- **Recent Form**: Last 5 matches (W/L indicators)
- **Streak**: Current win/loss streak
- **Performance Chart**: Mini line chart of wins over time

**Design**:
- Card-based layout
- Visual indicators (green for wins, red for losses)
- Link to full team stats page

---

### 4.4 Upcoming Matches Section (Coaches Only) - **ENHANCED**

**Purpose**: Show next match(es) with opponent intelligence and planning context

**Content**:
- **Next Match Card** (Primary Focus):
  - Opponent team name, coach name, and logo
  - Match date/time and week number
  - Status (Scheduled/Pending/Completed)
  - **Opponent Performance Snapshot**:
    - Record (W-L)
    - Win streak (active)
    - Kills, Deaths, Differential
    - **Must reflect current state as of that week** (not season-end projections)
  - **Opponent Tera Captains**:
    - List of opponent's Pokémon
    - Visual denotation (⭐) for Tera Captain(s)
    - Tera types for each captain
  - **Opponent Standings Context**:
    - Current league standing (overall rank)
    - Division rank
    - Conference position
    - **Critical**: Must match Matt's ranking comparator exactly (wins → losses → diff → H2H → streak → SoS → alpha)
  - Action buttons: "Plan Match", "View Details", "Submit Result"
- **Match History** (Last 3 matches):
  - Opponent, result, date
  - Quick view link
- **Weekly Battle Plan Status**:
  - Indicator if plan exists for next match
  - Last updated timestamp
  - Link to full planning workspace

**Design**:
- Prominent next match card with opponent intelligence
- Compact history list
- Clear call-to-action buttons
- Visual indicators for Tera captains
- Link to `/dashboard/weekly-matches?week={next_week}` for full planning

**Data Requirements**:
- **Performance**: Aggregates should be cached/materialized, not recomputed per render
- **Standings**: Must use authoritative source (view or materialized table)
- **Tera Captains**: Must come from `team_rosters` metadata field, not inferred dynamically

---

### 4.5 Draft Status Section (All Users)

**Purpose**: Show current draft progress

**Content**:
- **Draft Session Status**:
  - Current round and pick number
  - Total picks made
  - Status (Active/Completed/Paused)
- **Your Team's Status** (if coach):
  - Next pick number
  - Budget remaining
  - Picks made
- **Recent Picks** (Last 5):
  - Team name, Pokémon, round
  - Timestamp

**Design**:
- Status indicator (badge)
- Progress visualization
- Recent picks feed
- Link to full draft board

**Note**: This can integrate with existing `DraftTabsSection` or be a summary above it.

---

### 4.6 Recent Activity Section (All Users)

**Purpose**: Show user's and league's recent activity

**Content**:
- **Your Activity** (if any):
  - Draft picks made
  - Match results submitted
  - Roster changes
  - Profile updates
- **League Activity** (if viewer/admin):
  - Recent draft picks
  - Match results
  - Roster transactions
  - System events (admin only)

**Data Source**: `user_activity_log` table

**Design**:
- Timeline-style feed
- Icons for activity types
- Timestamps
- Links to relevant pages
- "View All" link

**Implementation**:
```typescript
// Query user_activity_log
const { data: activities } = await supabase
  .from('user_activity_log')
  .select('*')
  .eq('user_id', userId) // For user's own activity
  .order('created_at', { ascending: false })
  .limit(10)
```

---

### 4.7 Quick Actions Section - **ENHANCED**

**Purpose**: Context-aware action buttons

**For Coaches**:
- "Plan Next Match" (if match scheduled) → Links to `/dashboard/weekly-matches?week={next_week}`
- "Submit Match Result" (if match pending)
- "Make Draft Pick" (if draft active and your turn)
- "Manage Roster" (always)
- "View Team Stats" (always)
- "Weekly Matches" (always) → Links to `/dashboard/weekly-matches`

**For Viewers**:
- "View Standings"
- "View Schedule"
- "View Teams"
- "View Draft Board"

**For Admins**:
- "Admin Dashboard"
- "Sync Google Sheets"
- "Manage Users"
- "System Settings"

**Design**:
- Button grid (2x2 or 3x2)
- Icon + label
- Highlighted if action needed
- Disabled if not applicable

---

### 4.8 League Overview Section (Viewers/All)

**Purpose**: Show league-wide statistics

**Content**:
- **Top Teams** (Top 5):
  - Team name, record, standing
  - Link to team page
- **Recent Match Results** (Last 5):
  - Teams, score, date
  - Link to match details
- **Draft Leaders**:
  - Teams with most picks
  - Top point spenders

**Design**:
- Compact card layout
- Table or list format
- Visual indicators (badges, icons)

---

## 5. Technical Implementation

### 5.1 Performance & Caching Strategy (Critical - Per Matt's Requirements)

**Key Principle**: Aggregates should be cached/materialized, not recomputed per render.

**Materialized Aggregates Needed**:
1. **Team Performance Snapshot** (per week):
   - Wins, losses, differential as of that week
   - Win streak calculation
   - Kills/deaths totals
   - **Must reflect current state as of that week** (not season-end projections)

2. **Standings View** (`v_regular_team_rankings`):
   - Overall rank, division rank, conference rank
   - **Must match Matt's ranking comparator exactly**:
     - Primary: Wins (descending)
     - Secondary: Losses (ascending)
     - Tertiary: Differential (descending)
     - Quaternary: Head-to-head
     - Quinary: Win streak
     - Senary: Strength of Schedule
     - Final: Alphabetical (team name)

3. **Tera Captain Data**:
   - Stored in `team_rosters` metadata field
   - Not inferred dynamically
   - Must be authoritative (set at roster lock)

**Caching Strategy**:
- **Redis/Upstash KV**: For frequently accessed aggregates
- **TTL**: 30 seconds for draft status, 5 minutes for team stats, 1 hour for standings
- **Cache Keys**: 
  - `dashboard:team_stats:{team_id}:{season_id}:{week}`
  - `dashboard:standings:{season_id}`
  - `dashboard:opponent_intel:{team_id}:{week}`

**Implementation Pattern**:
```typescript
// Check cache first
const cached = await redisCache.get(`dashboard:team_stats:${teamId}:${seasonId}:${week}`)
if (cached) return cached

// Compute aggregate (or fetch from materialized view)
const stats = await computeTeamStats(teamId, seasonId, week)

// Cache result
await redisCache.set(`dashboard:team_stats:${teamId}:${seasonId}:${week}`, stats, { ttl: 300 })

return stats
```

---

### 5.2 API Route: `/api/dashboard/overview`

**Purpose**: Aggregate all dashboard data in one request

**Endpoint**: `GET /api/dashboard/overview`

**Query Parameters**:
- `season_id` (optional) - Defaults to current season
- `include_activity` (optional, default: true)
- `include_stats` (optional, default: true)

**Response Structure**:
```typescript
{
  user: {
    id: string
    role: 'coach' | 'viewer' | 'admin' | 'commissioner'
    team_id: string | null
    display_name: string
  }
  season: {
    id: string
    name: string
    is_current: boolean
  }
  stats: {
    // Role-based stats
    team_record?: { wins: number, losses: number, differential: number }
    draft_budget?: { total: number, spent: number, remaining: number }
    roster_count?: number
    next_match?: { opponent: string, date: string, week: number }
    // ... other role-specific stats
  }
  activity: Array<{
    id: string
    action: string
    resource_type: string
    created_at: string
    metadata: any
  }>
  draft_status?: {
    session_id: string
    current_round: number
    current_pick: number
    status: string
    is_your_turn: boolean
  }
  upcoming_matches?: Array<{
    id: string
    opponent: string
    opponent_coach: string
    opponent_logo_url: string | null
    date: string
    week: number
    opponent_stats: {
      wins: number
      losses: number
      differential: number
      win_streak: number
      kills: number
      deaths: number
    }
    opponent_tera_captains: Array<{
      pokemon_name: string
      tera_types: string[]
      generation: number | null
    }>
    opponent_standings: {
      overall_rank: number
      division_rank: number
      conference_rank: number
    }
    battle_plan_exists: boolean
    battle_plan_updated_at: string | null
  }>
  league_overview?: {
    top_teams: Array<{ name: string, wins: number, losses: number }>
    recent_matches: Array<{ teams: string[], score: string, date: string }>
  }
}
```

**Implementation**:
```typescript
// app/api/dashboard/overview/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Get current season
  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('is_current', true)
    .single()

  // Role-based data fetching
  const data: any = {
    user: {
      id: profile.id,
      role: profile.role,
      team_id: profile.team_id,
      display_name: profile.display_name || profile.username,
    },
    season: season || null,
  }

  // Fetch role-specific data
  if (profile.role === 'coach' && profile.team_id) {
    // Team stats
    const { data: team } = await supabase
      .from('teams')
      .select('wins, losses, differential, name')
      .eq('id', profile.team_id)
      .eq('season_id', season.id)
      .single()

    // Draft budget
    const { data: budget } = await supabase
      .from('draft_budgets')
      .select('total_points, spent_points, remaining_points')
      .eq('team_id', profile.team_id)
      .eq('season_id', season.id)
      .single()

    // Roster count
    const { count: rosterCount } = await supabase
      .from('team_rosters')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', profile.team_id)
      .eq('season_id', season.id)

    // Next match with opponent intelligence (use cached/materialized data)
    const { data: nextMatch } = await supabase
      .from('matches')
      .select(`
        id,
        week,
        team1_id,
        team2_id,
        matchweek_id,
        status,
        teams!matches_team1_id_fkey(id, name, coach_name, logo_url, wins, losses, differential),
        teams!matches_team2_id_fkey(id, name, coach_name, logo_url, wins, losses, differential)
      `)
      .or(`team1_id.eq.${profile.team_id},team2_id.eq.${profile.team_id}`)
      .eq('season_id', season.id)
      .eq('is_playoff', false)
      .is('winner_id', null)
      .order('week', { ascending: true })
      .limit(1)
      .single()

    // Get opponent intelligence if match exists
    let opponentIntel = null
    if (nextMatch) {
      const isTeam1 = nextMatch.team1_id === profile.team_id
      const opponentTeam = isTeam1 ? nextMatch.teams : nextMatch.teams
      const opponentTeamId = isTeam1 ? nextMatch.team2_id : nextMatch.team1_id

      // Get opponent Tera captains
      const { data: teraCaptains } = await supabase
        .from('team_rosters')
        .select(`
          pokemon_name,
          tera_captain,
          tera_types,
          pokepedia_pokemon(generation)
        `)
        .eq('team_id', opponentTeamId)
        .eq('season_id', season.id)
        .eq('tera_captain', true)

      // Get opponent standings (from materialized view)
      const { data: standings } = await supabase
        .from('v_regular_team_rankings')
        .select('rank, division_rank, conference_rank')
        .eq('team_id', opponentTeamId)
        .eq('season_id', season.id)
        .single()

      // Check if battle plan exists
      const { data: battlePlan } = await supabase
        .from('weekly_battle_plans')
        .select('updated_at')
        .eq('user_id', profile.id)
        .eq('match_id', nextMatch.id)
        .single()

      // Calculate win streak (from materialized/cached data)
      const winStreak = await calculateWinStreak(opponentTeamId, season.id, nextMatch.week)

      opponentIntel = {
        match_id: nextMatch.id,
        week: nextMatch.week,
        opponent_name: opponentTeam?.name,
        opponent_coach: opponentTeam?.coach_name,
        opponent_logo_url: opponentTeam?.logo_url,
        opponent_stats: {
          wins: opponentTeam?.wins || 0,
          losses: opponentTeam?.losses || 0,
          differential: opponentTeam?.differential || 0,
          win_streak: winStreak,
        },
        opponent_tera_captains: teraCaptains?.map(tc => ({
          pokemon_name: tc.pokemon_name,
          tera_types: tc.tera_types || [],
          generation: tc.pokepedia_pokemon?.generation || null,
        })) || [],
        opponent_standings: standings ? {
          overall_rank: standings.rank,
          division_rank: standings.division_rank,
          conference_rank: standings.conference_rank,
        } : null,
        battle_plan_exists: !!battlePlan,
        battle_plan_updated_at: battlePlan?.updated_at || null,
      }
    }

    data.stats = {
      team_record: team ? {
        wins: team.wins,
        losses: team.losses,
        differential: team.differential,
      } : null,
      draft_budget: budget,
      roster_count: rosterCount || 0,
      next_match: opponentIntel,
    }

    // Include full team data for coach card
    data.team = team?.data || null
  }

  // Draft status (all users)
  const { data: draftSession } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('season_id', season.id)
    .eq('status', 'active')
    .single()

  if (draftSession) {
    data.draft_status = {
      session_id: draftSession.id,
      current_round: draftSession.current_round,
      current_pick: draftSession.current_pick,
      status: draftSession.status,
      is_your_turn: draftSession.current_team_id === profile.team_id,
    }
  }

  // Recent activity
  const { data: activity } = await supabase
    .from('user_activity_log')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  data.activity = activity || []

  // League overview (for viewers/admins)
  if (profile.role === 'viewer' || profile.role === 'admin') {
    const { data: topTeams } = await supabase
      .from('teams')
      .select('name, wins, losses')
      .eq('season_id', season.id)
      .order('wins', { ascending: false })
      .limit(5)

    data.league_overview = {
      top_teams: topTeams || [],
    }
  }

  return NextResponse.json(data)
}
```

---

### 5.2 Dashboard Page Component

**Structure**: Server Component with data fetching

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getCurrentUserProfile(supabase)
  if (!profile) {
    redirect("/auth/login")
  }

  // Fetch dashboard data
  const dashboardData = await fetchDashboardData(supabase, profile)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <DashboardHeader profile={profile} season={dashboardData.season} />
        
        {/* Stats Grid */}
        <DashboardStatsGrid 
          role={profile.role}
          stats={dashboardData.stats}
          draftStatus={dashboardData.draft_status}
        />

        {/* Role-specific sections */}
        {profile.role === 'coach' && profile.team_id && (
          <>
            <TeamPerformanceSection teamId={profile.team_id} />
            <UpcomingMatchesSection teamId={profile.team_id} />
          </>
        )}

        {/* Draft Status */}
        <DraftStatusSection 
          draftStatus={dashboardData.draft_status}
          teamId={profile.team_id}
        />

        {/* Recent Activity */}
        <RecentActivitySection activities={dashboardData.activity} />

        {/* Quick Actions */}
        <QuickActionsSection 
          role={profile.role}
          teamId={profile.team_id}
          draftStatus={dashboardData.draft_status}
        />

        {/* League Overview (viewers/admins) */}
        {(profile.role === 'viewer' || profile.role === 'admin') && (
          <LeagueOverviewSection overview={dashboardData.league_overview} />
        )}

        {/* Existing Draft Tabs */}
        <DraftTabsSection />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

---

### 5.3 Component Files to Create

**New Components**:
1. `components/dashboard/dashboard-header.tsx` - Welcome header
2. `components/dashboard/coach-card-section.tsx` - **NEW** Dashboard coach card wrapper (optional, or use existing component directly)
3. `components/dashboard/dashboard-stats-grid.tsx` - Top stat cards
4. `components/dashboard/team-performance-section.tsx` - Team stats (coaches)
5. `components/dashboard/upcoming-matches-section.tsx` - Next matches with opponent intelligence (coaches)
6. `components/dashboard/opponent-intelligence-card.tsx` - Opponent stats, Tera captains, standings (coaches)
7. `components/dashboard/tera-captain-badge.tsx` - Tera captain indicator with ⭐
8. `components/dashboard/draft-status-section.tsx` - Draft summary
9. `components/dashboard/recent-activity-section.tsx` - Activity feed
10. `components/dashboard/quick-actions-section.tsx` - Action buttons
11. `components/dashboard/league-overview-section.tsx` - League stats (viewers)
12. `components/dashboard/weekly-battle-plan-status.tsx` - Battle plan indicator/link (coaches)

**Existing Components to Reuse**:
- ✅ `components/profile/coach-card.tsx` - **FEATURED ON DASHBOARD** (coaches only)

**New Utilities**:
1. `lib/dashboard/dashboard-data.ts` - Data fetching functions
2. `lib/dashboard/dashboard-cache.ts` - Caching utilities
3. `lib/dashboard/opponent-intelligence.ts` - Opponent data aggregation (with caching)
4. `lib/dashboard/standings-calculator.ts` - Standings calculation (matches league comparator)
5. `lib/dashboard/win-streak-calculator.ts` - Win streak calculation (materialized)

**New API Routes**:
1. `app/api/dashboard/overview/route.ts` - Main dashboard data endpoint
2. `app/api/dashboard/activity/route.ts` - Activity feed endpoint (optional)
3. `app/api/dashboard/opponent-intelligence/route.ts` - Opponent data for specific match (optional, for caching)

**Existing API Routes to Leverage**:
- ✅ `/api/weekly-battle-plans` - Get/save battle plans (already exists)
- ✅ `/api/dashboard/weekly-matches` - Weekly matches data (if exists)

---

## 6. Data Fetching Strategy - **ENHANCED**

### 6.0 Performance Requirements (Critical - Per Matt's Upgrades)

**Key Principles**:
1. **Materialized Aggregates**: Team stats, standings, win streaks must be pre-computed
2. **Cached Queries**: Use Redis/Upstash KV for frequently accessed data
3. **No On-Demand Computation**: Never recompute aggregates on every page load
4. **Standings Accuracy**: Must match league comparator exactly (use authoritative view)

**Materialized Views Needed**:
- `v_regular_team_rankings` - Standings with proper comparator
- `v_team_weekly_stats` - Team stats as of each week (for historical accuracy)
- `v_win_streaks` - Current win streaks per team

**Caching Strategy**:
- **Team Stats**: Cache per team per week (5 min TTL)
- **Opponent Intelligence**: Cache per opponent per week (5 min TTL)
- **Standings**: Cache per season (1 hour TTL, invalidate on match result)
- **Draft Status**: Cache per session (30 sec TTL)

---

### 6.1 Server-Side Rendering (Primary)

**Benefits**:
- Fast initial load
- SEO-friendly
- No loading states needed
- Works without JavaScript

**Use For**:
- Initial page load
- Static/semi-static data
- User profile
- Season information

### 6.2 Client-Side Fetching (Secondary)

**Benefits**:
- Real-time updates
- Interactive features
- Reduced server load

**Use For**:
- Activity feed updates
- Draft status polling (if active)
- Match status updates

### 6.3 Caching Strategy

**Server-Side Caching**:
- Redis/Upstash KV for dashboard data
- TTL: 30 seconds for draft status, 5 minutes for stats
- Cache keys: `dashboard:overview:{user_id}`, `dashboard:stats:{team_id}`

**Client-Side Caching**:
- React Query / SWR for client-side data
- Stale-while-revalidate pattern
- Background refetching

---

## 7. Performance Considerations

### 7.1 Query Optimization

**Parallel Queries**:
```typescript
// Fetch multiple data sources in parallel
const [teamData, draftData, matchData, activityData] = await Promise.all([
  fetchTeamStats(teamId),
  fetchDraftStatus(seasonId),
  fetchUpcomingMatches(teamId),
  fetchRecentActivity(userId),
])
```

**Selective Fields**:
- Only fetch needed columns
- Use `.select()` to limit data
- Avoid over-fetching

**Indexes**:
- Ensure indexes on:
  - `teams.season_id`
  - `team_rosters.team_id, season_id`
  - `matches.team1_id, team2_id, season_id`
  - `user_activity_log.user_id, created_at`

### 7.2 Component Optimization

**Code Splitting**:
- Lazy load heavy components
- Dynamic imports for charts/graphs
- Split by role (coach vs viewer components)

**Memoization**:
- Use `React.memo` for expensive components
- Memoize calculated values
- Cache formatted data

### 7.3 Loading States

**Skeleton Loaders**:
- Show skeleton for each section
- Match final layout
- Progressive loading

**Error Handling**:
- Graceful degradation
- Show partial data if some fails
- Error boundaries per section

---

## 8. Design System Integration

### 8.1 UI Components

**Use Existing Components**:
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Badge` for status indicators
- `Button` for actions
- `Skeleton` for loading states
- `Alert` for important messages
- `Progress` for budget/roster progress

**New Patterns**:
- Stat cards with large numbers
- Activity timeline
- Mini charts (using recharts or similar)
- Status badges with icons

### 8.2 Visual Hierarchy

**Priority Order**:
1. **Header** - Welcome, season context
2. **Stats Grid** - Key metrics (top 4)
3. **Primary Section** - Role-specific main content
4. **Secondary Sections** - Supporting information
5. **Draft Tabs** - Existing component (keep)

**Spacing**:
- Consistent gap-4 between sections
- Card padding: p-6
- Section spacing: space-y-6

### 8.3 Responsive Design

**Breakpoints**:
- **Mobile** (< 768px): Single column, stacked cards
- **Tablet** (768px - 1024px): 2-column grid
- **Desktop** (> 1024px): 4-column grid, side-by-side sections

**Mobile Optimizations**:
- Collapsible sections
- Swipeable cards
- Bottom navigation (existing dock)

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)

**Goals**: Set up infrastructure and basic data fetching with performance optimization

**Tasks**:
1. ✅ Create `/api/dashboard/overview` endpoint
2. ✅ Create dashboard data fetching utilities
3. ✅ **Set up caching layer** (Redis/Upstash KV integration)
4. ✅ **Create materialized views** for standings and team stats (if not exist)
5. ✅ **Implement win streak calculation** (materialized)
6. ✅ Update dashboard page to fetch real data
7. ✅ Create `DashboardHeader` component
8. ✅ **Feature Coach Card** on dashboard (coaches only) - **NEW**
9. ✅ Create `DashboardStatsGrid` component (basic version)
10. ✅ Test data fetching and error handling
11. ✅ **Verify standings match league comparator** (critical)

**Deliverables**:
- Working API endpoint with caching
- Materialized aggregates for performance
- Basic dashboard with real data
- **Coach card featured prominently** (coaches only)
- Error handling in place
- Standings accuracy verified

---

### Phase 2: Role-Based Sections (Week 2) - **ENHANCED**

**Goals**: Add role-specific content with opponent intelligence

**Tasks**:
1. ✅ Create `TeamPerformanceSection` (coaches)
2. ✅ Create `UpcomingMatchesSection` (coaches) - **Enhanced with opponent intelligence**
3. ✅ Create `OpponentIntelligenceCard` component:
   - Opponent stats (wins, losses, differential, win streak)
   - Tera captains display with ⭐ indicator
   - Standings context (overall, division, conference)
4. ✅ Create `TeraCaptainBadge` component (⭐ indicator)
5. ✅ Create `WeeklyBattlePlanStatus` component (plan exists indicator)
6. ✅ Create `LeagueOverviewSection` (viewers)
7. ✅ Create `QuickActionsSection` (all roles) - **Add "Plan Next Match" link**
8. ✅ Implement role-based conditional rendering
9. ✅ **Integrate with existing `/dashboard/weekly-matches` page**
10. ✅ Test with different user roles

**Deliverables**:
- Role-aware dashboard
- Coach-specific sections working with opponent intelligence
- Tera captain tracking and display
- Weekly battle plan integration
- Viewer sections working
- Link to full weekly matches planning workspace

---

### Phase 3: Activity & Polish (Week 3)

**Goals**: Add activity feed and refine UX

**Tasks**:
1. ✅ Create `RecentActivitySection` component
2. ✅ Implement activity feed with real data
3. ✅ Add loading states and skeletons
4. ✅ Add error boundaries
5. ✅ Optimize queries and add caching
6. ✅ Responsive design testing
7. ✅ Performance optimization

**Deliverables**:
- Complete dashboard with all sections
- Activity feed working
- Optimized performance
- Mobile-responsive

---

### Phase 4: Enhancements (Week 4+)

**Goals**: Add advanced features

**Tasks**:
1. ⬜ Add real-time updates (WebSocket/SSE)
2. ⬜ Add charts/graphs for performance trends
3. ⬜ Add notifications for important events
4. ⬜ Add dashboard customization (user preferences)
5. ⬜ Add export functionality
6. ⬜ Add analytics tracking

**Deliverables**:
- Enhanced dashboard features
- Real-time updates
- User customization

---

## 10. Database Queries Needed

### 10.1 Team Performance (Coaches)

```sql
-- Team record and standing
SELECT 
  t.id,
  t.name,
  t.wins,
  t.losses,
  t.differential,
  t.division,
  t.conference
FROM teams t
WHERE t.id = $team_id 
  AND t.season_id = $season_id;

-- Recent matches (last 5)
SELECT 
  m.id,
  m.week,
  m.team1_id,
  m.team2_id,
  m.winner_id,
  m.team1_score,
  m.team2_score,
  t1.name as team1_name,
  t2.name as team2_name
FROM matches m
JOIN teams t1 ON m.team1_id = t1.id
JOIN teams t2 ON m.team2_id = t2.id
WHERE (m.team1_id = $team_id OR m.team2_id = $team_id)
  AND m.season_id = $season_id
ORDER BY m.week DESC, m.created_at DESC
LIMIT 5;
```

### 10.2 Draft Status

```sql
-- Current draft session
SELECT 
  ds.id,
  ds.status,
  ds.current_round,
  ds.current_pick,
  ds.current_team_id,
  ds.total_rounds,
  ds.total_picks
FROM draft_sessions ds
WHERE ds.season_id = $season_id
  AND ds.status = 'active'
LIMIT 1;

-- Team draft budget
SELECT 
  db.total_points,
  db.spent_points,
  db.remaining_points
FROM draft_budgets db
WHERE db.team_id = $team_id
  AND db.season_id = $season_id;

-- Team roster count
SELECT COUNT(*) as roster_count
FROM team_rosters tr
WHERE tr.team_id = $team_id
  AND tr.season_id = $season_id;
```

### 10.3 Activity Feed

```sql
-- User's recent activity
SELECT 
  ual.id,
  ual.action,
  ual.resource_type,
  ual.resource_id,
  ual.metadata,
  ual.created_at
FROM user_activity_log ual
WHERE ual.user_id = $user_id
ORDER BY ual.created_at DESC
LIMIT 20;

-- League-wide activity (for viewers/admins)
SELECT 
  ual.id,
  ual.user_id,
  ual.action,
  ual.resource_type,
  ual.resource_id,
  ual.metadata,
  ual.created_at,
  p.display_name,
  p.username
FROM user_activity_log ual
JOIN profiles p ON ual.user_id = p.id
WHERE ual.action IN ('draft_pick', 'match_submit', 'roster_change')
ORDER BY ual.created_at DESC
LIMIT 20;
```

### 10.4 Upcoming Matches - **ENHANCED**

```sql
-- Next match for team with opponent intelligence
SELECT 
  m.id,
  m.week,
  m.team1_id,
  m.team2_id,
  m.status,
  m.matchweek_id,
  -- Opponent info
  CASE 
    WHEN m.team1_id = $team_id THEN t2.name
    ELSE t1.name
  END as opponent_name,
  CASE 
    WHEN m.team1_id = $team_id THEN t2.id
    ELSE t1.id
  END as opponent_id,
  CASE 
    WHEN m.team1_id = $team_id THEN t2.coach_name
    ELSE t1.coach_name
  END as opponent_coach_name,
  CASE 
    WHEN m.team1_id = $team_id THEN t2.logo_url
    ELSE t1.logo_url
  END as opponent_logo_url,
  -- Opponent stats (as of this week - must be materialized/cached)
  CASE 
    WHEN m.team1_id = $team_id THEN t2.wins
    ELSE t1.wins
  END as opponent_wins,
  CASE 
    WHEN m.team1_id = $team_id THEN t2.losses
    ELSE t1.losses
  END as opponent_losses,
  CASE 
    WHEN m.team1_id = $team_id THEN t2.differential
    ELSE t1.differential
  END as opponent_differential
FROM matches m
JOIN teams t1 ON m.team1_id = t1.id
JOIN teams t2 ON m.team2_id = t2.id
WHERE (m.team1_id = $team_id OR m.team2_id = $team_id)
  AND m.season_id = $season_id
  AND m.winner_id IS NULL
  AND m.is_playoff = false
ORDER BY m.week ASC
LIMIT 1;

-- Opponent Tera Captains
SELECT 
  tr.pokemon_id,
  tr.pokemon_name,
  tr.tera_captain,
  tr.tera_types,
  pp.generation
FROM team_rosters tr
JOIN pokepedia_pokemon pp ON tr.pokemon_name = pp.name
WHERE tr.team_id = $opponent_team_id
  AND tr.season_id = $season_id
  AND tr.tera_captain = true
ORDER BY tr.draft_round;

-- Opponent standings (must use authoritative view/materialized table)
-- Use v_regular_team_rankings or similar view that matches league comparator
SELECT 
  rank,
  division_rank,
  conference_rank,
  wins,
  losses,
  differential,
  strength_of_schedule
FROM v_regular_team_rankings  -- Or materialized standings table
WHERE team_id = $opponent_team_id
  AND season_id = $season_id;

-- Weekly battle plan status
SELECT 
  id,
  updated_at,
  notes,
  payload
FROM weekly_battle_plans
WHERE user_id = $user_id
  AND match_id = $next_match_id
LIMIT 1;
```

---

## 11. Error Handling & Edge Cases

### 11.1 Data Availability

**Scenarios**:
- No current season → Show message, disable season-dependent features
- No team assigned (coach) → Show "Join a team" prompt
- No draft session → Show "Draft not started" message
- No matches scheduled → Show "No upcoming matches"

**Handling**:
- Graceful degradation
- Helpful messages
- Action prompts (e.g., "Create draft session")

### 11.2 Permission Errors

**Scenarios**:
- User tries to access coach-only data
- RLS blocks data access
- Missing permissions

**Handling**:
- Check permissions before fetching
- Show appropriate messages
- Hide unavailable sections

### 11.3 Performance Issues

**Scenarios**:
- Slow database queries
- Timeout errors
- Cache failures

**Handling**:
- Query timeouts (10s max)
- Fallback to cached data
- Show partial data if some queries fail
- Retry logic for critical data

---

## 12. Testing Strategy

### 12.1 Unit Tests

**Components**:
- Test each dashboard component in isolation
- Mock data providers
- Test role-based rendering

**Utilities**:
- Test data fetching functions
- Test data transformation
- Test error handling

### 12.2 Integration Tests

**API Routes**:
- Test `/api/dashboard/overview` with different roles
- Test error scenarios
- Test caching behavior

**Page Component**:
- Test server-side rendering
- Test data fetching
- Test redirects

### 12.3 E2E Tests

**User Flows**:
- Coach viewing dashboard
- Viewer viewing dashboard
- Admin viewing dashboard
- Navigating from dashboard to other pages

---

## 13. Success Metrics

### 13.1 Performance Metrics

**Targets**:
- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- API response time: < 500ms
- Cache hit rate: > 80%

### 13.2 User Experience Metrics

**Targets**:
- Dashboard engagement: Users visit daily
- Action completion: Users complete suggested actions
- Error rate: < 1% of page loads
- Mobile usage: Works seamlessly on mobile

### 13.3 Business Metrics

**Targets**:
- Increased match submissions (coaches)
- Increased draft participation
- Reduced support tickets about "where do I..."
- Higher user retention

---

## 14. Future Enhancements

### 14.1 Real-Time Updates

**Features**:
- WebSocket connection for live updates
- Draft status updates
- Match result notifications
- Activity feed streaming

### 14.2 Personalization

**Features**:
- Customizable dashboard layout
- Widget selection
- Preference saving
- Theme customization

### 14.3 Advanced Analytics

**Features**:
- Performance trends (charts)
- Predictive analytics
- Comparison tools
- Export reports

### 14.4 Notifications

**Features**:
- Browser notifications
- Email digests
- Discord integration
- Mobile push (future)

---

## 15. Migration Plan

### 15.1 Backward Compatibility

**Strategy**:
- Keep existing `DraftTabsSection` (don't break)
- Add new sections incrementally
- Feature flag for new dashboard (optional)

### 15.2 Rollout Strategy

**Phase 1**: Internal testing
- Test with admin account
- Fix issues
- Performance testing

**Phase 2**: Beta testing
- Roll out to select coaches
- Gather feedback
- Iterate

**Phase 3**: Full rollout
- Deploy to all users
- Monitor metrics
- Address issues

---

## 16. Documentation Requirements

### 16.1 Component Documentation

**For Each Component**:
- Purpose and usage
- Props interface
- Example usage
- Dependencies

### 16.2 API Documentation

**For API Routes**:
- Endpoint description
- Request/response schemas
- Error codes
- Rate limits

### 16.3 User Documentation

**For End Users**:
- Dashboard overview guide
- How to interpret stats
- How to use quick actions
- Troubleshooting

---

## 17. Dependencies & Prerequisites

### 17.1 Required Dependencies

**Already Installed**:
- ✅ Next.js 16
- ✅ React 19.2
- ✅ Supabase client
- ✅ UI components (shadcn/ui)
- ✅ Lucide icons

**May Need**:
- ⬜ Chart library (recharts or similar) - for performance graphs
- ⬜ Date formatting library (date-fns) - if not already installed
- ⬜ SWR or React Query - for client-side data fetching (optional)

### 17.2 Database Requirements

**Tables Needed** (all exist):
- ✅ `profiles` - User profiles
- ✅ `teams` - Team data
- ✅ `matches` - Match records
- ✅ `draft_sessions` - Draft status
- ✅ `draft_budgets` - Budget tracking
- ✅ `team_rosters` - Roster data
- ✅ `user_activity_log` - Activity tracking
- ✅ `seasons` - Season information

**Indexes Needed** (verify exist):
- ✅ `teams.season_id`
- ✅ `team_rosters.team_id, season_id`
- ✅ `matches.team1_id, team2_id, season_id`
- ✅ `user_activity_log.user_id, created_at`

---

## 18. Risk Assessment

### 18.1 Technical Risks

**Risk**: Database query performance
- **Mitigation**: Add indexes, use caching, optimize queries
- **Impact**: Medium

**Risk**: Real-time data accuracy
- **Mitigation**: Use appropriate cache TTLs, refresh strategies
- **Impact**: Low

**Risk**: Role-based access complexity
- **Mitigation**: Clear role checking, comprehensive testing
- **Impact**: Medium

### 18.2 User Experience Risks

**Risk**: Information overload
- **Mitigation**: Progressive disclosure, collapsible sections
- **Impact**: Medium

**Risk**: Mobile usability
- **Mitigation**: Responsive design, mobile-first approach
- **Impact**: High

**Risk**: Confusion about data
- **Mitigation**: Clear labels, tooltips, help text
- **Impact**: Low

---

## 19. Open Questions

### 19.1 Design Decisions

1. **Charts/Graphs**: Should we include performance trend charts in Phase 1 or Phase 4?
2. **Real-Time**: Should dashboard update in real-time or on refresh?
3. **Activity Feed**: Show only user's activity or league-wide?
4. **Customization**: Allow users to customize dashboard layout?
5. **Weekly Matches Integration**: Should dashboard show full opponent intelligence cards or summary with link to full page?
6. **Damage Calculator**: Should dashboard include scoped damage calculator or just link to `/calc`?
7. **Standings Source**: Use materialized view (`v_regular_team_rankings`) or calculate on-the-fly?
8. **Tera Captain Display**: Show full Tera captain list or just count/indicator?

### 19.2 Technical Decisions

1. **Caching**: Use Redis/Upstash KV or Next.js cache?
2. **Data Fetching**: Single API call or multiple parallel calls?
3. **Error Handling**: Show partial data or full error page?
4. **Mobile**: Separate mobile layout or responsive only?
5. **Performance**: Materialize aggregates (team stats, standings) or compute on-demand?
6. **Standings Accuracy**: How to ensure rankings match Matt's comparator exactly?
7. **Tera Captain Data**: Store in `team_rosters` metadata or separate table?
8. **Battle Plans**: Load all plans or lazy-load on demand?

### 19.3 Feature Priorities

1. **Must Have**: Stats grid, activity feed, quick actions, next match opponent intelligence
2. **Should Have**: Team performance, upcoming matches with Tera captains, weekly battle plan status
3. **Nice to Have**: Charts, real-time updates, customization, scoped damage calculator
4. **Critical Requirements** (per Matt's upgrades):
   - Standings must match league comparator exactly
   - Opponent stats must reflect current state (not projections)
   - Tera captains must be authoritative (from metadata, not inferred)
   - Performance aggregates must be cached/materialized

---

## 20. Integration with Weekly Matches Feature

### 20.1 Connection Points

**Dashboard Overview** → **Weekly Matches Planning**:
- Dashboard shows summary of next match opponent
- "Plan Match" button links to `/dashboard/weekly-matches?week={next_week}`
- Battle plan status indicator shows if plan exists
- Quick access to full opponent intelligence

**Weekly Matches Page** → **Dashboard Overview**:
- Breadcrumb navigation back to dashboard
- Battle plan editor saves to `weekly_battle_plans` table
- Week selector shows all scheduled weeks
- Full opponent intelligence cards (as per Matt's requirements)

### 20.2 Data Flow

```
Dashboard Overview
├── Fetches next match opponent intelligence
├── Shows summary cards (opponent name, stats, Tera captains)
├── Links to full planning workspace
└── Shows battle plan status

Weekly Matches Page
├── Full opponent intelligence cards
├── Tera captains with ⭐ indicators
├── Standings context (league rank, division rank)
├── Battle plan editor (saves to weekly_battle_plans)
└── Damage calculator (scoped to week's teams)
```

### 20.3 Shared Components

**Reusable Components**:
- `OpponentIntelligenceCard` - Used in both dashboard and weekly matches
- `TeraCaptainBadge` - Used throughout app
- `StandingsContextCard` - Used in both locations
- `WeeklyBattlePlanStatus` - Status indicator component

**Shared Utilities**:
- `lib/dashboard/opponent-intelligence.ts` - Opponent data fetching
- `lib/dashboard/standings-calculator.ts` - Standings calculation
- `lib/dashboard/win-streak-calculator.ts` - Win streak calculation

---

## 21. Critical Requirements (Per Matt's Upgrades)

### 21.1 Standings Accuracy

**Requirement**: Rankings must match Matt's league comparator exactly.

**Comparator Order**:
1. Wins (descending)
2. Losses (ascending)
3. Differential (descending)
4. Head-to-head record
5. Win streak
6. Strength of Schedule
7. Alphabetical (team name)

**Implementation**:
- Use materialized view `v_regular_team_rankings` that implements this comparator
- Never calculate standings on-the-fly
- Cache standings with 1-hour TTL
- Invalidate cache when match results are submitted

### 21.2 Opponent Stats Accuracy

**Requirement**: Stats must reflect current state as of that week, not season-end projections.

**Implementation**:
- Use materialized view `v_team_weekly_stats` that stores stats per week
- Query stats for specific week, not current season totals
- Cache per team per week (5 min TTL)

### 21.3 Tera Captain Authority

**Requirement**: Tera captains must be authoritative (from metadata, not inferred).

**Implementation**:
- Store Tera captain flag in `team_rosters` table (`tera_captain` boolean)
- Store Tera types in `team_rosters` metadata (`tera_types` array)
- Never infer Tera captains from other data
- Display with ⭐ indicator for visual clarity

### 21.4 Performance Aggregates

**Requirement**: Aggregates should be cached/materialized, not recomputed per render.

**Implementation**:
- Materialize team stats, standings, win streaks
- Cache frequently accessed aggregates
- Use Redis/Upstash KV for caching layer
- Set appropriate TTLs based on data volatility

---

## 22. Next Steps

### Immediate Actions

1. **Review this plan** with stakeholders (especially Matt for weekly matches integration)
2. **Verify materialized views** exist or create them
3. **Set up caching infrastructure** (Redis/Upstash KV)
4. **Prioritize features** based on user needs
5. **Set timeline** for implementation
6. **Assign tasks** to team members

### Before Starting Implementation

1. **Verify database indexes** exist
2. **Verify materialized views** exist (`v_regular_team_rankings`, `v_team_weekly_stats`)
3. **Test existing API endpoints** for compatibility (`/api/weekly-battle-plans`)
4. **Review UI component library** for needed components
5. **Set up caching** (Redis/Upstash KV)
6. **Verify standings comparator** matches league rules exactly

### First Implementation Task

1. **Create materialized views** for standings and team stats (if not exist)
2. **Set up caching layer** (Redis/Upstash KV integration)
3. **Create `/api/dashboard/overview` endpoint** with caching
4. **Test standings accuracy** against league comparator
5. **Update dashboard page** to use new endpoint
6. **Create first component** (`DashboardHeader`)

---

## Appendix: Component Specifications

### A. DashboardHeader Component

**Props**:
```typescript
interface DashboardHeaderProps {
  profile: UserProfile
  season: { id: string; name: string } | null
  lastLogin?: string | null
}
```

**Features**:
- Welcome message with user name
- Season badge
- Last login indicator (optional)

---

### A.5 Coach Card Component (Featured on Dashboard)

**Component**: `components/profile/coach-card.tsx` (reused)

**Props**:
```typescript
interface CoachCardProps {
  team: Team | null
  userId: string
}
```

**Features**:
- Team avatar display (with upload capability)
- Team name (editable inline)
- Team stats grid:
  - Record (W-L) in large text
  - Differential (+/-) with color coding
  - Division/Conference badges
- Link to team page
- **Dashboard variant**: Can be read-only or full-featured

**Placement on Dashboard**:
- Immediately after header
- Full-width card (responsive)
- Only shown for coaches (`profile.role === 'coach'`)
- Only shown if team exists (`team !== null`)

**Data Requirements**:
- Team data from `teams` table
- Includes: `id`, `name`, `wins`, `losses`, `differential`, `division`, `conference`, `avatar_url`, `logo_url`

---

### B. DashboardStatsGrid Component

**Props**:
```typescript
interface DashboardStatsGridProps {
  role: 'coach' | 'viewer' | 'admin' | 'commissioner'
  stats: DashboardStats
  draftStatus?: DraftStatus
}
```

**Features**:
- Renders 4 stat cards
- Role-based card content
- Responsive grid layout
- Click handlers for navigation

---

### C. TeamPerformanceSection Component

**Props**:
```typescript
interface TeamPerformanceSectionProps {
  teamId: string
  seasonId: string
}
```

**Features**:
- Team record display
- Standing position
- Recent form (last 5 matches)
- Performance trend (optional chart)
- Link to full team stats

---

### D. RecentActivitySection Component

**Props**:
```typescript
interface RecentActivitySectionProps {
  activities: Activity[]
  showLeagueActivity?: boolean
}
```

**Features**:
- Timeline-style feed
- Activity type icons
- Timestamps
- Links to relevant pages
- "View All" link
- Empty state message

---

---

## 23. Additional Enhancements from Matt's Requirements

### 23.1 Weekly Battle Plans Integration

**Feature**: Per-user, per-match battle plans saved privately.

**Data Model** (already exists):
```sql
CREATE TABLE weekly_battle_plans (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  match_id UUID NOT NULL REFERENCES matches(id),
  season_id UUID REFERENCES seasons(id),
  matchweek_id UUID REFERENCES matchweeks(id),
  week_number INTEGER,
  notes TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);
```

**Dashboard Integration**:
- Show battle plan status for next match
- Link to full planning workspace
- Display last updated timestamp
- Indicator if plan exists

### 23.2 Opponent Intelligence Cards

**Card Structure** (per Matt's requirements):
1. **Week & View Configuration Card**:
   - Week selector (dropdown)
   - Sprite view selector (future)
   
2. **Opponent Identity Card**:
   - Opponent team name
   - Opponent coach name
   - Team logo
   
3. **Opponent Performance Snapshot Card**:
   - Record (W-L)
   - Win streak
   - Kills, Deaths, Differential
   - **Must reflect current state as of that week**
   
4. **Opponent Tera Captains Card**:
   - List of opponent's Pokémon
   - ⭐ indicator for Tera Captains
   - Tera types for each captain
   
5. **Standings & Division Context Card**:
   - Current league standing (overall rank)
   - Division rank
   - **Must match league comparator exactly**

### 23.3 Damage Calculator Integration

**Requirement**: Scoped damage calculator that pulls only Pokémon from each team for the specific week.

**Status**: ⚠️ **Requires Simeon's approval** before implementation

**Considerations**:
- External logic engine
- IP/licensing considerations
- Performance considerations
- Trust boundaries (calc correctness)

**Recommended Approach**:
- Treat as pluggable service
- UI calls internal adapter
- Adapter may call trusted external calc or run sandboxed internal engine
- Scope to week's teams only (not global)

**Dashboard Integration**:
- Link to `/calc` with pre-filtered teams
- Or embed scoped calculator (if approved)
- Show only relevant Pokémon for planning

---

## 24. Database Schema Additions

### 24.1 Materialized Views Needed

**`v_regular_team_rankings`** (if not exists):
```sql
CREATE MATERIALIZED VIEW v_regular_team_rankings AS
SELECT 
  t.id as team_id,
  t.season_id,
  t.wins,
  t.losses,
  t.differential,
  -- Calculate rank using league comparator
  ROW_NUMBER() OVER (
    PARTITION BY t.season_id
    ORDER BY 
      t.wins DESC,
      t.losses ASC,
      t.differential DESC,
      -- Add H2H, streak, SoS, alphabetical as needed
      t.name ASC
  ) as rank,
  -- Division and conference ranks
  ROW_NUMBER() OVER (
    PARTITION BY t.season_id, t.division
    ORDER BY t.wins DESC, t.losses ASC, t.differential DESC
  ) as division_rank,
  ROW_NUMBER() OVER (
    PARTITION BY t.season_id, t.conference
    ORDER BY t.wins DESC, t.losses ASC, t.differential DESC
  ) as conference_rank
FROM teams t
WHERE t.season_id IS NOT NULL;

-- Refresh strategy: After match results submitted
CREATE UNIQUE INDEX ON v_regular_team_rankings(team_id, season_id);
```

**`v_team_weekly_stats`** (if not exists):
```sql
CREATE MATERIALIZED VIEW v_team_weekly_stats AS
SELECT 
  t.id as team_id,
  t.season_id,
  m.week,
  COUNT(CASE WHEN m.winner_id = t.id THEN 1 END) as wins_up_to_week,
  COUNT(CASE WHEN m.winner_id != t.id AND m.winner_id IS NOT NULL THEN 1 END) as losses_up_to_week,
  SUM(CASE WHEN m.winner_id = t.id THEN m.differential ELSE -m.differential END) as differential_up_to_week
FROM teams t
JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id)
WHERE m.week <= CURRENT_WEEK
GROUP BY t.id, t.season_id, m.week;

-- Refresh strategy: After match results submitted
CREATE UNIQUE INDEX ON v_team_weekly_stats(team_id, season_id, week);
```

### 24.2 Tera Captain Tracking

**In `team_rosters` table**:
- `tera_captain` BOOLEAN - Whether this Pokémon is a Tera Captain
- `tera_types` JSONB - Array of 3 Tera types for this captain
- **Must be set at roster lock, not inferred**

**Query Pattern**:
```sql
SELECT 
  tr.pokemon_name,
  tr.tera_captain,
  tr.tera_types,
  pp.generation
FROM team_rosters tr
JOIN pokepedia_pokemon pp ON tr.pokemon_name = pp.name
WHERE tr.team_id = $team_id
  AND tr.season_id = $season_id
  AND tr.tera_captain = true;
```

---

## 25. Testing Requirements

### 25.1 Standings Accuracy Testing

**Test Cases**:
1. Verify standings match Google Sheets exactly
2. Test tiebreaker scenarios (H2H, streak, SoS)
3. Test division/conference rankings
4. Verify rankings update correctly after match results

**Validation**:
- Compare dashboard standings to Google Sheets
- Test edge cases (tied records, same differential)
- Verify comparator order is correct

### 25.2 Opponent Intelligence Testing

**Test Cases**:
1. Verify opponent stats reflect correct week
2. Test Tera captain display (⭐ indicator)
3. Test standings context accuracy
4. Test battle plan status indicator

**Validation**:
- Compare stats to materialized view
- Verify Tera captains come from metadata
- Test with different weeks (historical accuracy)

### 25.3 Performance Testing

**Test Cases**:
1. Verify caching works correctly
2. Test cache invalidation on match results
3. Test materialized view refresh
4. Measure query performance (should be < 100ms)

**Validation**:
- Cache hit rate > 80%
- Query times < 100ms (cached)
- Materialized views refresh correctly

---

---

## 26. Coach Card Feature Integration

### 26.1 Overview

The **Coach Card** (`components/profile/coach-card.tsx`) will be **prominently featured** on the dashboard overview page for all coaches. This provides immediate visibility of team status, identity, and quick access to team management.

### 26.2 Implementation Details

**Component**: Reuse existing `components/profile/coach-card.tsx`

**Placement**:
- **Location**: Immediately after dashboard header, before stats grid
- **Layout**: Full-width card (responsive: full-width on mobile, can be side-by-side on desktop)
- **Visibility**: Only shown for coaches (`profile.role === 'coach'`) with assigned team

**Data Fetching**:
```typescript
// In dashboard page (server component)
const team = profile.team_id 
  ? await supabase
      .from('teams')
      .select('id, name, wins, losses, differential, division, conference, avatar_url, logo_url, coach_name')
      .eq('id', profile.team_id)
      .single()
  : null
```

**Rendering**:
```typescript
{profile.role === 'coach' && team?.data && (
  <div className="mb-6">
    <CoachCard team={team.data} userId={profile.id} />
  </div>
)}
```

### 26.3 Design Options

**Option A: Full-Featured Card** (Recommended)
- Use existing `CoachCard` component as-is
- Includes edit capabilities (team name, avatar upload)
- Full team stats display
- Link to team page

**Option B: Read-Only Dashboard Variant**
- Create dashboard-specific variant
- Remove edit functionality
- More compact layout
- Still includes all stats and link to team page

**Option C: Compact Sidebar Style**
- Smaller card alongside stats grid
- 2-column layout on desktop
- Full-width on mobile

**Recommendation**: **Option A** - Use full-featured card for consistency with profile page and immediate access to team management.

### 26.4 Benefits

1. **Immediate Team Visibility**: Coaches see their team status at a glance
2. **Quick Access**: Direct link to team page and team management
3. **Consistency**: Same component used in profile and dashboard
4. **Visual Identity**: Team avatar and name prominently displayed
5. **Action-Oriented**: Quick stats (record, differential) visible immediately

### 26.5 Responsive Behavior

- **Desktop**: Full-width card after header
- **Tablet**: Full-width card after header
- **Mobile**: Full-width card after header, stats grid below

### 26.6 Integration with Other Sections

- **Stats Grid**: Coach card complements stats grid (doesn't replace it)
- **Team Performance Section**: Coach card provides quick overview, Team Performance provides detailed analysis
- **Upcoming Matches**: Coach card shows team identity, Upcoming Matches shows opponent context

---

**Status**: ✅ **PLAN COMPLETE - ENHANCED WITH MATT'S UPGRADES + COACH CARD FEATURE**  
**Last Updated**: January 25, 2026  
**Version**: 2.1 - Enhanced with Weekly Matches Integration + Coach Card Feature
