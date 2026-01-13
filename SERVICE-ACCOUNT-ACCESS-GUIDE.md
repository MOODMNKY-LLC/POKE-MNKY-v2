# Service Account Access Guide

## ✅ Access Level: Editor (Current)

**Status**: ✅ **Editor access is sufficient and working**

### Access Level Comparison:

| Access Level | Permissions | Required for Our Use Case |
|--------------|-------------|--------------------------|
| **Viewer** | Read-only access | ✅ **Recommended** (sufficient) |
| **Editor** | Read + Write access | ✅ **Works** (more than needed) |
| **Owner** | Full control | ❌ Not needed |

### Current Setup:
- **Service Account Email**: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
- **Access Level**: Editor (requested by user)
- **Status**: ✅ Working correctly

---

## 🔒 Security Best Practice

### Recommended: Viewer Access

For security best practices, **Viewer access is recommended** because:
- ✅ Our application only reads data (no writes)
- ✅ Follows principle of least privilege
- ✅ Reduces security risk if credentials are compromised
- ✅ Still allows all required operations:
  - Reading spreadsheet data
  - Accessing metadata
  - Extracting images
  - Reading cell values

### Current: Editor Access

**Editor access works fine** but provides more permissions than needed:
- ✅ Can read all data (required)
- ✅ Can write data (not needed for our use case)
- ⚠️ More permissions = higher security risk if compromised

---

## 🔄 How to Change to Viewer Access (Optional)

If you want to follow security best practices:

1. **Open Google Sheet**:
   - Go to: https://docs.google.com/spreadsheets/d/1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ/edit

2. **Click Share Button**

3. **Find Service Account**:
   - Look for: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

4. **Change Permission**:
   - Click the dropdown next to the service account
   - Change from "Editor" to **"Viewer"**
   - Click **Done**

5. **Verify**:
   - Run test script to confirm it still works:
   \`\`\`bash
   npx tsx scripts/test-scopes-direct.ts
   \`\`\`

---

## ✅ Current Status

**Your current Editor access is working correctly!**

- ✅ All read operations work
- ✅ Image extraction works
- ✅ Metadata access works
- ✅ No changes needed unless you want to improve security

**Note**: Editor access won't cause any issues - it's just more permission than strictly necessary. The application will continue to work exactly the same.

---

## 🧪 Verification

To verify access is working:

\`\`\`bash
# Test direct access (no auth required)
npx tsx scripts/test-scopes-direct.ts

# Test via API (requires dev server + auth)
pnpm dev  # Terminal 1
npx tsx scripts/test-sheet-analysis.ts  # Terminal 2
\`\`\`

---

## 📚 References

- [Google Sheets API Scopes](https://developers.google.com/sheets/api/scopes)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/service-accounts)
- [Principle of Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege)
