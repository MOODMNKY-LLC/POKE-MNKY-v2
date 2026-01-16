# Integration Worker Testing - Execution Guide

**Date**: January 15, 2026  
**Status**: Ready to Execute  
**Approach**: Step-by-Step with Verification

---

## Quick Start

Follow these steps in order. Each step includes verification commands.

---

## Step 1: Verify Service is Running ✅

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose ps integration-worker'
```

**Expected Output**:
```
NAME                           STATUS
poke-mnky-integration-worker   Up
```

**If not running**: `docker compose up -d integration-worker`

---

## Step 2: Check Current Logs ✅

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=30 integration-worker'
```

**What to Look For**:
- ✅ "Worker started successfully"
- ✅ "Connected to Showdown server"
- ✅ "Room monitoring started"
- ❌ No error messages

**Note Current State**: Write down what you see

---

## Step 3: Verify WebSocket Connection ✅

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -E "(ShowdownMonitor|Connected)"'
```

**Expected**: "Connected to Showdown server"

---

## Step 4: Verify Database Connection ✅

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -E "(RoomManager|Synced)"'
```

**Expected**: "Synced X active rooms" (X can be 0)

---

## Step 5: Get Team IDs for Test Match

**We need two team IDs to create a test match.**

**Option A: Via Supabase Dashboard**
1. Go to Supabase dashboard
2. Navigate to `teams` table
3. Note two team IDs

**Option B: Via SQL Query**
```sql
SELECT id, name FROM teams LIMIT 2;
```

**Save these IDs**: We'll use them in the next step

---

## Step 6: Create Test Match

**SQL Query** (replace `<team1-id>` and `<team2-id>` with actual IDs):

```sql
INSERT INTO matches (
  team1_id,
  team2_id,
  week,
  status,
  showdown_room_id,
  showdown_room_url
) VALUES (
  '<team1-id>',
  '<team2-id>',
  1,
  'in_progress',
  'battle-gen9avgatbest-test123',
  'https://aab-play.moodmnky.com/battle-gen9avgatbest-test123'
)
RETURNING id, showdown_room_id;
```

**Save the match ID**: We'll use it for verification

---

## Step 7: Wait for Room Subscription (30-35 seconds)

**Command** (run after 35 seconds):
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

**Expected**:
```
[RoomManager] Synced 1 active rooms
[ShowdownMonitor] Subscribed to room: battle-gen9avgatbest-test123
```

**If not appearing**: Check match was created correctly, wait another 30 seconds

---

## Step 8: Test Battle Completion

**Option A: Real Battle** (Recommended)
1. Go to Showdown: `https://aab-play.moodmnky.com`
2. Join room: `battle-gen9avgatbest-test123`
3. Complete a quick battle (or forfeit)
4. Watch logs for completion event

**Option B: Monitor Logs**
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

**What to Watch For**:
- "Battle completed"
- "Processing battle completion"
- "Parsed replay"
- "Updated match"

---

## Step 9: Verify Match Updated

**SQL Query**:
```sql
SELECT 
  id,
  status,
  winner_id,
  team1_score,
  team2_score,
  differential,
  replay_url
FROM matches
WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Expected**:
- `status` = 'completed'
- Scores populated
- Differential calculated

---

## Step 10: Verify Standings Updated

**SQL Query**:
```sql
SELECT 
  t.id,
  t.name,
  t.wins,
  t.losses,
  t.differential
FROM teams t
WHERE t.id IN (
  SELECT team1_id FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123'
  UNION
  SELECT team2_id FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123'
);
```

**Expected**: Wins/losses/differential updated

---

## Step 11: Check Discord Notification

**If Discord webhook configured**:
- Check Discord channel for notification
- Or check logs: `docker compose logs integration-worker | grep Discord`

---

## Step 12: Cleanup Test Data

**SQL**:
```sql
DELETE FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Verify Unsubscription**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=20 integration-worker | grep -E "(Synced|Unsubscribed)"'
```

**Expected**: "Synced 0 active rooms" and "Unsubscribed from room"

---

## Testing Results Template

Fill this out as you test:

```
Phase 1: Basic Connectivity
[ ] Service running: ___________
[ ] WebSocket connected: ___________
[ ] Database accessible: ___________

Phase 2: Room Polling
[ ] Test match created: Match ID: ___________
[ ] Worker detected match: Time: ___________
[ ] Room subscribed: Room ID: ___________

Phase 3: Battle Processing
[ ] Battle completed: Time: ___________
[ ] Completion detected: ___________
[ ] Replay parsed: Winner: ___________, Scores: ___________

Phase 4: Database Updates
[ ] Match updated: Status: ___________
[ ] Standings updated: Team 1: ___________, Team 2: ___________

Phase 5: Notifications
[ ] Discord notification: ___________

Phase 6: Cleanup
[ ] Test data removed: ___________
[ ] Room unsubscribed: ___________
```

---

## Common Issues and Solutions

### Issue: Worker Not Detecting Match

**Check**:
1. Match `status` is exactly `'in_progress'` (not `'in progress'`)
2. `showdown_room_id` is set (not NULL)
3. Wait full 35 seconds (polling interval)

**Fix**: Re-check match in database, ensure exact status match

### Issue: Room Subscription Fails

**Check**:
1. WebSocket still connected
2. Room ID format matches Showdown format
3. Showdown server is running

**Fix**: Check Showdown server logs, verify room ID format

### Issue: Battle Completion Not Detected

**Check**:
1. Room ID matches exactly
2. Battle actually completed in Showdown
3. WebSocket connection stable

**Fix**: Verify battle completed, check Showdown server logs

---

**Ready to start testing? Begin with Step 1!**
