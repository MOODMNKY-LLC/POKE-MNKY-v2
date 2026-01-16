# Integration Worker Deployment Summary

**Date**: January 15, 2026  
**Status**: Ready for Deployment ✅

---

## Deployment Files Created

### Core Files
- ✅ `Dockerfile` - Container image definition
- ✅ `docker-compose-snippet.yml` - Service definition for server's docker-compose.yml
- ✅ `deploy-to-server.sh` - Automated deployment script (WSL)

### Documentation
- ✅ `DEPLOYMENT-SERVER.md` - Complete deployment guide
- ✅ `QUICK-DEPLOY.md` - Quick reference guide
- ✅ `DEPLOYMENT-SUMMARY.md` - This file

---

## Quick Start

### Option 1: Automated Deployment (Recommended)

From WSL:
```bash
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2
./scripts/integration-worker/deploy-to-server.sh
```

### Option 2: Manual Deployment

1. **Copy files to server**:
   ```bash
   sshpass -p '<password>' rsync -avz scripts/integration-worker/ \
     moodmnky@10.3.0.119:/home/moodmnky/POKE-MNKY/scripts/integration-worker/
   ```

2. **SSH to server**:
   ```bash
   sshpass -p '<password>' ssh moodmnky@10.3.0.119
   ```

3. **Add service to docker-compose.yml**:
   - Copy content from `docker-compose-snippet.yml`
   - Add to `/home/moodmnky/POKE-MNKY/docker-compose.yml`

4. **Update .env file**:
   ```env
   SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-key>
   DISCORD_RESULTS_CHANNEL_ID=<optional>
   ```

5. **Build and start**:
   ```bash
   cd /home/moodmnky/POKE-MNKY
   docker compose build integration-worker
   docker compose up -d integration-worker
   docker compose logs -f integration-worker
   ```

---

## Service Configuration

### Docker Compose Service

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
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOWDOWN_SERVER_URL` | Yes | Internal Docker network URL: `http://pokemon-showdown:8000` |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for database access |
| `DISCORD_RESULTS_CHANNEL_ID` | No | Discord channel for notifications |

---

## Verification Checklist

After deployment, verify:

- [ ] Service is running: `docker compose ps integration-worker`
- [ ] Logs show successful connection: `docker compose logs integration-worker`
- [ ] WebSocket connected to Showdown server
- [ ] Room Manager polling for active matches
- [ ] No errors in logs

---

## Monitoring

### View Logs
```bash
docker compose logs -f integration-worker
```

### Check Status
```bash
docker compose ps integration-worker
```

### Restart Service
```bash
docker compose restart integration-worker
```

### Update Service
```bash
# After code changes
docker compose build integration-worker
docker compose up -d integration-worker
```

---

## Expected Log Output

Successful deployment should show:

```
[IntegrationWorker] Starting integration worker...
[ShowdownMonitor] Connecting to ws://pokemon-showdown:8000/showdown/websocket...
[ShowdownMonitor] Connected to Showdown server
[RoomManager] Starting room monitoring...
[RoomManager] Synced 0 active rooms
[IntegrationWorker] Worker started successfully
```

---

## Troubleshooting

### Service Won't Start
- Check logs: `docker compose logs integration-worker`
- Verify environment variables in `.env`
- Check network: `docker network ls | grep poke-mnky`

### WebSocket Connection Fails
- Verify Showdown server is running: `docker compose ps pokemon-showdown`
- Check network connectivity: `docker compose exec integration-worker ping pokemon-showdown`
- Verify `SHOWDOWN_SERVER_URL` uses internal network name

### Database Connection Fails
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase project is accessible
- Verify service role key has proper permissions

---

## Next Steps After Deployment

1. ✅ Monitor logs for 5-10 minutes
2. ✅ Create test match with `status='in_progress'` and `showdown_room_id`
3. ✅ Complete test battle in Showdown
4. ✅ Verify match record updated in database
5. ✅ Verify standings recalculated
6. ✅ Verify Discord notification (if configured)

---

## Support

- **Documentation**: See `DEPLOYMENT-SERVER.md` for detailed guide
- **Quick Reference**: See `QUICK-DEPLOY.md` for quick commands
- **Test Results**: See `TEST-RESULTS.md` for test validation

---

**Last Updated**: January 15, 2026
