# Environment Configuration Guide

## ✅ Correct Setup (Implemented)

### File Structure

- **`.env`** → **PRODUCTION** values (for Vercel deployment)
- **`.env.local`** → **LOCAL** values (for local development)

---

## 📋 Environment Files

### `.env` (Production - Vercel)

**Purpose:** Default values for production deployment  
**Used by:** Vercel, production builds  
**Supabase:** Production instance (`chmrszrwlfeqovwxyrmt`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
# ... other production values
```

### `.env.local` (Local Development)

**Purpose:** Local development overrides  
**Used by:** `next dev`, local scripts  
**Supabase:** Local instance (`127.0.0.1:54321`)

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
NEXT_PUBLIC_APP_URL=http://localhost:3000
# ... other local values
```

---

## 🔄 How Next.js Loads Environment Variables

Next.js loads environment variables in this order (later files override earlier):

1. `.env` - Default values (production)
2. `.env.local` - Local overrides (gitignored, takes precedence)

**Result:**
- **Local development:** Uses `.env.local` → Points to local Supabase
- **Production (Vercel):** Uses `.env` → Points to production Supabase

---

## 🚀 Pulling Production Variables from Vercel

### Option 1: Vercel CLI (Recommended)

```bash
# Link to Vercel project (if not already linked)
vercel link

# Pull production environment variables
vercel env pull .env.production

# Review and merge into .env
# Then update .env.local for local development
```

### Option 2: Manual Setup

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Copy all production variables
3. Add to `.env` file
4. Create `.env.local` with local overrides

---

## ✅ Current Configuration

### Production (`.env`)
- ✅ Points to: `https://chmrszrwlfeqovwxyrmt.supabase.co`
- ✅ Has production Supabase keys
- ✅ Has production app URL
- ✅ Ready for Vercel deployment

### Local (`.env.local`)
- ✅ Points to: `http://127.0.0.1:54321`
- ✅ Has local Supabase keys
- ✅ Has localhost app URL
- ✅ Pokemon cache being populated

---

## 🧪 Local Development Workflow

### 1. Start Local Supabase

```bash
supabase start
```

### 2. Run Next.js App

```bash
pnpm dev
```

**Result:** App connects to **local Supabase** (via `.env.local`)

### 3. Run Scripts

```bash
# Scripts use .env.local automatically
pnpm exec tsx --env-file=.env.local scripts/pre-cache-competitive-pokemon.ts
pnpm exec tsx --env-file=.env.local scripts/full-sync-pokemon.ts
```

**Result:** Scripts sync to **local Supabase**

---

## 🚀 Production Deployment Workflow

### 1. Vercel Uses `.env`

Vercel automatically uses `.env` values (or env vars set in dashboard)

### 2. Deploy

```bash
vercel --prod
```

**Result:** App connects to **production Supabase**

---

## 📝 Best Practices

1. ✅ **Never commit `.env.local`** - Already in `.gitignore`
2. ✅ **Commit `.env`** - Contains production defaults (no secrets)
3. ✅ **Use `.env.local` for local overrides** - Takes precedence
4. ✅ **Keep production secrets in Vercel dashboard** - Don't hardcode in `.env`
5. ✅ **Document required variables** - Use `.env.example`

---

## 🔧 Updating Environment Variables

### Update Production Variables

```bash
# Pull from Vercel
vercel env pull .env.production

# Review changes
# Update .env if needed
```

### Update Local Variables

```bash
# Edit .env.local directly
# Changes take effect on next dev server restart
```

---

## ✅ Verification

### Check Which Database You're Using

```bash
# Check .env.local (local development)
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL
# Should show: http://127.0.0.1:54321

# Check .env (production defaults)
cat .env | grep NEXT_PUBLIC_SUPABASE_URL
# Should show: https://chmrszrwlfeqovwxyrmt.supabase.co
```

### Verify Local Cache

```bash
# Check local Supabase
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) FROM pokemon_cache;"
# Should show: 1025 (after full sync completes)
```

---

## 🎯 Summary

| File | Purpose | Supabase | Used By |
|------|---------|----------|---------|
| `.env` | Production defaults | Production | Vercel, production builds |
| `.env.local` | Local overrides | Local | `next dev`, local scripts |

**Current Status:**
- ✅ `.env` → Production Supabase
- ✅ `.env.local` → Local Supabase  
- ✅ Local cache being populated
- ✅ Ready for local development!
