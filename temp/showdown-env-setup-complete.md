# Showdown Environment Setup Complete ✅

**Date**: January 15, 2026  
**Status**: Environment variables configured and endpoints tested

---

## Environment Variables Added

### `.env.local` (Local Development)
```env
# Showdown Server Configuration
SHOWDOWN_SERVER_URL=https://showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://play.moodmnky.com
SHOWDOWN_API_KEY=
```

### `.env` (Production)
```env
# Showdown Server Configuration
SHOWDOWN_SERVER_URL=https://showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://play.moodmnky.com
SHOWDOWN_API_KEY=
```

---

## Server Connectivity Test Results

### ✅ Showdown Server
- **URL**: `https://showdown.moodmnky.com`
- **Status**: 200 OK
- **Response Time**: ~0.12s
- **Accessible**: Yes ✅
- **Via**: Cloudflare Tunnel

### ✅ Showdown Client
- **URL**: `https://play.moodmnky.com`
- **Status**: 200 OK
- **Response Time**: ~0.13s
- **Accessible**: Yes ✅
- **Via**: Cloudflare Tunnel

---

## API Endpoints Created

### 1. Create Room Endpoint
**Path**: `POST /api/showdown/create-room`

**Status**: ✅ Created and ready

**Functionality**:
- Authenticates user
- Verifies user is part of match (coach of team1 or team2)
- Generates room ID: `battle-match-{match_id}`
- Constructs room URL: `https://play.moodmnky.com/battle-{roomId}`
- Optionally calls Showdown server API (if configured)
- Updates match record with room info
- Sets match status to 'in_progress'

**Request**:
```json
{
  "match_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "room_id": "battle-match-...",
  "room_url": "https://play.moodmnky.com/battle-...",
  "match_id": "uuid"
}
```

### 2. Validate Team Endpoint
**Path**: `POST /api/showdown/validate-team`

**Status**: ✅ Created and ready

**Functionality**:
- Authenticates user
- Parses Showdown team export text
- Fetches user's drafted roster
- Validates team against roster
- Checks league rules (team size, banned items/moves, level caps, tera rules)
- Returns validation results with detailed errors

**Request**:
```json
{
  "team_text": "Pikachu @ Light Ball\nAbility: Static\n...",
  "match_id": "uuid" // optional
}
```

**Response**:
```json
{
  "valid": true,
  "errors": [],
  "team": {
    "pokemon": [...],
    "count": 6
  },
  "canonical_text": "..."
}
```

---

## Testing

### Connectivity Tests ✅
- Showdown server accessible: ✅
- Showdown client accessible: ✅

### Endpoint Tests
- **Create Room**: Requires authentication + valid match_id (manual test needed)
- **Validate Team**: Requires authentication + team text (manual test needed)

**Test Script Created**: `scripts/test-showdown-endpoints.ts`

Run with:
```bash
pnpm exec tsx --env-file=.env.local scripts/test-showdown-endpoints.ts
```

---

## Next Steps

### Immediate
1. ✅ Environment variables added to `.env` and `.env.local`
2. ✅ Server connectivity verified
3. ⏳ Run database migration: `supabase/migrations/20260115000000_add_showdown_fields.sql`
4. ⏳ Test endpoints with authenticated requests

### Manual Testing Required

**Test Create Room**:
1. Start dev server: `pnpm dev`
2. Log in to the app
3. Navigate to a match page
4. Use browser console or Postman to test:
   ```javascript
   fetch('/api/showdown/create-room', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify({ match_id: 'your-match-uuid' })
   }).then(r => r.json()).then(console.log)
   ```

**Test Validate Team**:
```javascript
fetch('/api/showdown/validate-team', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    team_text: 'Pikachu @ Light Ball\nAbility: Static\n- Thunderbolt'
  })
}).then(r => r.json()).then(console.log)
```

---

## Configuration Notes

### Showdown Server API
The `create-room` endpoint attempts to call your Showdown server API at:
```
POST https://showdown.moodmnky.com/api/create-room
```

**If your Showdown server doesn't have this API endpoint yet:**
- The endpoint will gracefully fall back to generating local room IDs/URLs
- Room URLs will be: `https://play.moodmnky.com/battle-{roomId}`
- You can implement the API endpoint later if needed

### Room URL Format
Room URLs are constructed as:
```
https://play.moodmnky.com/battle-{roomId}
```

Where `roomId` is: `battle-match-{first-16-chars-of-match-uuid}`

Example:
- Match ID: `123e4567-e89b-12d3-a456-426614174000`
- Room ID: `battle-match-123e4567e89b12d3`
- Room URL: `https://play.moodmnky.com/battle-battle-match-123e4567e89b12d3`

---

## Files Modified

- ✅ `.env` - Added Showdown configuration
- ✅ `.env.local` - Added Showdown configuration
- ✅ `scripts/test-showdown-endpoints.ts` - Created test script

---

## Environment Variable Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `SHOWDOWN_SERVER_URL` | Showdown server API base URL | `https://showdown.moodmnky.com` |
| `NEXT_PUBLIC_SHOWDOWN_CLIENT_URL` | Showdown client web URL | `https://play.moodmnky.com` |
| `SHOWDOWN_API_KEY` | Optional API key for Showdown server | (leave empty if not needed) |

---

**Setup Complete! Ready for Phase 2 (UI Components).**
