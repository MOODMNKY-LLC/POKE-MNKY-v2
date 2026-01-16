# Step-by-Step Integration Worker Testing Guide

**Date**: January 15, 2026  
**Approach**: Systematic Testing with Verification at Each Step

---

## 🎯 Testing Overview

We'll test the Integration Worker in phases, verifying each component works before moving to the next. This ensures we catch issues early and understand what's working.

---

## Phase 1: Basic Connectivity ✅ (Start Here)

### Step 1.1: Verify Service is Running

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose ps integration-worker'
```

**Expected**: Status shows "Up"

**✅ Pass Criteria**: Service is running

---

### Step 1.2: Check Initial Logs

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=30 integration-worker'
```

**What to Look For**:
- ✅ `[IntegrationWorker] Worker started successfully`
- ✅ `[ShowdownMonitor] Connected to Showdown server`
- ✅ `[RoomManager] Room monitoring started`
- ✅ `[RoomManager] Synced 0 active rooms` (this is OK - means no active matches)

**✅ Pass Criteria**: All success messages present, no errors

**Note**: Write down what you see. This is our baseline.

---

### Step 1.3: Verify WebSocket Connection

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -E "(ShowdownMonitor|Connected)" | tail -5'
```

**Expected**:
```
[ShowdownMonitor] Connecting to ws://pokemon-showdown:8000/showdown/websocket...
[ShowdownMonitor] Connected to Showdown server
```

**✅ Pass Criteria**: "Connected to Showdown server" appears

---

### Step 1.4: Verify Database Connection

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -E "(RoomManager|Synced)" | tail -5'
```

**Expected**:
```
[RoomManager] Synced 0 active rooms
```

**✅ Pass Criteria**: "Synced X active rooms" appears (X can be 0)

---

## Phase 2: Room Polling Test 🔄

### Step 2.1: Get Team IDs

**We need two team IDs to create a test match.**

**Option A: Via Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/chmrszrwlfeqovwxyrmt/editor
2. Navigate to `teams` table
3. Note two team IDs (UUIDs)

**Option B: Via SQL Query**
```sql
SELECT id, name FROM teams LIMIT 2;
```

**Save These**:
- Team 1 ID: `_________________`
- Team 2 ID: `_________________`

---

### Step 2.2: Create Test Match

**SQL Query** (replace `<team1-id>` and `<team2-id>` with actual UUIDs):

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
RETURNING id, showdown_room_id, status;
```

**Save Match ID**: `_________________`

**✅ Pass Criteria**: Match created successfully, status = 'in_progress'

---

### Step 2.3: Wait for Room Subscription

**The worker polls every 30 seconds. Wait 35 seconds, then check:**

**Command**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

**Expected**:
```
[RoomManager] Synced 1 active rooms
[ShowdownMonitor] Subscribed to room: battle-gen9avgatbest-test123
```

**✅ Pass Criteria**: "Synced 1 active rooms" and "Subscribed to room" appear

**If not appearing**:
- Wait another 30 seconds (polling interval)
- Verify match `status` is exactly `'in_progress'` (not `'in progress'`)
- Verify `showdown_room_id` is set (not NULL)

---

## Phase 3: Battle Completion Test 🎮

### Step 3.1: Monitor Logs in Real-Time

**Open a terminal and run** (keep this running):
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

**This will show live logs as the battle completes.**

---

### Step 3.2: Complete a Battle

**Option A: Real Battle** (Recommended)
1. Go to: https://aab-play.moodmnky.com
2. Navigate to room: `battle-gen9avgatbest-test123`
3. Complete a quick battle (or forfeit)
4. Watch the logs terminal for completion events

**Option B: Test Room** (If real battle not possible)
- We'll need to manually trigger completion or wait for a real battle

**What to Watch For in Logs**:
```
[ShowdownMonitor] Battle completed in battle-gen9avgatbest-test123
[IntegrationWorker] Processing battle completion for room battle-gen9avgatbest-test123
[IntegrationWorker] Parsed replay: ...
[DatabaseUpdater] Updated match ...
[IntegrationWorker] Posted result to Discord ...
```

**✅ Pass Criteria**: Battle completion detected and processed

---

## Phase 4: Database Verification ✅

### Step 4.1: Verify Match Updated

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
  played_at
FROM matches
WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**Expected**:
- `status` = `'completed'`
- `winner_id` = team1_id or team2_id (or NULL for tie)
- `team1_score` and `team2_score` populated
- `differential` calculated
- `replay_url` set (if available)
- `played_at` timestamp set

**✅ Pass Criteria**: All fields updated correctly

---

### Step 4.2: Verify Standings Updated

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

**Expected**:
- Winner team: `wins` increased by 1
- Loser team: `losses` increased by 1
- `differential` updated for both teams

**✅ Pass Criteria**: Standings reflect battle result

---

## Phase 5: Discord Notification Test 📢

### Step 5.1: Check Discord Channel

**If Discord webhook is configured**:
1. Check Discord channel for notification
2. Should see formatted match result message

**Or check logs**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -i discord'
```

**Expected**:
```
[IntegrationWorker] Posted result to Discord for match <match-id>
```

**✅ Pass Criteria**: Notification sent (or skipped if not configured)

---

## Phase 6: Cleanup 🧹

### Step 6.1: Remove Test Match

**SQL**:
```sql
DELETE FROM matches WHERE showdown_room_id = 'battle-gen9avgatbest-test123';
```

**✅ Pass Criteria**: Match deleted

---

### Step 6.2: Verify Room Unsubscription

**Wait 35 seconds, then check**:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=30 integration-worker | grep -E "(Synced|Unsubscribed)"'
```

**Expected**:
```
[RoomManager] Synced 0 active rooms
[ShowdownMonitor] Unsubscribed from room: battle-gen9avgatbest-test123
```

**✅ Pass Criteria**: Worker unsubscribed from room

---

## Testing Checklist

Use this checklist as you test:

```
Phase 1: Basic Connectivity
[ ] Service running
[ ] WebSocket connected
[ ] Database accessible
[ ] Room Manager polling

Phase 2: Room Polling
[ ] Test match created
[ ] Match ID: ___________
[ ] Worker detected match (time: __________)
[ ] Room subscribed (time: __________)

Phase 3: Battle Processing
[ ] Battle completed (time: __________)
[ ] Completion detected
[ ] Replay parsed
[ ] Winner: ___________, Scores: ___________

Phase 4: Database Updates
[ ] Match status = 'completed'
[ ] Scores populated
[ ] Standings updated
[ ] Team 1 wins: ___________, losses: ___________
[ ] Team 2 wins: ___________, losses: ___________

Phase 5: Notifications
[ ] Discord notification sent (or skipped)

Phase 6: Cleanup
[ ] Test match deleted
[ ] Room unsubscribed
```

---

## Quick Test Commands

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

### Check Battle Processing
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs integration-worker | grep -E "(Battle completed|Processing battle)" | tail -10'
```

---

## Troubleshooting

### Worker Not Detecting Match

**Check**:
1. Match `status` is exactly `'in_progress'` (case-sensitive)
2. `showdown_room_id` is set (not NULL)
3. Wait full 35 seconds (polling interval)

**Fix**: Re-check match in database, ensure exact status match

### Room Subscription Fails

**Check**:
1. WebSocket still connected
2. Room ID format matches Showdown format
3. Showdown server is running

**Fix**: Check Showdown server logs, verify room ID format

### Battle Completion Not Detected

**Check**:
1. Room ID matches exactly
2. Battle actually completed in Showdown
3. WebSocket connection stable

**Fix**: Verify battle completed, check Showdown server logs

---

## Success Criteria

**Full Test Success**:
- ✅ All Phase 1 tests pass
- ✅ Room polling detects test match
- ✅ Battle completion triggers processing
- ✅ Match record updated correctly
- ✅ Standings recalculated
- ✅ No errors in logs

---

**Ready to begin? Start with Phase 1, Step 1.1!**
