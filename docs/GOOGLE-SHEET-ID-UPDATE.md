# Google Sheet ID Update

**Date:** 2026-01-20  
**Status:** ✅ Updated

---

## Spreadsheet Information

**URL:** https://docs.google.com/spreadsheets/d/1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw/edit?gid=1135279173#gid=1135279173

**Spreadsheet ID:** `1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw`

---

## Environment Variables Updated

### ✅ Local Development (`.env.local`)
```bash
GOOGLE_SHEET_ID=1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw
```

### ✅ Production (`.env`)
```bash
GOOGLE_SHEET_ID=1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw
```

### ⚠️ Vercel Production (Manual Update Required)

**Action Required:** Update in Vercel Dashboard

1. Go to: https://vercel.com/[your-project]/settings/environment-variables
2. Find `GOOGLE_SHEET_ID`
3. Update value to: `1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw`
4. Save changes
5. Redeploy (or wait for next deployment)

**Or use Vercel CLI:**
```bash
vercel env add GOOGLE_SHEET_ID production
# Enter: 1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw
```

---

## ⚠️ CRITICAL: Share Spreadsheet with Service Account

**Before using the export feature, you MUST grant access:**

### Step 1: Get Service Account Email

Check your `.env.local` or `.env` file for:
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
```

### Step 2: Share Spreadsheet

1. **Open the spreadsheet:**
   - https://docs.google.com/spreadsheets/d/1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw/edit

2. **Click "Share"** (top right corner)

3. **Add Service Account:**
   - Email: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
   - **Permission: Editor** (required for write access)
   - Uncheck "Notify people"
   - Click "Share"

4. **Wait 10-30 seconds** for permissions to propagate

### Why Editor Access?

The export feature needs **write access** to:
- Create new sheets
- Update existing sheets
- Write Pokémon data to cells

Viewer access is not sufficient for the export functionality.

---

## Testing

After updating environment variables and sharing the spreadsheet:

### Test Export Feature

1. Go to `/admin/pokemon`
2. Click "Export to Google Sheets"
3. Enter spreadsheet ID: `1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw`
4. Enter sheet name: `Draft Board` (or your preferred name)
5. Select action: "Create new sheet"
6. Click "Export"

### Verify Access

Run test script:
```bash
npx tsx scripts/test-spreadsheet-access.ts 1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw
```

**Expected Output:**
```
✅ Success! Spreadsheet: "[Spreadsheet Name]"
✅ Sheets found: [number]
```

---

## Related Environment Variables

These should already be configured (verify if needed):

```bash
# Google Service Account (for authentication)
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sheet ID (updated)
GOOGLE_SHEET_ID=1ezZTEqhLrE4id9EdXRIAd0J8hqiGE9dh9Ar5RvcPCLw
```

---

## Summary

- ✅ Local `.env.local` updated
- ✅ Production `.env` updated  
- ⚠️ **Action Required:** Update Vercel environment variable
- ⚠️ **Action Required:** Share spreadsheet with service account (Editor access)

---

**Status:** ✅ Environment Variables Updated  
**Next Step:** Share spreadsheet and test export feature
