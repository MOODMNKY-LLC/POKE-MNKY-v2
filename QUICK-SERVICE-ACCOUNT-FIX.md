# Quick Service Account Fix

## 🔴 Current Issues

1. **Service account credentials not found** in environment variables
2. **Service accounts don't appear** in Google Sheets share dialog (this is **NORMAL**)

---

## ✅ Solution Summary

### Issue 1: Missing Credentials

**Problem**: `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` not set.

**Solution**: 
1. Get service account key from Google Cloud Console
2. Add credentials to `.env.local`

### Issue 2: Can't Find Service Account in Share Dialog

**This is NORMAL!** Service accounts don't appear in Google Sheets share dialog search.

**Solution**: **Paste the email address directly** (don't search for it).

---

## 🚀 Quick Steps

### 1. Get Service Account Email

Your service account email should be:
```
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
```

**To verify/create**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **IAM & Admin** > **Service Accounts**
3. Look for or create `poke-mnky-service`

### 2. Get Service Account Key

1. Click on the service account
2. **Keys** tab > **Add Key** > **Create new key**
3. Select **JSON**
4. Download the JSON file

### 3. Extract Credentials

From the JSON file, copy:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### 4. Add to `.env.local`

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: Keep the private key in quotes and preserve `\n` characters.

### 5. Enable APIs

1. Google Cloud Console > **APIs & Services** > **Library**
2. Enable:
   - ✅ Google Sheets API
   - ✅ Google Drive API

### 6. Share Spreadsheet

**⚠️ CRITICAL**: Service accounts don't appear in search!

1. Open spreadsheet: https://docs.google.com/spreadsheets/d/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/edit
2. Click **Share**
3. **PASTE** this email directly (don't search):
   ```
   poke-mnky-service@mood-mnky.iam.gserviceaccount.com
   ```
4. Set to **Viewer** (or Editor)
5. Uncheck "Notify people"
6. Click **Share**
7. Wait 30 seconds

### 7. Verify

```bash
# Check credentials
npx tsx scripts/verify-service-account.ts

# Test access
npx tsx scripts/test-scopes-direct.ts 1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0
```

---

## 📋 Checklist

- [ ] Service account exists in Google Cloud Console
- [ ] Service account key (JSON) downloaded
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` added to `.env.local`
- [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` added to `.env.local`
- [ ] Google Sheets API enabled
- [ ] Google Drive API enabled
- [ ] Spreadsheet shared (pasted email directly)
- [ ] Waited 30 seconds
- [ ] Verification script passes

---

## 🐛 Common Mistakes

1. **Searching for service account** → Don't search, paste email directly
2. **Removing `\n` from private key** → Keep them, they're needed
3. **Not enabling APIs** → Both Sheets and Drive APIs must be enabled
4. **Not waiting after sharing** → Wait 30-60 seconds for permissions

---

## 📝 Key Points

- ✅ Service accounts **CAN** access spreadsheets (when shared)
- ⚠️ Service accounts **DON'T** appear in share dialog search
- ✅ **Paste email directly** to share
- ✅ **Viewer** permission is sufficient
- ✅ Environment variables must be set correctly
