# Final Environment Variables Summary

> **Date**: 2026-01-17  
> **Status**: Ready to Add to Vercel

---

## 📋 Production Variables to Add/Update (19 total)

### Application URLs (2) - NEW
- `APP_URL` = `https://poke-mnky.moodmnky.com` → **All environments**
- `NEXT_PUBLIC_APP_URL` = `https://poke-mnky.moodmnky.com` → **All environments**

### Supabase Production (3) - VERIFY/UPDATE
- `NEXT_PUBLIC_SUPABASE_URL` = `https://chmrszrwlfeqovwxyrmt.supabase.co` → **Production only**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` → **Production only**
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` → **Production only**

### Discord Production (1) - NEW
- `DISCORD_GUILD_IDS` = `1069695816001933332,1190512330556063764` → **All environments**
  - **Note**: Includes both dev and prod guild IDs. Keep `DISCORD_GUILD_ID=1190512330556063764` (correct prod ID)

### Showdown Production (5) - NEW
- `SHOWDOWN_SERVER_URL` = `https://aab-showdown.moodmnky.com` → **All environments**
- `NEXT_PUBLIC_SHOWDOWN_CLIENT_URL` = `https://aab-play.moodmnky.com` → **All environments**
- `SHOWDOWN_API_KEY` = `5828714b68d1b1251425aba63d28edb164fa3f42e9523fbff8c5979107317750` → **All environments**
- `SHOWDOWN_PUBLIC_URL` = `https://aab-play.moodmnky.com` → **All environments**
- `SHOWDOWN_COOKIE_DOMAIN` = `moodmnky.com` → **All environments**

### Loginserver (1) - NEW
- `LOGINSERVER_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...` → **All environments**
  - **Note**: Full RSA private key, multi-line

### MinIO Production URLs (4) - VERIFY/UPDATE
- `MINIO_ENDPOINT_EXTERNAL` = `https://s3-api-data.moodmnky.com` → **Production only**
- `MINIO_CONSOLE_EXTERNAL` = `https://s3-console-data.moodmnky.com` → **Production only**
- `SPRITES_BASE_URL` = `https://s3-api-data.moodmnky.com/pokedex-sprites` → **Production only**
- `NEXT_PUBLIC_SPRITES_BASE_URL` = `https://s3-api-data.moodmnky.com/pokedex-sprites` → **Production only**

### PokéAPI Production (2) - VERIFY/UPDATE
- `POKEAPI_BASE_URL` = `https://pokeapi.co/api/v2` → **Production only**
- `NEXT_PUBLIC_POKEAPI_BASE_URL` = `https://pokeapi.co/api/v2` → **Production only**

---

## 📋 Local Development Variables (11 total)

### Supabase Local Keys (10) - Development/Preview ONLY
- `SUPABASE_ANON_KEY` = `eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYx...` → **Development, Preview**
- `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJFUzI1NiIsImtpZCI6ImI4MTI2OWYx...` → **Development, Preview**
- `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` → **Development, Preview**
- `SUPABASE_SECRET_KEY` = `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz` → **Development, Preview**
- `SUPABASE_JWT_SECRET` = `super-secret-jwt-token-with-at-least-32-characters-long` → **Development, Preview**
- `JWT_SECRET` = `super-secret-jwt-token-with-at-least-32-characters-long` → **Development, Preview**
- `SUPABASE_STORAGE_ACCESS_KEY` = `625729a08b95bf1b7ff351a663f3a23c` → **Development, Preview**
- `SUPABASE_STORAGE_SECRET_KEY` = `850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907` → **Development, Preview**
- `SUPABASE_STORAGE_REGION` = `local` → **Development, Preview**
- `SUPABASE_MANAGEMENT_API_TOKEN` = `sbp_810ec88f472beddfca3037ab970f716e93d31bf3` → **Development, Preview**

### Discord (1) - Already included above
- `DISCORD_GUILD_IDS` = `1069695816001933332,1190512330556063764` → **All environments**

---

## ⚠️ Important Notes

1. **DISCORD_GUILD_ID**: Keep existing value `1190512330556063764` (correct production ID). Do NOT update to `1069695816001933332` (old dev ID).

2. **DISCORD_GUILD_IDS**: Add to all environments with both IDs: `1069695816001933332,1190512330556063764`

3. **Supabase Variables**: 
   - Production keys go to **Production only**
   - Local dev keys go to **Development/Preview only**

4. **MinIO/PokéAPI URLs**: 
   - Production URLs go to **Production only**
   - Local dev URLs are excluded (localhost/internal IPs)

5. **LOGINSERVER_PRIVATE_KEY**: Multi-line private key, needs careful handling when adding.

---

## 📊 Summary

- **Production Variables**: 19 (9 new, 10 verify/update)
- **Local Dev Variables**: 11 (10 Supabase local keys, 1 Discord)
- **Total Variables**: 30

---

## ✅ Ready to Proceed

All variables identified and categorized. Ready to add to Vercel.
