# Showdown Integration Status

**Date**: January 2026  
**Status**: App-side endpoints configured ✅ | Server-side API may need implementation ⚠️

---

## ✅ What's Configured

### Environment Variables
```env
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
LOGINSERVER_URL=https://aab-login.moodmnky.com
SHOWDOWN_API_KEY=  # (empty - optional)
```

### API Endpoints (App-Side)

#### 1. **POST `/api/showdown/create-room`** ✅
- **Status**: Fully implemented
- **Location**: `app/api/showdown/create-room/route.ts`
- **Functionality**:
  - ✅ Authenticates user
  - ✅ Verifies user is part of match (coach of team1 or team2)
  - ✅ Generates room ID: `battle-match-{match_id}`
  - ✅ Constructs room URL: `https://play.moodmnky.com/battle-gen9avgatbest-{roomId}`
  - ✅ **Attempts** to call Showdown server API: `${SHOWDOWN_SERVER_URL}/api/create-room`
  - ✅ **Gracefully falls back** if server API doesn't exist (generates local room URL)
  - ✅ Updates match record in database
  - ✅ Sets match status to 'in_progress'

**Frontend Integration**: ✅
- `components/showdown/match-lobby.tsx` calls this endpoint
- Opens battle room URL in new tab after creation

#### 2. **POST `/api/showdown/validate-team`** ✅
- **Status**: Fully implemented
- **Location**: `app/api/showdown/validate-team/route.ts`
- **Functionality**:
  - ✅ Authenticates user
  - ✅ Parses Showdown team export text (using `koffing` library)
  - ✅ Fetches user's drafted roster from database
  - ✅ Validates team against roster
  - ✅ Checks league rules (team size, level caps)
  - ✅ Returns detailed validation results with errors

**Frontend Integration**: ✅
- `components/showdown/team-validator.tsx` calls this endpoint
- Displays validation results with error messages

#### 3. **GET/POST `/api/showdown/teams`** ✅
- **Status**: Fully implemented
- **Location**: `app/api/showdown/teams/route.ts`
- **Functionality**:
  - ✅ List teams with filtering/search
  - ✅ Create new teams
  - ✅ Auto-creates coach records if needed

#### 4. **GET/PATCH/DELETE `/api/showdown/teams/[id]`** ✅
- **Status**: Fully implemented
- **Location**: `app/api/showdown/teams/[id]/route.ts`
- **Functionality**:
  - ✅ Get team details
  - ✅ Export team in Showdown format
  - ✅ Update team
  - ✅ Delete team

---

## ⚠️ What May Need Configuration

### Showdown Server API Endpoint

**Expected Endpoint**: `POST ${SHOWDOWN_SERVER_URL}/api/create-room`

**Current Status**: 
- The app **attempts** to call this endpoint
- If it doesn't exist or fails, the app **gracefully falls back** to generating room URLs locally
- Room URLs will still work, but rooms won't be pre-created on the server

**What the App Sends**:
```json
{
  "roomId": "battle-match-123e4567e89b12d3",
  "format": "gen9avgatbest",
  "team1": "Team Name 1",
  "team2": "Team Name 2",
  "matchId": "uuid"
}
```

**Expected Response**:
```json
{
  "room_id": "battle-match-123e4567e89b12d3",
  "room_url": "https://aab-play.moodmnky.com/battle-gen9avgatbest-battle-match-123e4567e89b12d3"
}
```

**If Not Implemented**: 
- The app will still work
- Room URLs will be generated locally
- Users can manually navigate to the room URL
- Rooms will be created when users join (standard Showdown behavior)

---

## 🔍 Verification Checklist

### To Verify Full Integration:

1. **Test Room Creation**:
   ```bash
   # In browser console (while logged in):
   fetch('/api/showdown/create-room', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({ match_id: 'your-match-uuid' })
   }).then(r => r.json()).then(console.log)
   ```
   
   **Expected**: Should return `room_url` that opens in Showdown client

2. **Check Server Logs**:
   - Look for `[Showdown] Server API call failed` warnings
   - If you see these, the server API endpoint doesn't exist yet
   - The app will still work, but rooms won't be pre-created

3. **Test Team Validation**:
   ```bash
   # In browser console (while logged in):
   fetch('/api/showdown/validate-team', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({ 
       team_text: 'Your Showdown team export text here'
     })
   }).then(r => r.json()).then(console.log)
   ```
   
   **Expected**: Should return validation results

---

## 📋 Current Behavior

### Room Creation Flow:
1. User clicks "Launch Battle" in Match Lobby
2. App calls `/api/showdown/create-room` with `match_id`
3. App attempts to call `${SHOWDOWN_SERVER_URL}/api/create-room`
4. **If server API exists**: Room is pre-created on server
5. **If server API doesn't exist**: App generates room URL locally (still works!)
6. App updates database with room URL
7. App opens room URL in new tab

### Team Validation Flow:
1. User pastes/uploads team in Team Validator
2. App calls `/api/showdown/validate-team` with team text
3. App parses team and validates against roster
4. App returns validation results
5. User sees errors/warnings if team is invalid

---

## 🎯 Recommendations

### If Showdown Server API Doesn't Exist Yet:

**Option 1: Implement Server API** (Recommended for full integration)
- Create `POST /api/create-room` endpoint on your Showdown server
- Accept the request format shown above
- Return room creation confirmation
- This enables pre-creation of rooms before users join

**Option 2: Continue Without Server API** (Works fine)
- Current implementation gracefully handles missing API
- Rooms will be created when users navigate to the URL
- This is standard Showdown behavior

### Additional Enhancements (Optional):

1. **Replay Capture API**: 
   - Endpoint to capture replays from completed battles
   - Would integrate with Replay Library

2. **Room Status API**:
   - Check if room exists/is active
   - Get room participants
   - Monitor battle progress

3. **Format Validation API**:
   - Validate teams against Showdown server's format rules
   - More comprehensive than app-side validation

---

## ✅ Summary

**App-Side**: ✅ Fully configured and working
- All API endpoints implemented
- Frontend components integrated
- Environment variables set
- Graceful fallbacks in place

**Server-Side**: ⚠️ May need implementation
- Server API endpoint (`/api/create-room`) may not exist
- App works without it (falls back to local URL generation)
- For full integration, implement server API endpoint

**Current Status**: **Functional** - App will work with or without server API endpoint
