# Showdown Endpoint Testing Summary

**Date**: January 15, 2026  
**Status**: ✅ Environment configured, endpoints ready for testing

---

## Environment Configuration ✅

### Variables Added

**`.env.local`** (Local Development):
```env
# Showdown Server Configuration
SHOWDOWN_SERVER_URL=https://showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://play.moodmnky.com
SHOWDOWN_API_KEY=
```

**`.env`** (Production):
```env
# Showdown Server Configuration
SHOWDOWN_SERVER_URL=https://showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://play.moodmnky.com
SHOWDOWN_API_KEY=
```

---

## Server Connectivity Tests ✅

### Showdown Server
- **URL**: `https://showdown.moodmnky.com`
- **Status**: ✅ 200 OK
- **Response Time**: ~0.12s
- **Accessible**: Yes
- **Via**: Cloudflare Tunnel

### Showdown Client
- **URL**: `https://play.moodmnky.com`
- **Status**: ✅ 200 OK
- **Response Time**: ~0.13s
- **Accessible**: Yes
- **Via**: Cloudflare Tunnel

---

## API Endpoints Status

### ✅ POST /api/showdown/create-room

**Status**: Created and ready for testing

**Functionality**:
- ✅ User authentication check
- ✅ Match ownership verification
- ✅ Room ID generation
- ✅ Room URL construction
- ✅ Optional Showdown server API call
- ✅ Database update

**Room URL Format**:
```
https://play.moodmnky.com/battle-gen9avgatbest-battle-match-{roomId}
```

**Test Command** (requires authentication):
```bash
# In browser console (while logged in):
fetch('/api/showdown/create-room', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ match_id: 'your-match-uuid' })
}).then(r => r.json()).then(console.log)
```

### ✅ POST /api/showdown/validate-team

**Status**: Created and ready for testing

**Functionality**:
- ✅ User authentication check
- ✅ Team parsing (koffing library)
- ✅ Roster validation
- ✅ League rules checking
- ✅ Detailed error reporting

**Test Command** (requires authentication):
```bash
# In browser console (while logged in):
fetch('/api/showdown/validate-team', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    team_text: 'Pikachu @ Light Ball\nAbility: Static\nLevel: 50\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Thunderbolt\n- Quick Attack\n- Iron Tail\n- Brick Break'
  })
}).then(r => r.json()).then(console.log)
```

---

## Testing Checklist

### Prerequisites
- [x] Environment variables added
- [x] Server connectivity verified
- [ ] Database migration run (`20260115000000_add_showdown_fields.sql`)
- [ ] Dev server running (`pnpm dev`)
- [ ] User logged in to app

### Manual Testing Steps

#### Test 1: Create Room Endpoint
1. Navigate to `/matches` page
2. Find a scheduled match where you're the coach
3. Open browser console
4. Run test command above with actual match_id
5. Verify response contains `room_id` and `room_url`
6. Check database: `matches` table should have `showdown_room_id` and `showdown_room_url` populated
7. Verify match status changed to `in_progress`

#### Test 2: Validate Team Endpoint
1. Ensure you have a drafted roster in database
2. Open browser console
3. Run test command above with Showdown team export
4. Verify response shows validation results
5. Test with invalid team (Pokemon not in roster)
6. Verify errors are returned correctly

---

## Room URL Format Notes

Showdown uses the format:
```
/battle-[format]-[roomId]
```

Our implementation generates:
```
https://play.moodmnky.com/battle-gen9avgatbest-battle-match-{roomId}
```

**If your Showdown server uses a different format**, adjust the URL construction in `app/api/showdown/create-room/route.ts` line 66.

---

## Next Steps

1. **Run Database Migration**: Execute `supabase/migrations/20260115000000_add_showdown_fields.sql`
2. **Test Endpoints**: Use browser console or Postman with authenticated requests
3. **Verify Room Creation**: Check that rooms are created correctly
4. **Test Team Validation**: Verify roster validation works
5. **Proceed to Phase 2**: Build UI components once endpoints are verified

---

## Files Modified/Created

- ✅ `.env` - Added Showdown variables
- ✅ `.env.local` - Added Showdown variables
- ✅ `app/api/showdown/create-room/route.ts` - Created
- ✅ `app/api/showdown/validate-team/route.ts` - Created
- ✅ `lib/team-parser.ts` - Created
- ✅ `scripts/test-showdown-endpoints.ts` - Created test script
- ✅ `supabase/migrations/20260115000000_add_showdown_fields.sql` - Created

---

**Ready for manual endpoint testing!**
