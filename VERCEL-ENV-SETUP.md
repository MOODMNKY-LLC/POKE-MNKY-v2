# Vercel Environment Variables Setup

## 🔄 Pulling Production Variables from Vercel

### Step 1: Link Vercel Project

\`\`\`bash
# Link to your Vercel project
vercel link

# Follow prompts to select project
\`\`\`

### Step 2: Pull Environment Variables

\`\`\`bash
# Pull production environment variables
vercel env pull .env.production

# This creates .env.production with all production vars
\`\`\`

### Step 3: Review and Update `.env`

\`\`\`bash
# Review the pulled variables
cat .env.production

# Merge into .env (production defaults)
# Keep .env.local for local development
\`\`\`

---

## 📋 Environment Variable Priority

Next.js loads environment variables in this order:

1. **`.env`** - Default values (production)
2. **`.env.local`** - Local overrides (takes precedence, gitignored)

**Result:**
- Local dev → Uses `.env.local` → Local Supabase
- Production → Uses `.env` → Production Supabase

---

## ✅ Current Setup

### `.env` (Production)
- Contains production Supabase URL
- Contains production API keys
- Used by Vercel for deployment

### `.env.local` (Local)
- Contains local Supabase URL (`http://127.0.0.1:54321`)
- Contains local API keys
- Used by `next dev` and local scripts

---

## 🔧 Updating Production Variables

### From Vercel Dashboard

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add/update variables
3. Pull to local: `vercel env pull .env.production`
4. Review and update `.env` if needed

### From Command Line

\`\`\`bash
# Pull latest from Vercel
vercel env pull .env.production

# Review changes
diff .env .env.production

# Update .env if needed
\`\`\`

---

## ⚠️ Important Notes

1. **`.env.local` is gitignored** - Never commit local secrets
2. **`.env` can be committed** - Contains defaults (no real secrets)
3. **Production secrets** - Keep in Vercel dashboard, not in `.env`
4. **Local development** - Always uses `.env.local` when present

---

## 🎯 Quick Reference

| Command | Purpose |
|---------|---------|
| `vercel link` | Link local project to Vercel |
| `vercel env pull .env.production` | Pull production env vars |
| `vercel env ls` | List environment variables |
| `vercel env add <name>` | Add new environment variable |

---

## ✅ Verification

After setup, verify:

\`\`\`bash
# Check local config
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL
# Should show: http://127.0.0.1:54321

# Check production config
cat .env | grep NEXT_PUBLIC_SUPABASE_URL
# Should show: https://chmrszrwlfeqovwxyrmt.supabase.co
\`\`\`
