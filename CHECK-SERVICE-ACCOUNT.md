# Check if Service Account Exists

## 🔍 How to Find Your Service Account

### Step 1: Navigate to Service Accounts

In Google Cloud Console:
1. Go to **IAM & Admin** > **Service Accounts** (NOT "IAM")
2. Look for: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

### Step 2: If Service Account EXISTS

✅ **Good!** You can use it.

**Next Steps**:
1. Click on the service account
2. Go to **Keys** tab
3. **Add Key** > **Create new key** > **JSON**
4. Download the JSON file
5. Extract credentials and add to `.env.local`
6. Share spreadsheet with the service account email

### Step 3: If Service Account DOES NOT EXIST

❌ **You need to create it first.**

**Steps to Create**:
1. Click **Create Service Account** (top of page)
2. Fill in:
   - **Service account name**: `poke-mnky-service`
   - **Service account ID**: `poke-mnky-service` (auto-generated)
   - **Description**: "Service account for Google Sheets access"
3. Click **Create and Continue**
4. Skip role assignment (click **Continue**)
5. Click **Done**
6. Then follow Step 2 above to create a key

---

## ⚠️ Important

**DO NOT** use `moodmnky@gmail.com` for the following reasons:

1. ❌ **Security Risk**: Personal accounts shouldn't be used for automated access
2. ❌ **Won't Work**: Your app code expects the service account credentials
3. ❌ **Best Practice**: Service accounts are designed for API access

**DO** use `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`:
1. ✅ **Secure**: Limited permissions, designed for automation
2. ✅ **Correct**: Matches what your app expects
3. ✅ **Best Practice**: Standard approach for API access

---

## 📋 Quick Checklist

- [ ] Navigate to **IAM & Admin** > **Service Accounts**
- [ ] Look for `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
- [ ] If exists: Create key and add to `.env.local`
- [ ] If not exists: Create service account first
- [ ] Share spreadsheet with SERVICE ACCOUNT email (not personal Gmail)
- [ ] Test with verification script
