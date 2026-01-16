# Battle Completion Debug - Room ID Issue

**Date**: January 15, 2026  
**Status**: Debugging Room ID Parsing

---

## 🔍 Issue

### Problem
- ✅ Battle completion detected
- ❌ Room ID is empty (`Battle completed in :`)
- ❌ Replay fetch fails (empty room ID)
- ❌ Match not updated

### Root Cause Hypothesis
The WebSocket message format for completion events might not include the room ID in `parts[0]`. Possible formats:
1. `|win|p1` (no room prefix - global message)
2. `>battle-gen9randombattle-1|win|p1` (with room prefix)
3. Different message structure entirely

---

## ✅ Fix Applied

### Enhanced Debug Logging
Added comprehensive logging to capture:
- Raw WebSocket message line
- All parts of the message
- Room ID parsing steps
- Fallback logic execution

### Fallback Logic
If room ID is empty or not in subscriptions:
- Use the single subscribed room ID (if only one room is subscribed)
- Log error if multiple rooms or no rooms

---

## 📋 Next Steps

1. **Wait for next battle completion**
2. **Check logs** for DEBUG output:
   ```bash
   ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker' | grep DEBUG
   ```
3. **Analyze raw message format** from logs
4. **Fix room ID parsing** based on actual format

---

## 🎯 Expected Debug Output

When next battle completes, we should see:
```
[ShowdownMonitor] DEBUG: Completion event detected. Raw line: "..."
[ShowdownMonitor] DEBUG: Parts: [...]
[ShowdownMonitor] DEBUG: parts[0] (roomId): "..."
[ShowdownMonitor] DEBUG: command: "win"
[ShowdownMonitor] DEBUG: Subscribed rooms: [...]
[ShowdownMonitor] DEBUG: Using fallback - subscribed room: battle-gen9randombattle-1
[ShowdownMonitor] DEBUG: Final roomId for completion: "battle-gen9randombattle-1"
```

---

**Status**: ⏳ **WAITING FOR NEXT BATTLE TO CAPTURE DEBUG OUTPUT**
