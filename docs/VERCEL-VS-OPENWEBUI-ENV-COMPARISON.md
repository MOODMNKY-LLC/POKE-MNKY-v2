# Vercel vs OpenWebUI Environment Variables Comparison

**Date**: January 18, 2026  
**Purpose**: Compare OAuth environment variables between Vercel (Next.js app) and OpenWebUI

---

## 🔍 Important Distinction

**Vercel** = Next.js app (`poke-mnky.moodmnky.com`) - Has the consent screen  
**OpenWebUI** = Separate deployment (`aab-gpt.moodmnky.com`) - Needs OAuth callback handling

These are **two different applications** with **different environment variable requirements**.

---

## 📋 Vercel Environment Variables (Next.js App)

### Documented in `docs/VERCEL-ENV-VARIABLES-ADDED.md`:

```bash
# Supabase OAuth (OpenWebUI Integration)
SUPABASE_OAUTH_CLIENT_ID=8719038a-d69d-4c98-99cd-53283b3a3bb8 ✅
SUPABASE_OAUTH_CLIENT_SECRET=Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo ✅
```

**Purpose**: These are stored in Vercel but are **NOT used by the Next.js app**. They're documented for reference, but the Next.js app doesn't need them for the consent screen to work.

**Status**: ✅ **Correctly documented** - Values match Supabase OAuth client

---

## 📋 OpenWebUI Environment Variables (Required)

### What OpenWebUI Needs (from `docs/OPENWEBUI-OAUTH-DEBUG-GUIDE.md`):

```bash
# Required OIDC/OAuth Configuration
OPENID_PROVIDER_URL=https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
OAUTH_CLIENT_ID=8719038a-d69d-4c98-99cd-53283b3a3bb8
OAUTH_CLIENT_SECRET=Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo
OPENID_REDIRECT_URI=https://aab-gpt.moodmnky.com/oauth/oidc/callback
OAUTH_SCOPES=openid email profile
ENABLE_OAUTH_SIGNUP=true
```

**Purpose**: OpenWebUI uses these to:
1. Discover OIDC endpoints (`OPENID_PROVIDER_URL`)
2. Authenticate with Supabase (`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`)
3. Handle OAuth callback (`OPENID_REDIRECT_URI`)
4. Request proper scopes (`OAUTH_SCOPES`)

**Status**: ❓ **Unknown** - Need to verify if these are set in OpenWebUI deployment

---

## ✅ Comparison

| Variable | Vercel (Next.js) | OpenWebUI | Match? |
|----------|----------------|-----------|--------|
| **Client ID** | `SUPABASE_OAUTH_CLIENT_ID` = `8719038a-d69d-4c98-99cd-53283b3a3bb8` | `OAUTH_CLIENT_ID` = `8719038a-d69d-4c98-99cd-53283b3a3bb8` | ✅ **MATCH** |
| **Client Secret** | `SUPABASE_OAUTH_CLIENT_SECRET` = `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo` | `OAUTH_CLIENT_SECRET` = `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo` | ✅ **MATCH** |
| **Discovery URL** | N/A (not needed) | `OPENID_PROVIDER_URL` = `https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration` | ❓ **Need to verify** |
| **Redirect URI** | N/A (not needed) | `OPENID_REDIRECT_URI` = `https://aab-gpt.moodmnky.com/oauth/oidc/callback` | ❓ **Need to verify** |
| **Scopes** | N/A (not needed) | `OAUTH_SCOPES` = `openid email profile` | ❓ **Need to verify** |
| **Signup** | N/A (not needed) | `ENABLE_OAUTH_SIGNUP` = `true` | ❓ **Need to verify** |

---

## 🎯 Key Findings

### ✅ What Matches:
1. **Client ID**: Both use `8719038a-d69d-4c98-99cd-53283b3a3bb8` ✅
2. **Client Secret**: Both use `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo` ✅

### ❓ What Needs Verification:
1. **OpenWebUI Environment Variables**: Need to check if OpenWebUI has these set:
   - `OPENID_PROVIDER_URL`
   - `OAUTH_CLIENT_ID` (should match Vercel)
   - `OAUTH_CLIENT_SECRET` (should match Vercel)
   - `OPENID_REDIRECT_URI`
   - `OAUTH_SCOPES`
   - `ENABLE_OAUTH_SIGNUP`

---

## 🔧 How to Verify OpenWebUI Environment Variables

### Option 1: Check OpenWebUI Deployment

If OpenWebUI is deployed via:
- **Docker**: Check `docker-compose.yml` or container environment
- **Kubernetes**: Check ConfigMap or Secrets
- **Cloud Platform**: Check platform's environment variable settings
- **Manual Server**: Check `.env` file or system environment variables

### Option 2: Check OpenWebUI Logs

OpenWebUI logs should show OAuth configuration on startup:
```
OAuth/OIDC provider configured: Supabase
Discovery URL: https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/.well-known/openid-configuration
```

### Option 3: Test OAuth Flow

If OAuth fails with "[ERROR: Error during OAuth process]", it likely means:
- Environment variables are missing
- Environment variables are incorrect
- OpenWebUI wasn't restarted after setting variables

---

## 🐛 Current Issue Analysis

Based on the error "[ERROR: Error during OAuth process]":

**Most Likely Cause**: OpenWebUI is missing one or more of these environment variables:
- `OPENID_PROVIDER_URL` (most critical - needed for OIDC discovery)
- `OAUTH_CLIENT_ID` (should match: `8719038a-d69d-4c98-99cd-53283b3a3bb8`)
- `OAUTH_CLIENT_SECRET` (should match: `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo`)

**Less Likely Causes**:
- `OPENID_REDIRECT_URI` mismatch
- `OAUTH_SCOPES` missing `openid`
- OpenWebUI not restarted after setting variables

---

## ✅ Action Items

1. **Verify Vercel Variables** ✅ (Already documented correctly)
   - `SUPABASE_OAUTH_CLIENT_ID` = `8719038a-d69d-4c98-99cd-53283b3a3bb8`
   - `SUPABASE_OAUTH_CLIENT_SECRET` = `Ow6N36Gnm1ZuOFR7kOs14nVTinLLESUwqavudLmHFEo`

2. **Verify OpenWebUI Variables** ❓ (Need to check)
   - Check if `OPENID_PROVIDER_URL` is set
   - Check if `OAUTH_CLIENT_ID` matches Vercel value
   - Check if `OAUTH_CLIENT_SECRET` matches Vercel value
   - Check if `OPENID_REDIRECT_URI` is set correctly
   - Check if `OAUTH_SCOPES` includes `openid email profile`
   - Check if `ENABLE_OAUTH_SIGNUP` is set to `true`

3. **If Missing**: Set OpenWebUI environment variables and restart OpenWebUI

---

## 📝 Summary

**Vercel (Next.js App)**:
- ✅ Has correct OAuth client ID and secret documented
- ✅ Values match Supabase OAuth client
- ⚠️ These variables aren't actually used by the Next.js app (consent screen works without them)

**OpenWebUI**:
- ❓ Unknown if environment variables are set
- ❓ Need to verify deployment configuration
- ❓ Most likely missing `OPENID_PROVIDER_URL` and other OAuth config

**Next Step**: Check OpenWebUI deployment to verify environment variables are set correctly.
