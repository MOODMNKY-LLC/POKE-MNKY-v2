# Draft Session Start Guide

**Date**: January 19, 2026  
**Purpose**: How to create and start a draft session for testing

---

## Quick Start

### Option 1: API Endpoint (Recommended)

**Create a draft session via API:**

```bash
# Using curl
curl -X POST http://localhost:3000/api/draft/create-session \
  -H "Content-Type: application/json"

# Or with custom options
curl -X POST http://localhost:3000/api/draft/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "draft_type": "snake",
    "pick_time_limit": 45
  }'
```

**Or use the browser console:**

```javascript
fetch('/api/draft/create-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    draft_type: 'snake',
    pick_time_limit: 45
  })
})
.then(r => r.json())
.then(console.log)
```

---

### Option 2: Setup Script

**Run the setup script:**

```bash
pnpm exec tsx --env-file=.env.local scripts/setup-draft-test-environment.ts
```

This script will:
1. ✅ Create/get current season
2. ✅ Create test teams (if needed)
3. ✅ Initialize draft budgets
4. ✅ Create draft session

---

### Option 3: Direct Database (Advanced)

**Using Supabase SQL Editor:**

```sql
-- 1. Get current season ID
SELECT id FROM seasons WHERE is_current = true LIMIT 1;

-- 2. Get team IDs
SELECT id FROM teams WHERE season_id = '<season_id>' LIMIT 20;

-- 3. Create draft session
INSERT INTO draft_sessions (
  season_id,
  status,
  draft_type,
  total_teams,
  total_rounds,
  current_pick_number,
  current_round,
  current_team_id,
  turn_order,
  pick_time_limit_seconds,
  started_at
) VALUES (
  '<season_id>',
  'active',
  'snake',
  20,
  11,
  1,
  1,
  '<first_team_id>',
  '["<team_id_1>", "<team_id_2>", ...]'::jsonb,
  45,
  NOW()
);

-- 4. Initialize budgets
INSERT INTO draft_budgets (team_id, season_id, total_points, spent_points, remaining_points)
SELECT id, '<season_id>', 120, 0, 120
FROM teams
WHERE season_id = '<season_id>'
ON CONFLICT (team_id, season_id) DO NOTHING;
```

---

## Prerequisites

Before creating a draft session, ensure:

1. ✅ **Current Season Exists**
   ```sql
   SELECT * FROM seasons WHERE is_current = true;
   ```
   If none exists, create one:
   ```sql
   INSERT INTO seasons (name, start_date, is_current)
   VALUES ('Season 5', NOW(), true);
   ```

2. ✅ **Teams Exist for Season**
   ```sql
   SELECT COUNT(*) FROM teams WHERE season_id = '<season_id>';
   ```
   Need at least 2 teams. Create teams if needed.

3. ✅ **Draft Pool Populated**
   ```sql
   SELECT COUNT(*) FROM draft_pool WHERE season_id = '<season_id>' AND status = 'available';
   ```
   Should have Pokemon available for drafting.

---

## API Endpoint Details

### POST `/api/draft/create-session`

**Request Body (all optional):**
```typescript
{
  season_id?: string          // UUID, defaults to current season
  team_ids?: string[]         // Array of team UUIDs, defaults to all teams in season
  draft_type?: "snake" | "linear" | "auction"  // Defaults to "snake"
  pick_time_limit?: number    // Seconds, defaults to 45
}
```

**Response:**
```typescript
{
  success: boolean
  message: string
  session: DraftSession      // If created or already exists
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Draft session created successfully",
  "session": {
    "id": "uuid",
    "season_id": "uuid",
    "status": "active",
    "draft_type": "snake",
    "total_teams": 20,
    "total_rounds": 11,
    "current_pick_number": 1,
    "current_round": 1,
    "current_team_id": "uuid",
    "turn_order": ["uuid1", "uuid2", ...],
    "pick_time_limit_seconds": 45,
    "started_at": "2026-01-19T..."
  }
}
```

---

## Troubleshooting

### Error: "No current season found"

**Solution**: Create a current season:
```sql
INSERT INTO seasons (name, start_date, is_current)
VALUES ('Season 5', NOW(), true);
```

### Error: "No teams found for this season"

**Solution**: Create teams for the season:
```sql
INSERT INTO teams (name, season_id, coach_name, division, conference)
VALUES 
  ('Team 1', '<season_id>', 'Coach 1', 'Kanto', 'Lance Conference'),
  ('Team 2', '<season_id>', 'Coach 2', 'Johto', 'Leon Conference');
```

### Error: "Active draft session already exists"

**Solution**: Either:
1. Use the existing session (it's already active)
2. Complete/cancel the existing session first:
   ```sql
   UPDATE draft_sessions 
   SET status = 'completed' 
   WHERE season_id = '<season_id>' AND status = 'active';
   ```

### Error: "At least 2 teams are required"

**Solution**: Create more teams for the season (minimum 2 required).

---

## Verification

After creating a session, verify it exists:

```bash
# Check via API
curl http://localhost:3000/api/draft/status

# Should return:
{
  "success": true,
  "session": { ... },
  "currentTeam": { ... },
  "nextTeam": { ... },
  "currentTurn": { ... }
}
```

Or check database:
```sql
SELECT * FROM draft_sessions WHERE status = 'active';
```

---

## Next Steps

After creating a draft session:

1. ✅ Navigate to `/draft/board` - Should show the draft room
2. ✅ Verify draft board displays Pokemon
3. ✅ Verify budget display shows correct values
4. ✅ Test making a draft pick
5. ✅ Verify confetti animation on success
6. ✅ Verify border-beam appears when it's your turn

---

**Last Updated**: January 19, 2026  
**Status**: ✅ Ready to Use
