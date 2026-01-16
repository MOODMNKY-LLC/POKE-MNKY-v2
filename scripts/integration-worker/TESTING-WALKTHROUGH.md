# Integration Worker Testing - Complete Walkthrough

**Date**: January 15, 2026  
**Status**: Phase 1 Complete ✅ | Ready for Phase 2

---

## ✅ Phase 1 Results - ALL PASSED

Based on automated test results:

- ✅ **Service Running**: Container is up and healthy
- ✅ **WebSocket Connected**: Successfully connected to Showdown server
- ✅ **Database Accessible**: Room Manager polling active
- ✅ **No Errors**: Clean startup, all systems operational

**Current State**: Worker is running and ready to process battles!

---

## 📋 Phase 2: Room Polling Test (Next Step)

Now we'll test if the worker detects and subscribes to active battle rooms.

### Step 1: Get Team IDs

**Option A: Via Supabase Dashboard** (Easiest)
1. Go to: https://supabase.com/dashboard/project/chmrszrwlfeqovwxyrmt/editor
2. Click on `teams` table
3. Note two team IDs (UUIDs) - copy them

**Option B: Via SQL Query**
Run this in Supabase SQL Editor:
```sql
SELECT id, name FROM teams LIMIT 2;
```

**Save These**:
- Team 1 ID: `_________________`
- Team 1 Name: `_________________`
- Team 2 ID: `_________________`
- Team 2 Name: `_________________`

---

### Step 2: Create Test Match

**Run this SQL in Supabase SQL Editor** (replace the UUIDs):

```sql
INSERT INTO matches (
  team1_id,
  team2_id,
  week,
  status,
  showdown_room_id,
  showdown_room_url
) VALUES (
  '<paste-team1-id-here>',  -- Replace with actual UUID
  '<paste-team2-id-here>',  -- Replace with actual UUID
  1,
  'in_progress',
  'battle-gen9avgatbest-test123',
  'https://aab-play.moodmnky.com/battle-gen9avgatbest-test123'
)
RETURNING id, showdown_room_id, status;
```

**After running, save**:
- Match ID: `_________________`
- Room ID: `battle-gen9avgatbest-test123` ✅

---

### Step 3: Wait and Verify Subscription

**Wait 35 seconds** (worker polls every 30 seconds), then run:

```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

**Expected Output**:
```
[RoomManager] Synced 1 active rooms
[ShowdownMonitor] Subscribed to room: battle-gen9avgatbest-test123
```

**✅ Pass Criteria**: Both messages appear

**If not appearing**:
- Wait another 30 seconds
- Double-check match `status` is exactly `'in_progress'` (not `'in progress'`)
- Verify `showdown_room_id` is set (not NULL)

---

## 📋 Phase 3: Battle Completion Test

### Step 1: Monitor Logs in Real-Time

**Open a terminal and run** (keep this running to watch for events):

```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

---

### Step 2: Complete a Battle

**Go to Showdown**:
1. Navigate to: https://aab-play.moodmnky.com
2. Join room: `battle-gen9avgatbest-test123`
3. Complete a quick battle (or forfeit)
4. Watch the logs terminal for completion events

**What to Watch For**:
```
[ShowdownMonitor] Battle completed in battle-gen9avgatbest-test123
[IntegrationWorker] Processing battle completion for room battle-gen9avgatbest-test123
[IntegrationWorker] Parsed replay: winner=p1, scores=6-0, differential=6
[DatabaseUpdater] Updated match <match-id> with results
[DatabaseUpdater] Updated standings for 2 teams
[IntegrationWorker] Posted result to Discord for match <match-id>
```

**✅ Pass Criteria**: All steps complete without errors

---

## 📋 Phase 4: Verify Database Updates

### Step 1: Check Match Record

**Run in Supabase SQL Editor**:
```sql
SELECT 
  id,
  status,
  winner_id,
  team1_score,
  team2_score,
  differential,
  replay_url,
  played_at
FROM matches
WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Expected**:
- `status` = `'completed'` ✅
- `winner_id` = team1_id or team2_id ✅
- Scores populated ✅
- Differential calculated ✅

---

### Step 2: Check Standings

**Run in Supabase SQL Editor**:
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

**Expected**: Wins/losses/differential updated based on result

---

## 📋 Phase 5: Cleanup

### Remove Test Match

```sql
DELETE FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Verify Unsubscription** (wait 35 seconds):
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=30 integration-worker | grep -E "(Synced|Unsubscribed)"'
```

**Expected**: "Synced 0 active rooms" and "Unsubscribed from room"

---

## Quick Reference Commands

### Check Service Status
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose ps integration-worker'
```

### View Live Logs
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

### Check Room Subscriptions
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -E "(Synced|Subscribed)" | tail -10'
```

---

## Testing Progress Tracker

```
Phase 1: Basic Connectivity ✅ COMPLETE
[✅] Service running
[✅] WebSocket connected
[✅] Database accessible

Phase 2: Room Polling ⏳ IN PROGRESS
[ ] Test match created
[ ] Worker detected match
[ ] Room subscribed

Phase 3: Battle Processing ⏳ PENDING
[ ] Battle completed
[ ] Completion detected
[ ] Replay parsed
[ ] Match updated

Phase 4: Database Verification ⏳ PENDING
[ ] Match record updated
[ ] Standings recalculated

Phase 5: Cleanup ⏳ PENDING
[ ] Test data removed
```

---

**Next Action**: Get team IDs and create test match (Phase 2, Step 1)
