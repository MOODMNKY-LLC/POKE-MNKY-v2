# Why NOT Use Personal Email (`moodmnky@gmail.com`)

## ❌ Don't Use Personal Email

**Your personal email**: `moodmnky@gmail.com`  
**Service account email**: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

---

## 🔴 Problems with Using Personal Email

### 1. **Security Risk**
- Personal accounts have broader permissions
- Not designed for automated API access
- Violates security best practices

### 2. **Won't Work**
- Your application code expects service account credentials
- Code looks for: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- If you share with personal email, the service account still won't have access
- Your app will still get `403 Permission Denied` errors

### 3. **Wrong Credentials**
- Your `.env.local` needs `GOOGLE_SERVICE_ACCOUNT_EMAIL` set to the service account
- Personal email doesn't have a service account private key
- Can't authenticate with personal email using JWT tokens

---

## ✅ Correct Approach

### Use Service Account Email

**Service Account**: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

**Why**:
1. ✅ **Designed for API access** - Service accounts are built for automation
2. ✅ **Matches your code** - Your app expects this email
3. ✅ **Secure** - Limited permissions, safer than personal accounts
4. ✅ **Best Practice** - Standard approach for Google API access

---

## 🔍 Check if Service Account Exists

### In Google Cloud Console:

1. Go to **IAM & Admin** > **Service Accounts** (NOT "IAM")
2. Look for: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`

### If It Exists:
✅ Use it! Create a key and add credentials to `.env.local`

### If It Doesn't Exist:
❌ Create it first:
1. Click **Create Service Account**
2. Name: `poke-mnky-service`
3. Create key (JSON format)
4. Add credentials to `.env.local`

---

## 📋 Summary

| Email | Type | Use For | Should Use? |
|-------|------|---------|-------------|
| `moodmnky@gmail.com` | Personal Gmail | Personal access | ❌ **NO** |
| `poke-mnky-service@mood-mnky.iam.gserviceaccount.com` | Service Account | API access | ✅ **YES** |

---

## ✅ Action Items

1. **Check** if service account exists in Google Cloud Console
2. **Create** service account if it doesn't exist
3. **Download** service account key (JSON)
4. **Add** credentials to `.env.local`
5. **Share** spreadsheet with **SERVICE ACCOUNT** email (not personal)
6. **Test** with verification script

---

## 🎯 Bottom Line

**Use the service account email** (`poke-mnky-service@mood-mnky.iam.gserviceaccount.com`), not your personal Gmail (`moodmnky@gmail.com`).

Your personal email is for managing the Google Cloud project, not for API access.
