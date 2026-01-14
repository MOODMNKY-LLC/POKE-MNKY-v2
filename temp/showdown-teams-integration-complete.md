# Showdown Teams Integration - Complete ✅

**Date**: January 15, 2026  
**Status**: Database table created, utilities implemented, API routes ready

---

## ✅ What Was Created

### 1. Database Migration (`supabase/migrations/20260115000001_create_showdown_teams_table.sql`)

**Table**: `showdown_teams`

**Features**:
- ✅ Stores team export text (original and canonical/prettified)
- ✅ Parsed Pokemon data in JSONB format
- ✅ Metadata extraction (generation, format, folder, team name)
- ✅ Links to teams, coaches, and seasons
- ✅ Validation tracking
- ✅ Full-text search support
- ✅ Soft delete support
- ✅ Automatic timestamp management
- ✅ Row Level Security (RLS) policies

**Key Columns**:
- `team_name` - Team name from header
- `generation` - Generation number (e.g., 8, 9)
- `format` - Battle format (ou, uu, vgc, etc.)
- `folder_path` - Folder organization path
- `team_text` - Original team export text
- `canonical_text` - Cleaned/prettified version
- `pokemon_data` - JSONB array of parsed Pokemon
- `pokemon_count` - Auto-calculated count
- `is_validated` - Validation status
- `validation_errors` - Array of error messages
- `tags` - User-defined tags
- `notes` - User notes

**Indexes**:
- Team ID, Coach ID, Season ID
- Generation, Format, Folder Path
- Created At (descending)
- GIN indexes for JSONB and array searches
- Full-text search index

---

### 2. Team Management Library (`lib/showdown-teams.ts`)

**Functions**:
- ✅ `createShowdownTeam()` - Create new team from export text
- ✅ `getCoachTeams()` - Get teams for a coach with filters
- ✅ `getTeamById()` - Get single team by ID
- ✅ `updateShowdownTeam()` - Update team (re-parses if text changed)
- ✅ `deleteShowdownTeam()` - Soft delete team
- ✅ `searchTeams()` - Full-text search teams
- ✅ `exportTeam()` - Export team to Showdown format

**Features**:
- Automatic parsing on create/update
- Metadata extraction
- JSONB Pokemon data storage
- Error handling
- TypeScript types

---

### 3. API Routes

#### `GET /api/showdown/teams`
- Get teams for authenticated user
- Query parameters:
  - `search` - Full-text search
  - `format` - Filter by format
  - `generation` - Filter by generation
  - `season_id` - Filter by season
  - `limit` - Limit results

#### `POST /api/showdown/teams`
- Create new team
- Body: `{ team_text, team_name?, team_id?, season_id?, tags?, notes?, source? }`

#### `GET /api/showdown/teams/[id]`
- Get team by ID
- Query parameter: `export=showdown` to get exported text

#### `PATCH /api/showdown/teams/[id]`
- Update team
- Body: `{ team_name?, team_text?, tags?, notes?, folder_path? }`

#### `DELETE /api/showdown/teams/[id]`
- Soft delete team

---

### 4. Import Script (`scripts/import-showdown-teams.ts`)

**Purpose**: Import teams from the cloned Pokemon-Showdown-Teams repository

**Features**:
- ✅ Recursively scans Teams directory
- ✅ Parses each team file
- ✅ Extracts metadata (generation, format, folder)
- ✅ Imports into database
- ✅ Handles duplicates (skips)
- ✅ Error reporting
- ✅ Progress tracking

**Usage**:
```bash
pnpm exec tsx scripts/import-showdown-teams.ts
```

---

## 📋 Database Schema

```sql
CREATE TABLE public.showdown_teams (
  id UUID PRIMARY KEY,
  team_name TEXT NOT NULL,
  generation INTEGER,
  format TEXT,
  folder_path TEXT,
  team_text TEXT NOT NULL,
  canonical_text TEXT NOT NULL,
  pokemon_data JSONB NOT NULL,
  team_id UUID REFERENCES teams(id),
  coach_id UUID REFERENCES coaches(id),
  season_id UUID REFERENCES seasons(id),
  pokemon_count INTEGER NOT NULL,
  is_validated BOOLEAN DEFAULT FALSE,
  validation_errors TEXT[],
  source TEXT,
  tags TEXT[],
  notes TEXT,
  original_filename TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

---

## 🎯 Usage Examples

### Create a Team

```typescript
import { createShowdownTeam } from '@/lib/showdown-teams';

const result = await createShowdownTeam({
  team_text: `=== [gen9] My Team ===
Pikachu @ Light Ball
Ability: Static
[...]
`,
  team_name: 'My Team',
  tags: ['offensive', 'gen9']
}, coachId);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
} else {
  console.log('Team created:', result.team.id);
}
```

### Get Teams

```typescript
import { getCoachTeams } from '@/lib/showdown-teams';

// Get all teams
const teams = await getCoachTeams(coachId);

// Get OU teams for Gen 9
const ouTeams = await getCoachTeams(coachId, {
  format: 'ou',
  generation: 9
});
```

### Search Teams

```typescript
import { searchTeams } from '@/lib/showdown-teams';

const results = await searchTeams('rain', {
  format: 'vgc',
  limit: 10
});
```

### Export Team

```typescript
import { exportTeam } from '@/lib/showdown-teams';

const exported = exportTeam(team, {
  includeHeader: true,
  generation: 9,
  format: 'ou'
});
```

---

## 🔄 Next Steps

1. **Run Migration**:
   ```bash
   supabase db push
   ```

2. **Import Teams**:
   ```bash
   pnpm exec tsx scripts/import-showdown-teams.ts
   ```

3. **Test API Routes**:
   - Test creating a team via POST
   - Test getting teams via GET
   - Test updating/deleting teams

4. **Create UI Components**:
   - Team library page
   - Team upload component
   - Team viewer/editor
   - Team search/filter

---

## 📝 Notes

- Teams are stored with both original and canonical text
- Pokemon data is stored as JSONB for flexible querying
- Full-text search is available on team names and notes
- Soft delete preserves data for recovery
- RLS policies ensure users can only access their own teams
- Automatic triggers handle timestamps and Pokemon count

---

**✅ All components ready for use!**
