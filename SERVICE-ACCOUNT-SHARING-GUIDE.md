# Service Account Sharing Guide

## ⚠️ Important: Service Accounts Don't Appear in Share Dialog

**Service accounts are NOT regular Google accounts**, so they won't show up when you search in the Google Sheets "Share" dialog. However, you **CAN** share spreadsheets with service accounts by **pasting the email address directly**.

---

## ✅ How to Share a Spreadsheet with a Service Account

### Step-by-Step Instructions

1. **Open your Google Sheet**
   - Navigate to: https://docs.google.com/spreadsheets/d/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/edit

2. **Click the "Share" button** (top right corner)

3. **In the "Add people and groups" field**:
   - **DO NOT** try to search for the service account (it won't appear)
   - **INSTEAD**, **paste the full email address directly**:
     \`\`\`
     poke-mnky-service@mood-mnky.iam.gserviceaccount.com
     \`\`\`

4. **Set the permission level**:
   - **Viewer** (recommended) - Sufficient for read-only operations
   - **Editor** (also works) - More than needed, but harmless

5. **Uncheck "Notify people"** (optional - service accounts don't need email notifications)

6. **Click "Share"**

7. **Wait 10-30 seconds** for permissions to propagate

---

## 🔍 Verify Service Account Setup

Run the verification script to check your service account configuration:

\`\`\`bash
npx tsx scripts/verify-service-account.ts
\`\`\`

This will check:
- ✅ Environment variables are set
- ✅ Email format is correct
- ✅ Private key format is valid
- ✅ Authentication works
- ✅ APIs are enabled

---

## 📋 Your Service Account Details

**Service Account Email**:
\`\`\`
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
\`\`\`

**Required Permissions**:
- **Viewer** (recommended) - Can read spreadsheet data
- **Editor** (also works) - Can read and modify (more than needed)

**Why Viewer is Recommended**:
- We only use read-only API scopes
- More secure (can't accidentally modify data)
- Sufficient for all operations

---

## 🐛 Troubleshooting

### Issue: "The caller does not have permission" (403 Error)

**Cause**: Spreadsheet is not shared with the service account.

**Solution**:
1. Verify you pasted the **full email address** (not searched for it)
2. Check the email is correct: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
3. Ensure permission is set to at least **Viewer**
4. Wait 30-60 seconds after sharing for permissions to propagate
5. Try accessing again

### Issue: Service Account Doesn't Appear in Search

**This is NORMAL!** Service accounts don't appear in Google's share dialog search.

**Solution**: Paste the email address directly (don't search for it).

### Issue: "API has not been used" Error

**Cause**: Google Sheets API or Drive API not enabled in Google Cloud Console.

**Solution**:
1. Go to Google Cloud Console
2. Select your project: `mood-mnky`
3. Enable APIs:
   - Google Sheets API
   - Google Drive API
4. Wait a few minutes for APIs to activate

---

## ✅ Verification Checklist

After sharing, verify everything works:

- [ ] Service account email is correct
- [ ] Spreadsheet is shared with service account
- [ ] Permission is set to Viewer or Editor
- [ ] Waited 30 seconds after sharing
- [ ] Run verification script: `npx tsx scripts/verify-service-account.ts`
- [ ] Test access: `npx tsx scripts/test-scopes-direct.ts`

---

## 📝 Summary

**Key Points**:
1. ✅ Service accounts **CAN** access spreadsheets (when shared)
2. ⚠️ Service accounts **DON'T** appear in share dialog search
3. ✅ **Paste the email directly** to share with service account
4. ✅ **Viewer** permission is sufficient (Editor also works)
5. ✅ Wait 30 seconds after sharing for permissions to propagate

**Your Service Account Email**:
\`\`\`
poke-mnky-service@mood-mnky.iam.gserviceaccount.com
\`\`\`

**Action Required**: Share your spreadsheet with this email by pasting it directly into the share dialog.
