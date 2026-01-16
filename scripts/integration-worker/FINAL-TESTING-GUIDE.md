# Integration Worker - Final Testing Guide

**Date**: January 15, 2026  
**Status**: Worker Operational ✅ | Ready for Battle Completion Test

---

## ✅ Current Status

### Integration Worker
- ✅ Service running and healthy
- ✅ WebSocket connected to Showdown
- ✅ Database connectivity working
- ✅ Room Manager polling every 30 seconds
- ✅ Successfully subscribed to room: `gen9randombattle-1`

### Issue Identified
- ⚠️ Room `gen9randombattle-1` may have expired (Showdown rooms expire after 15 min inactivity)
- ⚠️ Need fresh active battle room for testing

---

## 🎯 Complete Test Workflow (Do This Now)

### Step 1: Create Fresh Battle Room (2 minutes)

1. **Open two browser windows**:
   - Window 1: https://aab-play.moodmnky.com
   - Window 2: https://aab-play.moodmnky.com (incognito/different browser)

2. **Start a battle**:
   - In Window 1: Type `/challenge` or challenge a player
   - In Window 2: Accept the challenge
   - **Start the battle** - this creates the room

3. **Copy room ID from URL**:
   - URL format: `https://aab-play.moodmnky.com/battle-gen9randombattle-1234567890`
   - Room ID: `gen9randombattle-1234567890` (copy everything after `/battle-`)

### Step 2: Update Match Record IMMEDIATELY (30 seconds)

```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
```

**Example**:
```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts gen9randombattle-1234567890
```

### Step 3: Monitor Worker Subscription (35 seconds)

**Open a terminal and run** (keep this running):
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

**Wait 35 seconds** and look for:
```
[ShowdownMonitor] Subscribed to room: gen9randombattle-1234567890
```

### Step 4: Complete Battle (within 10 minutes)

1. **Finish the battle** in Showdown (or forfeit)
2. **Watch the logs terminal** for completion events

**Expected events**:
```
[ShowdownMonitor] Battle completed in gen9randombattle-1234567890
[IntegrationWorker] Processing battle completion for room gen9randombattle-1234567890
[IntegrationWorker] Parsed replay: winner=p1, scores=6-0, differential=6
[DatabaseUpdater] Updated match with results
[DatabaseUpdater] Updated standings for 2 teams
```

### Step 5: Verify Database Updates

**Check match record**:
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
WHERE showdown_room_id = '<room-id>';
```

**Check standings**:
```sql
SELECT 
  t.id,
  t.name,
  t.wins,
  t.losses,
  t.differential
FROM teams t
WHERE t.id IN (
  SELECT team1_id FROM matches WHERE showdown_room_id = '<room-id>'
  UNION
  SELECT team2_id FROM matches WHERE showdown_room_id = '<room-id>'
);
```

---

## ⏱️ Timing is Critical

**Total workflow should take < 15 minutes**:
- Create room: 0:00
- Update match: 0:01
- Wait for subscription: 0:35
- Complete battle: 1:00 - 5:00
- Verify: 5:00 - 6:00

**Why**: Showdown rooms expire after 15 minutes of inactivity

---

## 📋 Quick Reference Commands

### Update Match with Room ID
```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
```

### Monitor Logs Live
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

### Check Recent Activity
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=100 integration-worker | grep -E "(Battle completed|Processing battle|Parsed replay)"'
```

---

## ✅ Success Criteria

**Full test success**:
- ✅ Worker subscribes to real room
- ✅ Battle completion detected via WebSocket
- ✅ Replay parsed successfully
- ✅ Match record updated with results
- ✅ Standings recalculated
- ✅ No errors in logs

---

## 🎯 Current Test Status

- ✅ Phase 1: Basic Connectivity - Complete
- ✅ Phase 2: Room Polling - Complete
- ✅ Phase 3: Real Room Subscription - Complete (worker subscribed)
- ⏳ Phase 4: Battle Completion Detection - **WAITING FOR ACTIVE BATTLE**
- ⏳ Phase 5: Database Updates - Pending
- ⏳ Phase 6: Standings Recalculation - Pending

---

**Ready to test! Create a fresh battle room and complete it within 15 minutes!**
