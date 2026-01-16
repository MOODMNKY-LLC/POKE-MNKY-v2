# Run Deployment Now

**Quick Command** - Execute this in WSL:

```bash
cd /mnt/c/DEV-MNKY/MOOD_MNKY/POKE-MNKY-v2
SSH_PASSWORD="your-server-password" bash scripts/integration-worker/deploy-non-interactive.sh
```

**Replace `your-server-password` with your actual server password.**

---

## What This Does

1. ✅ Copies all integration worker files to server
2. ✅ Adds service to docker-compose.yml (if not already present)
3. ✅ Builds Docker image
4. ✅ Starts the service
5. ✅ Shows logs and status

---

## After Deployment

### Verify Service is Running

```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose ps integration-worker'
```

### View Logs

```bash
ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs -f integration-worker'
```

### Check Environment Variables

Make sure `.env` file on server has:
```env
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

---

**Ready? Run the command above!**
