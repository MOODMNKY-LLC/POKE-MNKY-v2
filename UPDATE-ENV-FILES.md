# Update Environment Files

## ✅ Service Account Confirmed

From your screenshot:
- **Email**: `poke-mnky-service@mood-mnky.iam.gserviceaccount.com` ✅
- **Status**: Enabled ✅
- **Key exists**: Yes (created Dec 30, 2025) ✅
- **OAuth 2 Client ID**: `110692522893766968940`

---

## 📝 Add to `.env.local`

Add or update these lines in your `.env.local` file:

\`\`\`bash
# Google Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=poke-mnky-service@mood-mnky.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
\`\`\`

**Note**: Replace `...` with the actual private key from your JSON key file.

---

## 🔑 How to Get the Private Key

1. In Google Cloud Console, click on `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
2. Go to **Keys** tab
3. Click on the existing key (or create a new one: **Add Key** > **Create new key** > **JSON**)
4. Download the JSON file
5. Open the JSON file in a text editor
6. Find the `private_key` field
7. Copy the entire value (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
8. Paste it into `.env.local` as the value for `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

**Important**: 
- Keep the quotes around the private key
- Keep the `\n` characters (they represent newlines)
- Don't remove the BEGIN/END markers

---

## 📋 Optional: OAuth 2 Client ID

If needed (typically not required for JWT auth):

\`\`\`bash
GOOGLE_OAUTH_CLIENT_ID=110692522893766968940
\`\`\`

---

## ✅ Verification

After updating `.env.local`, verify:

\`\`\`bash
npx tsx scripts/verify-service-account.ts
\`\`\`

This will check:
- ✅ Environment variables are set correctly
- ✅ Email format is valid
- ✅ Private key format is valid
- ✅ Authentication works
- ✅ APIs are enabled

---

## 🎯 Next Steps

1. ✅ **Service account email** - Add to `.env.local` (see above)
2. ⚠️ **Download key JSON** - Get the private key value
3. ⚠️ **Add private key** - Add to `.env.local`
4. ⚠️ **Share spreadsheet** - With `poke-mnky-service@mood-mnky.iam.gserviceaccount.com`
5. ⚠️ **Test access** - Run verification script

---

## 📝 Summary

| Variable | Value | Status |
|----------|-------|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `poke-mnky-service@mood-mnky.iam.gserviceaccount.com` | ✅ **Add this** |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | From JSON key file | ⚠️ **Need to download** |
| `GOOGLE_OAUTH_CLIENT_ID` | `110692522893766968940` | ℹ️ Optional |
