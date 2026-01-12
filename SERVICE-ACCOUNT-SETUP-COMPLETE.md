# Service Account Setup - Complete Guide

## 🔍 Current Status

**Issue**: Service account credentials not found in environment variables.

**Also**: Service accounts don't appear in Google Sheets share dialog (this is **NORMAL**).

---

## ✅ Step 1: Verify Service Account Exists

### Option A: Check Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `mood-mnky`
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Look for: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

### Option B: Create Service Account (if missing)

If the service account doesn't exist:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Click **Create Service Account**
4. Fill in:
   - **Name**: `poke-mnky-service`
   - **ID**: `poke-mnky-service` (auto-generated)
   - **Description**: "Service account for Google Sheets access"
5. Click **Create and Continue**
6. Skip role assignment (click **Continue**)
7. Click **Done**

---

## ✅ Step 2: Create Service Account Key

1. In **Service Accounts** list, click on `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create** (JSON file downloads)

---

## ✅ Step 3: Extract Credentials from JSON

Open the downloaded JSON file. It should look like:

```json
{
  "type": "service_account",
  "project_id": "mood-mnky",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "poke-mnky-service@mood-mnky.iam.gserviceaccount.com",
  ...
}
```

**Extract these values**:
- `client_email` → This is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → This is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

---

## ✅ Step 4: Add to Environment Variables

Add these to your `.env.local` file:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- Keep the private key in quotes
- Keep the `\n` characters (they represent newlines)
- Don't remove the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers

---

## ✅ Step 5: Enable Required APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Library**
3. Search for and enable:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**

---

## ✅ Step 6: Share Spreadsheet with Service Account

**⚠️ IMPORTANT**: Service accounts **DO NOT** appear in Google Sheets share dialog search!

### How to Share:

1. **Open your Google Sheet**:
   - https://docs.google.com/spreadsheets/d/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/edit

2. **Click "Share"** (top right)

3. **In the "Add people and groups" field**:
   - **DO NOT** try to search (service account won't appear)
   - **INSTEAD**, **paste the full email address directly**:
     ```
     poke-mnky-service@mood-mnky.iam.gserviceaccount.com
     ```

4. **Set permission**:
   - **Viewer** (recommended) - Sufficient for read-only operations
   - **Editor** (also works) - More than needed, but harmless

5. **Uncheck "Notify people"** (optional)

6. **Click "Share"**

7. **Wait 10-30 seconds** for permissions to propagate

---

## ✅ Step 7: Verify Setup

Run the verification script:

```bash
npx tsx scripts/verify-service-account.ts
```

This will check:
- ✅ Environment variables are set
- ✅ Email format is correct
- ✅ Private key format is valid
- ✅ Authentication works
- ✅ APIs are enabled

---

## ✅ Step 8: Test Access

After sharing the spreadsheet, test access:

```bash
npx tsx scripts/test-scopes-direct.ts 1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0
```

**Expected Output**:
```
✅ Success! Spreadsheet: "[Spreadsheet Name]"
✅ Sheets found: [number]
```

---

## 🐛 Troubleshooting

### Issue: "Service account credentials not found"

**Solution**: 
1. Check `.env.local` file exists
2. Verify `GOOGLE_SERVICE_ACCOUNT_EMAIL` is set
3. Verify `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is set
4. Check for typos in variable names
5. Restart your dev server after adding variables

### Issue: "Service account doesn't appear in share dialog"

**This is NORMAL!** Service accounts don't appear in Google's share dialog search.

**Solution**: Paste the email address directly (don't search for it).

### Issue: "403 The caller does not have permission"

**Causes**:
1. Spreadsheet not shared with service account
2. Wrong email address
3. Permissions haven't propagated yet (wait 30-60 seconds)

**Solution**:
1. Verify you pasted the full email address
2. Check permission is set to at least Viewer
3. Wait 30-60 seconds after sharing
4. Try accessing again

### Issue: "API has not been used"

**Cause**: Google Sheets API or Drive API not enabled.

**Solution**:
1. Go to Google Cloud Console
2. Enable Google Sheets API
3. Enable Google Drive API
4. Wait a few minutes for APIs to activate

---

## 📋 Checklist

- [ ] Service account exists in Google Cloud Console
- [ ] Service account key (JSON) downloaded
- [ ] Environment variables added to `.env.local`
- [ ] Google Sheets API enabled
- [ ] Google Drive API enabled
- [ ] Spreadsheet shared with service account (pasted email directly)
- [ ] Waited 30 seconds after sharing
- [ ] Verification script passes
- [ ] Test access script works

---

## 📝 Summary

**Key Points**:
1. ✅ Service accounts **CAN** access spreadsheets (when shared)
2. ⚠️ Service accounts **DON'T** appear in share dialog search
3. ✅ **Paste the email directly** to share with service account
4. ✅ **Viewer** permission is sufficient (Editor also works)
5. ✅ Environment variables must be set correctly
6. ✅ APIs must be enabled in Google Cloud Console

**Your Service Account Email** (if it exists):
```
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
```

**Next Steps**:
1. Verify service account exists (or create it)
2. Download service account key (JSON)
3. Add credentials to `.env.local`
4. Enable APIs in Google Cloud Console
5. Share spreadsheet by pasting email directly
6. Test with verification script
