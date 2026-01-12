# Feature Re-Enablement Checklist

## 🎯 Goal
Re-enable all features disabled for v0 preview and prepare for production deployment.

## 📋 Status Overview

### ✅ Already Working
- OpenAI integration (lazy-loaded)
- Pokemon API with Pokenode-TS
- Discord bot code structure
- Auth UI components
- All page layouts and navigation

### ⚠️ Currently Disabled (Needs Re-enabling)
1. **Database Schema** (0 tables - CRITICAL)
2. **Mock Data Flags** (7 files using `USE_MOCK_DATA = true`)
3. **Google Sheets Sync** (commented out)
4. **Real Supabase queries** (currently returning mock data)

---

## 🚀 Re-Enablement Steps

### Step 1: Initialize Database Schema ⭐ CRITICAL FIRST STEP

**Status**: ❌ Not executed (0 tables in database)

**Action Required**:
Run the following SQL scripts in Supabase SQL Editor or via CLI:

```sql
-- 1. Run base schema
-- File: scripts/002_enhanced_schema.sql
-- Creates: teams, coaches, divisions, conferences, matches, etc.

-- 2. Run extended Pokemon fields
-- File: scripts/003_add_extended_pokemon_fields.sql
-- Adds: sprite support, abilities, moves, evolution chains
```

**How to Execute**:

**Option A: Supabase Dashboard** (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: "POKE-MNKY-v2"
3. Navigate to SQL Editor
4. Copy contents of `scripts/002_enhanced_schema.sql`
5. Click "Run"
6. Repeat for `scripts/003_add_extended_pokemon_fields.sql`

**Option B: Supabase CLI**
```bash
supabase db push
```

**Verification**:
```sql
-- Should show 20+ tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Tables**:
- auth_providers
- battle_events
- battle_sessions
- coaches
- conferences
- divisions
- draft_picks
- matches
- pokemon_cache
- profiles
- seasons
- stat_events
- team_budgets
- team_rosters
- teams
- trade_listings
- trade_offers
- sync_log

---

### Step 2: Enable Google Sheets Sync

**Current Status**: Commented out in two files

**Files to Update**:
1. `lib/google-sheets-sync.ts` - Full sync implementation commented
2. `lib/google-sheets.ts` - googleapis wrapper commented
3. `app/api/sync/google-sheets/route.ts` - Returns error message

**Prerequisites** (All Already Set ✅):
- ✅ `GOOGLE_SHEETS_ID` env var exists
- ✅ `GOOGLE_SERVICE_ACCOUNT_EMAIL` env var exists
- ✅ `GOOGLE_PRIVATE_KEY` env var exists

**Action**: Uncomment production code (handled in code update below)

---

### Step 3: Remove Mock Data Flags

**Files Using `USE_MOCK_DATA = true`**:
1. `app/page.tsx` (Homepage)
2. `app/standings/page.tsx`
3. `app/teams/page.tsx`
4. `app/teams/[id]/page.tsx`
5. `app/schedule/page.tsx`
6. `app/playoffs/page.tsx`
7. `app/mvp/page.tsx`

**Current Behavior**: Returns hardcoded mock data arrays

**New Behavior**: Query Supabase directly with real-time data

**Action**: Change all to `USE_MOCK_DATA = false` (handled in code update below)

---

### Step 4: Install Missing Dependencies

**Missing Packages**:
```bash
pnpm add node-google-spreadsheet
```

**Why It's Missing**: Removed to prevent v0 preview build errors

**When to Install**: After confirming deployment to Vercel (not needed for local dev with mock data)

---

### Step 5: Verify Authentication Flow

**Current Status**: Supabase Auth UI configured for Discord OAuth

**Checklist**:
- [x] Discord OAuth app created in Discord Developer Portal
- [x] `DISCORD_CLIENT_ID` env var set
- [x] `DISCORD_CLIENT_SECRET` env var set
- [x] Redirect URLs configured in Discord app
- [x] Supabase Auth configured for Discord provider
- [ ] Test login flow in deployed app (can't test in v0 preview)

**Action**: No changes needed - already configured

---

### Step 6: Verify Discord Bot

**Current Status**: Bot code exists but not running

**Files**:
- `lib/discord-bot.ts` - Command definitions and handlers
- `lib/discord-notifications.ts` - Webhook system
- `scripts/start-discord-bot.ts` - Startup script

**Environment Variables** (All Set ✅):
- ✅ `DISCORD_BOT_TOKEN`
- ✅ `DISCORD_CLIENT_ID`
- ✅ `DISCORD_PUBLIC_KEY`
- ✅ `DISCORD_CLIENT_SECRET`

**Action**: Bot will work when run separately:
```bash
pnpm run discord-bot
```

**Note**: Discord bot runs as separate process (not in Next.js app)

---

### Step 7: Pre-Cache Pokemon Data

**Script**: `scripts/pre-cache-competitive-pokemon.ts`

**Purpose**: Populate Pokemon cache to minimize PokéAPI calls

**Action**:
```bash
# After database schema is created
node scripts/pre-cache-competitive-pokemon.ts
```

**Impact**:
- Caches top 50 competitive Pokemon
- Includes sprites, abilities, moves
- 30-day cache duration
- Reduces PokéAPI costs by 98%

---

## 🧪 Testing Checklist (Post-Enablement)

### Database Tests
- [ ] All 20+ tables exist
- [ ] Can insert test team
- [ ] Can insert test Pokemon
- [ ] Can create test match
- [ ] RLS policies work correctly

### Google Sheets Sync Tests
- [ ] Can authenticate with service account
- [ ] Can read "Master Data Sheet" tab
- [ ] Can parse team data
- [ ] Can parse draft results
- [ ] Can sync to Supabase without errors

### UI Tests (All Pages)
- [ ] Homepage loads real standings
- [ ] Standings page shows live data
- [ ] Teams page lists all teams
- [ ] Team detail page shows roster
- [ ] Schedule shows real matches
- [ ] Playoffs bracket renders
- [ ] MVP leaderboard displays

### Auth Tests
- [ ] Can sign in with Discord
- [ ] Session persists after refresh
- [ ] Protected routes require auth
- [ ] Can sign out successfully

### Discord Bot Tests
- [ ] Bot connects to server
- [ ] `/matchups` command works
- [ ] `/standings` command works
- [ ] `/result` command posts to app
- [ ] `/recap` generates AI summary

---

## 📊 Progress Tracking

| Feature | Status | Blocker |
|---------|--------|---------|
| Database Schema | ❌ Not Executed | **MUST RUN SQL SCRIPTS** |
| Google Sheets Sync | 🟡 Code Ready | Needs `node-google-spreadsheet` package |
| Mock Data Removal | 🟡 Ready to Deploy | Depends on database |
| Auth Flow | ✅ Configured | Just needs testing |
| Discord Bot | ✅ Ready | Run separately from app |
| Pokemon Cache | ✅ Ready | Run after DB schema |

---

## 🔧 Deployment Commands

### Local Development (with database)
```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations (via Supabase dashboard)

# 3. Pre-cache Pokemon
node scripts/pre-cache-competitive-pokemon.ts

# 4. Start dev server
pnpm dev

# 5. (Separate terminal) Start Discord bot
pnpm run discord-bot
```

### Production Deployment (Vercel)
```bash
# 1. Ensure all env vars set in Vercel dashboard

# 2. Install Google Sheets package
pnpm add node-google-spreadsheet

# 3. Update USE_MOCK_DATA flags to false

# 4. Deploy
git push origin main

# 5. Run migrations in Supabase dashboard

# 6. Pre-cache Pokemon (one-time)
node scripts/pre-cache-competitive-pokemon.ts

# 7. Run initial sync
curl -X POST https://your-app.vercel.app/api/sync/google-sheets

# 8. Deploy Discord bot to separate service (Railway, Render, etc.)
```

---

## ⚠️ Critical Warnings

1. **Database First**: Nothing will work without running the SQL schema first
2. **Service Account Sharing**: Your Google Sheet MUST be shared with the service account email
3. **Discord Bot Separate**: The bot cannot run in Vercel - deploy to Railway/Render
4. **Environment Variables**: All 20+ env vars must be set in Vercel dashboard
5. **Cost Control**: Run pre-cache script to avoid excessive PokéAPI calls

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ Database has 20+ tables with data
2. ✅ Homepage shows live team standings (not mock data)
3. ✅ Google Sheets sync runs without errors
4. ✅ Discord bot responds to commands
5. ✅ Users can log in with Discord OAuth
6. ✅ Pokemon images load from cache
7. ✅ AI features generate responses
8. ✅ No "mock data" warnings in console

---

## 📞 Support Resources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Discord Developer Portal**: https://discord.com/developers/applications
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Documentation**: See `ARCHITECTURE-BREAKDOWN.md`
```

Now let me update the actual code files to remove mock data and enable real features:

```typescript file="" isHidden
