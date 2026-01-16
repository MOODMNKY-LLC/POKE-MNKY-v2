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
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="***REMOVED***` and `-----END PRIVATE KEY-----`)
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
