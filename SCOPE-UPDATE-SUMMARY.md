# Google API Scope Update Summary

## ✅ Changes Made

Updated all Google Sheets authentication to use **both** required scopes:

```typescript
scopes: [
  "https://www.googleapis.com/auth/spreadsheets.readonly",  // Read spreadsheet data
  "https://www.googleapis.com/auth/drive.readonly",          // Access images & metadata
]
```

---

## 📝 Files Updated

### 1. `lib/google-sheets-sync.ts`
- ✅ Updated to include Drive scope
- **Reason**: Needed for image extraction during sync

### 2. `app/api/sync/google-sheets/route.ts`
- ✅ Updated to include Drive scope
- **Reason**: Calls image extraction which requires Drive scope

### 3. `app/api/admin/google-sheets/detect/route.ts`
- ✅ Updated to include Drive scope
- **Reason**: Accesses metadata and images

### 4. `app/api/admin/google-sheets/test/route.ts`
- ✅ Updated to include Drive scope
- **Reason**: Consistent scope usage, may need for future features

### 5. `app/api/admin/google-sheets/analyze/route.ts`
- ✅ Already had both scopes (no change needed)

### 6. `scripts/test-parsers.ts`
- ✅ Already had both scopes (no change needed)

---

## 🔍 Why Both Scopes?

### `spreadsheets.readonly`
- Read cell values and formulas
- Read headers and sheet structure
- Access spreadsheet metadata
- Read sheet properties

### `drive.readonly`
- Access embedded images (`includeGridData: true`)
- Access image URLs stored in Google Drive
- Access file metadata
- Required for image extraction features

**Note**: `includeGridData: true` in the Sheets API requires Drive scope to access embedded objects (images).

---

## 🚀 Google Cloud Console Setup

### Required APIs to Enable:

1. **Google Sheets API** ✅
   - Navigate to: APIs & Services > Library
   - Search: "Google Sheets API"
   - Click: Enable

2. **Google Drive API** ✅
   - Navigate to: APIs & Services > Library
   - Search: "Google Drive API"
   - Click: Enable

### Verification:

After enabling APIs, verify they're enabled:
- Go to: APIs & Services > Enabled APIs
- You should see both APIs listed

---

## ✅ Testing

Run the test scripts to verify scopes are working:

```bash
# Test comprehensive analysis
npx tsx scripts/test-sheet-analysis.ts

# Test all parsers
npx tsx scripts/test-parsers.ts
```

---

## 📚 Documentation

See `GOOGLE-API-SETUP-GUIDE.md` for complete setup instructions.

---

## ⚠️ Important Notes

1. **Service Account Access**: Ensure your service account email has **Viewer** access to the Google Sheet
2. **API Enablement**: Both APIs must be enabled in Google Cloud Console
3. **Environment Variables**: Ensure credentials are properly configured in `.env.local`
4. **Scope Verification**: The test scripts will verify scopes are working correctly

---

## 🔄 Next Steps

1. ✅ Enable Google Sheets API in Cloud Console
2. ✅ Enable Google Drive API in Cloud Console
3. ✅ Verify service account has access to spreadsheet
4. ✅ Run test scripts to verify everything works
