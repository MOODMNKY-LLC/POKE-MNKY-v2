# Spreadsheet ID Updated

## ✅ Changes Made

**New Spreadsheet ID**: `1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0`

**Updated Files**:
- ✅ `.env.local` - Updated `GOOGLE_SHEET_ID`
- ✅ `.env` - Updated `GOOGLE_SHEET_ID`

---

## ⚠️ Important: Share Spreadsheet with Service Account

**Before testing, you MUST share the spreadsheet with the service account:**

1. Open the spreadsheet:
   - https://docs.google.com/spreadsheets/d/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/edit

2. Click **Share** (top right)

3. Add service account:
   - Email: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
   - Permission: **Viewer** (recommended) or **Editor** (also works)
   - Uncheck "Notify people"
   - Click **Share**

4. Wait 10-30 seconds for permissions to propagate

---

## 🧪 Test Access

After sharing the spreadsheet, test access:

\`\`\`bash
npx tsx scripts/test-scopes-direct.ts 1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0
\`\`\`

**Expected Output**:
\`\`\`
✅ Success! Spreadsheet: "[Spreadsheet Name]"
✅ Sheets found: [number]
\`\`\`

---

## 📋 Next Steps

1. ✅ **Update environment variables** - DONE
2. ⚠️ **Share spreadsheet** - REQUIRED (see above)
3. 🧪 **Test access** - After sharing
4. 🔄 **Update database** (optional):
   \`\`\`sql
   UPDATE google_sheets_config
   SET spreadsheet_id = '1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0',
       updated_at = NOW()
   WHERE id = (SELECT id FROM google_sheets_config ORDER BY created_at DESC LIMIT 1);
   \`\`\`

---

## 📝 Summary

- ✅ Environment variables updated
- ⚠️ **Action Required**: Share spreadsheet with service account
- 🧪 Test after sharing to verify access
