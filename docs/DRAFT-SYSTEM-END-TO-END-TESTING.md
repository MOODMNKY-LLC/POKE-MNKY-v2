# Draft System End-to-End Testing Guide

**Date**: January 19, 2026  
**Status**: 🧪 **READY FOR TESTING**  
**Phases Completed**: 1-4 ✅

---

## 🎯 Testing Overview

This guide provides a systematic approach to test the complete draft system end-to-end, verifying:
- Database state and prerequisites
- Admin panel functionality
- User dashboard integration (Planning, Board, Roster tabs)
- Draft flow (making picks, turn order, budget tracking)
- Real-time updates across components

---

## ✅ Prerequisites Check

Before starting, verify these prerequisites are met:

### 1. Current Season Exists

**Check**:
```sql
SELECT id, name, is_current, start_date, end_date
FROM seasons
WHERE is_current = true;
```

**Expected**: 1 row returned with `is_current = true`

**If fails**: Create a current season:
```sql
INSERT INTO seasons (name, is_current, start_date, end_date)
VALUES ('Season 5', true, CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months');
```

### 2. Draft Pool is Populated

**Check**:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'available') as available,
  COUNT(*) FILTER (WHERE status = 'drafted') as drafted,
  COUNT(*) FILTER (WHERE status = 'banned') as banned
FROM draft_pool
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1);
```

**Expected**: 
- `total` > 0 (ideally 200+ Pokemon)
- Most Pokemon should be `available`
- `drafted` should be 0 (or match current draft progress)

**If empty**: Run draft pool parser:
```bash
pnpm exec tsx scripts/test-draft-pool-parser.ts
```

### 3. User Has Team Assigned

**Check** (replace `USER_ID` with your user ID):
```sql
SELECT t.id, t.name, t.coach_id, t.season_id, s.name as season_name
FROM teams t
JOIN seasons s ON t.season_id = s.id
WHERE t.coach_id = 'USER_ID' 
  AND s.is_current = true;
```

**Expected**: 1 row returned

**If no team**: 
- Admin needs to create/assign team (see Team Setup in troubleshooting guide)
- Or use admin panel to assign team

### 4. Multiple Teams Exist (for Draft)

**Check**:
```sql
SELECT COUNT(*) as team_count
FROM teams
WHERE season_id = (SELECT id FROM seasons WHERE is_current = true LIMIT 1)
  AND coach_id IS NOT NULL;
```

**Expected**: At least 2 teams (for draft to work)

**If < 2**: Create additional teams via admin panel or SQL

---

## 🧪 Test Sequence

### Test 1: Admin Panel - Draft Session Management

**Goal**: Verify admin can create, view, and manage draft sessions

**Steps**:
1. Navigate to `/admin/draft/sessions`
2. **Verify UI loads**: Should see list of sessions (or empty state)
3. **Create new session**:
   - Click "Create Session" button
   - Fill in form:
     - Draft Type: `snake` (or `linear`)
     - Pick Time Limit: `45` (seconds)
   - Click "Create"
4. **Verify session created**:
   - Session should appear in list
   - Status should be `active`
   - Should show season, round, pick number
5. **Test cancel session**:
   - Click "Cancel" on active session
   - Verify status changes to `cancelled`
   - Verify session no longer appears as active

**Success Criteria**:
- ✅ Admin panel loads without errors
- ✅ Can create new draft session
- ✅ Session appears with correct status
- ✅ Can cancel session

---

### Test 2: Draft Planning Dashboard

**Goal**: Verify draft planning tab shows available Pokemon and user team info

**Steps**:
1. Navigate to `/dashboard` (main dashboard)
2. **Verify Draft section appears**: Should see tabs (Planning, Board, Roster)
3. **Click "Planning" tab** (or navigate to `/dashboard/draft`)
4. **Verify data loads**:
   - Should see "Draft Planning" header
   - Status alert should show:
     - Season name
     - Draft pool count (available/total)
     - Session status (if active)
     - Your team name and roster count
5. **Test filters**:
   - Search for a Pokemon name
   - Filter by point tier (e.g., "20 Points")
   - Filter by generation (e.g., "Gen 9")
   - Verify Pokemon list updates correctly
6. **Verify team panel**:
   - Right side should show your team roster
   - Should show budget display
   - Should show drafted Pokemon (if any)

**Success Criteria**:
- ✅ Planning tab loads without errors
- ✅ Shows available Pokemon list
- ✅ Shows user team and budget
- ✅ Filters work correctly
- ✅ Real-time updates work (if draft is active)

---

### Test 3: Draft Board (Live Draft)

**Goal**: Verify draft board shows live draft session and allows making picks

**Steps**:
1. **Ensure active session exists**: Go to `/admin/draft/sessions` and verify one is `active`
2. Navigate to `/dashboard/draft/board` (or click "Board" tab)
3. **Verify draft board loads**:
   - Should see `DraftHeader` with:
     - Current round number
     - Current pick number
     - Whose turn it is
   - Should see Pokemon organized by point tiers (20 down to 1)
   - Should see your team roster panel on right
   - Should see pick history
4. **Verify turn indicator**:
   - If it's your turn: Pokemon should be clickable
   - If not your turn: Should show whose turn it is
5. **Test making a pick** (if it's your turn):
   - Click on an available Pokemon
   - Confirm pick in modal (if PickConfirmation exists)
   - Verify:
     - Pokemon appears in your roster
     - Pokemon is marked as "drafted" in the board
     - Budget updates correctly
     - Turn advances to next team
     - Pick appears in pick history

**Success Criteria**:
- ✅ Draft board loads when session is active
- ✅ Shows correct turn information
- ✅ Can make picks when it's your turn
- ✅ Pick updates roster and budget
- ✅ Real-time updates work (see other picks as they happen)

---

### Test 4: Draft Roster View

**Goal**: Verify roster tab shows user's drafted Pokemon and budget

**Steps**:
1. Navigate to `/dashboard/draft/roster` (or click "Roster" tab)
2. **Verify roster loads**:
   - Should show "My Draft Roster" header
   - Should show team name
   - Left side: Team roster panel with drafted Pokemon
   - Right side: Budget overview and team information
3. **Verify roster display**:
   - Should list all drafted Pokemon
   - Should show point values
   - Should show draft round/order
   - Should show total roster count (e.g., "3/11")
4. **Verify budget display**:
   - Should show total budget (120 points)
   - Should show spent points
   - Should show remaining points
   - Should show progress bar
   - Should show warning if remaining < 20 points

**Success Criteria**:
- ✅ Roster tab loads without errors
- ✅ Shows all drafted Pokemon
- ✅ Budget display is accurate
- ✅ Updates in real-time when picks are made

---

### Test 5: Real-Time Updates

**Goal**: Verify components update in real-time when draft changes occur

**Steps**:
1. **Open two browser windows**:
   - Window 1: `/dashboard/draft/board` (logged in as User A)
   - Window 2: `/dashboard/draft/board` (logged in as User B, or same user)
2. **Make a pick in Window 1** (if it's your turn)
3. **Verify Window 2 updates**:
   - Pick should appear in pick history
   - Pokemon should be marked as drafted
   - Turn indicator should update
   - Budget should update (if same user)
4. **Test Planning tab updates**:
   - Open `/dashboard/draft` (Planning tab) in Window 2
   - Make a pick in Window 1
   - Verify Planning tab shows Pokemon as drafted
   - Verify draft pool count updates
5. **Test Roster tab updates**:
   - Open `/dashboard/draft/roster` in Window 2
   - Make a pick in Window 1
   - Verify roster updates with new Pokemon
   - Verify budget updates

**Success Criteria**:
- ✅ All tabs update in real-time
- ✅ No page refresh needed
- ✅ Updates appear within 1-2 seconds
- ✅ No duplicate updates or flickering

---

### Test 6: Error Handling

**Goal**: Verify system handles errors gracefully

**Test Cases**:

1. **No Active Session**:
   - Cancel all active sessions
   - Navigate to `/dashboard/draft/board`
   - **Expected**: Should show "No active draft session found" message
   - **Not Expected**: Blank page or crash

2. **No Team Assigned**:
   - Remove user's team assignment
   - Navigate to `/dashboard/draft`
   - **Expected**: Should show warning "You don't have a team for this season"
   - **Not Expected**: Crash or blank page

3. **Empty Draft Pool**:
   - Clear draft pool for current season
   - Navigate to `/dashboard/draft`
   - **Expected**: Should show warning "Draft pool is empty!"
   - **Not Expected**: Crash or infinite loading

4. **Invalid Pick**:
   - Try to pick a Pokemon that's already drafted
   - **Expected**: Should show error message
   - **Not Expected**: Pick succeeds or crashes

**Success Criteria**:
- ✅ All error states handled gracefully
- ✅ User-friendly error messages displayed
- ✅ No crashes or blank pages
- ✅ System recovers when prerequisites are fixed

---

### Test 7: Navigation and Routing

**Goal**: Verify all routes work correctly and tabs sync with URLs

**Routes to Test**:
1. `/dashboard` → Should show Draft tabs section
2. `/dashboard/draft` → Should show Planning tab active
3. `/dashboard/draft/board` → Should show Board tab active
4. `/dashboard/draft/roster` → Should show Roster tab active
5. Sidebar links → Should navigate to correct routes
6. Tab clicks → Should update URL and navigate correctly

**Success Criteria**:
- ✅ All routes load correctly
- ✅ Tabs sync with URL paths
- ✅ Browser back/forward works
- ✅ Direct URL access works
- ✅ Sidebar navigation works

---

## 📊 Test Results Template

Use this template to track test results:

```markdown
## Test Results - [Date]

### Prerequisites
- [ ] Current season exists
- [ ] Draft pool populated (> 0 Pokemon)
- [ ] User has team assigned
- [ ] Multiple teams exist (≥ 2)

### Test 1: Admin Panel
- [ ] Admin panel loads
- [ ] Can create session
- [ ] Session appears with correct status
- [ ] Can cancel session

### Test 2: Draft Planning
- [ ] Planning tab loads
- [ ] Shows available Pokemon
- [ ] Shows user team and budget
- [ ] Filters work
- [ ] Real-time updates work

### Test 3: Draft Board
- [ ] Board loads when session active
- [ ] Shows turn information
- [ ] Can make picks
- [ ] Pick updates roster/budget
- [ ] Real-time updates work

### Test 4: Draft Roster
- [ ] Roster tab loads
- [ ] Shows drafted Pokemon
- [ ] Budget display accurate
- [ ] Updates in real-time

### Test 5: Real-Time Updates
- [ ] Cross-tab updates work
- [ ] Updates appear quickly (< 2s)
- [ ] No duplicate updates

### Test 6: Error Handling
- [ ] No session error handled
- [ ] No team error handled
- [ ] Empty pool error handled
- [ ] Invalid pick error handled

### Test 7: Navigation
- [ ] All routes work
- [ ] Tabs sync with URLs
- [ ] Browser navigation works
- [ ] Sidebar links work

## Issues Found
[List any issues discovered during testing]

## Next Steps
[What needs to be fixed or improved]
```

---

## 🔧 Quick Fixes Reference

### If Draft Board Doesn't Show

1. Check session status:
   ```bash
   # In browser console
   fetch('/api/draft/status').then(r => r.json()).then(console.log)
   ```

2. If no session, create one via `/admin/draft/sessions`

3. Verify session is `active` (not `pending`)

### If No Pokemon Show

1. Check draft pool:
   ```sql
   SELECT COUNT(*) FROM draft_pool 
   WHERE season_id = (SELECT id FROM seasons WHERE is_current = true);
   ```

2. If empty, run parser:
   ```bash
   pnpm exec tsx scripts/test-draft-pool-parser.ts
   ```

### If Team Roster Doesn't Load

1. Check team assignment:
   ```sql
   SELECT * FROM teams 
   WHERE coach_id = 'YOUR_USER_ID' 
   AND season_id = (SELECT id FROM seasons WHERE is_current = true);
   ```

2. If no team, admin needs to assign one

---

## 📝 Notes

- All tests should be run in order
- Fix any failing prerequisites before proceeding
- Document any issues found
- Test with multiple users if possible (to verify turn order)
- Test on different browsers/devices if possible

---

**Last Updated**: January 19, 2026  
**Status**: Ready for Testing  
**Related Docs**: 
- `docs/DRAFT-SYSTEM-TROUBLESHOOTING.md`
- `docs/DRAFT-SYSTEM-COMPREHENSIVE-UPDATE-PLAN.md`
