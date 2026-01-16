# Room Expiration Issue - Guide

**Date**: January 15, 2026  
**Issue**: Showdown rooms expire after 15 minutes of inactivity

---

## 🔍 Understanding Showdown Room Lifecycle

### Room Creation
- Rooms are created when a **battle starts**
- Not created by visiting URLs or database records

### Room Expiration
- **Rooms expire after 15 minutes of inactivity**
- If no one is actively battling, the room closes
- The URL will show "room doesn't exist" error

### Room ID Format
- **URL format**: `/battle-{format}-{id}` (e.g., `/battle-gen9randombattle-1`)
- **WebSocket format**: `{format}-{id}` (e.g., `gen9randombattle-1`)
- The "battle-" prefix is only in the URL path, not the room ID

---

## ✅ Solution: Create Fresh Room & Test Immediately

### Step 1: Create Fresh Battle Room

1. Go to: https://aab-play.moodmnky.com
2. **Start a new battle** (challenge someone or accept challenge)
3. **Copy the room ID immediately** from URL
   - URL: `https://aab-play.moodmnky.com/battle-gen9randombattle-1234567890`
   - Room ID: `gen9randombattle-1234567890` (without "battle-" prefix)

### Step 2: Update Match Record IMMEDIATELY

```bash
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
```

**Do this within 1-2 minutes** of creating the room to ensure it's still active.

### Step 3: Verify Worker Subscription

Wait 30-35 seconds, then check:
```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'
```

### Step 4: Complete Battle Quickly

**Complete the battle within 15 minutes** to ensure:
- Room stays active
- Worker can detect completion
- Replay is available for parsing

---

## 🎯 Best Practice for Testing

### Create Room → Update Match → Complete Battle (All Within 15 Minutes)

1. **Create battle room** (0:00)
2. **Update match record** (0:01)
3. **Wait for worker subscription** (0:35)
4. **Complete battle** (1:00 - 5:00)
5. **Verify processing** (5:00 - 6:00)

**Total time**: ~6 minutes (well within 15-minute expiration)

---

## 📋 Quick Test Workflow

```bash
# 1. Create room on Showdown (manual)
# 2. Update match immediately
pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>

# 3. Wait 35 seconds
sleep 35

# 4. Check subscription
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep Subscribed'

# 5. Complete battle (manual)
# 6. Check processing
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=100 integration-worker | grep -E "(Battle completed|Processing)"'
```

---

## 💡 Key Insight

**The Integration Worker is working correctly!**

The challenge is timing:
- Rooms expire quickly (15 minutes)
- Need to create → update → complete quickly
- Worker will detect completion once room is active

---

**Next**: Create a fresh battle room, update immediately, and complete within 15 minutes!
