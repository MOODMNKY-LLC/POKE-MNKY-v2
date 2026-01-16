# Integration Worker - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd scripts/integration-worker
pnpm install
```

### Step 2: Set Environment Variables

Create `.env` file in `scripts/integration-worker/`:

```env
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Step 3: Test Connection

```bash
pnpm dev
```

You should see:
```
[IntegrationWorker] Starting integration worker...
[ShowdownMonitor] Connecting to wss://aab-showdown.moodmnky.com/showdown/websocket...
[ShowdownMonitor] Connected to Showdown server
[RoomManager] Starting room monitoring...
[IntegrationWorker] Worker started successfully
```

### Step 4: Verify It's Working

1. Create a test match in the app with `showdown_room_id` set
2. Set match status to `in_progress`
3. Complete a battle in that room
4. Check logs for:
   - `[ShowdownMonitor] Battle completed`
   - `[IntegrationWorker] Processing battle completion`
   - `[DatabaseUpdater] Updated match`
   - `[IntegrationWorker] Posted result to Discord`

## 🐛 Troubleshooting

### "WebSocket error" or Connection Fails

- Verify `SHOWDOWN_SERVER_URL` is correct
- Check Showdown server is running
- Verify network connectivity

### "Failed to fetch replay"

- Verify room ID format is correct
- Check replay exists on Showdown server
- Try different format prefixes (gen9avgatbest, gen9ou, etc.)

### "Match not found for room"

- Verify match exists in database
- Check `showdown_room_id` matches exactly
- Verify match status is `in_progress`

## 📚 Next Steps

- See `DEPLOYMENT.md` for production deployment
- See `README.md` for architecture details
- See `docs/PRIORITY-1-INTEGRATION-WORKER-IMPLEMENTATION.md` for complete documentation
