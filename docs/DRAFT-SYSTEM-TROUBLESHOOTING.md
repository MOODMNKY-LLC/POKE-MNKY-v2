# Draft System Troubleshooting Guide

**Date**: January 19, 2026

## Quick Diagnostic Checklist

### 1. Check Draft Session Status
```bash
# Via browser console or API call
fetch('/api/draft/status').then(r => r.json()).then(console.log)
```

**Expected**: Should return `{ success: true, session: {...} }` with `status: "active"`

**If fails**:
- Check if session exists: Go to `/admin/draft/sessions`
- Verify session status is `"active"` (not `"pending"` or `"cancelled"`)
- Check current season exists: `SELECT * FROM seasons WHERE is_current = true`

### 2. Check Draft Pool Population
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as total, 
       COUNT(*) FILTER (WHERE status = 'available') as available,
       COUNT(*) FILTER (WHERE status = 'drafted') as drafted
FROM draft_pool
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1);
```

**Expected**: Should have > 0 total Pokemon, with most marked as `available`

**If empty**:
- Run draft pool parser: `pnpm exec tsx scripts/test-draft-pool-parser.ts`
- Verify Google Sheets sync has run
- Check `draft_pool` table has data for current season

### 3. Check User Team Assignment
```sql
-- Run in Supabase SQL Editor (replace USER_ID with your user ID)
SELECT t.id, t.name, t.coach_id, t.season_id
FROM teams t
JOIN seasons s ON t.season_id = s.id
WHERE t.coach_id = 'USER_ID' 
  AND s.is_current = true;
```

**Expected**: Should return 1 team row

**If no team**:
- User needs to be assigned to a team via admin panel
- Or team needs to be created and coach_id assigned
- Check `profiles.team_id` is set

### 4. Check Draft Board Access
- Navigate to `/draft/board`
- Should see draft board with Pokemon list
- If error: Check browser console for API errors

## Common Issues

### Issue: "No active draft session found"
**Cause**: Session status is not `"active"` or session doesn't exist

**Fix**:
1. Go to `/admin/draft/sessions`
2. Check if session exists
3. If status is `"pending"`, update it to `"active"`:
   ```sql
   UPDATE draft_sessions 
   SET status = 'active' 
   WHERE id = 'SESSION_ID';
   ```

### Issue: Draft board shows no Pokemon
**Cause**: Draft pool is empty or not filtered correctly

**Fix**:
1. Check draft pool population (see #2 above)
2. Verify `season_id` is set correctly in `draft_pool` table
3. Run draft pool parser if needed

### Issue: "Please log in to view your team roster"
**Cause**: User doesn't have a team assigned for current season

**Fix**:
1. Admin needs to create/assign team
2. Set `teams.coach_id` to user's ID
3. Set `teams.season_id` to current season ID
4. Optionally set `profiles.team_id` for easier lookup

### Issue: Draft planning dashboard shows errors
**Cause**: Missing dependencies or API issues

**Fix**:
1. Check browser console for specific errors
2. Verify all API routes are accessible
3. Check Supabase connection

## Draft Pool Population

### How to Populate Draft Pool

1. **Via Script** (Recommended):
   ```bash
   pnpm exec tsx scripts/test-draft-pool-parser.ts
   ```

2. **Via Google Sheets Sync**:
   - Go to `/admin/google-sheets`
   - Run sync
   - Draft pool should populate automatically

3. **Manual Check**:
   ```sql
   SELECT COUNT(*) FROM draft_pool WHERE season_id = 'SEASON_ID';
   ```

## Team Setup Process

### For Admins: Assigning Teams to Coaches

1. **Create Team** (if doesn't exist):
   ```sql
   INSERT INTO teams (name, season_id, division, conference)
   VALUES ('Team Name', 'SEASON_ID', 'Division', 'Conference');
   ```

2. **Assign Coach**:
   ```sql
   UPDATE teams 
   SET coach_id = 'USER_ID'
   WHERE id = 'TEAM_ID';
   ```

3. **Update Profile** (optional):
   ```sql
   UPDATE profiles 
   SET team_id = 'TEAM_ID'
   WHERE id = 'USER_ID';
   ```

### For Users: Checking Your Team

1. Go to `/dashboard/profile`
2. Check "Coach Card" section
3. If no team shown, contact admin

## Testing End-to-End

### Step-by-Step Test Process

1. **Verify Prerequisites**:
   - ✅ Current season exists (`is_current = true`)
   - ✅ Draft pool populated (> 0 Pokemon)
   - ✅ At least 2 teams exist for season
   - ✅ Teams have `coach_id` assigned

2. **Create Draft Session**:
   - Go to `/admin/draft/sessions`
   - Click "Create Session"
   - Verify session appears with `status: "active"`

3. **Access Draft Board**:
   - Navigate to `/draft/board`
   - Should see Pokemon list
   - Should see your team roster (if logged in)

4. **Test Draft Planning Dashboard**:
   - Navigate to `/dashboard/draft`
   - Should see available Pokemon
   - Should see your team info
   - Should update in real-time

5. **Make a Pick**:
   - Click on a Pokemon
   - Confirm pick
   - Verify it appears in your roster
   - Verify it's marked as drafted

## API Endpoints Reference

- `GET /api/draft/status` - Get active draft session
- `GET /api/draft/available` - Get available Pokemon
- `POST /api/draft/pick` - Make a draft pick
- `GET /api/draft/team-status` - Get team budget/roster
- `POST /api/draft/create-session` - Create new session (admin)
- `GET /api/admin/draft/sessions` - List all sessions (admin)

## Still Having Issues?

1. Check browser console for errors
2. Check server logs for API errors
3. Verify database state using SQL queries above
4. Check Supabase RLS policies allow access
5. Verify environment variables are set correctly
