# Room Creation Issue - Root Cause & Fix

**Date**: January 15, 2026  
**Issue**: Room doesn't exist on Showdown server

---

## 🔍 Root Cause Analysis

### The Problem
1. ✅ We created a match record with `showdown_room_id = 'battle-gen9avgatbest-test123'`
2. ✅ Integration Worker subscribed to this room ID
3. ❌ **But the room doesn't actually exist on Showdown server**

### Why Rooms Don't Exist
Showdown rooms are **NOT created** by:
- ❌ Just visiting a URL
- ❌ Creating a database record
- ❌ Subscribing via WebSocket

Showdown rooms **ARE created** when:
- ✅ A player challenges another player
- ✅ A challenge is accepted
- ✅ A battle actually **starts**

### WebSocket Evidence
```
>battle-gen9avgatbest-test123
|noinit|nonexistent|The room "battle-gen9avgatbest-test123" does not exist.
```

---

## ✅ Solution: Create Real Battle Room

### Option 1: Manual Room Creation (Recommended for Testing)

**Steps**:
1. Go to: https://aab-play.moodmnky.com
2. **Challenge another player** (or use two browser windows)
3. **Accept the challenge**
4. **Start the battle** - this creates the room
5. **Note the room ID** from the URL (e.g., `gen9avgatbest-1234567890`)
6. **Update match record**:
   ```sql
   UPDATE matches 
   SET showdown_room_id = '<actual-room-id-from-url>',
       showdown_room_url = 'https://aab-play.moodmnky.com/<actual-room-id>'
   WHERE id = '6f10c53b-d601-4fdb-ab28-110b16b59234';
   ```
7. **Wait 30 seconds** for Integration Worker to poll and subscribe
8. **Complete the battle**
9. **Verify** worker detects completion

---

### Option 2: Use Showdown's Challenge System

**Programmatic approach** (requires authentication):
1. Authenticate with Showdown server
2. Send challenge command
3. Accept challenge
4. Start battle
5. Extract room ID from WebSocket messages

**Note**: This is more complex and requires Showdown authentication.

---

### Option 3: Update Test Script to Use Real Room

**Better approach for future testing**:
1. Create match **without** `showdown_room_id` initially
2. Use `/api/showdown/create-room` endpoint (creates room via challenge)
3. Or manually create room and update match record

---

## 🎯 Quick Fix for Current Test

### Step 1: Create Real Battle Room

1. Open **two browser windows** (or use incognito)
2. Go to: https://aab-play.moodmnky.com
3. In window 1: Challenge a player (or use `/challenge` command)
4. In window 2: Accept the challenge
5. Start the battle
6. **Copy the room ID** from URL (format: `gen9avgatbest-1234567890`)

### Step 2: Update Match Record

```sql
UPDATE matches 
SET showdown_room_id = '<actual-room-id>',
    showdown_room_url = 'https://aab-play.moodmnky.com/<actual-room-id>'
WHERE id = '6f10c53b-d601-4fdb-ab28-110b16b59234';
```

### Step 3: Wait for Worker to Subscribe

Wait 30-35 seconds, then check logs:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

### Step 4: Complete Battle

Complete the battle in the room, then verify worker detects it.

---

## 📋 Updated Test Flow

1. ✅ **Phase 1**: Basic Connectivity - Complete
2. ✅ **Phase 2**: Room Polling - Complete (worker subscribed to non-existent room)
3. ⏳ **Phase 3**: Create Real Room & Update Match
   - Create actual battle room on Showdown
   - Update match record with real room ID
   - Wait for worker to subscribe to real room
   - Complete battle
   - Verify worker detects completion
4. ⏳ **Phase 4**: Database Verification

---

## 🔧 Future Improvement

Update `setup-test-environment.ts` to:
1. Create match without `showdown_room_id`
2. Provide instructions to create room manually
3. Or integrate with Showdown challenge API (if available)

---

**Next Step**: Create a real battle room on Showdown, update the match record, then proceed with testing!
