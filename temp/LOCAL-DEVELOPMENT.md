# Local Development Guide - Discord Bot

This guide explains how to run the Discord bot locally for development and testing.

## Quick Start

### Option 1: Direct Node.js (Recommended for Development)

1. **Install dependencies** (if not already done):
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Set up environment variables:**
   \`\`\`bash
   # Copy example file
   cp .env.example .env.local
   
   # Edit .env.local with your credentials
   \`\`\`

3. **Run the bot:**
   \`\`\`bash
   # Standard run
   pnpm run discord-bot
   
   # With hot-reload (restarts on file changes)
   pnpm run discord-bot:dev
   \`\`\`

### Option 2: Docker Compose (Isolated Environment)

1. **Set up environment variables:**
   \`\`\`bash
   # Copy example file
   cp .env.example .env.local
   
   # Edit .env.local with your credentials
   \`\`\`

2. **Run with Docker Compose:**
   \`\`\`bash
   # Start bot with hot-reload
   docker-compose -f docker-compose.dev.yml up
   
   # Or run in background
   docker-compose -f docker-compose.dev.yml up -d
   
   # View logs
   docker-compose -f docker-compose.dev.yml logs -f
   
   # Stop
   docker-compose -f docker-compose.dev.yml down
   \`\`\`

---

## Environment Variables

Create a `.env.local` file (or `.env`) in the project root:

\`\`\`bash
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_GUILD_ID=your-discord-guild-id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Node Environment
NODE_ENV=development
\`\`\`

### Getting Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to "Bot" section → Copy token
4. Go to "OAuth2" → Copy Client ID and Secret
5. Enable "Server Members Intent" and "Message Content Intent" in Bot settings
6. Invite bot to your server with `applications.commands` scope

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Development Workflow

### Running Both Next.js App and Discord Bot

**Terminal 1 - Next.js App:**
\`\`\`bash
pnpm dev
# Runs on http://localhost:3000
\`\`\`

**Terminal 2 - Discord Bot:**
\`\`\`bash
pnpm run discord-bot:dev
# Bot runs and watches for file changes
\`\`\`

### Hot Reload

The `discord-bot:dev` script uses `tsx --watch` which automatically restarts the bot when you change:
- `lib/discord-bot.ts`
- `lib/discord-notifications.ts`
- `scripts/start-discord-bot.ts`
- Any imported files

### Testing Commands

Once the bot is running:

1. **Invite bot to your Discord server** (if not already)
2. **Test slash commands:**
   - `/standings` - View league standings
   - `/matchups week:1` - View week 1 matchups
   - `/pokemon name:Pikachu` - Look up Pokemon info
   - `/submit result:"Team A beat Team B 6-4"` - Submit match result
   - `/recap week:1` - Generate weekly recap

---

## Troubleshooting

### Bot Won't Start

**Error: `DISCORD_BOT_TOKEN environment variable is required`**
- Make sure `.env.local` exists and contains `DISCORD_BOT_TOKEN`
- Verify the token is correct (no extra spaces)

**Error: `Invalid token`**
- Check Discord Developer Portal
- Regenerate token if needed
- Ensure bot is enabled

**Error: `Missing Access`**
- Bot needs to be invited to your Discord server
- Use invite URL: `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands`
- Replace `YOUR_CLIENT_ID` with your actual client ID

### Commands Not Appearing

**Commands don't show up in Discord:**
- Wait 1-2 minutes after bot starts (Discord caches commands)
- Check logs for registration errors
- Verify `DISCORD_GUILD_ID` matches your server
- Ensure bot has `applications.commands` scope

**Commands show but don't work:**
- Check Supabase connection
- Verify environment variables are set
- Review bot logs for errors

### Supabase Connection Issues

**Error connecting to Supabase:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` is valid
- Ensure Supabase project is active
- Check network connectivity

---

## Development Tips

### 1. Use Separate Discord Server for Testing

Create a test Discord server to avoid spamming your production server:
- Test commands safely
- Experiment with features
- Debug without affecting real users

### 2. Enable Debug Logging

Add debug logging to see what's happening:

\`\`\`typescript
// In lib/discord-bot.ts
console.log('[DEBUG] Command received:', interaction.commandName);
console.log('[DEBUG] User:', interaction.user.username);
\`\`\`

### 3. Test Database Queries Separately

Test Supabase queries in isolation:
\`\`\`bash
# Use Supabase SQL Editor or create a test script
pnpm exec tsx scripts/test-supabase.ts
\`\`\`

### 4. Monitor Bot Logs

Keep bot logs visible:
\`\`\`bash
# Terminal output shows all bot activity
# Watch for errors, command usage, etc.
\`\`\`

---

## File Structure

\`\`\`
POKE-MNKY-v2/
├── lib/
│   ├── discord-bot.ts          # Main bot logic
│   ├── discord-notifications.ts # Notification helpers
│   └── supabase/               # Supabase client
├── scripts/
│   └── start-discord-bot.ts    # Bot entry point
├── .env.local                  # Your local env vars (gitignored)
├── .env.example                # Example env vars
└── docker-compose.dev.yml      # Docker dev setup
\`\`\`

---

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `discord-bot` | `pnpm run discord-bot` | Run bot once |
| `discord-bot:dev` | `pnpm run discord-bot:dev` | Run bot with hot-reload |

---

## Next Steps

1. ✅ Set up `.env.local` with your credentials
2. ✅ Run `pnpm run discord-bot:dev`
3. ✅ Test commands in Discord
4. ✅ Make changes and see hot-reload in action
5. 🚀 Deploy to Coolify when ready (see `COOLIFY-DEPLOYMENT.md`)

---

## Notes

- The bot runs **independently** from the Next.js app
- Both can run simultaneously on your machine
- Changes to bot code require restart (or use `:dev` for auto-restart)
- Environment variables are loaded from `.env.local` automatically
- Never commit `.env.local` to git (already in `.gitignore`)
