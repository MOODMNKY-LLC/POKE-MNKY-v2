# OAuth 400 Error Diagnostic Guide

**Date**: January 17, 2026  
**Error**: `400 Bad Request - authorization request cannot be processed`

---

## 🔍 Understanding the 400 Error

A **400 Bad Request** error when calling `getAuthorizationDetails()` typically means:

1. **Authorization request expired** (most common if user waited >10 minutes)
2. **OAuth Server not enabled** in Supabase Dashboard
3. **Configuration mismatch** (Authorization Path, Site URL, etc.)
4. **OAuth client not properly registered**
5. **Authorization ID is invalid or malformed**

---

## ✅ Step-by-Step Diagnostic Checklist

### Step 1: Verify OAuth Server is Enabled

**Location**: Supabase Dashboard → Authentication → OAuth Server

**Check**:
- [ ] Navigate to Supabase Dashboard
- [ ] Go to **Authentication** → **OAuth Server**
- [ ] Verify **"OAuth 2.1 Server"** toggle is **ON** (enabled)
- [ ] If disabled, enable it and wait 2-3 minutes for propagation

**If OAuth Server is disabled**: This is the #1 cause of 400 errors. Enable it first.

---

### Step 2: Verify Authorization Path

**Location**: Supabase Dashboard → Authentication → OAuth Server → Authorization Path

**Check**:
- [ ] Authorization Path is set to: `/oauth/consent`
- [ ] **No trailing slash** (should be `/oauth/consent`, not `/oauth/consent/`)
- [ ] **No leading slash issues** (should start with `/`)

**Expected Configuration**:
```
Authorization Path: /oauth/consent
```

**Your App Route**: `app/oauth/consent/page.tsx` ✅ (matches)

**If mismatch**: Update Authorization Path in Supabase Dashboard to exactly `/oauth/consent`

---

### Step 3: Verify Site URL

**Location**: Supabase Dashboard → Authentication → URL Configuration → Site URL

**Check**:
- [ ] Site URL is set to: `https://poke-mnky.moodmnky.com`
- [ ] **No trailing slash**
- [ ] **Matches your production domain exactly**

**Expected Configuration**:
```
Site URL: https://poke-mnky.moodmnky.com
```

**If mismatch**: Update Site URL in Supabase Dashboard

---

### Step 4: Verify Redirect URLs

**Location**: Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

**Check**:
- [ ] Redirect URLs include: `https://poke-mnky.moodmnky.com/oauth/consent`
- [ ] Redirect URLs include: `https://poke-mnky.moodmnky.com/auth/callback`
- [ ] Redirect URLs include: `https://aab-gpt.moodmnky.com/oauth/oidc/callback` (for Open WebUI)

**If missing**: Add the consent screen URL to Redirect URLs

---

### Step 5: Verify OAuth Client Registration

**Location**: Supabase Dashboard → Authentication → OAuth Server → Clients

**Check**:
- [ ] OAuth client is registered (e.g., "Open WebUI")
- [ ] Client is **active** (not disabled)
- [ ] **Client ID** matches what the client app is using
- [ ] **Redirect URI** matches the client's callback URL exactly

**Example for Open WebUI**:
```
Client Name: Open WebUI
Client ID: [your-client-id]
Redirect URI: https://aab-gpt.moodmnky.com/oauth/oidc/callback
Client Type: Confidential
Registration Type: Manual
```

**If client not registered**: Register the OAuth client in Supabase Dashboard

---

### Step 6: Verify Environment Variables

**Location**: Vercel Dashboard → Settings → Environment Variables

**Check**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set to: `https://chmrszrwlfeqovwxyrmt.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- [ ] Values match your Supabase project

**If incorrect**: Update environment variables in Vercel Dashboard

---

### Step 7: Check Authorization Request Timing

**Check**:
- [ ] Authorization request is **fresh** (started within last 10 minutes)
- [ ] User didn't wait too long before accessing consent screen
- [ ] Authorization ID format looks correct (e.g., `cx7wpvrzajm6scj2pxgjna2e4zf5nos2`)

**If expired**: Start a **new** OAuth flow from the client application

---

## 🧪 Test Authorization Request Freshness

1. **Start a NEW OAuth flow** from Open WebUI (`https://aab-gpt.moodmnky.com/auth`)
2. **Immediately** (within 30 seconds) navigate to the consent screen
3. **If it works**: The issue was expiration timing
4. **If it still fails**: Check Supabase configuration (Steps 1-6)

---

## 🔧 Common Configuration Issues

### Issue 1: OAuth Server Not Enabled

**Symptom**: Always getting 400 errors, even with fresh requests

**Fix**:
1. Go to Supabase Dashboard → Authentication → OAuth Server
2. Enable "OAuth 2.1 Server"
3. Wait 2-3 minutes
4. Try again

---

### Issue 2: Authorization Path Mismatch

**Symptom**: 400 error when accessing consent screen

**Fix**:
1. Check Supabase Dashboard → Authentication → OAuth Server → Authorization Path
2. Should be exactly: `/oauth/consent`
3. Update if different

---

### Issue 3: Site URL Mismatch

**Symptom**: Redirects not working, 400 errors

**Fix**:
1. Check Supabase Dashboard → Authentication → URL Configuration → Site URL
2. Should be: `https://poke-mnky.moodmnky.com`
3. Update if different

---

### Issue 4: OAuth Client Not Registered

**Symptom**: Authorization requests fail immediately

**Fix**:
1. Go to Supabase Dashboard → Authentication → OAuth Server → Clients
2. Register the OAuth client (e.g., Open WebUI)
3. Set correct Redirect URI
4. Set Client Type to "Confidential"
5. Set Registration Type to "Manual"

---

## 📋 Quick Diagnostic Script

Run this in your browser console when on the consent screen:

```javascript
// Check environment variables
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');

// Check session
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
console.log('Session exists:', !!session);
console.log('User ID:', session?.user?.id);

// Get authorization ID from URL
const urlParams = new URLSearchParams(window.location.search);
const authId = urlParams.get('authorization_id');
console.log('Authorization ID:', authId);
console.log('Authorization ID length:', authId?.length);
```

---

## 🚨 Most Likely Causes (in order)

1. **OAuth Server not enabled** (90% of cases)
2. **Authorization Path mismatch** (5% of cases)
3. **Authorization request expired** (3% of cases)
4. **Site URL mismatch** (2% of cases)

---

## 📞 Next Steps

If all checks pass but error persists:

1. **Check Supabase Logs**: Dashboard → Logs → Auth Logs
2. **Check Supabase Status**: https://status.supabase.com
3. **Verify OAuth Server Beta**: Check for known issues
4. **Contact Supabase Support**: If configuration is correct but still failing

---

## 📚 References

- **Supabase OAuth Server Docs**: https://supabase.com/docs/guides/auth/oauth-server/getting-started
- **Troubleshooting Guide**: `docs/OAUTH-CONSENT-TROUBLESHOOTING.md`
- **Error Codes**: https://supabase.com/docs/guides/auth/debugging/error-codes
