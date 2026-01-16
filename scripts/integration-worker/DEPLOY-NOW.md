# Deploy Integration Worker Now - Step by Step

**Quick Deployment Guide** - Follow these steps in order

---

## Step 1: Open WSL Terminal

Open your WSL terminal (Ubuntu-24.04) and navigate to the project:

```bash
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2
```

---

## Step 2: Set Server Password (Optional)

You can set the password as an environment variable to avoid typing it multiple times:

```bash
export SSH_PASSWORD="your-server-password-here"
```

**OR** you can enter it when prompted by the script.

---

## Step 3: Run Deployment Script

```bash
bash scripts/integration-worker/deploy-enhanced.sh
```

The script will:
1. ✅ Verify prerequisites (sshpass)
2. ✅ Test SSH connection
3. ✅ Copy files to server
4. ✅ Add service to docker-compose.yml
5. ✅ Build Docker image
6. ✅ Start service
7. ✅ Show logs and status

---

## Alternative: Manual Deployment

If you prefer manual control, follow these steps:

### A. Copy Files to Server

```bash
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2
sshpass -p "$SSH_PASSWORD" rsync -avz --progress \
  --exclude 'node_modules' --exclude 'dist' --exclude '.env' \
  scripts/integration-worker/ \
  moodmnky@10.3.0.119:/home/moodmnky/POKE-MNKY/scripts/integration-worker/
```

### B. SSH to Server

```bash
sshpass -p "$SSH_PASSWORD" ssh moodmnky@10.3.0.119
```

### C. Add Service to docker-compose.yml

On the server:

```bash
cd /home/moodmnky/POKE-MNKY

# Backup docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Edit docker-compose.yml
nano docker-compose.yml
```

Add this service definition at the end (before the `networks:` section if it exists):

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
    - ./logs/integration-worker:/app/logs
  healthcheck:
    test: ["CMD", "node", "-e", "process.exit(0)"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

Save and exit (Ctrl+X, Y, Enter)

### D. Update .env File

```bash
nano .env
```

Add or verify these variables exist:

```env
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DISCORD_RESULTS_CHANNEL_ID=your-channel-id-here
```

Save and exit.

### E. Build and Start

```bash
# Build the image
docker compose build integration-worker

# Start the service
docker compose up -d integration-worker

# Check status
docker compose ps integration-worker

# View logs
docker compose logs -f integration-worker
```

---

## Step 4: Verify Deployment

You should see logs like:

```
[IntegrationWorker] Starting integration worker...
[ShowdownMonitor] Connecting to ws://pokemon-showdown:8000/showdown/websocket...
[ShowdownMonitor] Connected to Showdown server
[RoomManager] Starting room monitoring...
[RoomManager] Synced 0 active rooms
[IntegrationWorker] Worker started successfully
```

---

## Step 5: Monitor and Test

### Monitor Logs

```bash
docker compose logs -f integration-worker
```

### Check Service Status

```bash
docker compose ps integration-worker
```

### Test with Real Battle

1. Create a test match in the database with:
   - `status = 'in_progress'`
   - `showdown_room_id = 'battle-gen9avgatbest-test123'`

2. Complete a battle in that room

3. Verify:
   - Match record updated
   - Standings recalculated
   - Discord notification sent (if configured)

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker compose logs integration-worker

# Verify environment variables
docker compose exec integration-worker env | grep SUPABASE
```

### WebSocket Connection Fails

```bash
# Check Showdown server is running
docker compose ps pokemon-showdown

# Test network connectivity
docker compose exec integration-worker ping pokemon-showdown
```

### Build Fails

```bash
# Check Dockerfile syntax
docker compose build --no-cache integration-worker

# View build logs
docker compose build integration-worker 2>&1 | tee build.log
```

---

## Quick Commands Reference

```bash
# View logs
docker compose logs -f integration-worker

# Restart service
docker compose restart integration-worker

# Stop service
docker compose stop integration-worker

# Rebuild and restart
docker compose build integration-worker && docker compose up -d integration-worker

# Check service health
docker compose exec integration-worker node -e "console.log('OK')"
```

---

**Ready to deploy? Run the script or follow manual steps above!**
