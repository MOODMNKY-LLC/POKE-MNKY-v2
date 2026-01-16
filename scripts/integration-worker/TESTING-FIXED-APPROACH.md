# Integration Worker Testing - Fixed Approach

**Date**: January 15, 2026  
**Issue**: Showdown rooms must be created by starting actual battles

---

## 🔍 Root Cause

Showdown rooms are **only created when a battle starts**, not by:
- ❌ Visiting a URL
- ❌ Creating a database record
- ❌ WebSocket subscription

---

## ✅ Corrected Test Flow

### Phase 1: Basic Connectivity ✅ COMPLETE
- Service running
- WebSocket connected
- Database accessible

### Phase 2: Room Polling ✅ COMPLETE  
- Worker subscribed to room ID (even though room doesn't exist yet)
- This is OK - worker will detect when room is created

### Phase 3: Create Real Battle Room ⏳ NEXT STEP

**Steps**:

1. **Create Real Battle Room**:
   - Go to: https://aab-play.moodmnky.com
   - **Option A**: Challenge another player (use two browser windows)
   - **Option B**: Use `/challenge` command in Showdown chat
   - **Accept the challenge**
   - **Start the battle** - this creates the room
   - **Note the room ID** from URL (format: `gen9avgatbest-1234567890`)

2. **Update Match Record**:
   ```bash
   pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
   ```
   
   Example:
   ```bash
   pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts gen9avgatbest-1234567890
   ```

3. **Wait for Worker Subscription** (30-35 seconds):
   ```bash
   ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
   ```
   
   Expected:
   ```
   [RoomManager] Synced 1 active rooms
   [ShowdownMonitor] Subscribed to room: gen9avgatbest-1234567890
   ```

4. **Complete Battle**:
   - Finish the battle in Showdown
   - Watch logs for completion events

5. **Verify Worker Processing**:
   ```bash
   ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=100 integration-worker | grep -E "(Battle completed|Processing battle)"'
   ```

---

## 📋 Quick Reference

### Update Match with Real Room ID
```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
```

### Check Worker Subscription
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

### Monitor Battle Completion
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

---

## 🎯 Expected Room ID Format

Showdown room IDs follow this format:
- `{format}-{random-number}`
- Example: `gen9avgatbest-1234567890`
- Example: `gen9ou-9876543210`

**NOT**:
- ❌ `battle-gen9avgatbest-test123` (our test ID - doesn't exist)
- ❌ `battle-match-{uuid}` (our generated format - doesn't exist until battle starts)

---

## 💡 Key Insight

**The Integration Worker is working correctly!** 

The issue is that we're trying to subscribe to a room that doesn't exist yet. Once you:
1. Create a real battle room
2. Update the match record with the real room ID
3. Wait for worker to poll and subscribe

The worker will then detect battle completion events properly.

---

**Next Step**: Create a real battle room on Showdown, then update the match record!
