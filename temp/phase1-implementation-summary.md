# Phase 1 Implementation Summary - Showdown Integration

**Date**: January 15, 2026  
**Status**: ✅ Complete  
**Phase**: Foundation APIs

---

## Completed Tasks

### ✅ 1. Database Migration
**File**: `supabase/migrations/20260115000000_add_showdown_fields.sql`

Added Showdown integration fields to the `matches` table:
- `showdown_room_id` (TEXT) - Room identifier for battle tracking
- `showdown_room_url` (TEXT) - Full URL to join Showdown battle room
- Index created on `showdown_room_id` for faster lookups

**Action Required**: Run this migration in Supabase SQL Editor.

### ✅ 2. Package Installation
**Package**: `koffing` (v1.0.0)

Installed the koffing library for parsing Pokémon Showdown team exports.

### ✅ 3. Team Parser Module
**File**: `lib/team-parser.ts`

Created comprehensive team parsing and validation module with:
- `parseShowdownTeam()` - Parses Showdown export text into structured data
- `validateTeamAgainstRoster()` - Validates team against drafted roster and league rules
- `exportTeamToShowdown()` - Exports team back to Showdown format
- Full TypeScript types for all interfaces
- Support for:
  - Roster validation (Pokemon must be in drafted roster)
  - Team size validation (6-10 Pokemon)
  - Banned items/moves/abilities checking
  - Level cap validation
  - Tera type rules
  - League-specific rules

### ✅ 4. Create Room API Endpoint
**File**: `app/api/showdown/create-room/route.ts`

**Endpoint**: `POST /api/showdown/create-room`

**Features**:
- Authenticates user
- Verifies user is part of the match (coach of team1 or team2)
- Checks if room already exists (returns existing room if found)
- Generates room ID and URL
- Optionally calls Showdown server API (if configured)
- Updates match record with room information
- Sets match status to 'in_progress'

**Request Body**:
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
  "room_url": "http://...",
  "match_id": "uuid"
}
```

### ✅ 5. Validate Team API Endpoint
**File**: `app/api/showdown/validate-team/route.ts`

**Endpoint**: `POST /api/showdown/validate-team`

**Features**:
- Authenticates user
- Parses Showdown team export text
- Fetches user's drafted roster
- Validates team against roster and league rules
- Returns validation results with detailed errors

**Request Body**:
```json
{
  "team_text": "Pikachu @ Light Ball\n...",
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

## Environment Variables Required

Add these to your `.env.local`:

```env
# Showdown Server Configuration
SHOWDOWN_SERVER_URL=http://your-showdown-server-url:8000
SHOWDOWN_API_KEY=your-api-key-if-needed
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=http://your-showdown-client-url
```

**Note**: The API endpoints will work even if `SHOWDOWN_SERVER_URL` is not set - they'll generate local room IDs/URLs that you can configure later.

---

## Next Steps

### Immediate Actions
1. **Run Database Migration**: Execute `supabase/migrations/20260115000000_add_showdown_fields.sql` in Supabase SQL Editor
2. **Set Environment Variables**: Add Showdown configuration to `.env.local`
3. **Test API Endpoints**: 
   - Test `/api/showdown/create-room` with a valid match ID
   - Test `/api/showdown/validate-team` with a Showdown team export

### Phase 2 (Next)
- Create Match Lobby component
- Create Team Validator component  
- Update Showdown page with functional tabs
- Create Replay Library component

---

## Testing Guide

### Test Create Room Endpoint

```bash
# Get auth token first, then:
curl -X POST http://localhost:3000/api/showdown/create-room \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{"match_id": "your-match-uuid"}'
```

### Test Validate Team Endpoint

```bash
curl -X POST http://localhost:3000/api/showdown/validate-team \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "team_text": "Pikachu @ Light Ball\nAbility: Static\nLevel: 50\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Thunderbolt\n- Quick Attack\n- Iron Tail\n- Brick Break"
  }'
```

---

## Implementation Notes

### Showdown Server API Integration
The `create-room` endpoint attempts to call your Showdown server API if `SHOWDOWN_SERVER_URL` is configured. If the API call fails or the server is unavailable, it gracefully falls back to generating local room IDs/URLs.

**To customize**: Adjust the API call in `app/api/showdown/create-room/route.ts` based on your Showdown server's actual API endpoints.

### Team Validation
The validation checks:
1. Team parsing (syntax validation)
2. Roster membership (all Pokemon must be drafted)
3. Team size (6-10 Pokemon)
4. League rules (banned items/moves/abilities, level caps, tera rules)

**To enhance**: Add more league-specific rules by querying the `league_config` table and parsing the rules JSON.

### Error Handling
All endpoints include:
- Proper authentication checks
- Input validation
- Error logging
- Graceful error responses
- TypeScript type safety

---

## Files Created/Modified

### New Files
- `supabase/migrations/20260115000000_add_showdown_fields.sql`
- `lib/team-parser.ts`
- `app/api/showdown/create-room/route.ts`
- `app/api/showdown/validate-team/route.ts`

### Modified Files
- `package.json` (added koffing dependency)

---

## Known Limitations

1. **Showdown Server API**: The exact API endpoints may vary. Adjust the `create-room` endpoint based on your server's API.
2. **League Rules**: Currently uses default rules. Enhance by parsing `league_config` table for dynamic rules.
3. **Season Filtering**: Team roster validation doesn't filter by season yet (if your schema supports it).
4. **Room Management**: No automatic cleanup of old rooms or room status tracking.

---

## Success Criteria Met

✅ Database schema updated with Showdown fields  
✅ Team parsing library installed and integrated  
✅ Team validation logic implemented  
✅ Room creation API endpoint created  
✅ Team validation API endpoint created  
✅ Proper authentication and authorization  
✅ Error handling and logging  
✅ TypeScript types throughout  

**Phase 1 is complete and ready for testing!**
