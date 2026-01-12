# Coolify Deployment Guide - Discord Bot

This guide explains how to deploy the Discord bot to Coolify using Docker.

## Prerequisites

- Coolify instance set up and running
- Discord bot token and credentials
- Supabase credentials

## Repository Structure

**Note:** This is **NOT a monorepo**. It's a single Next.js application with:
- Main Next.js app (deploy separately to Vercel/Netlify)
- Discord bot service (deploy to Coolify using this guide)
- Database migrations (run in Supabase dashboard)

## Discord Bot Docker Setup

### Files Created

1. **Dockerfile.discord-bot** - Dockerfile specifically for Discord bot
2. **docker-compose.discord-bot.yml** - Docker Compose configuration
3. **.dockerignore** - Excludes unnecessary files from build

### Deployment Steps

#### Option 1: Using Coolify UI

1. **Create New Resource in Coolify**
   - Go to your Coolify dashboard
   - Click "New Resource" → "Docker Compose"
   - Or "New Resource" → "Docker Image"

2. **If Using Docker Compose:**
   - Select "docker-compose.discord-bot.yml"
   - Coolify will detect the service automatically

3. **If Using Docker Image:**
   - Build from Dockerfile: `Dockerfile.discord-bot`
   - Set build context to repository root
   - Command: `pnpm exec tsx scripts/start-discord-bot.ts`

4. **Set Environment Variables:**
   ```
   DISCORD_BOT_TOKEN=your-discord-bot-token
   DISCORD_CLIENT_ID=your-discord-client-id
   DISCORD_CLIENT_SECRET=your-discord-client-secret
   DISCORD_GUILD_ID=your-discord-guild-id
   NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Deploy"
   - Monitor logs to ensure bot connects successfully

#### Option 2: Using Git Integration

1. **Connect Repository**
   - In Coolify, connect your Git repository
   - Select branch (usually `main` or `master`)

2. **Configure Build**
   - Build Type: Docker Compose
   - Compose File: `docker-compose.discord-bot.yml`
   - Or Build Type: Dockerfile
   - Dockerfile: `Dockerfile.discord-bot`

3. **Set Environment Variables** (same as above)

4. **Enable Auto-Deploy**
   - Enable auto-deploy on push
   - Bot will redeploy automatically on code changes

## Manual Docker Commands

If you prefer to deploy manually:

```bash
# Build the image
docker build -f Dockerfile.discord-bot -t poke-mnky-discord-bot .

# Run with docker-compose
docker-compose -f docker-compose.discord-bot.yml up -d

# Or run directly
docker run -d \
  --name poke-mnky-discord-bot \
  --restart unless-stopped \
  -e DISCORD_BOT_TOKEN=your-token \
  -e DISCORD_CLIENT_ID=your-client-id \
  -e DISCORD_CLIENT_SECRET=your-secret \
  -e DISCORD_GUILD_ID=your-guild-id \
  -e NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  poke-mnky-discord-bot
```

## Verification

After deployment, check logs:

```bash
# In Coolify UI: View logs
# Or via Docker:
docker logs poke-mnky-discord-bot
```

You should see:
```
[v0] Registering Discord slash commands...
[v0] Discord commands registered successfully!
[v0] Discord bot is running...
```

## Health Checks

The Dockerfile includes a health check. Coolify will monitor:
- Container is running
- Bot process is active

## Troubleshooting

### Bot Won't Start
- Verify all environment variables are set correctly
- Check Discord bot token is valid
- Ensure bot has proper permissions in Discord server
- Review logs for specific errors

### Commands Not Registering
- Verify `DISCORD_CLIENT_ID` is correct
- Check `DISCORD_GUILD_ID` matches your server
- Ensure bot has `applications.commands` scope

### Connection Issues
- Verify Supabase credentials
- Check network connectivity
- Review Supabase logs for connection errors

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Discord bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Discord application client ID |
| `DISCORD_CLIENT_SECRET` | Yes | Discord application secret |
| `DISCORD_GUILD_ID` | Yes | Discord server (guild) ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `NODE_ENV` | No | Set to `production` |

## Architecture

```
┌─────────────────┐
│   Coolify       │
│                 │
│  ┌───────────┐ │
│  │ Discord   │ │
│  │ Bot       │ │───► Discord API
│  │ Container │ │
│  └─────┬─────┘ │
│        │       │
│        ▼       │
│  ┌───────────┐ │
│  │ Supabase  │ │
│  │ Database  │ │
│  └───────────┘ │
└─────────────────┘

┌─────────────────┐
│   Vercel/       │
│   Netlify       │
│                 │
│  ┌───────────┐ │
│  │ Next.js   │ │───► Users
│  │ App       │ │
│  └─────┬─────┘ │
│        │       │
│        ▼       │
│  ┌───────────┐ │
│  │ Supabase  │ │
│  │ Database  │ │
│  └───────────┘ │
└─────────────────┘
```

## Notes

- The Discord bot runs as a **separate service** from the Next.js app
- Both services share the same Supabase database
- The bot requires a **long-running process** (not serverless)
- Coolify is perfect for this use case (persistent containers)
- The Next.js app should be deployed separately (Vercel recommended)

## Updates

To update the bot:
1. Push changes to Git repository
2. Coolify will auto-deploy (if enabled)
3. Or manually trigger deployment in Coolify UI
4. Bot will restart with new code
