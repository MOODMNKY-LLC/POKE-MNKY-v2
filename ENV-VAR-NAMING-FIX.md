# Environment Variable Naming Fix

## Issue Identified

The codebase had inconsistent environment variable naming for Google Sheets credentials:

- **README.md** shows: `GOOGLE_PRIVATE_KEY`
- **New utility function** checks: `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- **Old code** (`lib/google-sheets.ts`) uses: `GOOGLE_PRIVATE_KEY`

This caused credentials in `.env.local` to not be detected.

---

## ✅ Fix Applied

Updated `lib/utils/google-sheets.ts` to support **both naming conventions** for backward compatibility:

### Supported Variable Names

**Email** (only one format):
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` ✅

**Private Key** (both formats supported):
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` ✅ (preferred, new)
- `GOOGLE_PRIVATE_KEY` ✅ (legacy, backward compatible)

---

## 🔧 Changes Made

### 1. Updated Utility Functions

**`getGoogleServiceAccountCredentials()`**:
- Checks `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` first
- Falls back to `GOOGLE_PRIVATE_KEY` if not found
- Adds debug logging in development mode

**`hasGoogleSheetsCredentials()`**:
- Checks both private key variable names
- Returns true if either is found

### 2. Debug Logging

Added development-mode logging to help identify missing variables:
```typescript
if (process.env.NODE_ENV === "development") {
  console.log("[Google Sheets] Credential check:", {
    email: email ? "✓ Found" : "✗ Missing",
    privateKey: privateKey ? "✓ Found" : "✗ Missing",
    foundEnvVars: [...]
  })
}
```

---

## 📋 Recommended Variable Names

**For new setups**, use:
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="***REMOVED***\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🔍 Troubleshooting

### Check if variables are loaded:

1. **Restart dev server** after changing `.env.local`
2. **Check console logs** in development mode
3. **Verify variable names** match exactly (case-sensitive)
4. **Check for typos** or extra spaces

### Debug Steps:

1. Visit `/admin/google-sheets`
2. Check browser console for credential check logs
3. Look for "✓ Found" or "✗ Missing" messages
4. Verify variables are in `.env.local` (not `.env`)

---

## ✅ Verification

After restarting the dev server:
- Credentials should be detected
- Status indicator should show "Configured"
- Test connection should work
- Sync should function properly

---

## 📝 Next Steps

1. **Restart dev server** to load updated code
2. **Check credentials status** at `/admin/google-sheets`
3. **Test connection** to verify it works
4. **Update `.env.local`** to use preferred names (optional)

The fix maintains backward compatibility while supporting the preferred naming convention! 🎉
