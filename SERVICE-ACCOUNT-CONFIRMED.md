# Service Account Confirmed ✅

## ✅ Service Account Details

From your screenshot, I can confirm:

**Service Account Email**: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
- ✅ **Status**: Enabled
- ✅ **Name**: `poke-mnky-service`
- ✅ **Description**: Service account for POKE MNKY Google Sheets integration
- ✅ **Key ID**: `7d8e9fdd0a373d88d1e9ec07c43e380e59d3daed` (Key exists)
- ✅ **Key Created**: Dec 30, 2025
- ✅ **OAuth 2 Client ID**: `110692522893766968940`

---

## 📋 Environment Variables

### ✅ Already Set (or being set):

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
```

### ⚠️ Still Needed:

```bash
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**To get the private key**:
1. Click on the service account (`poke-mnky-service@mood-mnky.iam.gserviceaccount.com`)
2. Go to **Keys** tab
3. Click on the existing key (or create a new one)
4. Download as **JSON**
5. Open the JSON file
6. Copy the `private_key` value
7. Add to `.env.local` as `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

---

## 📝 OAuth 2 Client ID

**Value**: `110692522893766968940`

**Note**: For JWT authentication (which we're using), the OAuth 2 Client ID is typically **not needed**. We use:
- Service account email
- Private key

However, if your application specifically requires it, you can add:
```bash
GOOGLE_OAUTH_CLIENT_ID=110692522893766968940
```

---

## ✅ Next Steps

1. ✅ **Service account email** - Added to `.env.local`
2. ⚠️ **Download key JSON** - Get the private key
3. ⚠️ **Add private key** - Add to `.env.local`
4. ⚠️ **Share spreadsheet** - With service account email
5. ⚠️ **Test access** - Run verification script

---

## 🔍 Verification

After adding the private key, verify:

```bash
npx tsx scripts/verify-service-account.ts
```

This will check:
- ✅ Environment variables are set
- ✅ Email format is correct
- ✅ Private key format is valid
- ✅ Authentication works
- ✅ APIs are enabled

---

## 📋 Summary

| Item | Status | Value |
|------|--------|-------|
| **Service Account Email** | ✅ **Set** | `poke-mnky-service@mood-mnky.iam.gserviceaccount.com` |
| **Service Account Status** | ✅ **Enabled** | Active |
| **Private Key** | ⚠️ **Need to download** | From JSON key file |
| **OAuth 2 Client ID** | ℹ️ **Optional** | `110692522893766968940` |

---

## 🎯 Action Required

**Most Important**: Download the service account key (JSON file) and add the `private_key` value to `.env.local` as `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.

Then share your spreadsheet with: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
