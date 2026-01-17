# Open WebUI OAuth Configuration Guide

**Date**: January 17, 2026  
**Issue**: `oauth_client_not_found` error (400 Bad Request)

---

## 🔍 Problem

Open WebUI is sending OAuth requests with placeholder values:
```
client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI
```

This causes Supabase to return `oauth_client_not_found` because `YOUR_CLIENT_ID` is not a valid client ID.

---

## ✅ Solution: Configure Open WebUI with Real OAuth Client ID

### Step 1: Get OAuth Client ID from Supabase

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: `chmrszrwlfeqovwxyrmt`
3. **Navigate to**: Authentication → OAuth Server → Clients
4. **Find your Open WebUI client** (or create one if it doesn't exist)
5. **Copy the Client ID** (it will look like: `abc123def456...`)

**Example Client ID format**:
```
abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

### Step 2: Create OAuth Client (if not exists)

If you don't have an OAuth client for Open WebUI:

1. **Go to**: Supabase Dashboard → Authentication → OAuth Server → Clients
2. **Click**: "Create Client" or "Add Client"
3. **Fill in**:
   - **Name**: `Open WebUI` (or any descriptive name)
   - **Client Type**: `Confidential` ✅
   - **Registration Type**: `Manual` ✅
   - **Redirect URI**: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
4. **Save** and copy the **Client ID**

---

### Step 3: Configure Open WebUI

You need to configure Open WebUI with the OAuth client ID. The configuration location depends on how Open WebUI is set up:

#### Option A: Environment Variables (Recommended)

Set these environment variables in your Open WebUI deployment:

```bash
# OAuth/OIDC Configuration
OAUTH_CLIENT_ID=your-actual-client-id-from-supabase
OAUTH_CLIENT_SECRET=your-client-secret-if-using-confidential
OAUTH_DISCOVERY_URL=https://chmrszrwlfeqovwxyrmt.supabase.co/.well-known/openid-configuration
OAUTH_REDIRECT_URI=https://aab-gpt.moodmnky.com/oauth/oidc/callback
OAUTH_AUTHORIZATION_URL=https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize
OAUTH_TOKEN_URL=https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/token
```

**Replace**:
- `your-actual-client-id-from-supabase` with the Client ID from Step 1
- `your-client-secret-if-using-confidential` with the Client Secret (if using Confidential client type)

#### Option B: Configuration File

If Open WebUI uses a config file, update it with:

```yaml
oauth:
  client_id: "your-actual-client-id-from-supabase"
  client_secret: "your-client-secret"
  discovery_url: "https://chmrszrwlfeqovwxyrmt.supabase.co/.well-known/openid-configuration"
  redirect_uri: "https://aab-gpt.moodmnky.com/oauth/oidc/callback"
  authorization_url: "https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize"
  token_url: "https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/token"
```

#### Option C: UI Configuration

If Open WebUI has a UI for OAuth configuration:

1. **Go to**: Open WebUI Settings → Authentication → OAuth/OIDC
2. **Enter**:
   - **Client ID**: `[your-actual-client-id-from-supabase]`
   - **Client Secret**: `[your-client-secret]` (if using Confidential)
   - **Discovery URL**: `https://chmrszrwlfeqovwxyrmt.supabase.co/.well-known/openid-configuration`
   - **Redirect URI**: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
3. **Save** configuration

---

### Step 4: Verify Configuration

After updating Open WebUI configuration:

1. **Restart Open WebUI** (if using environment variables or config file)
2. **Try signing in** with Discord OAuth
3. **Check the authorization URL** - it should now have:
   ```
   client_id=abc123def456... (your actual client ID)
   redirect_uri=https://aab-gpt.moodmnky.com/oauth/oidc/callback
   ```
   Instead of:
   ```
   client_id=YOUR_CLIENT_ID
   redirect_uri=YOUR_REDIRECT_URI
   ```

---

## 🔧 Complete OAuth Configuration

### Supabase Side (Already Configured ✅)

- ✅ OAuth Server enabled
- ✅ Authorization Path: `/oauth/consent`
- ✅ Site URL: `https://poke-mnky.moodmnky.com`
- ✅ OAuth Client registered
- ✅ Redirect URI: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`

### Open WebUI Side (Needs Configuration ⚠️)

- ⚠️ **Client ID**: Must be set to actual Supabase Client ID
- ⚠️ **Client Secret**: Must be set if using Confidential client type
- ⚠️ **Redirect URI**: Must match Supabase configuration
- ⚠️ **Discovery URL**: Should point to Supabase OIDC discovery endpoint

---

## 📋 Configuration Checklist

### Supabase Dashboard
- [ ] OAuth Server enabled
- [ ] OAuth Client created for Open WebUI
- [ ] Client ID copied
- [ ] Client Secret copied (if Confidential)
- [ ] Redirect URI set to: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`

### Open WebUI
- [ ] Client ID configured (not `YOUR_CLIENT_ID`)
- [ ] Client Secret configured (if Confidential)
- [ ] Redirect URI matches Supabase: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
- [ ] Discovery URL set: `https://chmrszrwlfeqovwxyrmt.supabase.co/.well-known/openid-configuration`
- [ ] Open WebUI restarted after configuration changes

---

## 🧪 Testing

### Test OAuth Flow

1. **Go to**: `https://aab-gpt.moodmnky.com/auth`
2. **Click**: "Sign in with Discord" (or OAuth button)
3. **Check browser address bar** - should redirect to:
   ```
   https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize?
     client_id=abc123def456... (actual client ID)
     redirect_uri=https://aab-gpt.moodmnky.com/oauth/oidc/callback
     response_type=code
     scope=openid+email+profile
   ```
4. **Should redirect to consent screen**: `https://poke-mnky.moodmnky.com/oauth/consent?authorization_id=...`
5. **Approve authorization**
6. **Should redirect back to Open WebUI** and complete login

---

## 🚨 Common Issues

### Issue 1: Still Getting `oauth_client_not_found`

**Cause**: Open WebUI still using placeholder values

**Fix**:
1. Verify environment variables are set correctly
2. Restart Open WebUI after setting environment variables
3. Check Open WebUI logs for configuration errors
4. Verify Client ID matches exactly (no extra spaces, correct case)

---

### Issue 2: Redirect URI Mismatch

**Error**: `redirect_uri_mismatch`

**Fix**:
1. Verify Redirect URI in Supabase matches exactly: `https://aab-gpt.moodmnky.com/oauth/oidc/callback`
2. Verify Redirect URI in Open WebUI matches exactly
3. No trailing slashes, correct protocol (https), correct domain

---

### Issue 3: Client Secret Required

**Error**: `invalid_client` or `unauthorized_client`

**Fix**:
1. If using Confidential client type, Client Secret is required
2. Set `OAUTH_CLIENT_SECRET` environment variable in Open WebUI
3. Verify Client Secret matches Supabase Dashboard

---

## 📚 References

- **Supabase OAuth Server Docs**: https://supabase.com/docs/guides/auth/oauth-server/getting-started
- **Open WebUI OAuth Configuration**: Check Open WebUI documentation for OAuth/OIDC setup
- **OAuth Consent Screen**: `docs/OAUTH-CONSENT-SCREEN-CHECKPOINT.md`

---

## ✅ Quick Fix Summary

**The Issue**: Open WebUI is using `YOUR_CLIENT_ID` instead of actual Client ID

**The Fix**: 
1. Get Client ID from Supabase Dashboard → Authentication → OAuth Server → Clients
2. Configure Open WebUI with the actual Client ID (environment variable, config file, or UI)
3. Restart Open WebUI
4. Test OAuth flow

**Expected Result**: OAuth flow works, redirects to consent screen, completes authentication
