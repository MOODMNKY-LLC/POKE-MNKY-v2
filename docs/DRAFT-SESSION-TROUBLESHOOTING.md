# Draft Session Troubleshooting

**Date**: January 19, 2026  
**Purpose**: Quick troubleshooting guide for draft session issues

---

## Issue: "No active draft session found"

### Symptoms
- Error message: "No active draft session found"
- 404 error on `/api/draft/status`
- Draft board page shows "No active draft session found"

### Solution

**Quick Fix - Create Session via API:**

```bash
# Using curl
curl -X POST http://localhost:3000/api/draft/create-session

# Or browser console
fetch('/api/draft/create-session', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

**Or use the setup script:**

```bash
pnpm exec tsx --env-file=.env.local scripts/setup-draft-test-environment.ts
```

---

## Issue: "No active season found"

### Symptoms
- Error: "No active season found"
- Cannot create draft session

### Solution

**Create a current season:**

```sql
-- Check if season exists
SELECT * FROM seasons WHERE is_current = true;

-- If none exists, create one
INSERT INTO seasons (name, start_date, is_current)
VALUES ('Season 5', NOW(), true);
```

**Or via API (if you have a seasons API):**

```javascript
// Create season via Supabase client
const { data, error } = await supabase
  .from('seasons')
  .insert({
    name: 'Season 5',
    start_date: new Date().toISOString(),
    is_current: true
  })
  .select()
  .single()
```

---

## Issue: "No teams found for this season"

### Symptoms
- Error when creating session: "No teams found for this season"
- Cannot create draft session

### Solution

**Create teams for the season:**

```sql
-- Get season ID
SELECT id FROM seasons WHERE is_current = true LIMIT 1;

-- Create teams (replace <season_id> with actual ID)
INSERT INTO teams (name, season_id, coach_name, division, conference)
VALUES 
  ('Team 1', '<season_id>', 'Coach 1', 'Kanto', 'Lance Conference'),
  ('Team 2', '<season_id>', 'Coach 2', 'Johto', 'Leon Conference'),
  ('Team 3', '<season_id>', 'Coach 3', 'Hoenn', 'Lance Conference');
```

**Minimum Requirements:**
- At least 2 teams required
- Each team needs: `name`, `season_id`
- Optional: `coach_name`, `division`, `conference`

---

## Issue: "Active draft session already exists"

### Symptoms
- Error when creating session: "Active draft session already exists"
- Session exists but you want to create a new one

### Solution

**Option 1: Use existing session**
- The existing session is already active
- Just navigate to `/draft/board` and use it

**Option 2: Complete existing session first**

```sql
-- Complete the existing session
UPDATE draft_sessions 
SET status = 'completed', completed_at = NOW()
WHERE season_id = '<season_id>' AND status = 'active';
```

**Option 3: Cancel existing session**

```sql
-- Cancel the existing session
UPDATE draft_sessions 
SET status = 'cancelled'
WHERE season_id = '<season_id>' AND status = 'active';
```

Then create a new session via API.

---

## Issue: Redirect Loop (307 redirects)

### Symptoms
- Multiple 307 redirects
- API calls failing

### Solution

**Fixed in latest code** - The status route now handles season lookup without redirects.

**If still experiencing issues:**

1. Check browser console for errors
2. Verify season exists:
   ```sql
   SELECT * FROM seasons WHERE is_current = true;
   ```
3. Try calling API directly with season_id:
   ```bash
   curl "http://localhost:3000/api/draft/status?season_id=<season_id>"
   ```

---

## Verification Steps

After fixing issues, verify everything works:

### 1. Check Season Exists
```sql
SELECT id, name, is_current FROM seasons WHERE is_current = true;
```

### 2. Check Teams Exist
```sql
SELECT COUNT(*) as team_count, season_id 
FROM teams 
WHERE season_id = '<season_id>'
GROUP BY season_id;
```

### 3. Check Draft Session Exists
```sql
SELECT * FROM draft_sessions WHERE status = 'active';
```

### 4. Check via API
```bash
curl http://localhost:3000/api/draft/status
```

Should return:
```json
{
  "success": true,
  "session": { ... }
}
```

### 5. Check Draft Board Page
Navigate to `http://localhost:3000/draft/board`
- Should show draft room
- Should display Pokemon
- Should show budget (if logged in)

---

## Common Workflows

### First Time Setup

1. **Create Season**
   ```sql
   INSERT INTO seasons (name, start_date, is_current)
   VALUES ('Season 5', NOW(), true);
   ```

2. **Create Teams**
   ```sql
   INSERT INTO teams (name, season_id, coach_name)
   VALUES ('Team 1', '<season_id>', 'Coach 1');
   -- Repeat for more teams
   ```

3. **Create Draft Session**
   ```bash
   curl -X POST http://localhost:3000/api/draft/create-session
   ```

4. **Verify**
   ```bash
   curl http://localhost:3000/api/draft/status
   ```

### Reset Draft Session

1. **Complete/Cancel existing session**
   ```sql
   UPDATE draft_sessions 
   SET status = 'completed'
   WHERE status = 'active';
   ```

2. **Create new session**
   ```bash
   curl -X POST http://localhost:3000/api/draft/create-session
   ```

---

## Debugging Tips

### Check Logs
- Browser console (F12)
- Terminal/Server logs
- Network tab (check API responses)

### Database Queries
```sql
-- Check all draft sessions
SELECT id, status, season_id, current_round, current_pick_number
FROM draft_sessions
ORDER BY created_at DESC;

-- Check teams for season
SELECT id, name, season_id
FROM teams
WHERE season_id = '<season_id>';

-- Check draft budgets
SELECT team_id, total_points, spent_points, remaining_points
FROM draft_budgets
WHERE season_id = '<season_id>';
```

### API Testing
```bash
# Test status endpoint
curl http://localhost:3000/api/draft/status

# Test create endpoint
curl -X POST http://localhost:3000/api/draft/create-session \
  -H "Content-Type: application/json"

# Test with season_id
curl "http://localhost:3000/api/draft/status?season_id=<season_id>"
```

---

## Still Having Issues?

1. ✅ Check all prerequisites (season, teams, draft pool)
2. ✅ Verify database migrations are applied
3. ✅ Check RLS policies allow access
4. ✅ Review server logs for errors
5. ✅ Test API endpoints directly
6. ✅ Verify environment variables are set

---

**Last Updated**: January 19, 2026  
**Status**: ✅ Ready to Use
