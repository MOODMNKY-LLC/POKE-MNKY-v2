# OpenWebUI OAuth Debug Guide

**Issue**: OpenWebUI showing "The email or password provided is incorrect" after OAuth approval  
**Error URL**: `https://aab-gpt.moodmnky.com/auth?error=The%20email%20or%20password%20provided%20is%20incorrect...`

---

## 🔍 Problem Analysis

The OAuth flow completes successfully:
1. ✅ User clicks "Sign in with Discord" in OpenWebUI
2. ✅ Redirects to Supabase OAuth authorize endpoint
3. ✅ Supabase redirects to consent screen (`/oauth/consent`)
4. ✅ User approves authorization
5. ✅ Supabase redirects to OpenWebUI callback: `https://aab-gpt.moodmnky.com/oauth/oidc/callback?code=XXX&state=YYY`
6. ❌ **OpenWebUI fails to process callback** → redirects to `/auth` with email/password error

---

## 🎯 Root Cause

OpenWebUI is **not properly configured** to handle OIDC/OAuth callbacks. When the code exchange fails, it falls back to email/password authentication, which shows the error.

---

## ✅ Required OpenWebUI Environment Variables

Based on OpenWebUI documentation and Supabase OIDC requirements, these environment variables **must** be set in OpenWebUI:

```bash
# Required OIDC/OAuth Configuration
OPENID_PROVIDER_URL=https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
OAUTH_CLIENT_ID=8719038a-d69d-4c98-99cd-53283b3a3bb8
OAUTH_CLIENT_SECRET=Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo
OPENID_REDIRECT_URI=https://aab-gpt.moodmnky.com/oauth/oidc/callback
OAUTH_SCOPES=openid email profile
ENABLE_OAUTH_SIGNUP=true

# Optional but Recommended
OAUTH_PROVIDER_NAME=Discord
WEBUI_URL=https://aab-gpt.moodmnky.com
```

**Critical Notes**:
- `OPENID_PROVIDER_URL` must point to Supabase's discovery endpoint
- `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` must match Supabase OAuth client
- `OPENID_REDIRECT_URI` must **exactly** match what's registered in Supabase
- `OAUTH_SCOPES` must include `openid` (required for OIDC)

---

## 🔧 Verification Steps

### Step 1: Verify Supabase OAuth Client

1. **Go to**: Supabase Dashboard → Authentication → OAuth Server → Clients
2. **Find**: Client with ID `8719038a-d69d-4c98-99cd-53283b3a3bb8`
3. **Verify**:
   - ✅ Client is **active** (not disabled)
   - ✅ Redirect URI: `https://aab-gpt.moodmnky.com/oauth/oidc/callback` (exact match)
   - ✅ Client Type: `Confidential`
   - ✅ Client Secret matches: `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo`

### Step 2: Verify Supabase Discovery Endpoint

**Test URL**: `https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration`

**Expected Response** (should return JSON):
```json
{
  "issuer": "https://chmrszrwlfeqovwxyrmt.supabase.co",
  "authorization_endpoint": "https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize",
  "token_endpoint": "https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/token",
  "jwks_uri": "https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/jwks.json",
  ...
}
```

**If 404**: OAuth Server not enabled in Supabase Dashboard

### Step 3: Check OpenWebUI Logs

After setting environment variables and restarting OpenWebUI, check logs for:

1. **OAuth configuration loaded**:
   ```
   OAuth/OIDC provider configured: Supabase
   Discovery URL: https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
   ```

2. **Callback received**:
   ```
   OAuth callback received: /oauth/oidc/callback?code=...
   ```

3. **Code exchange**:
   ```
   Exchanging authorization code for tokens...
   Token exchange successful
   ```

4. **Errors** (if any):
   ```
   OAuth error: invalid_client
   OAuth error: invalid_grant
   OAuth error: redirect_uri_mismatch
   ```

### Step 4: Test OAuth Flow

1. **Clear browser cookies** for `aab-gpt.moodmnky.com`
2. **Visit**: `https://aab-gpt.moodmnky.com/auth`
3. **Click**: "Sign in with Discord" or OAuth button
4. **Check browser address bar** - should redirect to:
   ```
   https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize?
     client_id=8719038a-d69d-4c98-99cd-53283b3a3bb8
     redirect_uri=https://aab-gpt.moodmnky.com/oauth/oidc/callback
     response_type=code
     scope=openid+email+profile
   ```
5. **Should redirect to consent screen**: `https://poke-mnky.moodmnky.com/oauth/consent?authorization_id=...`
6. **Approve authorization**
7. **Should redirect back to**: `https://aab-gpt.moodmnky.com/oauth/oidc/callback?code=XXX&state=YYY`
8. **OpenWebUI should complete login** (not redirect to `/auth` with error)

---

## 🐛 Common Issues & Fixes

### Issue 1: "The email or password provided is incorrect"

**Cause**: OpenWebUI OAuth configuration missing or incorrect

**Fix**:
1. Verify all environment variables are set in OpenWebUI
2. Restart OpenWebUI after setting environment variables
3. Check OpenWebUI logs for OAuth errors
4. Verify `OPENID_PROVIDER_URL` is accessible (not 404)

### Issue 2: Redirect URI Mismatch

**Error**: `redirect_uri_mismatch` in OpenWebUI logs

**Fix**:
1. Verify Redirect URI in Supabase: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
2. Verify `OPENID_REDIRECT_URI` in OpenWebUI: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
3. Must match **exactly** (no trailing slash, correct protocol, correct domain)

### Issue 3: Invalid Client

**Error**: `invalid_client` or `unauthorized_client`

**Fix**:
1. Verify `OAUTH_CLIENT_ID` matches Supabase: `8719038a-d69d-4c98-99cd-53283b3a3bb8`
2. Verify `OAUTH_CLIENT_SECRET` matches Supabase: `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo`
3. Verify client is **active** in Supabase Dashboard
4. Verify client type is **Confidential** (requires secret)

### Issue 4: Discovery Endpoint 404

**Error**: `404 Not Found` when accessing discovery URL

**Fix**:
1. Verify OAuth Server is enabled in Supabase Dashboard
2. Check Supabase project URL is correct: `chmrszrwlfeqovwxyrmt.supabase.co`
3. Test discovery URL directly in browser

### Issue 5: Code Exchange Fails

**Error**: Code exchange fails silently, redirects to `/auth`

**Fix**:
1. Check OpenWebUI logs for token exchange errors
2. Verify `OAUTH_CLIENT_SECRET` is set correctly
3. Verify code hasn't expired (codes expire quickly)
4. Check if PKCE is required (Supabase OAuth Server supports PKCE)

---

## 📊 Diagnostic Checklist

### Supabase Configuration
- [ ] OAuth Server enabled
- [ ] Authorization Path: `/oauth/consent`
- [ ] Site URL: `https://poke-mnky.moodmnky.com`
- [ ] OAuth Client registered: `8719038a-d69d-4c98-99cd-53283b3a3bb8`
- [ ] Client is **active** (not disabled)
- [ ] Redirect URI: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
- [ ] Client Type: `Confidential`
- [ ] Client Secret matches

### OpenWebUI Configuration
- [ ] `OPENID_PROVIDER_URL` set correctly
- [ ] `OAUTH_CLIENT_ID` set correctly
- [ ] `OAUTH_CLIENT_SECRET` set correctly
- [ ] `OPENID_REDIRECT_URI` set correctly
- [ ] `OAUTH_SCOPES` includes `openid email profile`
- [ ] `ENABLE_OAUTH_SIGNUP=true` (if allowing new users)
- [ ] OpenWebUI restarted after configuration changes

### Network & Access
- [ ] Discovery URL accessible: `https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration`
- [ ] Authorization URL accessible: `https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize`
- [ ] Token URL accessible: `https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/token`
- [ ] No firewall blocking OpenWebUI → Supabase communication

---

## 🔍 Debugging Tools

### Check Redirect URL Format

The consent screen now logs the redirect URL. Check browser console for:
```
[OAuth Consent] Redirecting to: https://aab-gpt.moodmnky.com/oauth/oidc/callback?code=...
[OAuth Consent] Redirect URL breakdown: { ... }
```

**Verify**:
- ✅ URL has `code` parameter
- ✅ URL has `state` parameter (if state was sent)
- ✅ Domain matches: `aab-gpt.moodmnky.com`
- ✅ Path matches: `/oauth/oidc/callback`

### Test Discovery Endpoint

```bash
curl https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
```

**Expected**: JSON response with OIDC configuration

### Test Token Exchange (Manual)

If you have the authorization code, you can test token exchange:

```bash
curl -X POST https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization-code>" \
  -d "redirect_uri=https://aab-gpt.moodmnky.com/oauth/oidc/callback" \
  -d "client_id=8719038a-d69d-4c98-99cd-53283b3a3bb8" \
  -d "client_secret=Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo"
```

**Expected**: JSON response with `access_token`, `id_token`, `token_type`, `expires_in`

---

## 🚀 Quick Fix

**Most Likely Issue**: OpenWebUI environment variables not set or incorrect

**Quick Fix**:
1. SSH to OpenWebUI server (or access Docker container)
2. Set environment variables (see "Required OpenWebUI Environment Variables" above)
3. Restart OpenWebUI
4. Test OAuth flow again

**If using Docker**:
```bash
docker exec -it open-webui-container sh
# Edit environment file or set env vars
# Restart container
docker restart open-webui-container
```

**If using Docker Compose**:
```yaml
environment:
  OPENID_PROVIDER_URL: https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
  OAUTH_CLIENT_ID: 8719038a-d69d-4c98-99cd-53283b3a3bb8
  OAUTH_CLIENT_SECRET: Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo
  OPENID_REDIRECT_URI: https://aab-gpt.moodmnky.com/oauth/oidc/callback
  OAUTH_SCOPES: openid email profile
  ENABLE_OAUTH_SIGNUP: "true"
```

Then restart:
```bash
docker-compose restart open-webui
```

---

## 📝 Next Steps

1. **Verify OpenWebUI Configuration**: Check if environment variables are set
2. **Check OpenWebUI Logs**: Look for OAuth-related errors
3. **Test Discovery Endpoint**: Verify it's accessible
4. **Test OAuth Flow**: Try the complete flow and check browser console for redirect URL
5. **Review Logs**: Check both Supabase logs and OpenWebUI logs for errors

---

## 🔗 Related Documentation

- `docs/OPEN-WEBUI-OAUTH-CONFIGURATION.md` - OAuth configuration guide
- `docs/OAUTH-CONSENT-SCREEN-IMPLEMENTATION.md` - Consent screen implementation
- `docs/OAUTH-CONSENT-TROUBLESHOOTING.md` - Consent screen troubleshooting
- `docs/VERCEL-ENV-VARIABLES-ADDED.md` - Environment variables reference
