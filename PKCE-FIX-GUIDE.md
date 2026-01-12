# PKCE Code Verifier Missing Error - Fix Guide

## Problem

Getting `AuthPKCECodeVerifierMissingError: PKCE code verifier not found in storage` when trying to complete Discord OAuth login.

## Root Cause

The PKCE (Proof Key for Code Exchange) code verifier must be stored in **cookies** (not localStorage) and accessed on the **server-side** during the OAuth callback. The previous implementation used a client component for the callback, which couldn't reliably access the code verifier stored during OAuth initiation.

## Solution Applied

### ✅ Fixed: OAuth Callback Route Handler

**Created:** `app/auth/callback/route.ts` (Server-side Route Handler)

**Why:** Route Handlers run on the server and can properly read/write cookies, ensuring the PKCE code verifier persists across the OAuth redirect flow.

**Key Changes:**
- ✅ Server-side Route Handler (not client component)
- ✅ Uses `createServerClient()` with cookie handling
- ✅ Properly exchanges authorization code for session
- ✅ Handles errors and redirects appropriately

### ✅ Fixed: Middleware

**Created:** `middleware.ts` (Root level)

**Why:** Middleware ensures the session is refreshed on every request, maintaining auth state across the application.

**Key Features:**
- ✅ Runs on every request
- ✅ Calls `updateSession()` to refresh auth cookies
- ✅ Protects routes and maintains session state

### ✅ Verified: Client Configuration

**File:** `lib/supabase/client.ts`

**Status:** Already correct ✅
- Uses `createBrowserClient` from `@supabase/ssr`
- Automatically handles PKCE code verifier storage in cookies
- Works correctly for initiating OAuth flow

---

## How PKCE Flow Works Now

### 1. User Initiates OAuth (Client-side)
```
User clicks "Continue with Discord"
  ↓
app/auth/login/page.tsx (Client Component)
  ↓
createBrowserClient().signInWithOAuth()
  ↓
@supabase/ssr stores PKCE code verifier in cookies
  ↓
Redirects to Discord
```

### 2. Discord Authorization (External)
```
Discord authorization page
  ↓
User authorizes app
  ↓
Discord redirects to: http://127.0.0.1:54321/auth/v1/callback?code=XXX
  ↓
Supabase processes callback
  ↓
Supabase redirects to: http://localhost:3000/auth/callback?code=XXX
```

### 3. Code Exchange (Server-side) ✅ FIXED
```
GET /auth/callback?code=XXX
  ↓
app/auth/callback/route.ts (Route Handler - Server-side)
  ↓
createServerClient() reads PKCE code verifier from cookies ✅
  ↓
exchangeCodeForSession(code) - Success! ✅
  ↓
Session created, cookies set
  ↓
Redirect to home page
```

### 4. Session Maintenance (Middleware)
```
Every request
  ↓
middleware.ts runs
  ↓
updateSession() refreshes auth cookies
  ↓
Session persists across page navigations ✅
```

---

## Files Changed

### Created Files
1. ✅ `app/auth/callback/route.ts` - Server-side OAuth callback handler
2. ✅ `middleware.ts` - Session refresh middleware

### Updated Files
1. ✅ `lib/supabase/client.ts` - Added comments clarifying PKCE handling
2. ✅ `app/auth/callback/page.tsx` - Updated to be fallback UI only

### Existing Files (Already Correct)
- ✅ `lib/supabase/server.ts` - Server client with cookie handling
- ✅ `lib/supabase/proxy.ts` - Session update utility

---

## Testing the Fix

### Step 1: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Restart
pnpm dev
```

### Step 2: Test Discord OAuth Flow

1. **Visit:** `http://localhost:3000/auth/login`
2. **Click:** "Continue with Discord"
3. **Expected:** Redirects to Discord (no error)
4. **Authorize:** Click "Authorize" in Discord
5. **Expected:** Redirects back to app, session created ✅

### Step 3: Verify Session

After successful login:
- ✅ Check browser cookies (should see Supabase auth cookies)
- ✅ Visit protected route (`/admin`) - should work
- ✅ Check Supabase Studio → Authentication → Users (should see your Discord user)

---

## Troubleshooting

### Issue: Still getting PKCE error

**Possible causes:**

1. **Cookies not being set**
   - Check browser console for cookie errors
   - Verify SameSite cookie settings
   - Try in incognito mode (rules out extension interference)

2. **Domain mismatch**
   - Ensure using `localhost` consistently (not `127.0.0.1` for app)
   - Check cookie domain settings

3. **Middleware not running**
   - Verify `middleware.ts` exists in project root
   - Check middleware matcher config
   - Restart Next.js dev server

4. **Route Handler not being used**
   - Verify `app/auth/callback/route.ts` exists
   - Check Next.js logs for route handler execution
   - Ensure no conflicting routes

### Issue: Redirect loop

**Solution:**
- Check middleware matcher - might be matching `/auth/callback`
- Update matcher to exclude auth routes if needed

### Issue: Session not persisting

**Solution:**
- Verify middleware is running (`console.log` in middleware)
- Check cookie settings (SameSite, Secure, HttpOnly)
- Ensure `updateSession()` is being called

---

## Technical Details

### Why Route Handler Instead of Page Component?

**Client Component (page.tsx) Limitations:**
- ❌ Runs in browser - cookies may not be accessible during redirect
- ❌ PKCE code verifier stored in browser storage (can be lost)
- ❌ Race conditions during OAuth redirects

**Route Handler (route.ts) Advantages:**
- ✅ Runs on server - full access to cookies
- ✅ PKCE code verifier read from cookies reliably
- ✅ Proper cookie handling with Next.js Request/Response
- ✅ No client-side JavaScript required for callback

### Cookie Storage for PKCE

The `@supabase/ssr` package automatically:
1. **Stores** PKCE code verifier in cookies when `signInWithOAuth()` is called
2. **Reads** PKCE code verifier from cookies during `exchangeCodeForSession()`
3. **Manages** cookie options (SameSite, Secure, HttpOnly) automatically

### Middleware Importance

Middleware ensures:
- Session cookies are refreshed on every request
- Expired tokens are automatically renewed
- Auth state stays synchronized between server and client

---

## Verification Checklist

- [x] `app/auth/callback/route.ts` exists (Server Route Handler)
- [x] `middleware.ts` exists in project root
- [x] `lib/supabase/client.ts` uses `createBrowserClient` from `@supabase/ssr`
- [x] `lib/supabase/server.ts` uses `createServerClient` with cookie handling
- [x] OAuth callback uses server client (not browser client)
- [x] Middleware calls `updateSession()` on every request

---

## Additional Resources

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [PKCE Flow Explanation](https://oauth.net/2/pkce/)

---

**Last Updated:** January 2026  
**Status:** ✅ Fixed - OAuth callback now uses server-side Route Handler
