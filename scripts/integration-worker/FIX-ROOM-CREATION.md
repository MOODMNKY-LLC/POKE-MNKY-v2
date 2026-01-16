# Fix: Room Creation Issue

**Date**: January 15, 2026  
**Issue**: Room doesn't exist on Showdown server

---

## 🔍 Problem

The test match was created with `showdown_room_id = 'battle-gen9avgatbest-test123'`, but:
- ❌ The room doesn't actually exist on the Showdown server
- ❌ Showdown rooms expire after 15 minutes of inactivity
- ❌ Rooms are only created when someone visits the URL or uses the API

---

## ✅ Solution Options

### Option 1: Visit URL to Create Room (Easiest)

**Steps**:
1. Open browser
2. Visit: `https://aab-play.moodmnky.com/battle-gen9avgatbest-test123`
3. This will create the room automatically
4. The Integration Worker is already subscribed and will detect events

**Pros**: Simple, no code changes  
**Cons**: Room expires after 15 minutes of inactivity

---

### Option 2: Use Create Room API Endpoint

**Steps**:
1. Ensure you're authenticated in the app
2. Call: `POST /api/showdown/create-room`
3. Body: `{ "match_id": "6f10c53b-d601-4fdb-ab28-110b16b59234" }`
4. This will create the room and update the match record

**Pros**: Proper API flow  
**Cons**: Requires authentication

---

### Option 3: Create Room Manually on Showdown

**Steps**:
1. Go to: https://aab-play.moodmnky.com
2. Create a new battle room
3. Note the actual room ID
4. Update match record:
   ```sql
   UPDATE matches 
   SET showdown_room_id = '<actual-room-id>',
       showdown_room_url = 'https://aab-play.moodmnky.com/<actual-room-id>'
   WHERE id = '6f10c53b-d601-4fdb-ab28-110b16b59234';
   ```

**Pros**: Full control  
**Cons**: Manual process

---

## 🎯 Recommended Approach

**For Testing**: Use **Option 1** - Just visit the URL

1. Open: `https://aab-play.moodmnky.com/battle-gen9avgatbest-test123`
2. This creates the room automatically
3. Complete a quick battle (or forfeit)
4. Watch Integration Worker logs for completion events

---

## 📋 Updated Test Flow

1. ✅ **Phase 1**: Basic Connectivity - Complete
2. ✅ **Phase 2**: Room Polling - Complete (worker subscribed)
3. ⏳ **Phase 3**: Create Room & Complete Battle
   - Visit URL to create room
   - Complete battle
   - Verify worker detects completion
4. ⏳ **Phase 4**: Database Verification

---

## 🔧 Alternative: Update Test Script

We can update `setup-test-environment.ts` to:
1. Create match WITHOUT `showdown_room_id` initially
2. Use the create-room API endpoint (if authenticated)
3. Or provide instructions to visit URL

**Would you like me to update the test script?**

---

**Next Step**: Visit `https://aab-play.moodmnky.com/battle-gen9avgatbest-test123` to create the room, then proceed with battle completion test!
