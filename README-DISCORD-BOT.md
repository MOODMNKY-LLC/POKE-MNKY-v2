# Discord Bot - Quick Reference

> **⚠️ NOTE**: The Discord bot is now hosted externally on a local server (`moodmnky@10.3.0.119`).  
> This repository contains API endpoints and integrations that work with the external bot.  
> Bot initialization and command handling are managed by the external bot service.

## 🔗 External Bot Location

- **Server**: `moodmnky@10.3.0.119`
- **Status**: Bot runs independently on external server
- **API Endpoints**: All Discord API endpoints remain functional in this repository

## 📝 What's Still Here

- ✅ Discord API endpoints (`/api/discord/*`)
- ✅ Discord command handlers (`lib/discord-commands/`)
- ✅ Discord role sync utilities (`lib/discord-role-sync.ts`)
- ✅ Discord notifications (`lib/discord-notifications.ts`)
- ✅ Webhook integrations

## 🚀 Quick Start (Local Development)

\`\`\`bash
# 1. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 2. Run bot with hot-reload
pnpm run discord-bot:dev
\`\`\`

**Note**: Bot commands are now handled by the external bot service. This repository's API endpoints integrate with it.

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `pnpm run discord-bot` | Run bot once |
| `pnpm run discord-bot:dev` | Run bot with hot-reload (recommended for dev) |

## 🔧 Development vs Production

### Local Development
- Use `pnpm run discord-bot:dev` for hot-reload
- Edit code in `lib/discord-bot.ts` and see changes instantly
- Test commands in your Discord server
- Debug easily with console logs

### Production (Coolify)
- Deploy using `Dockerfile.discord-bot`
- Use `docker-compose.discord-bot.yml` for Coolify
- See `COOLIFY-DEPLOYMENT.md` for details

## ⚡ Activating slash commands

Slash commands must be **registered** with Discord (once per guild, or after adding/changing commands). From the repo root with `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, and `DISCORD_GUILD_ID` in `.env.local` or `.env`:

```bash
pnpm discord:register-commands
```

To register from the server where the bot runs, see **[docs/DISCORD-SLASH-COMMANDS-ACTIVATION.md](docs/DISCORD-SLASH-COMMANDS-ACTIVATION.md)** (includes SSH steps for `moodmnky@10.3.0.119`).

## 📚 Documentation

- **docs/DISCORD-SLASH-COMMANDS-ACTIVATION.md** — Activate slash commands (local or via SSH)
- **docs/DISCORD-COMMANDS-REGISTRATION.md** — Command registration and interaction handling
- **docs/DISCORD-INTEGRATION-GUIDE.md** — Webhooks, bot commands, channel mapping
- **LOCAL-DEVELOPMENT.md** - Complete local dev guide (if present)
- **COOLIFY-DEPLOYMENT.md** - Production deployment guide (if present)
- **SCRIPTS-GUIDE.md** - All scripts explained (if present)

## ⚡ Tips

1. **Run Next.js and Bot Together:**
   \`\`\`bash
   # Terminal 1
   pnpm dev
   
   # Terminal 2
   pnpm run discord-bot:dev
   \`\`\`

2. **Test Commands:**
   - `/standings` - View standings
   - `/pokemon name:Pikachu` - Look up Pokemon
   - `/matchups week:1` - View matchups

3. **Debug:**
   - Check console output
   - Review Supabase logs
   - Verify Discord bot permissions
