# Integration Worker Testing Plan

**Date**: January 15, 2026  
**Method**: Systematic Step-by-Step Testing  
**Goal**: Verify Integration Worker functionality end-to-end

---

## Testing Philosophy

We'll test the Integration Worker systematically, starting with basic connectivity and progressing to full end-to-end battle processing. Each test builds on the previous, ensuring we catch issues early and understand what's working.

---

## Phase 1: Basic Connectivity Tests

### Test 1.1: Verify Service is Running

**Objective**: Confirm the container is running and healthy

**Steps**:
1. SSH to server: `ssh moodmnky@10.3.0.119`
2. Check service status: `docker compose ps integration-worker`
3. View recent logs: `docker compose logs --tail=20 integration-worker`

**Expected Result**:
- Status shows "Up"
- Logs show "Worker started successfully"
- No error messages

**Success Criteria**: ✅ Service running, no errors

---

### Test 1.2: Verify WebSocket Connection

**Objective**: Confirm connection to Showdown server

**Steps**:
1. View logs: `docker compose logs integration-worker | grep ShowdownMonitor`
2. Look for: "Connected to Showdown server"

**Expected Result**:
```
[ShowdownMonitor] Connecting to ws://pokemon-showdown:8000/showdown/websocket...
[ShowdownMonitor] Connected to Showdown server
```

**Success Criteria**: ✅ WebSocket connected

---

### Test 1.3: Verify Database Connection

**Objective**: Confirm Supabase connection is working

**Steps**:
1. View logs: `docker compose logs integration-worker | grep RoomManager`
2. Look for: "Synced X active rooms" (even if X is 0)

**Expected Result**:
```
[RoomManager] Synced 0 active rooms
```

**Success Criteria**: ✅ Database queries working (0 rooms is OK - means no active matches)

---

## Phase 2: Room Polling Test

### Test 2.1: Create Test Match

**Objective**: Create a match record that the worker can detect

**Steps**:
1. Access Supabase dashboard or use API
2. Create a test match with:
   - `status = 'in_progress'`
   - `showdown_room_id = 'battle-gen9avgatbest-test123'`
   - `team1_id` and `team2_id` (use existing team IDs)

**SQL Example**:
```sql
-- First, get two team IDs
SELECT id, name FROM teams LIMIT 2;

-- Then create test match (replace UUIDs with actual team IDs)
INSERT INTO matches (
  team1_id,
  team2_id,
  week,
  status,
  showdown_room_id,
  showdown_room_url
) VALUES (
  '<team1-uuid>',
  '<team2-uuid>',
  1,
  'in_progress',
  'battle-gen9avgatbest-test123',
  'https://aab-play.moodmnky.com/battle-gen9avgatbest-test123'
);
```

**Success Criteria**: ✅ Match created in database

---

### Test 2.2: Verify Room Subscription

**Objective**: Confirm worker detects and subscribes to the test room

**Steps**:
1. Wait 30-35 seconds (polling interval)
2. View logs: `docker compose logs --tail=50 integration-worker`
3. Look for: "Subscribed to room"

**Expected Result**:
```
[RoomManager] Synced 1 active rooms
[ShowdownMonitor] Subscribed to room: battle-gen9avgatbest-test123
```

**Success Criteria**: ✅ Worker detected match and subscribed to room

---

## Phase 3: Battle Completion Simulation

### Test 3.1: Simulate Battle Completion Event

**Objective**: Test if worker detects battle completion

**Options**:

**Option A: Use Real Showdown Room** (Recommended)
1. Create actual battle room in Showdown
2. Complete a quick battle (or forfeit)
3. Worker should detect completion automatically

**Option B: Manual Test** (If real battle not possible)
- We'll need to manually trigger the completion handler
- Or wait for a real battle to complete

**Expected Result**:
```
[ShowdownMonitor] Battle completed in battle-gen9avgatbest-test123
[IntegrationWorker] Processing battle completion for room battle-gen9avgatbest-test123
```

**Success Criteria**: ✅ Battle completion detected

---

### Test 3.2: Verify Replay Parsing

**Objective**: Confirm replay is fetched and parsed correctly

**Steps**:
1. After battle completion, check logs for replay parsing
2. Look for: "Parsed replay"

**Expected Result**:
```
[IntegrationWorker] Parsed replay:
  winner: p1
  scores: 6-0
  differential: 6
```

**Success Criteria**: ✅ Replay parsed successfully

---

## Phase 4: Database Update Test

### Test 4.1: Verify Match Record Updated

**Objective**: Confirm match record is updated with results

**Steps**:
1. Query the test match from database
2. Check fields: `status`, `winner_id`, `team1_score`, `team2_score`, `differential`

**SQL Query**:
```sql
SELECT 
  id,
  status,
  winner_id,
  team1_score,
  team2_score,
  differential,
  replay_url,
  showdown_room_id
FROM matches
WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Expected Result**:
- `status` = 'completed'
- `winner_id` = team1_id or team2_id (or null for tie)
- `team1_score` and `team2_score` populated
- `differential` calculated
- `replay_url` set

**Success Criteria**: ✅ Match record updated correctly

---

### Test 4.2: Verify Standings Recalculation

**Objective**: Confirm standings are recalculated

**Steps**:
1. Check teams table for updated wins/losses/differential
2. Query teams that participated in the test match

**SQL Query**:
```sql
SELECT 
  id,
  name,
  wins,
  losses,
  differential
FROM teams
WHERE id IN (
  SELECT team1_id FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123'
  UNION
  SELECT team2_id FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123'
);
```

**Expected Result**:
- Wins/losses updated based on result
- Differential updated

**Success Criteria**: ✅ Standings recalculated

---

## Phase 5: Discord Notification Test

### Test 5.1: Verify Discord Webhook

**Objective**: Confirm Discord notification is sent (if configured)

**Steps**:
1. Check Discord channel for notification
2. Or check logs for webhook posting

**Expected Result**:
```
[IntegrationWorker] Posted result to Discord for match <match-id>
```

**Success Criteria**: ✅ Discord notification sent (or skipped if not configured)

---

## Phase 6: Cleanup and Validation

### Test 6.1: Clean Up Test Data

**Objective**: Remove test match after validation

**Steps**:
1. Delete test match from database
2. Verify worker unsubscribes from room

**SQL**:
```sql
DELETE FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Expected Result**:
```
[RoomManager] Synced 0 active rooms
[ShowdownMonitor] Unsubscribed from room: battle-gen9avgatbest-test123
```

**Success Criteria**: ✅ Test data cleaned up

---

## Testing Checklist

### Phase 1: Basic Connectivity
- [ ] Service running
- [ ] WebSocket connected
- [ ] Database accessible

### Phase 2: Room Polling
- [ ] Test match created
- [ ] Worker detects match
- [ ] Room subscription successful

### Phase 3: Battle Processing
- [ ] Battle completion detected
- [ ] Replay parsed correctly

### Phase 4: Database Updates
- [ ] Match record updated
- [ ] Standings recalculated

### Phase 5: Notifications
- [ ] Discord notification sent (if configured)

### Phase 6: Cleanup
- [ ] Test data removed
- [ ] Worker unsubscribed from room

---

## Troubleshooting Guide

### Worker Not Detecting Match

**Symptoms**: No "Subscribed to room" message after 35 seconds

**Solutions**:
1. Verify match `status = 'in_progress'`
2. Verify `showdown_room_id` is set
3. Check logs for database errors
4. Verify Supabase connection

### Battle Completion Not Detected

**Symptoms**: Battle completes but no processing

**Solutions**:
1. Verify room ID matches exactly
2. Check WebSocket connection is stable
3. Verify Showdown server is sending completion events
4. Check logs for WebSocket errors

### Replay Parsing Fails

**Symptoms**: "Failed to fetch replay" errors

**Solutions**:
1. Verify replay exists on Showdown server
2. Check room ID format
3. Try different format prefixes
4. Verify Showdown server replay storage

### Database Update Fails

**Symptoms**: "Failed to update match" errors

**Solutions**:
1. Verify service role key has permissions
2. Check RLS policies allow updates
3. Verify match exists in database
4. Check database connection

---

## Success Criteria Summary

**Full Test Success**:
- ✅ All Phase 1 tests pass
- ✅ Room polling detects test match
- ✅ Battle completion triggers processing
- ✅ Match record updated correctly
- ✅ Standings recalculated
- ✅ No errors in logs

---

**Ready to begin testing? Let's start with Phase 1!**
