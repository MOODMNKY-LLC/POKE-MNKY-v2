# Teams Architecture - Comprehensive Analysis

## Executive Summary

POKE MNKY has **two distinct team concepts** that share the same structure but serve different purposes:

1. **General Teams** - Available to all users, for casual/showdown use
2. **League/Drafted Teams** - Bound by league rules, draft picks, official competition

Both use the same team structure (Pokemon, moves, items, etc.) but are sourced and managed differently.

---

## 1. Team Type Distinctions

### General Teams (Showdown Teams)
**Purpose**: Casual teams for fun, practice, showdown integration  
**Access**: All users (no coach status required)  
**Source**: User-created or stock teams  
**Rules**: No league rules apply  
**Storage**: `showdown_teams` table

**Characteristics**:
- Can be created by anyone
- Used for casual battles
- Can optionally link to league teams (`team_id` FK)
- Stock teams available to all (`is_stock = true`)
- User teams belong to creator (`coach_id` FK)
- No draft restrictions
- No budget constraints

### League/Drafted Teams
**Purpose**: Official league competition teams  
**Access**: Coaches only (assigned to teams)  
**Source**: Draft picks, free agency, trades  
**Rules**: Bound by league rules (roster size, draft budget, etc.)  
**Storage**: `teams` table + `draft_picks` / `team_rosters`

**Characteristics**:
- Must be assigned to a coach (`coach_id` FK)
- Participate in seasons (`season_id` FK)
- Have draft rosters (`draft_picks` table)
- Bound by draft budget (120 points)
- Subject to roster limits (8-10 Pokemon)
- Track wins/losses, standings
- Can link to showdown teams for battles

---

## 2. Database Schema Analysis

### General Teams Tables

**`showdown_teams`**:
```sql
- id (UUID)
- team_name (TEXT)
- generation (INTEGER)
- format (TEXT) -- ou, uu, vgc, etc.
- team_text (TEXT) -- Original export
- canonical_text (TEXT) -- Cleaned version
- pokemon_data (JSONB) -- Parsed Pokemon array
- team_id (UUID FK) -- OPTIONAL link to league team
- coach_id (UUID FK) -- Owner/creator (nullable)
- season_id (UUID FK) -- OPTIONAL season context
- is_stock (BOOLEAN) -- Stock/pre-loaded teams
- is_validated (BOOLEAN) -- Validation status
- source (TEXT) -- 'upload', 'import', 'showdown'
- tags (TEXT[]) -- User tags
- created_at, updated_at, deleted_at
```

**`showdown_client_teams`**:
```sql
- teamid (TEXT) -- Showdown client team ID
- ownerid (TEXT) -- Showdown user ID
- team (TEXT) -- Team export text
- format (TEXT)
- title (TEXT)
- private (TEXT)
- views (INTEGER)
- date (BIGINT)
- created_at, updated_at
```

**Relationship**:
- `showdown_teams.team_id` → `teams.id` (nullable FK)
- When linked: League team can use showdown team for battles
- When not linked: Standalone casual team

### League Teams Tables

**`teams`** (League Teams):
```sql
- id (UUID)
- name / team_name (TEXT)
- coach_id (UUID FK) -- REQUIRED for league teams
- coach_name (TEXT)
- division (TEXT) -- Kanto, Johto, Hoenn, Sinnoh
- conference (TEXT) -- Lance, Leon
- season_id (UUID FK) -- REQUIRED for league teams
- division_id (UUID FK)
- franchise_key (TEXT) -- Stable across seasons
- wins, losses, differential (INTEGER)
- current_streak, streak_type (TEXT)
- strength_of_schedule (DECIMAL)
- logo_url, theme (TEXT)
- created_at, updated_at
```

**`draft_picks`** (Drafted Roster):
```sql
- id (UUID)
- season_id (UUID FK) -- REQUIRED
- team_id (UUID FK) -- References teams.id
- pokemon_id (UUID FK) -- References pokemon.id
- acquisition (ENUM) -- 'draft', 'free_agency', 'trade', 'waiver'
- draft_round (INTEGER)
- pick_number (INTEGER)
- status (ENUM) -- 'active', 'dropped', 'traded_away', 'ir', 'banned'
- points_snapshot (INTEGER) -- Points at acquisition time
- start_date, end_date (DATE)
- notes (TEXT)
- created_at, updated_at
```

**`team_rosters`** (Legacy/Alternative):
```sql
- id (UUID)
- team_id (UUID FK)
- pokemon_id (UUID FK)
- draft_round (INTEGER)
- draft_order (INTEGER)
- draft_points (INTEGER)
- season_id (UUID FK)
- created_at
```

**`season_teams`** (Season Participation):
```sql
- season_id (UUID FK)
- team_id (UUID FK)
- PRIMARY KEY (season_id, team_id)
```

**`draft_budgets`**:
```sql
- id (UUID)
- team_id (UUID FK)
- season_id (UUID FK)
- total_points (INTEGER) -- 120 points
- spent_points (INTEGER)
- remaining_points (INTEGER)
- tera_budget (INTEGER) -- 15 points
- tera_spent (INTEGER)
```

**Relationships**:
- `teams.season_id` → `seasons.id` (REQUIRED)
- `teams.coach_id` → `coaches.id` (REQUIRED)
- `draft_picks.team_id` → `teams.id` (REQUIRED)
- `season_teams` links teams to seasons (many-to-many)
- `showdown_teams.team_id` → `teams.id` (OPTIONAL)

---

## 3. Identifying League Teams vs General Teams

### League Team Indicators
- `teams.season_id IS NOT NULL` - Participates in a season
- `teams.coach_id IS NOT NULL` - Assigned to a coach
- Has entries in `draft_picks` table
- Has entries in `season_teams` table
- Has `draft_budgets` record
- Can be flagged with a tag or field (e.g., `is_league_team`)

### General Team Indicators
- `showdown_teams.team_id IS NULL` - Not linked to league team
- `showdown_teams.is_stock = true` - Stock team (available to all)
- `showdown_teams.coach_id IS NULL` - No owner (stock team)
- OR `showdown_teams.coach_id IS NOT NULL` but `team_id IS NULL` - User's casual team

### Proposed Flagging System
Add a flag to distinguish league teams:
```sql
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS is_league_team BOOLEAN DEFAULT false;

-- Set to true for teams that participate in seasons
UPDATE public.teams 
SET is_league_team = true 
WHERE season_id IS NOT NULL;
```

Or use a tag system:
- League teams: `tags @> ARRAY['league']`
- General teams: No 'league' tag

---

## 4. Sidebar Structure Proposal

### Option A: Two Separate Sections (Recommended)

**1. Teams** (All Users):
```typescript
{
  title: "Teams",
  url: "/dashboard/teams",
  icon: Users,
  items: [
    { title: "My Teams", url: "/dashboard/teams" },
    { title: "Team Library", url: "/dashboard/teams/library" },
    { title: "Create Team", url: "/dashboard/teams/create" },
    { title: "Team Builder", url: "/teams/builder" },
  ],
}
```

**2. My League Team** (Coaches Only):
```typescript
// Only if userProfile?.role === "coach" && userProfile?.team_id
{
  title: "My League Team",
  url: "/dashboard/league-team",
  icon: Trophy,
  items: [
    { title: "View Team", url: "/dashboard/league-team" },
    { title: "Roster", url: "/dashboard/league-team/roster" },
    { title: "Free Agency", url: "/dashboard/free-agency" },
    { title: "Team Stats", url: "/dashboard/league-team/stats" },
  ],
}
```

### Option B: Single Section with Subsections

**Teams** (All Users):
```typescript
{
  title: "Teams",
  url: "/dashboard/teams",
  icon: Users,
  items: [
    // General Teams (all users)
    { title: "My Teams", url: "/dashboard/teams" },
    { title: "Team Library", url: "/dashboard/teams/library" },
    { title: "Create Team", url: "/dashboard/teams/create" },
    
    // League Team (coaches only - conditionally added)
    // Only if userProfile?.role === "coach" && userProfile?.team_id
    { title: "My League Team", url: "/dashboard/league-team" },
    { title: "League Roster", url: "/dashboard/league-team/roster" },
    { title: "Free Agency", url: "/dashboard/free-agency" },
    { title: "League Stats", url: "/dashboard/league-team/stats" },
  ],
}
```

---

## 5. Page Structure

### General Teams Pages (`/dashboard/teams/*`)
- `/dashboard/teams` - List user's teams (from `showdown_teams` where `coach_id = user`)
- `/dashboard/teams/library` - Browse stock teams and public teams
- `/dashboard/teams/create` - Create new showdown team
- `/dashboard/teams/[id]` - View/edit showdown team
- `/teams/builder` - Team builder tool (public)

### League Team Pages (`/dashboard/league-team/*`)
- `/dashboard/league-team` - Coach's league team overview
- `/dashboard/league-team/roster` - Draft roster management
- `/dashboard/league-team/stats` - League team statistics
- `/dashboard/free-agency` - Free agency transactions (already exists)

---

## 6. Data Sources for Each Section

### General Teams Section
**Data Sources**:
- `showdown_teams` table
  - User's teams: `WHERE coach_id = (SELECT id FROM coaches WHERE user_id = auth.uid())`
  - Stock teams: `WHERE is_stock = true`
  - Public teams: `WHERE deleted_at IS NULL AND (is_stock = true OR coach_id = ...)`
- `showdown_client_teams` table (synced from Showdown)
- Can optionally link to league teams via `team_id` FK

**Features**:
- Create/edit/delete teams
- Import from Showdown
- Export to Showdown format
- Share teams (if public)
- Use in casual battles

### League Team Section
**Data Sources**:
- `teams` table (coach's league team)
- `draft_picks` table (roster)
- `draft_budgets` table (budget tracking)
- `free_agency_transactions` table (transactions)
- `matches` table (battle history)
- `team_rosters` table (legacy roster data)

**Features**:
- View league team info
- Manage draft roster
- Free agency transactions
- View team statistics
- Link to showdown teams for battles

---

## 7. Integration Points

### Linking General Teams to League Teams
When a coach wants to use a showdown team for a league battle:
1. Coach selects a showdown team from their collection
2. System links it via `showdown_teams.team_id = teams.id`
3. System validates showdown team against league roster
4. Team can be used in official battles

### Validation
- League teams must validate against `draft_picks` roster
- Showdown teams can optionally validate if linked to league team
- General teams have no validation requirements

---

## 8. Recommendations

### Immediate Actions
1. **Add "Teams" section** (all users) for general/showdown teams
2. **Rename "My Team" to "My League Team"** (coaches only) for clarity
3. **Create general teams pages** (`/dashboard/teams/*`)
4. **Keep league team pages** (`/dashboard/league-team/*`)
5. **Consider adding flag** to `teams` table: `is_league_team BOOLEAN`

### Future Enhancements
- Team sharing system for general teams
- Team templates/library
- Import/export functionality
- Team validation UI
- Team comparison tools

---

## Summary

**Two Team Concepts**:
1. **General Teams** (`showdown_teams`) - All users, casual use, no rules
2. **League Teams** (`teams` + `draft_picks`) - Coaches only, official competition, bound by rules

**Sidebar Structure**:
- **Teams** section (all users) - General/showdown teams
- **My League Team** section (coaches only) - Drafted/league teams

**Key Distinction**:
- League teams have `season_id`, `coach_id`, `draft_picks`
- General teams are standalone, optionally linkable to league teams
