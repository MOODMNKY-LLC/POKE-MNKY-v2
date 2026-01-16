# Integration Worker

Automates Showdown battle result capture, standings updates, and Discord notifications.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set environment variables:
```bash
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DISCORD_RESULTS_CHANNEL_ID=your-channel-id
```

3. Build:
```bash
pnpm build
```

4. Run:
```bash
pnpm start
```

## Development

Run in watch mode:
```bash
pnpm dev
```

## Architecture

- **monitors/**: WebSocket monitoring for Showdown battle rooms
- **parsers/**: Replay log parsing to extract battle results
- **updaters/**: Database updates and standings recalculation

See `docs/PRIORITY-1-INTEGRATION-WORKER-IMPLEMENTATION.md` for complete documentation.
