# Service Account Permissions Guide

## ✅ Your Current Setup

**Service Account Email**: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`  
**Access Level**: **Editor** (you requested this)  
**Spreadsheet**: "Average at Best Draft League"  
**Status**: ✅ **Working correctly**

---

## 📋 Permission Levels Explained

### Viewer (Read-Only) ✅ **Recommended**
- **What it allows**: Read-only access to the spreadsheet
- **What we need**: ✅ Perfect for our use case
- **Why**: We only use **read-only** scopes:
  - `spreadsheets.readonly`
  - `drive.readonly`
- **Security**: More secure (can't accidentally modify data)

### Editor (Read & Write) ✅ **Also Works**
- **What it allows**: Can read AND modify the spreadsheet
- **What we need**: ✅ Works fine, but more than necessary
- **Why**: We still only use read-only scopes, so Editor access is fine
- **Security**: Less secure (could modify data if code changes)

### Commenter
- **What it allows**: Can view and add comments
- **What we need**: ❌ Not sufficient (can't read data)

### Owner
- **What it allows**: Full control
- **What we need**: ❌ Overkill and unnecessary

---

## ✅ Answer: Is Editor Access Good Enough?

**YES! Editor access is perfectly fine.** 

Here's why:
1. ✅ **It works**: Editor access includes Viewer permissions
2. ✅ **Our scopes are read-only**: Even with Editor access, our code only requests read-only scopes
3. ✅ **Already tested**: The test script confirmed access is working

**However**, for better security practices:
- **Viewer access is sufficient** for our read-only operations
- You can change it to Viewer if you want (it will work the same)
- Editor access won't cause any problems

---

## 🔒 Security Best Practice

**Recommended**: Use **Viewer** access since we only read data.

**Current**: **Editor** access works fine, but grants more permissions than needed.

**To change to Viewer**:
1. Open your Google Sheet
2. Click **Share**
3. Find the service account email
4. Change permission from "Editor" to "Viewer"
5. Click **Done**

---

## ✅ Verification

Your current setup is working correctly:
- ✅ Service account has access to the spreadsheet
- ✅ Test script confirmed successful connection
- ✅ All 30 sheets are accessible
- ✅ API scopes are working

**No changes needed** - Editor access works perfectly fine!

---

## 🐛 Troubleshooting

### If you get "Permission denied" errors:

1. **Check service account email**:
   - Verify: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
   - Check `.env.local` for `GOOGLE_SERVICE_ACCOUNT_EMAIL`

2. **Verify spreadsheet sharing**:
   - Open the Google Sheet
   - Click **Share**
   - Ensure service account email is listed
   - Ensure it has at least **Viewer** access

3. **Check API enablement**:
   - Google Sheets API must be enabled
   - Google Drive API must be enabled

---

## 📝 Summary

| Access Level | Works? | Recommended? | Notes |
|--------------|--------|--------------|-------|
| **Viewer** | ✅ Yes | ✅ **Yes** | Perfect for read-only operations |
| **Editor** | ✅ Yes | ⚠️ Works but unnecessary | More than needed, but harmless |
| **Commenter** | ❌ No | ❌ No | Insufficient permissions |
| **Owner** | ✅ Yes | ❌ No | Overkill |

**Your current Editor access is working fine!** No changes needed unless you want to follow security best practices and switch to Viewer.
