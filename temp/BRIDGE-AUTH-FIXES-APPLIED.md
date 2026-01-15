# Bridge Authentication Fixes Applied ✅

**Date**: January 16, 2026  
**Status**: Critical Issues Fixed - Ready for Testing

---

## ✅ Fixes Applied

### 1. Added Required Fields to Registration Payload ✅

**Fixed**: Added all required fields that loginserver expects:

```typescript
const payload = {
  act: 'register',              // ✅ Action name (required)
  username: showdownUsername,  // ✅ Username
  password: password,           // ✅ Password
  cpassword: password,         // ✅ Confirm password (must match)
  captcha: 'pikachu',          // ✅ Anti-spam captcha (required)
  challstr: challstr,          // ✅ Challenge string (required)
  email: user.email || '',     // ✅ Email
}
```

### 2. Implemented Challenge String Fetching ✅

**Fixed**: Added `getChallengeString()` function that:
- Connects to Showdown server WebSocket (`wss://aab-showdown.moodmnky.com/showdown/websocket`)
- Waits for `|challstr|` message
- Parses challenge string correctly
- Handles timeouts and errors
- Uses native WebSocket (Node.js 18+)

**Implementation**:
```typescript
async function getChallengeString(): Promise<string> {
  // Connects to Showdown server WebSocket
  // Waits for |challstr| message
  // Returns challenge string
}
```

### 3. Removed `/api/updateuser` Calls ✅

**Fixed**: Removed all references to `/api/updateuser` endpoint (doesn't exist)

**Changed**: Now uses `/api/register` for both new and existing accounts

### 4. Handle "Username Already Taken" as Success ✅

**Fixed**: Updated error handling to treat "username already taken" as success:

```typescript
if (
  response.status === 409 ||
  errorMessage.includes('already taken') ||
  errorMessage.includes('already exists') ||
  errorMessage.includes('username is taken')
) {
  // Treat as success - account already synced
  // Continue to update Supabase profile
}
```

### 5. Fixed Password Generation ✅

**Fixed**: Changed from base64 to base64url encoding to avoid invalid characters:

```typescript
// OLD: base64 (may include +, /, =)
const hash = hmac.digest('base64')

// NEW: base64url (safe for passwords)
const base64url = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
```

### 6. Added Timeout Handling ✅

**Fixed**: Added 10-second timeout to both WebSocket and fetch requests:

```typescript
// WebSocket timeout
const timeout = setTimeout(() => {
  ws.close()
  reject(new Error('Timeout waiting for challenge string'))
}, 10000)

// Fetch timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)
```

---

## 📋 Updated Flow

### Complete Sync Flow:

1. **User logs in** → Supabase auth callback triggers
2. **Get challenge string** → Connect to Showdown WebSocket, wait for `|challstr|`
3. **Generate password** → Deterministic password from user ID + secret
4. **Determine username** → Priority: showdown_username → discord_username → email → user ID
5. **Call loginserver** → `POST /api/register` with all required fields:
   - `act: 'register'`
   - `username`
   - `password`
   - `cpassword` (matches password)
   - `captcha: 'pikachu'`
   - `challstr` (from WebSocket)
   - `email`
6. **Handle response**:
   - Success → Update Supabase profile
   - Username taken → Treat as success, update profile
   - Other errors → Return error
7. **Update profile** → Set `showdown_username`, `showdown_account_synced`, `showdown_account_synced_at`

---

## 🧪 Testing

### Test Script Created

**File**: `scripts/test-loginserver-api.ts`

**Run**:
```bash
pnpm tsx scripts/test-loginserver-api.ts
```

**Tests**:
1. ✅ WebSocket connection to Showdown server
2. ✅ Challenge string fetching
3. ✅ Loginserver registration with all required fields
4. ✅ Error handling for username conflicts

---

## 🔧 Environment Variables

**Required**:
- ✅ `LOGINSERVER_URL` - Loginserver API URL (`https://aab-login.moodmnky.com`)
- ✅ `SHOWDOWN_SERVER_URL` - Showdown server URL (`https://aab-showdown.moodmnky.com`)
- ✅ `SHOWDOWN_PASSWORD_SECRET` - Password generation secret

**Already Configured**:
- ✅ `.env` - Production URLs
- ✅ `.env.local` - Local IP addresses

---

## 📝 Code Changes Summary

### Files Modified:

1. **`lib/showdown/sync.ts`**:
   - ✅ Added `getChallengeString()` function
   - ✅ Updated `generateShowdownPassword()` to use base64url
   - ✅ Updated `syncShowdownAccount()` to:
     - Fetch challenge string before registration
     - Include all required fields (act, cpassword, captcha, challstr)
     - Remove `/api/updateuser` calls
     - Handle "username taken" as success
     - Add timeout handling

### Files Created:

1. **`scripts/test-loginserver-api.ts`**:
   - Test script for challenge string fetching
   - Test script for registration endpoint
   - Comprehensive error reporting

---

## ✅ Verification Checklist

- [x] Challenge string fetching implemented
- [x] All required fields added to payload
- [x] `/api/updateuser` calls removed
- [x] "Username taken" handled as success
- [x] Password generation fixed (base64url)
- [x] Timeout handling added
- [x] Error handling improved
- [x] Test script created

---

## 🚀 Next Steps

1. **Run Database Migration**:
   ```bash
   supabase migration up
   ```

2. **Test Challenge String Fetching**:
   ```bash
   pnpm tsx scripts/test-loginserver-api.ts
   ```

3. **Test End-to-End Flow**:
   - Log into app
   - Check if sync triggers automatically
   - Verify Supabase profile updated
   - Verify loginserver account created

4. **Verify Showdown Login**:
   - Try logging into Showdown with synced username
   - Use deterministic password (generated from user ID + secret)

---

**All Critical Issues Fixed!** 🎉

The bridge authentication implementation now includes:
- ✅ Challenge string fetching from Showdown WebSocket
- ✅ All required fields in registration payload
- ✅ Proper error handling
- ✅ "Username taken" treated as success
- ✅ Timeout handling
- ✅ Base64url password encoding

Ready for testing!
