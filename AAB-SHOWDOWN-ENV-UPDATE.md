# AAB Showdown Subdomain Update ✅

**Date**: January 16, 2026  
**Status**: Code Updated - Environment Variables Need Manual Update

---

## ✅ Code Updates Complete

All code references have been updated to use the new "aab" prefix subdomains:

- `showdown.moodmnky.com` → `aab-showdown.moodmnky.com`
- `play.moodmnky.com` → `aab-play.moodmnky.com`
- `login.moodmnky.com` → `aab-login.moodmnky.com`

### Files Updated

1. ✅ `app/api/showdown/create-room/route.ts` - Updated fallback URL
2. ✅ `lib/showdown/sync.ts` - Updated LOGINSERVER_URL default
3. ✅ `components/showdown/showdown-landing.tsx` - Updated fallback URL
4. ✅ `app/showdown/match-lobby/page.tsx` - Updated fallback URL
5. ✅ `scripts/test-showdown-api.ts` - Updated default URL

---

## 🔧 Environment Variables Required

**You need to manually update your `.env` and `.env.local` files:**

### Production (`.env`)

```bash
# Showdown Server Configuration (AAB - League Exclusive)
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=https://aab-play.moodmnky.com
LOGINSERVER_URL=https://aab-login.moodmnky.com
SHOWDOWN_API_KEY=***REMOVED***
SHOWDOWN_PASSWORD_SECRET=change-me-in-production-generate-secure-random-string
```

### Local Development (`.env.local`)

```bash
# Showdown Server Configuration (AAB - League Exclusive)
# Local IP addresses for development
SHOWDOWN_SERVER_URL=http://10.3.0.119:8000
NEXT_PUBLIC_SHOWDOWN_CLIENT_URL=http://10.3.0.119:8080
LOGINSERVER_URL=http://10.3.0.119:8001
SHOWDOWN_API_KEY=
SHOWDOWN_PASSWORD_SECRET=local-dev-secret-change-in-production
```

---

## 📋 Environment Variable Mapping

| Variable | Production | Local Development | Purpose |
|----------|-----------|-------------------|---------|
| `SHOWDOWN_SERVER_URL` | `https://aab-showdown.moodmnky.com` | `http://10.3.0.119:8000` | Showdown server API base URL |
| `NEXT_PUBLIC_SHOWDOWN_CLIENT_URL` | `https://aab-play.moodmnky.com` | `http://10.3.0.119:8080` | Showdown client web URL |
| `LOGINSERVER_URL` | `https://aab-login.moodmnky.com` | `http://10.3.0.119:8001` | Showdown loginserver API URL |
| `SHOWDOWN_API_KEY` | (your existing key) | (empty for local) | Optional API key for Showdown server |
| `SHOWDOWN_PASSWORD_SECRET` | (secure random string) | `local-dev-secret-change-in-production` | Secret for deterministic password generation |

---

## 🚀 Next Steps

1. **Update `.env` file** with production URLs (aab-* subdomains)
2. **Update `.env.local` file** with local IP addresses
3. **Update Vercel environment variables** (if deploying):
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update `SHOWDOWN_SERVER_URL`, `NEXT_PUBLIC_SHOWDOWN_CLIENT_URL`, and `LOGINSERVER_URL`
4. **Test the changes**:
   ```bash
   # Test Showdown server connectivity
   curl http://10.3.0.119:8000
   
   # Test Showdown client connectivity
   curl http://10.3.0.119:8080
   
   # Test loginserver connectivity
   curl http://10.3.0.119:8001
   ```

---

## 📝 Notes

- **Local Development**: Uses IP addresses (`10.3.0.119`) instead of subdomains
- **Production**: Uses HTTPS subdomains (`aab-*.moodmnky.com`)
- **Fallback URLs**: Code includes fallback URLs, but environment variables should be set for proper functionality
- **Bridge Authentication**: `LOGINSERVER_URL` is used by the bridge authentication system to sync accounts

---

**Update Complete!** 🎉

All code references have been updated. Please update your `.env` and `.env.local` files with the new URLs.
