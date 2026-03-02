# Discord Bot for POKE MNKY

Discord bot integration for league operations, match scheduling, and result posting.

## Features

- **Slash Commands**:
  - `/matchups` - View matchups for a specific week
  - `/submit` - Submit match results (AI-parsed)
  - `/standings` - View current league standings
  - `/recap` - Generate AI-powered weekly recap
  - `/pokemon` - Look up Pokémon information
  - `/draft` - Draft a Pokémon
  - `/draft-status` - View current draft status
  - `/draft-available` - View available Pokémon to draft
  - `/draft-my-team` - View your team's draft picks and budget

## Setup

### Environment Variables

Required environment variables:
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application client ID
- `DISCORD_GUILD_ID` - Discord server (guild) ID
- `APP_URL` - Application URL (e.g., `https://poke-mnky.moodmnky.com`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Docker

```bash
# Build and run
docker compose up -d discord-bot

# View logs
docker compose logs -f discord-bot
```

### Local Development

```bash
cd tools/discord-bot
pnpm install
pnpm dev
```

## Architecture

- **TypeScript** with `tsx` for runtime execution
- **discord.js** v14 for Discord API
- **@supabase/supabase-js** for database access
- Communicates with Next.js app via HTTP API calls

## Files

- `index.ts` - Main bot logic and command handlers
- `notifications.ts` - Webhook utilities for posting to Discord
- `start.ts` - Entry point script
- `Dockerfile` - Container build configuration

## Integration

The bot calls your Next.js app's API endpoints:
- `/api/matches` - Fetch matchups
- `/api/ai/parse-result` - Parse match results
- `/api/standings` - Get standings
- `/api/ai/weekly-recap` - Generate recap
- `/api/pokemon/{name}` - Get Pokémon data
- `/api/draft/*` - Draft operations
- `/api/discord/team` - Get team by Discord ID
