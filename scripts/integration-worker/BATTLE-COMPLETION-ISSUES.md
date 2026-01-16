# Battle Completion Detection - Issues Found & Fixes

**Date**: January 15, 2026  
**Status**: Issues Identified ✅ | Fixes Applied (Need Redeploy)

---

## ✅ Success: Battle Completion Detected!

The worker **successfully detected** the battle completion:
```
[ShowdownMonitor] Battle completed in : { winner: null, isTie: false, isForfeit: false }
[IntegrationWorker] Processing battle completion for room 
```

---

## ❌ Issues Found

### Issue 1: Empty Room ID
- **Problem**: Room ID is empty in logs (`Battle completed in :`)
- **Root Cause**: Room ID from WebSocket includes `>` prefix (`>battle-gen9randombattle-1`)
- **Fix Applied**: Strip `>` prefix before processing

### Issue 2: Replay Fetch Failed (404)
- **Problem**: `Failed to fetch replay: 404 Not Found`
- **Root Cause**: 
  1. Empty room ID (from Issue 1)
  2. Replay URL format incorrect - needs to strip `battle-` prefix for replay URLs
- **Fix Applied**: 
  1. Strip `>` prefix from room ID
  2. Strip `battle-` prefix when constructing replay URL
  3. Try multiple replay URL formats

---

## ✅ Fixes Applied

### Fix 1: Room ID Parsing (`showdown-monitor.ts`)
```typescript
// Strip '>' prefix from room ID if present
if (roomId.startsWith('>')) {
  roomId = roomId.substring(1);
}
```

### Fix 2: Replay URL Construction (`replay-parser.ts`)
```typescript
// Strip 'battle-' prefix if present (roomId might be 'battle-gen9randombattle-1')
// Replay URLs use format: {format}-{id} (e.g., 'gen9randombattle-1')
let replayRoomId = roomId;
if (replayRoomId.startsWith('battle-')) {
  replayRoomId = replayRoomId.substring(7); // Remove 'battle-' prefix
}
```

---

## 📋 Next Steps: Redeploy Worker

### Step 1: Rebuild and Redeploy
```bash
# On server
cd /home/moodmnky/POKE-MNKY
docker compose build integration-worker
docker compose up -d integration-worker
```

### Step 2: Test Again
1. Create a new battle room
2. Update match record
3. Complete battle
4. Verify worker processes completion correctly

---

## 🎯 Expected Behavior After Fix

### Logs Should Show:
```
[ShowdownMonitor] Battle completed in battle-gen9randombattle-1: { winner: 'p1', ... }
[IntegrationWorker] Processing battle completion for room battle-gen9randombattle-1
[IntegrationWorker] Parsed replay: winner=p1, scores=6-0, differential=6
[DatabaseUpdater] Updated match with results
```

### Database Should Update:
- `status` = `'completed'`
- `winner_id` = team ID
- `team1_score` = score
- `team2_score` = score
- `differential` = calculated
- `replay_url` = replay URL

---

## ✅ Summary

**Status**: ✅ **BATTLE COMPLETION DETECTED** | ⚠️ **PROCESSING FAILED** (Fixed, needs redeploy)

- ✅ Worker detects battle completion
- ✅ WebSocket connection working
- ✅ Room subscription working
- ❌ Room ID parsing issue (FIXED)
- ❌ Replay URL construction issue (FIXED)
- ⏳ Need to redeploy with fixes

**Next**: Rebuild and redeploy worker, then test again!
