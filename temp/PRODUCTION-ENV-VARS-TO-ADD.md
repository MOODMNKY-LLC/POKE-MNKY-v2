# Production Environment Variables to Add/Update

> **Date**: 2026-01-17  
> **Source**: Server production `.env` file  
> **Status**: Ready for Review

---

## 📋 Variables to Add/Update (20 total)

### Application URLs (2)
- ✅ `APP_URL` = `https://poke-mnky.moodmnky.com`
- ✅ `NEXT_PUBLIC_APP_URL` = `https://poke-mnky.moodmnky.com`

### Supabase Production (3)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://chmrszrwlfeqovwxyrmt.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full JWT token)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full JWT token)

### Discord Production (3)
- ⚠️ `DISCORD_BOT_TOKEN` = `MTQ1NTQ0MjExNDE3NDM4NjI3Mg.GjwknN...` (may already exist, verify value)
- ⚠️ `DISCORD_GUILD_ID` = `1069695816001933332` (different from current: `1190512330556063764`)
- ✅ `DISCORD_GUILD_IDS` = `1069695816001933332,1190512330556063764` (comma-separated list)

### Showdown Production (5)
- ✅ `SHOWDOWN_SERVER_URL` = `https://aab-showdown.moodmnky.com`
- ✅ `NEXT_PUBLIC_SHOWDOWN_CLIENT_URL` = `https://aab-play.moodmnky.com`
- ✅ `SHOWDOWN_API_KEY` = `5828714b68d1b1251425aba63d28edb164fa3f42e9523fbff8c5979107317750`
- ✅ `SHOWDOWN_PUBLIC_URL` = `https://aab-play.moodmnky.com`
- ✅ `SHOWDOWN_COOKIE_DOMAIN` = `moodmnky.com`

### Loginserver (1)
- ✅ `LOGINSERVER_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...` (full RSA private key)

### MinIO Production URLs (4)
- ⚠️ `MINIO_ENDPOINT_EXTERNAL` = `https://s3-api-data.moodmnky.com` (may already exist, verify value)
- ⚠️ `MINIO_CONSOLE_EXTERNAL` = `https://s3-console-data.moodmnky.com` (may already exist, verify value)
- ⚠️ `SPRITES_BASE_URL` = `https://s3-api-data.moodmnky.com/pokedex-sprites` (may already exist, verify value)
- ⚠️ `NEXT_PUBLIC_SPRITES_BASE_URL` = `https://s3-api-data.moodmnky.com/pokedex-sprites` (may already exist, verify value)

### PokéAPI Production (2)
- ⚠️ `POKEAPI_BASE_URL` = `https://pokeapi.co/api/v2` (may already exist)
- ⚠️ `NEXT_PUBLIC_POKEAPI_BASE_URL` = `https://pokeapi.co/api/v2` (may already exist)

---

## ⚠️ Variables Excluded (Server-Specific)

These are excluded because they're server/Docker-specific or placeholders:

- `PS_PORT`, `LOGINSERVER_PORT` (Docker internal ports)
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (Docker internal MinIO)
- `SUPABASE_DB_URL`, `SUPABASE_DB_PASSWORD` (Direct DB connection, not needed in Vercel)
- `DISCORD_RESULTS_CHANNEL_ID` (placeholder: `your-results-channel-id-here`)
- `SHOWDOWN_PASSWORD_SECRET` (placeholder: `change-me-in-production-generate-secure-random-string`)
- `TUNNEL_ID`, `TUNNEL_CREDENTIALS_FILE` (Cloudflare tunnel config)
- `NOTION_*` (placeholders)
- `POKEAPI_PUBLIC_HOSTNAME`, `POKEAPI_DB_PASSWORD` (server-specific)
- `DITTO_*` (server-specific PokéAPI mirroring)

---

## 🔍 Notes

1. **DISCORD_GUILD_ID**: Current value in Vercel is `1190512330556063764`, but server has `1069695816001933332`. The new `DISCORD_GUILD_IDS` includes both, so we may want to keep both or update to use the comma-separated list.

2. **MinIO URLs**: Current values may be different (local/internal URLs). These production URLs should replace them.

3. **Supabase Keys**: These are production keys, different from local development keys.

4. **Showdown URLs**: These are production Showdown server URLs, different from local development.

---

## ✅ Ready to Proceed?

**Total Variables**: 20  
**New Variables**: ~15 (some may already exist with different values)  
**Variables Needing Update**: ~5 (verify existing values match production)

**Next Step**: Review this list, then I'll add/update all variables in Vercel.
