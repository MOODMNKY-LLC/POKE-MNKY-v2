# Scripts Guide - POKE MNKY v2

This guide explains all available scripts and when to use them.

## Database Setup Scripts

### ✅ Completed
- **Migrations** - All 5 migrations have been applied:
  - `20260112104004_create_schema.sql` - Base schema
  - `20260112104025_enhanced_schema.sql` - Extended schema
  - `20260112104030_add_extended_pokemon_fields.sql` - Pokemon cache enhancements
  - `20260112104051_user_management_rbac.sql` - RBAC system
  - `20260112104100_create_sync_jobs_table.sql` - Sync job tracking

## Pokemon Sync Scripts

### 1. Pre-Cache Competitive Pokemon ✅ COMPLETED
**File:** `scripts/pre-cache-competitive-pokemon.ts`

**Purpose:** Caches the top 48 competitive Pokemon to reduce API calls for frequently accessed Pokemon.

**Status:** ✅ Already completed (48 Pokemon cached)

**When to run:**
- After initial deployment ✅
- When new Pokemon become competitively relevant
- After cache expiry (30 days)

**Usage:**
\`\`\`bash
pnpm exec tsx scripts/pre-cache-competitive-pokemon.ts
\`\`\`

**Requirements:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. Full Pokemon Sync 🔄 RUNNING
**File:** `scripts/full-sync-pokemon.ts`

**Purpose:** Synchronizes ALL Pokemon (1-1025+) from PokéAPI to Supabase cache.

**Status:** 🔄 Currently running in background (~17 minutes)

**When to run:**
- After initial deployment ✅ (running now)
- When new generation releases
- To recover from cache corruption
- Overnight maintenance

**Usage:**
\`\`\`bash
pnpm exec tsx scripts/full-sync-pokemon.ts
\`\`\`

**Features:**
- Rate limiting: 100ms delay between requests (respects PokéAPI limits)
- Checkpoint every 50 Pokemon (resume capability)
- Retry failed requests 3 times with exponential backoff
- Progress tracking in `sync_jobs` table

**Requirements:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Estimated Time:** ~17 minutes for 1025 Pokemon

---

### 3. Incremental Pokemon Sync
**File:** `scripts/incremental-sync-pokemon.ts`

**Purpose:** Syncs only expired or new Pokemon entries (minimal API usage).

**Status:** ⏸️ Not needed right now (full sync running)

**When to run:**
- Daily via cron (3 AM UTC recommended)
- After competitive tier updates
- To maintain cache freshness

**Usage:**
\`\`\`bash
pnpm exec tsx scripts/incremental-sync-pokemon.ts
\`\`\`

**Benefits:**
- Minimal API usage (5-20 requests/day typically)
- Fast execution (1-5 minutes)
- Automatically detects new Pokemon releases

**Requirements:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Setup Cron Job (optional):**
\`\`\`bash
# Add to crontab (runs daily at 3 AM UTC)
0 3 * * * cd /path/to/project && pnpm exec tsx scripts/incremental-sync-pokemon.ts
\`\`\`

---

## Discord Bot Script

### 4. Start Discord Bot ⚠️ SERVICE (Not a one-time script)
**File:** `scripts/start-discord-bot.ts`

**Purpose:** Starts the Discord bot service for league notifications and commands.

**Status:** ⚠️ Service - Run separately, not part of setup

**Important:** This is a **long-running service**, not a one-time script. It should be:
- Deployed to a separate service (Railway, Render, etc.)
- Run in a separate terminal/process
- NOT run as part of initial setup

**When to run:**
- After deployment to production
- As a separate service/container
- In development: separate terminal window

**Usage:**
\`\`\`bash
# Development (separate terminal)
pnpm exec tsx scripts/start-discord-bot.ts

# Or via npm script
pnpm run discord-bot
\`\`\`

**Requirements:**
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_CLIENT_SECRET` - Discord application secret
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Deployment Options:**
1. **Railway** - Recommended for Discord bots
2. **Render** - Free tier available
3. **Vercel** - Not recommended (serverless functions timeout)
4. **Separate VPS** - Full control

**Note:** The bot cannot run in Vercel's serverless environment due to WebSocket requirements.

---

## Script Execution Summary

### ✅ Completed Setup Tasks
1. ✅ Database migrations (5 files)
2. ✅ Pre-cache competitive Pokemon (48 Pokemon)
3. 🔄 Full Pokemon sync (running in background)

### ⏸️ Optional/Future Tasks
1. ⏸️ Incremental sync (set up cron job for daily runs)
2. ⚠️ Discord bot (deploy as separate service)

---

## Environment Variables Required

All scripts require these environment variables:

\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Discord Bot (for start-discord-bot.ts only)
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
\`\`\`

---

## Monitoring Sync Jobs

Check sync job status:
\`\`\`sql
SELECT * FROM sync_jobs 
ORDER BY started_at DESC 
LIMIT 10;
\`\`\`

Check Pokemon cache status:
\`\`\`sql
SELECT 
  COUNT(*) as total_cached,
  MIN(pokemon_id) as min_id,
  MAX(pokemon_id) as max_id,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_cache
FROM pokemon_cache;
\`\`\`

---

## Troubleshooting

### Sync Script Fails
- Check environment variables are set
- Verify Supabase connection
- Check `sync_jobs` table for error logs
- Review PokéAPI rate limits (100 req/min)

### Discord Bot Won't Start
- Verify `DISCORD_BOT_TOKEN` is valid
- Check bot has proper permissions in Discord server
- Ensure WebSocket connections are allowed
- Don't run in Vercel serverless environment

### Cache Not Updating
- Check `expires_at` timestamps in `pokemon_cache`
- Run incremental sync to refresh expired entries
- Verify PokéAPI is accessible
