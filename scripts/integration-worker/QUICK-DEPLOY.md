# Quick Deployment Guide - Integration Worker

**For**: Server deployment via WSL/SSH  
**Time**: ~10 minutes

---

## Prerequisites Check

```bash
# In WSL, check if sshpass is installed
which sshpass || sudo apt-get install -y sshpass
```

---

## One-Command Deployment

From WSL, run:

```bash
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2
./scripts/integration-worker/deploy-to-server.sh
```

This script will:
1. ✅ Copy files to server
2. ✅ Build Docker image
3. ✅ Start service
4. ✅ Show logs

---

## Manual Deployment (Step-by-Step)

### 1. Copy Files to Server

```bash
# In WSL
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2
sshpass -p '<password>' rsync -avz --progress \
  --exclude 'node_modules' --exclude 'dist' --exclude '.env' \
  scripts/integration-worker/ \
  moodmnky@10.3.0.119:/home/moodmnky/POKE-MNKY/scripts/integration-worker/
```

### 2. SSH to Server

```bash
sshpass -p '<password>' ssh moodmnky@10.3.0.119
```

### 3. Add Service to docker-compose.yml

```bash
cd /home/moodmnky/POKE-MNKY
nano docker-compose.yml
```

Add the service definition from `docker-compose-snippet.yml` (or copy-paste it).

### 4. Update .env File

```bash
nano .env
```

Add:
```env
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DISCORD_RESULTS_CHANNEL_ID=your-channel-id
```

### 5. Build and Start

```bash
docker compose build integration-worker
docker compose up -d integration-worker
docker compose logs -f integration-worker
```

---

## Verify Deployment

### Check Service Status

```bash
docker compose ps integration-worker
```

Should show: `Up` status

### Check Logs

```bash
docker compose logs --tail=50 integration-worker
```

Should see:
```
[IntegrationWorker] Starting integration worker...
[ShowdownMonitor] Connected to Showdown server
[RoomManager] Room monitoring started
[IntegrationWorker] Worker started successfully
```

### Test Connection

```bash
docker compose exec integration-worker node -e "console.log('Worker is running')"
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose logs integration-worker

# Common issues:
# 1. Missing environment variables → Check .env file
# 2. Network issues → Verify poke-mnky-network exists
# 3. Showdown server not accessible → Check SHOWDOWN_SERVER_URL
```

### WebSocket Connection Fails

```bash
# Verify Showdown server is running
docker compose ps pokemon-showdown

# Test network connectivity
docker compose exec integration-worker ping pokemon-showdown
```

### Rebuild After Code Changes

```bash
docker compose build integration-worker
docker compose up -d integration-worker
```

---

## Next Steps

1. ✅ Monitor logs for first few minutes
2. ✅ Create test match with `status='in_progress'`
3. ✅ Complete test battle
4. ✅ Verify match updates in database
5. ✅ Verify standings recalculation

---

**Last Updated**: January 15, 2026
