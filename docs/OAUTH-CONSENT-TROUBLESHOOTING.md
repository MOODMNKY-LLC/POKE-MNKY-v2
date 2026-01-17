# OAuth Consent Screen Troubleshooting Guide

**Date**: January 17, 2026  
**Issue**: "Authorization request expired or invalid" error

---

## 🔍 Error: "Authorization request expired or invalid"

This error occurs when the consent screen cannot fetch authorization details from Supabase. This can be caused by several issues on the **Supabase/server side** or **client side**.

---

## ✅ Supabase Dashboard Configuration Checklist

### 1. OAuth Server Enabled

**Check**: Supabase Dashboard → Authentication → OAuth Server

- [ ] **OAuth 2.1 Server** is **enabled**
- [ ] Feature toggle is **ON**

**If not enabled**: Enable it in the dashboard. This is required for OAuth Server functionality.

---

### 2. Authorization Path Configuration

**Check**: Supabase Dashboard → Authentication → OAuth Server → Authorization Path

- [ ] **Authorization Path** is set to: `/oauth/consent`
- [ ] **Site URL** is set to: `https://poke-mnky.moodmnky.com`

**Full Authorization URL should be**:
```
https://poke-mnky.moodmnky.com/oauth/consent
```

**If mismatch**: Update the Authorization Path to match your route exactly.

---

### 3. OAuth Client Registration

**Check**: Supabase Dashboard → Authentication → OAuth Server → Clients

- [ ] **OAuth Client is registered** (e.g., Open WebUI)
- [ ] **Client ID** is correct
- [ ] **Redirect URI** matches the client's callback URL
- [ ] **Client is active** (not disabled)

**Example Redirect URI for Open WebUI**:
```
https://aab-gpt.moodmnky.com/oauth/oidc/callback
```

---

### 4. Site URL Configuration

**Check**: Supabase Dashboard → Authentication → URL Configuration

- [ ] **Site URL** is set to: `https://poke-mnky.moodmnky.com`
- [ ] **Redirect URLs** include your consent screen URL

**Required Redirect URLs**:
```
https://poke-mnky.moodmnky.com/oauth/consent
https://poke-mnky.moodmnky.com/auth/callback
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Authorization Request Expires

**Symptom**: Error appears after user takes too long to approve/deny

**Cause**: Authorization requests expire after ~10 minutes

**Solution**: 
- This is **normal behavior** - authorization requests have a short TTL
- User must start the OAuth flow again from the client application
- **Not a bug** - this is expected security behavior

---

### Issue 2: OAuth Server Not Enabled

**Symptom**: Always getting "not found" or "invalid" errors

**Check**:
1. Go to Supabase Dashboard → Authentication → OAuth Server
2. Verify "OAuth 2.1 Server" toggle is **ON**
3. If not enabled, enable it and wait a few minutes for propagation

**Solution**: Enable OAuth Server in dashboard

---

### Issue 3: Authorization Path Mismatch

**Symptom**: Error when accessing consent screen

**Check**:
1. Supabase Dashboard → Authentication → OAuth Server → Authorization Path
2. Should be exactly: `/oauth/consent` (no trailing slash)
3. Your app route should match: `app/oauth/consent/page.tsx`

**Solution**: Update Authorization Path in Supabase Dashboard to match your route

---

### Issue 4: Site URL Mismatch

**Symptom**: Redirects not working correctly

**Check**:
1. Supabase Dashboard → Authentication → URL Configuration → Site URL
2. Should be: `https://poke-mnky.moodmnky.com`
3. Must match your production domain exactly

**Solution**: Update Site URL in Supabase Dashboard

---

### Issue 5: OAuth Client Not Registered

**Symptom**: Authorization requests fail immediately

**Check**:
1. Supabase Dashboard → Authentication → OAuth Server → Clients
2. Verify the OAuth client (e.g., Open WebUI) is registered
3. Check Redirect URI matches client's callback URL

**Solution**: Register the OAuth client in Supabase Dashboard

---

### Issue 6: User Session Issues

**Symptom**: Error when user is logged in but still gets auth errors

**Check**:
1. User must be logged in to approve/deny authorization
2. Session must be valid (not expired)
3. User must have valid Supabase auth session

**Solution**: Ensure user is logged in before accessing consent screen

---

## 🔧 Server-Side Checks

### Verify OAuth Server Endpoints

**Check if OAuth Server endpoints are accessible**:

```bash
# Authorization endpoint (should return OAuth authorize page)
curl https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=openid%20email%20profile

# Discovery endpoint (should return OAuth configuration)
curl https://chmrszrwlfeqovwxyrmt.supabase.co/.well-known/oauth-authorization-server/auth/v1
```

**Expected**: Should return OAuth configuration JSON, not 404

---

### Check Environment Variables

**Verify in Vercel Dashboard**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- [ ] Values match your Supabase project

---

## 🐛 Debugging Steps

### Step 1: Check Browser Console

Open browser DevTools → Console and look for:
- Error messages from `getAuthorizationDetails()`
- Error codes (404, 401, 400)
- Authorization ID being used

### Step 2: Check Network Tab

Open browser DevTools → Network:
- Look for requests to `/auth/v1/oauth/authorizations/{id}`
- Check response status codes
- Check response body for error details

### Step 3: Verify Authorization ID Format

Authorization IDs should look like:
```
bfixnvmrtorg6gyqhoqzofc24kahpal7
```

If the ID looks different or malformed, the client might be sending incorrect data.

### Step 4: Test with Fresh Authorization

1. Start a **new** OAuth flow from the client application
2. Don't wait - immediately approve/deny
3. If it works, the issue is expiration timing
4. If it still fails, check Supabase configuration

---

## 📋 Quick Verification Checklist

Run through this checklist when troubleshooting:

- [ ] OAuth Server enabled in Supabase Dashboard
- [ ] Authorization Path set to `/oauth/consent`
- [ ] Site URL matches production domain
- [ ] OAuth client registered with correct Redirect URI
- [ ] User is logged in with valid session
- [ ] Environment variables set correctly in Vercel
- [ ] Authorization request is fresh (not expired)
- [ ] Browser console shows no other errors

---

## 🚨 If Issue Persists

If all checks pass but error continues:

1. **Check Supabase Status**: https://status.supabase.com
2. **Check Supabase Logs**: Dashboard → Logs → Auth Logs
3. **Verify OAuth Server Beta**: OAuth Server is in beta - check for known issues
4. **Contact Supabase Support**: If configuration is correct but still failing

---

## 📚 References

- **Supabase OAuth Server Docs**: https://supabase.com/docs/guides/auth/oauth-server/getting-started
- **Troubleshooting Guide**: https://supabase.com/docs/guides/auth/troubleshooting
- **Error Codes**: https://supabase.com/docs/guides/auth/debugging/error-codes

---

## 💡 Most Common Fix

**90% of issues are caused by**:
1. OAuth Server not enabled in Supabase Dashboard
2. Authorization Path mismatch (`/oauth/consent` vs actual route)
3. Authorization request expired (user waited too long)

**Quick fix**: Enable OAuth Server, verify Authorization Path, and test with a fresh authorization request.
