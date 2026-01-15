# Google Sheets Credentials Refactor

## Summary

Refactored Google Sheets configuration to use environment variables for service account credentials, making the UI simpler and more secure. Only the spreadsheet ID is now required from users.

---

## ✅ Changes Made

### 1. Database Migration
- ✅ Made `service_account_email` and `service_account_private_key` nullable
- ✅ Added comments explaining credentials come from env vars
- ✅ Migration: `make_google_sheets_credentials_optional`

### 2. Utility Functions
- ✅ Created `lib/utils/google-sheets.ts`:
  - `extractSpreadsheetId()` - Parses spreadsheet ID from URL or returns ID as-is
  - `getGoogleServiceAccountCredentials()` - Gets credentials from env vars
  - `hasGoogleSheetsCredentials()` - Checks if credentials are configured

### 3. UI Improvements
- ✅ Removed service account credential input fields
- ✅ Single input field for spreadsheet URL or ID
- ✅ Auto-parsing of spreadsheet ID from URL
- ✅ Visual feedback for parsed ID (green checkmark)
- ✅ Credentials status indicator (configured/not configured)
- ✅ Updated documentation section

### 4. API Routes Updated
- ✅ `GET /api/admin/google-sheets/config`:
  - Returns `credentials_configured` status
  - No longer returns credentials from database
  
- ✅ `POST /api/admin/google-sheets/config`:
  - Only requires `spreadsheet_id`
  - Validates credentials exist in env vars
  - Doesn't save credentials to database
  
- ✅ `POST /api/admin/google-sheets/test`:
  - Only requires `spreadsheet_id`
  - Uses credentials from env vars

### 5. Sync Function Updated
- ✅ `syncLeagueData()` signature simplified:
  - Before: `(spreadsheetId, email, privateKey, mappings)`
  - After: `(spreadsheetId, mappings)`
- ✅ Reads credentials from env vars internally

---

## 🔒 Security Improvements

1. **Credentials Not in Database**: Service account credentials are no longer stored in the database
2. **Environment Variables Only**: Credentials managed via server-side env vars
3. **No Client Exposure**: Credentials never exposed to client-side code
4. **Better Access Control**: Only admins/devs with server access can configure credentials

---

## 📋 User Experience

### Before
- Required 3 fields: Spreadsheet ID, Email, Private Key
- Users had to manually extract spreadsheet ID from URL
- Credentials stored in database (security concern)
- More complex form

### After
- Only 1 field: Spreadsheet URL or ID
- Auto-parsing from URL
- Visual feedback for valid ID
- Credentials configured server-side
- Simpler, cleaner UI

---

## 🎯 Usage

### For Administrators/Developers

1. **Set Environment Variables**:
   \`\`\`bash
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   \`\`\`

2. **Share Google Sheet**: Share with service account email (Viewer permissions)

### For Users/Admins

1. **Visit** `/admin/google-sheets`
2. **Paste** Google Sheets URL or Spreadsheet ID
3. **Configure** sheet mappings
4. **Test** connection
5. **Save** configuration

---

## 🔧 Technical Details

### URL Parsing
The `extractSpreadsheetId()` function handles:
- Full URLs: `https://docs.google.com/spreadsheets/d/1abc123/edit`
- Partial URLs: `https://docs.google.com/spreadsheets/d/1abc123`
- Direct IDs: `1abc123`
- Invalid formats: Returns `null`

### Credential Flow
\`\`\`
1. User enters spreadsheet ID
   ↓
2. API validates credentials exist (env vars)
   ↓
3. Save spreadsheet_id to database
   ↓
4. Sync uses env vars for authentication
\`\`\`

### Error Handling
- Clear error if credentials not configured
- Visual feedback for invalid spreadsheet ID
- Helpful error messages for connection issues

---

## 📊 Database Schema

### `google_sheets_config` Table
- `spreadsheet_id` - **Required** (user-provided)
- `service_account_email` - **Nullable** (from env var)
- `service_account_private_key` - **Nullable** (from env var)
- Other fields unchanged

---

## ✅ Benefits

1. **Security**: Credentials not in database
2. **Simplicity**: Single input field
3. **User-Friendly**: Auto-parsing from URL
4. **Maintainability**: Centralized credential management
5. **Best Practices**: Follows 12-factor app principles

---

## 🚀 Migration Path

For existing configurations:
1. Credentials in database are ignored (nullable fields)
2. Set environment variables
3. Existing spreadsheet IDs remain valid
4. No data loss

---

## 📝 Next Steps

1. Set environment variables in production
2. Test connection with new UI
3. Verify sync works with env vars
4. Remove old credential fields from database (optional, future cleanup)

The refactor is complete and ready for use! 🎉
