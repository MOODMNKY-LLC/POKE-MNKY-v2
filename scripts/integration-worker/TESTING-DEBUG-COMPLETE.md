# Integration Worker Testing - Debug Complete

**Date**: January 15, 2026  
**Status**: Root Cause Identified ✅ | Solution Ready

---

## 🔍 Root Cause Identified

### The Issue
- ✅ Integration Worker is functioning correctly
- ✅ WebSocket connection is stable
- ✅ Room subscription mechanism works
- ❌ **Room doesn't exist on Showdown server**

### Why Room Doesn't Exist
**Showdown rooms are ONLY created when a battle actually starts**, not by:
- ❌ Visiting a URL
- ❌ Creating a database record  
- ❌ WebSocket subscription

**WebSocket Evidence**:
```
>battle-gen9avgatbest-test123
|noinit|nonexistent|The room "battle-gen9avgatbest-test123" does not exist.
```

---

## ✅ Solution: Create Real Battle Room

### Step-by-Step Instructions

#### Step 1: Create Real Battle Room on Showdown

**Method A: Two Browser Windows** (Easiest)
1. Open **Window 1**: Go to https://aab-play.moodmnky.com
2. Open **Window 2**: Go to https://aab-play.moodmnky.com (incognito or different browser)
3. In Window 1: Type `/challenge` or challenge a player
4. In Window 2: Accept the challenge
5. **Start the battle** - this creates the room
6. **Copy the room ID** from URL (format: `gen9avgatbest-1234567890`)

**Method B: Use Showdown Chat**
1. Go to: https://aab-play.moodmnky.com
2. Type: `/challenge <username>` or `/challenge` to challenge random player
3. Accept challenge when it appears
4. Start battle
5. Copy room ID from URL

#### Step 2: Update Match Record

**Using Script** (Recommended):
```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
```

**Example**:
```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts gen9avgatbest-1234567890
```

**Or Manually via SQL**:
```sql
UPDATE matches 
SET showdown_room_id = '<actual-room-id>',
    showdown_room_url = 'https://aab-play.moodmnky.com/<actual-room-id>'
WHERE id = '6f10c53b-d601-4fdb-ab28-110b16b59234';
```

#### Step 3: Wait for Worker Subscription

Wait **30-35 seconds** for Integration Worker to poll, then check:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

**Expected**:
```
[RoomManager] Synced 1 active rooms
[ShowdownMonitor] Subscribed to room: gen9avgatbest-1234567890
```

#### Step 4: Complete Battle

1. Finish the battle in Showdown (or forfeit)
2. Watch Integration Worker logs for completion events

#### Step 5: Verify Processing

```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=100 integration-worker | grep -E "(Battle completed|Processing battle|Parsed replay)"'
```

**Expected**:
```
[ShowdownMonitor] Battle completed in gen9avgatbest-1234567890
[IntegrationWorker] Processing battle completion for room gen9avgatbest-1234567890
[IntegrationWorker] Parsed replay: winner=p1, scores=6-0
[DatabaseUpdater] Updated match with results
```

---

## 📊 Current Status

### ✅ Working Correctly
- Integration Worker service
- WebSocket connection to Showdown
- Database connectivity
- Room Manager polling
- Room subscription mechanism

### ⏳ Waiting For
- Real battle room to be created
- Match record update with real room ID
- Battle completion to test full flow

---

## 🎯 Room ID Format

**Showdown Format**:
- `{format}-{random-number}`
- Example: `gen9avgatbest-1234567890`
- Example: `gen9ou-9876543210`

**NOT Our Test Format**:
- ❌ `battle-gen9avgatbest-test123` (doesn't exist until battle starts)

---

## 📋 Quick Commands

### Update Match with Real Room
```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
```

### Check Worker Status
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

## ✅ Summary

**The Integration Worker is functioning correctly!**

The issue is simply that Showdown rooms must be created by starting actual battles. Once you:
1. ✅ Create a real battle room
2. ✅ Update match record with real room ID  
3. ✅ Wait for worker to subscribe
4. ✅ Complete battle

Everything should work as expected!

---

**Ready to proceed**: Create a real battle room, update the match, and test!
