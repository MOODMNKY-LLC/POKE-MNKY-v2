# Integration Worker Deployment Guide

## Overview

The Integration Worker automates Showdown battle result capture, standings updates, and Discord notifications. This guide covers local development, testing, and production deployment.

## Prerequisites

- Node.js 20+ installed
- pnpm installed (`npm install -g pnpm`)
- Access to Supabase project
- Showdown server accessible
- Discord webhook configured

## Local Development Setup

### 1. Install Dependencies

```bash
cd scripts/integration-worker
pnpm install
```

### 2. Set Environment Variables

Create `.env` file:

```bash
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
# Or for local development:
# SHOWDOWN_SERVER_URL=http://10.3.0.119:8000

SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional - for Discord notifications
DISCORD_RESULTS_CHANNEL_ID=your-channel-id
```

### 3. Run in Development Mode

```bash
pnpm dev
```

This runs the worker in watch mode, automatically restarting on file changes.

### 4. Build for Production

```bash
pnpm build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 5. Run Production Build

```bash
pnpm start
```

## Testing

### Test Replay Parser

```bash
pnpm test
```

This tests the replay parser with a sample room ID. Update `src/test.ts` with a real room ID for testing.

### Manual Testing Checklist

- [ ] WebSocket connection to Showdown server
- [ ] Room subscription/unsubscription
- [ ] Battle completion event detection
- [ ] Replay fetching and parsing
- [ ] Match record updates
- [ ] Standings recalculation
- [ ] Discord notifications
- [ ] Error handling and retries
- [ ] Graceful shutdown

## Docker Deployment (Server)

### Add to Server's docker-compose.yml

Add this service to the server's `docker-compose.yml`:

```yaml
integration-worker:
  build:
    context: .
    dockerfile: scripts/integration-worker/Dockerfile
  container_name: poke-mnky-integration-worker
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - DISCORD_RESULTS_CHANNEL_ID=${DISCORD_RESULTS_CHANNEL_ID}
  networks:
    - poke-mnky-network
  depends_on:
    - pokemon-showdown
```

### Build and Start

On the server:

```bash
cd /home/moodmnky/POKE-MNKY
docker compose build integration-worker
docker compose up -d integration-worker
```

### View Logs

```bash
docker compose logs -f integration-worker
```

### Restart Service

```bash
docker compose restart integration-worker
```

## Monitoring

### Health Checks

The worker logs important events:
- `[ShowdownMonitor] Connected` - WebSocket connected
- `[RoomManager] Synced X active rooms` - Room sync successful
- `[IntegrationWorker] Processing battle completion` - Battle detected
- `[DatabaseUpdater] Updated match` - Match updated
- `[IntegrationWorker] Posted result to Discord` - Notification sent

### Error Monitoring

Watch for these error patterns:
- `WebSocket error` - Connection issues
- `Failed to fetch replay` - Replay parsing issues
- `Failed to update match` - Database update failures
- `Failed to notify Discord` - Webhook issues

## Troubleshooting

### WebSocket Connection Fails

**Symptoms**: `WebSocket error` in logs  
**Solutions**:
1. Verify `SHOWDOWN_SERVER_URL` is correct
2. Check Showdown server is running: `docker compose ps pokemon-showdown`
3. Verify network connectivity from worker to server
4. Check firewall rules allow WebSocket connections

### Replay Parsing Fails

**Symptoms**: `Failed to fetch replay` errors  
**Solutions**:
1. Verify room ID format matches Showdown format
2. Check replay URL is accessible
3. Verify replay file exists on Showdown server
4. Check replay format matches expected structure

### Database Updates Fail

**Symptoms**: `Failed to update match` errors  
**Solutions**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Check match exists in database with correct `showdown_room_id`
3. Verify RLS policies allow service role updates
4. Check database connection is stable

### Discord Notifications Fail

**Symptoms**: `Failed to notify Discord` errors  
**Solutions**:
1. Verify webhook URL is correct in `discord_webhooks` table
2. Check webhook is enabled (`enabled = true`)
3. Verify webhook URL is still valid (Discord webhooks can expire)
4. Check network connectivity to Discord

## Production Checklist

Before deploying to production:

- [ ] Environment variables set correctly
- [ ] Showdown server accessible
- [ ] Supabase connection tested
- [ ] Discord webhook configured and tested
- [ ] Worker tested with sample battle completion
- [ ] Logs monitored for errors
- [ ] Restart policy configured (`restart: unless-stopped`)
- [ ] Health monitoring set up

## Next Steps

After deployment:

1. Monitor logs for first few battles
2. Verify match updates are correct
3. Verify standings calculations
4. Verify Discord notifications
5. Set up alerting for errors
6. Document any issues encountered
