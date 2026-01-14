# Bridge Authentication Implementation Complete ✅

**Date**: January 16, 2026  
**Status**: ✅ Implementation Complete - Ready for Testing

---

## ✅ Implementation Summary

Bridge authentication has been successfully implemented to sync Supabase user accounts with the Showdown loginserver. When users log into the app via Discord OAuth, their Showdown account is automatically created/updated.

---

## 📁 Files Created/Modified

### ✅ Database Migration
- **File**: `supabase/migrations/20260116000001_add_showdown_sync_fields.sql`
- **Purpose**: Adds `showdown_username`, `showdown_account_synced`, and `showdown_account_synced_at` columns to `profiles` table
- **Status**: Ready to run

### ✅ Utility Functions
- **File**: `lib/showdown/sync.ts`
- **Functions**:
  - `generateShowdownPassword(userId)` - Generates deterministic password
  - `getShowdownUsername(userId)` - Determines username with fallback logic
  - `syncShowdownAccount(userId)` - Syncs account to loginserver
  - `getShowdownUsernameFromProfile(userId)` - Gets synced username
- **Status**: ✅ Complete

### ✅ API Endpoint
- **File**: `app/api/showdown/sync-account/route.ts`
- **Endpoint**: `POST /api/showdown/sync-account`
- **Purpose**: API endpoint for manual account sync (also used internally)
- **Status**: ✅ Complete

### ✅ Auth Callback Integration
- **File**: `app/auth/callback/route.ts`
- **Changes**: Added automatic sync trigger after successful login
- **Status**: ✅ Complete

---

## 🔧 Environment Variables Required

Add these to your `.env` and `.env.local` files:

### Production (`.env`)
```bash
# Showdown Loginserver Configuration (AAB subdomain)
LOGINSERVER_URL=https://aab-login.moodmnky.com
SHOWDOWN_PASSWORD_SECRET=change-me-in-production-generate-secure-random-string
```

### Local Development (`.env.local`)
```bash
# Showdown Loginserver Configuration (AAB local IP)
LOGINSERVER_URL=http://10.3.0.119:8001
SHOWDOWN_PASSWORD_SECRET=local-dev-secret-change-in-production
```

**Note**: Generate a secure random string for `SHOWDOWN_PASSWORD_SECRET` in production:
```bash
# Generate secure secret (use in production)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 Next Steps

### 1. Run Database Migration
```bash
# If using Supabase CLI locally
supabase migration up

# Or apply manually via Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20260116000001_add_showdown_sync_fields.sql
```

### 2. Add Environment Variables
- Add `LOGINSERVER_URL` and `SHOWDOWN_PASSWORD_SECRET` to `.env` and `.env.local`
- For production, also add to Vercel environment variables

### 3. Test the Flow

#### Manual Sync Test
```bash
# After logging in, test manual sync via API
curl -X POST http://localhost:3000/api/showdown/sync-account \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

#### Automatic Sync Test
1. Log out of the app
2. Log back in via Discord OAuth
3. Check Supabase `profiles` table - should have:
   - `showdown_username` populated
   - `showdown_account_synced` = `true`
   - `showdown_account_synced_at` timestamp

### 4. Verify Loginserver Integration

Ensure your Showdown loginserver is running and accessible at `LOGINSERVER_URL`:

```bash
# Test loginserver connectivity
curl http://localhost:8001/api/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","email":"test@example.com"}'
```

---

## 🔄 How It Works

### User Flow

1. **User logs in** via Discord OAuth → Supabase
2. **Auth callback** (`/auth/callback`) receives session
3. **Background sync** triggers automatically:
   - Determines Showdown username (from profile → discord_username → email → user ID)
   - Generates deterministic password (from user ID + secret)
   - Calls loginserver `/api/register` (or `/api/updateuser` if exists)
   - Updates Supabase profile with sync status
4. **User can now log into Showdown** with synced username and password

### Username Priority

1. `showdown_username` (if manually set in profile)
2. `discord_username` (from Discord OAuth)
3. Email prefix (from user email)
4. User ID (fallback, max 18 chars)

### Password Generation

- Deterministic: Generated from `userId + SHOWDOWN_PASSWORD_SECRET`
- User doesn't know password (uses app auth)
- Password can't be changed by user (maintains sync)
- Uses HMAC-SHA256 for security

---

## 🛡️ Security Considerations

1. **Password Security**: Passwords are deterministic but secure (HMAC-SHA256)
2. **API Authentication**: Sync endpoint requires Supabase auth
3. **Username Validation**: Automatically sanitized (alphanumeric + underscore, max 18 chars)
4. **Error Handling**: Graceful fallbacks, doesn't block login if sync fails

---

## 🐛 Troubleshooting

### Sync Not Triggering
- Check browser console for errors
- Verify `LOGINSERVER_URL` is correct
- Ensure loginserver is running and accessible

### Username Conflicts
- Loginserver will return error if username exists
- System will try to update existing account
- Check Supabase profile for sync status

### Password Issues
- Password is deterministic - same user ID always generates same password
- If password doesn't work, verify `SHOWDOWN_PASSWORD_SECRET` hasn't changed

---

## 📚 Related Documentation

- **Full Plan**: `BRIDGE-AUTHENTICATION-PLAN.md`
- **Summary**: `BRIDGE-AUTH-SUMMARY`
- **Loginserver Guide**: `SHOWDOWN-LOGINSERVER-GUIDE.md`

---

**Implementation Complete!** 🎉

The bridge authentication system is ready for testing. Once environment variables are added and the migration is run, users will automatically have Showdown accounts synced when they log in.
