# Integration Worker - Server Deployment Guide

**Date**: January 15, 2026  
**Target**: Server at `10.3.0.119` (via SSH/WSL)  
**Service**: Integration Worker for Showdown battle automation

---

## Prerequisites

- WSL (Windows Subsystem for Linux) installed
- `sshpass` installed in WSL: `sudo apt-get install sshpass`
- SSH access to server (`moodmnky@10.3.0.119`)
- Server has Docker and Docker Compose installed
- Server has access to Supabase and Showdown server

---

## Deployment Steps

### Step 1: Install sshpass (if not already installed)

```bash
# In WSL
sudo apt-get update
sudo apt-get install -y sshpass
```

### Step 2: Copy Integration Worker to Server

```bash
# From WSL, navigate to project root
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2

# Copy integration-worker directory to server
sshpass -p '<your-password>' scp -r scripts/integration-worker moodmnky@10.3.0.119:/home/moodmnky/POKE-MNKY/
```

**Alternative**: Use rsync for better file transfer:
```bash
sshpass -p '<your-password>' rsync -avz --progress scripts/integration-worker/ moodmnky@10.3.0.119:/home/moodmnky/POKE-MNKY/scripts/integration-worker/
```

### Step 3: SSH into Server

```bash
# In WSL
sshpass -p '<your-password>' ssh moodmnky@10.3.0.119
```

### Step 4: Navigate to Server Project Directory

```bash
# On server
cd /home/moodmnky/POKE-MNKY
```

### Step 5: Add Integration Worker to docker-compose.yml

Edit the server's `docker-compose.yml` file:

```bash
nano docker-compose.yml
```

Add this service definition (add it after the existing services):

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
    - DISCORD_RESULTS_CHANNEL_ID=${DISCORD_RESULTS_CHANNEL_ID:-}
  networks:
    - poke-mnky-network
  depends_on:
    - pokemon-showdown
  volumes:
    # Optional: Mount logs directory for debugging
    - ./logs/integration-worker:/app/logs
```

**Note**: 
- `SHOWDOWN_SERVER_URL` uses internal Docker network name `pokemon-showdown:8000`
- Environment variables should be set in `.env` file on server
- Service depends on `pokemon-showdown` service

### Step 6: Update .env File on Server

Add these variables to the server's `.env` file:

```bash
nano .env
```

Add:
```env
# Integration Worker
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DISCORD_RESULTS_CHANNEL_ID=your-discord-channel-id-here
```

**Security Note**: Make sure `.env` file has proper permissions:
```bash
chmod 600 .env
```

### Step 7: Build and Start Service

```bash
# Build the integration worker image
docker compose build integration-worker

# Start the service
docker compose up -d integration-worker

# Verify it's running
docker compose ps integration-worker
```

### Step 8: View Logs

```bash
# View logs
docker compose logs -f integration-worker

# View last 100 lines
docker compose logs --tail=100 integration-worker
```

### Step 9: Verify Service is Running

You should see output like:
```
[IntegrationWorker] Starting integration worker...
[ShowdownMonitor] Connecting to ws://pokemon-showdown:8000/showdown/websocket...
[ShowdownMonitor] Connected to Showdown server
[RoomManager] Starting room monitoring...
[IntegrationWorker] Worker started successfully
```

---

## Quick Deployment Script

Create a deployment script for easier future deployments:

```bash
# On server, create deploy-integration-worker.sh
nano deploy-integration-worker.sh
```

Add:
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Integration Worker..."

cd /home/moodmnky/POKE-MNKY

echo "📦 Building image..."
docker compose build integration-worker

echo "🔄 Restarting service..."
docker compose up -d integration-worker

echo "📋 Checking status..."
docker compose ps integration-worker

echo "📝 Viewing logs..."
docker compose logs --tail=50 integration-worker

echo "✅ Deployment complete!"
```

Make executable:
```bash
chmod +x deploy-integration-worker.sh
```

Run:
```bash
./deploy-integration-worker.sh
```

---

## Automated Deployment from Local (WSL)

Create a local deployment script:

```bash
# In WSL, create deploy-to-server.sh
nano deploy-to-server.sh
```

Add:
```bash
#!/bin/bash
set -e

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"
SERVER_PATH="/home/moodmnky/POKE-MNKY"
PROJECT_ROOT="/mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2"

echo "🚀 Deploying Integration Worker to server..."

# Read password (or use SSH key)
read -sp "Enter server password: " PASSWORD
echo

# Copy files
echo "📦 Copying files..."
sshpass -p "$PASSWORD" rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  "$PROJECT_ROOT/scripts/integration-worker/" \
  "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/scripts/integration-worker/"

# Deploy on server
echo "🔧 Building and starting on server..."
sshpass -p "$PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY
docker compose build integration-worker
docker compose up -d integration-worker
docker compose logs --tail=50 integration-worker
ENDSSH

echo "✅ Deployment complete!"
```

Make executable:
```bash
chmod +x deploy-to-server.sh
```

Run:
```bash
./deploy-to-server.sh
```

---

## Troubleshooting

### Service Won't Start

**Check logs**:
```bash
docker compose logs integration-worker
```

**Common issues**:
1. **Missing environment variables**: Check `.env` file
2. **Network issues**: Verify `poke-mnky-network` exists
3. **Showdown server not accessible**: Check `SHOWDOWN_SERVER_URL`

### WebSocket Connection Fails

**Symptoms**: `WebSocket error` in logs

**Solutions**:
1. Verify Showdown server is running:
   ```bash
   docker compose ps pokemon-showdown
   ```

2. Check network connectivity:
   ```bash
   docker compose exec integration-worker ping pokemon-showdown
   ```

3. Verify `SHOWDOWN_SERVER_URL` uses internal network name:
   ```env
   SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
   ```

### Supabase Connection Fails

**Symptoms**: `Missing required environment variables`

**Solutions**:
1. Verify `.env` file has correct values
2. Check service role key is valid
3. Verify Supabase project is accessible

### Service Keeps Restarting

**Check restart reason**:
```bash
docker compose ps integration-worker
docker inspect poke-mnky-integration-worker | grep -A 10 "State"
```

**Common causes**:
- Missing environment variables
- Network connectivity issues
- Application errors (check logs)

---

## Monitoring

### View Real-Time Logs

```bash
docker compose logs -f integration-worker
```

### Check Service Status

```bash
docker compose ps integration-worker
```

### Restart Service

```bash
docker compose restart integration-worker
```

### Stop Service

```bash
docker compose stop integration-worker
```

### Update Service

```bash
# Pull latest code (if using git)
cd /home/moodmnky/POKE-MNKY
git pull

# Rebuild and restart
docker compose build integration-worker
docker compose up -d integration-worker
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SHOWDOWN_SERVER_URL` | Yes | Showdown server URL (use internal Docker network name) | `http://pokemon-showdown:8000` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://chmrszrwlfeqovwxyrmt.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key | `eyJhbGc...` |
| `DISCORD_RESULTS_CHANNEL_ID` | No | Discord channel ID for notifications | `1234567890` |

---

## Security Considerations

1. **Environment Variables**: Store sensitive keys in `.env` file, not in docker-compose.yml
2. **File Permissions**: Ensure `.env` has restricted permissions (`chmod 600`)
3. **Network Isolation**: Service runs on internal Docker network
4. **Service Role Key**: Use Supabase service role key (not anon key) for database access

---

## Rollback

If deployment causes issues:

```bash
# Stop service
docker compose stop integration-worker

# Remove service
docker compose rm -f integration-worker

# Revert docker-compose.yml changes
git checkout docker-compose.yml
```

---

## Next Steps After Deployment

1. ✅ **Monitor Logs**: Watch for errors or warnings
2. ✅ **Test with Real Battle**: Create a test match and complete battle
3. ✅ **Verify Match Updates**: Check database for updated match records
4. ✅ **Verify Standings**: Check standings recalculation
5. ✅ **Verify Discord**: Check Discord notifications (if configured)

---

**Last Updated**: January 15, 2026
