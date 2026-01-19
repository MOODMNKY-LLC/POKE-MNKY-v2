# OAuth Consent Flow - Complete Explanation

**Date**: January 18, 2026  
**Issue**: Fast redirect without showing consent screen, followed by OpenWebUI error

---

## 🔄 Complete OAuth Flow

### Step-by-Step Flow:

```
1. User clicks "Sign in with Discord" on OpenWebUI
   ↓
2. OpenWebUI redirects to Supabase OAuth authorize endpoint:
   https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize?
     client_id=8719038a-d69d-4c98-99cd-53283b3a3bb8
     redirect_uri=https://aab-gpt.moodmnky.com/oauth/oidc/callback
     response_type=code
     scope=openid email profile
   ↓
3. Supabase checks if user is logged in:
   - If NOT logged in → Redirects to Discord OAuth login
   - If logged in → Continues to step 4
   ↓
4. Supabase checks if authorization was already approved:
   - If already approved → Supabase returns redirect_url immediately
   - If NOT approved → Redirects to consent screen
   ↓
5. Consent Screen (`/oauth/consent?authorization_id=XXX`):
   - Checks if authorization already processed (has redirect_url)
   - If redirect_url exists → IMMEDIATELY redirects (this is why it's fast!)
   - If no redirect_url → Shows consent UI with Approve/Deny buttons
   ↓
6. User clicks "Approve" (if shown):
   - Calls supabase.auth.oauth.approveAuthorization()
   - Supabase returns redirect_url
   - Browser redirects to redirect_url
   ↓
7. Redirect URL: https://aab-gpt.moodmnky.com/oauth/oidc/callback?code=XXX&state=YYY
   ↓
8. OpenWebUI should:
   - Receive the code
   - Exchange code for tokens (access_token, id_token)
   - Create user session
   - Redirect to dashboard
   ↓
9. ❌ CURRENT ISSUE: OpenWebUI fails at step 8
   - Shows error: "[ERROR: Error during OAuth process]"
   - Redirects to /auth with email/password error
```

---

## ⚡ Why It's Happening So Fast

### The Fast Redirect Explained

Looking at the consent screen code (`app/oauth/consent/page.tsx` lines 241-251):

```typescript
// Check if authorization already processed (redirect_url present)
if (data.redirect_url) {
  console.log("Authorization already processed, redirecting to:", data.redirect_url)
  // Authorization was already approved/processed - redirect immediately
  if (typeof window !== 'undefined') {
    window.location.href = data.redirect_url
  }
  setLoading(false)
  fetchingRef.current = false
  return true // Authorization was processed
}
```

**What's happening**:
1. You previously approved authorization for OpenWebUI
2. Supabase remembers this approval (for a period of time)
3. When you try to login again, Supabase checks: "Has this user already approved this client?"
4. If YES → Supabase immediately returns `redirect_url` in the authorization details
5. The consent screen sees `redirect_url` exists → **Immediately redirects** without showing UI
6. This is why you don't see the consent button - it's already approved!

**This is actually CORRECT behavior** - Supabase is remembering your previous consent to avoid asking you every time.

---

## 🐛 The Real Problem: OpenWebUI Error

The issue is **NOT** with the consent screen - it's working correctly. The problem is at **Step 8**:

### What Should Happen:
```
OpenWebUI receives: /oauth/oidc/callback?code=XXX&state=YYY
↓
OpenWebUI exchanges code for tokens:
  POST https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/token
  {
    grant_type: "authorization_code",
    code: "XXX",
    redirect_uri: "https://aab-gpt.moodmnky.com/oauth/oidc/callback",
    client_id: "8719038a-d69d-4c98-99cd-53283b3a3bb8",
    client_secret: "***REMOVED***"
  }
↓
Supabase returns tokens:
  {
    access_token: "...",
    id_token: "...",
    token_type: "Bearer",
    expires_in: 3600
  }
↓
OpenWebUI creates user session and redirects to dashboard ✅
```

### What's Actually Happening:
```
OpenWebUI receives: /oauth/oidc/callback?code=XXX&state=YYY
↓
OpenWebUI tries to exchange code for tokens
↓
❌ FAILS (likely because OAuth environment variables not configured)
↓
OpenWebUI shows error: "[ERROR: Error during OAuth process]"
↓
OpenWebUI redirects to /auth (login page)
↓
Login page shows: "The email or password provided is incorrect"
```

---

## 🔍 Root Cause Analysis

The error "[ERROR: Error during OAuth process]" indicates:

1. **OpenWebUI is receiving the callback** ✅ (this part works)
2. **OpenWebUI is trying to exchange the code** ✅ (this part works)
3. **The code exchange is FAILING** ❌ (this is the problem)

### Why Code Exchange Fails:

Most likely causes:
1. **Missing Environment Variables**: OpenWebUI doesn't have OAuth config set
2. **Incorrect Client Secret**: Client secret doesn't match Supabase
3. **Discovery Endpoint Not Accessible**: OpenWebUI can't fetch OIDC config
4. **Redirect URI Mismatch**: OpenWebUI's redirect URI doesn't match Supabase

---

## ✅ Solution: Configure OpenWebUI

OpenWebUI needs these environment variables set:

```bash
# Required OIDC/OAuth Configuration
OPENID_PROVIDER_URL=https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
OAUTH_CLIENT_ID=8719038a-d69d-4c98-99cd-53283b3a3bb8
OAUTH_CLIENT_SECRET=***REMOVED***
OPENID_REDIRECT_URI=https://aab-gpt.moodmnky.com/oauth/oidc/callback
OAUTH_SCOPES=openid email profile
ENABLE_OAUTH_SIGNUP=true
```

**After setting these**:
1. Restart OpenWebUI
2. Try OAuth login again
3. The flow should complete successfully

---

## 🔄 Flow Summary

### Normal Flow (First Time):
```
OpenWebUI → Supabase → Discord Login → Consent Screen → Approve → 
OpenWebUI Callback → Code Exchange → Success ✅
```

### Fast Flow (Already Approved):
```
OpenWebUI → Supabase → (Already Approved) → Consent Screen (auto-redirect) → 
OpenWebUI Callback → Code Exchange → Success ✅
```

### Current Broken Flow:
```
OpenWebUI → Supabase → (Already Approved) → Consent Screen (auto-redirect) → 
OpenWebUI Callback → Code Exchange ❌ FAILS → Error Page
```

---

## 🧪 Debugging Steps

### 1. Check Browser Console

When you see the fast redirect, open browser console and look for:
```
[OAuth Consent] Authorization already processed, redirecting to: https://aab-gpt.moodmnky.com/oauth/oidc/callback?code=...
[OAuth Consent] Redirect URL breakdown: { ... }
```

This confirms the consent screen is working correctly.

### 2. Check OpenWebUI Logs

After the redirect, check OpenWebUI server logs for:
- OAuth callback received
- Code exchange attempt
- Error messages (invalid_client, invalid_grant, etc.)

### 3. Test Discovery Endpoint

Verify OpenWebUI can access Supabase discovery endpoint:
```bash
curl https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
```

Should return JSON with OIDC configuration.

### 4. Verify Environment Variables

Check if OpenWebUI has the required OAuth environment variables set:
- `OPENID_PROVIDER_URL`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `OPENID_REDIRECT_URI`
- `OAUTH_SCOPES`

---

## 📝 Key Takeaways

1. **Fast redirect is NORMAL** - Supabase remembers your previous consent
2. **Consent screen is working correctly** - It's detecting already-approved authorizations
3. **The problem is OpenWebUI** - It's not configured to handle OAuth callbacks
4. **Solution**: Set OpenWebUI environment variables and restart

---

## 🔗 Related Documentation

- `docs/OPENWEBUI-OAUTH-DEBUG-GUIDE.md` - Complete debugging guide
- `docs/OPEN-WEBUI-OAUTH-CONFIGURATION.md` - Configuration guide
- `docs/OAUTH-CONSENT-SCREEN-IMPLEMENTATION.md` - Consent screen details
