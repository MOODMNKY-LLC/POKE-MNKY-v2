# Notion Realtime Integration Guide

Complete guide for setting up real-time synchronization between Notion Draft Board and Supabase using webhooks, n8n workflows, and Supabase Realtime.

## Overview

This integration enables **real-time bidirectional synchronization** between Notion and Supabase:

```
Notion Draft Board Change
  ↓ (webhook: database.content_updated)
n8n Webhook Trigger
  ↓
n8n HTTP Request → /api/sync/notion/pull
  ↓
Supabase draft_pool UPDATE
  ↓ (Supabase Realtime broadcast)
All Connected Clients Update Instantly
  ↓ (Parallel)
Discord Notification (for important changes)
```

## Architecture Components

### 1. Notion Webhook Subscriptions
- **Setup**: Created via Notion Integration Settings UI (not API)
- **Events**: `database.content_updated`, `page.properties_updated`
- **Verification**: Uses `verification_token` for signature validation
- **URL**: Points to n8n webhook endpoint (or direct API endpoint)

### 2. n8n Workflow Orchestration
- **Purpose**: Receives Notion webhooks and triggers sync
- **Workflow**: Webhook → Filter → HTTP Request → Discord Notification
- **Management**: Can be created programmatically via API

### 3. Supabase Realtime
- **Channel**: `draft-board-updates`
- **Event**: `draft_board_synced` broadcast
- **Clients**: Automatically receive updates without polling

### 4. Discord Notifications
- **Success**: `draft_board_sync` webhook
- **Errors**: `draft_board_errors` webhook
- **Format**: Rich embeds with sync statistics

## Prerequisites

- Notion workspace with Draft Board database access
- n8n instance (self-hosted or cloud)
- Next.js application deployed
- Supabase project with Realtime enabled
- Discord webhook URLs configured

## Environment Variables

### Required Variables

```bash
# Notion
NOTION_API_KEY=secret_...
NOTION_WEBHOOK_SECRET=<generated-secret>  # For signature verification
NOTION_SYNC_SECRET=<generated-secret>      # For API authentication

# n8n
N8N_API_URL=https://aab-n8n.moodmnky.com
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://poke-mnky.moodmnky.com
```

### Generate Secrets

```bash
# Generate webhook secret (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate sync secret (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 1: Database Setup

Run migrations to create required tables:

```bash
# Apply migrations
supabase migration up

# Or via Supabase Dashboard:
# 1. Go to Database → Migrations
# 2. Upload migration files:
#    - 20260201000000_create_notion_webhook_subscriptions.sql
#    - 20260201000001_create_discord_notification_log.sql
#    - 20260201000002_update_sync_jobs_triggered_by.sql
```

### Tables Created

1. **`notion_webhook_subscriptions`**: Tracks Notion webhook subscriptions
2. **`discord_notification_log`**: Logs Discord webhook notifications
3. **`sync_jobs`**: Updated to support `triggered_by = 'notion_webhook'`

## Step 2: Notion Webhook Subscription Setup

### Manual Setup (Required)

Notion webhooks are created via the integration settings UI, not API:

1. **Go to Integration Settings**:
   - Visit: https://www.notion.so/profile/integrations
   - Select your integration (or create new one)
   - Ensure it has access to Draft Board database

2. **Create Webhook Subscription**:
   - Navigate to "Webhooks" tab
   - Click "+ Create a subscription"
   - Enter webhook URL:
     - **n8n**: `https://aab-n8n.moodmnky.com/webhook/notion-draft-board`
     - **Direct**: `https://poke-mnky.moodmnky.com/api/webhooks/notion`
   - Select events:
     - `database.content_updated`
     - `page.properties_updated`
   - Click "Create subscription"

3. **Verify Subscription**:
   - Notion sends a POST request with `verification_token`
   - Copy the token from the request body
   - Go back to Notion → Click "⚠️ Verify"
   - Paste the token and click "Verify subscription"

4. **Store Subscription Metadata**:
   ```bash
   # Use setup script
   pnpm exec tsx --env-file=.env.local scripts/setup-notion-webhook.ts
   
   # Or manually via admin dashboard:
   # POST /api/admin/notion/webhook-subscription
   ```

### Webhook URL Options

**Option A: Via n8n (Recommended)**
- URL: `https://aab-n8n.moodmnky.com/webhook/notion-draft-board`
- Benefits: Workflow orchestration, error handling, retry logic
- Setup: Create n8n workflow first (see Step 3)

**Option B: Direct API**
- URL: `https://poke-mnky.moodmnky.com/api/webhooks/notion`
- Benefits: Simpler, fewer moving parts
- Trade-off: Less workflow control

## Step 3: n8n Workflow Setup

### Option A: Programmatic Creation

```bash
# Create workflow via API
curl -X POST https://poke-mnky.moodmnky.com/api/admin/n8n/create-workflow \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Option B: Manual Creation in n8n Dashboard

1. **Open n8n Dashboard**: https://aab-n8n.moodmnky.com

2. **Create New Workflow**:
   - Name: "Notion Draft Board Sync"
   - Add nodes:

   **Node 1: Webhook Trigger**
   - Type: `Webhook`
   - Method: `POST`
   - Path: `notion-draft-board`
   - Response Mode: "Respond When Last Node Finishes"
   - Copy webhook URL for Notion configuration

   **Node 2: IF Node (Filter Draft Board)**
   - Type: `IF`
   - Condition:
     ```
     {{ $json.body.data?.database_id || $json.body.database_id }} === "5e58ccd73ceb44ed83de826b51cf5c36"
     ```

   **Node 3: HTTP Request (Trigger Sync)**
   - Type: `HTTP Request`
   - Method: `POST`
   - URL: `{{ $env.NEXT_PUBLIC_APP_URL }}/api/sync/notion/pull`
   - Authentication: Header Auth
     - Name: `Authorization`
     - Value: `Bearer {{ $env.NOTION_SYNC_SECRET }}`
   - Body: JSON
     ```json
     {
       "scope": ["draft_board"],
       "incremental": true,
       "since": "{{ $now.minus({ minutes: 5 }).toISO() }}"
     }
     ```

   **Node 4: IF Node (Check Success)**
   - Type: `IF`
   - Condition: `{{ $json.success }} === true`

   **Node 5: Discord Webhook (Success)**
   - Type: `Discord`
   - Webhook URL: From `discord_webhooks` table (`draft_board_sync`)
   - Text: `✅ Draft board sync completed: {{ $json.pokemon_synced }} Pokémon`

   **Node 6: Discord Webhook (Error)**
   - Type: `Discord`
   - Webhook URL: From `discord_webhooks` table (`draft_board_errors`)
   - Text: `❌ Draft board sync failed: {{ $json.error }}`

3. **Activate Workflow**:
   - Toggle "Active" switch
   - Workflow will now receive webhooks from Notion

## Step 4: Discord Webhook Configuration

### Create Discord Webhooks

1. **Discord Server Settings**:
   - Server Settings → Integrations → Webhooks
   - Create two webhooks:
     - `draft_board_sync` - Success notifications
     - `draft_board_errors` - Error notifications

2. **Store in Database**:
   ```sql
   INSERT INTO discord_webhooks (name, webhook_url, enabled)
   VALUES
     ('draft_board_sync', 'https://discord.com/api/webhooks/...', true),
     ('draft_board_errors', 'https://discord.com/api/webhooks/...', true);
   ```

3. **Or via Admin Dashboard**:
   - Go to `/admin/discord`
   - Add webhooks with names above

## Step 5: Testing the Integration

### Test Webhook Reception

1. **Make Change in Notion**:
   - Open Draft Board database
   - Check/uncheck "Added to Draft Board" for a Pokémon
   - Change "Point Value" or "Status"

2. **Verify Webhook Received**:
   - Check n8n workflow executions
   - Should see webhook trigger fired
   - Check `/admin/draft-board-management` → Sync Status
   - Should see new sync job with status "completed"

3. **Verify Supabase Updated**:
   ```sql
   SELECT * FROM draft_pool
   WHERE updated_at > NOW() - INTERVAL '5 minutes'
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

4. **Verify Realtime Broadcast**:
   - Open draft board page (`/draft/board`)
   - Should see updates without page refresh
   - Check browser console for Realtime messages

5. **Verify Discord Notification**:
   - Check Discord channel
   - Should see success notification with sync stats

### Test Error Handling

1. **Simulate Sync Failure**:
   - Temporarily break Notion API key
   - Make change in Notion
   - Verify error notification sent to Discord

2. **Test Webhook Signature Verification**:
   - Send invalid signature
   - Verify webhook rejected (401)

## Step 6: Client-Side Realtime Subscription

Clients automatically subscribe to Realtime updates. The subscription is already implemented in:

- `components/draft/draft-board-client.tsx`
- `components/dashboard/draft-planning-section.tsx`

**Enhancement**: Subscribe to broadcast events:

```typescript
// In draft-board-client.tsx
useEffect(() => {
  const channel = supabase.channel("draft-board-updates")
    .on("broadcast", { event: "draft_board_synced" }, (payload) => {
      // Refresh draft board data
      refetch()
    })
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [])
```

## Monitoring & Troubleshooting

### Check Webhook Status

```bash
# Via API
curl https://poke-mnky.moodmnky.com/api/admin/notion/webhook-subscription

# Via Admin Dashboard
# Go to /admin/draft-board-management → Webhook Status panel
```

### Check Sync Jobs

```sql
-- Recent sync jobs
SELECT 
  job_id,
  triggered_by,
  status,
  pokemon_synced,
  pokemon_failed,
  created_at,
  completed_at
FROM sync_jobs
WHERE config->>'scope' @> '["draft_board"]'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Discord Notifications

```sql
-- Recent notifications
SELECT 
  webhook_name,
  event_type,
  success,
  sent_at,
  error_message
FROM discord_notification_log
ORDER BY sent_at DESC
LIMIT 20;
```

### Common Issues

1. **Webhook Not Received**:
   - Verify webhook URL is publicly accessible (HTTPS)
   - Check n8n workflow is active
   - Verify Notion integration has access to Draft Board

2. **Sync Fails**:
   - Check `sync_jobs` table for error logs
   - Verify `NOTION_API_KEY` is valid
   - Check Supabase connection

3. **Realtime Not Working**:
   - Verify Supabase Realtime is enabled
   - Check client subscription code
   - Verify broadcast is sent (check logs)

4. **Discord Notifications Not Sent**:
   - Check `discord_webhooks` table
   - Verify webhook URLs are valid
   - Check `discord_notification_log` for errors

## API Endpoints

### Webhook Endpoints

- `POST /api/webhooks/notion` - Receives Notion webhooks
- `GET /api/webhooks/notion` - Health check

### Admin Endpoints

- `POST /api/admin/notion/webhook-subscription` - Create subscription
- `GET /api/admin/notion/webhook-subscription` - List subscriptions
- `DELETE /api/admin/notion/webhook-subscription` - Delete subscription
- `POST /api/admin/n8n/create-workflow` - Create n8n workflow
- `POST /api/admin/trigger-notion-sync` - Manual sync trigger
- `POST /api/admin/test-realtime-broadcast` - Test Realtime broadcast

## Security Considerations

1. **Webhook Signature Verification**:
   - All webhooks verified using `NOTION_WEBHOOK_SECRET`
   - Invalid signatures rejected (401)

2. **API Authentication**:
   - Admin endpoints require authentication
   - Sync endpoint uses `NOTION_SYNC_SECRET` bearer token

3. **Rate Limiting**:
   - Notion API has rate limits
   - Incremental sync reduces API calls
   - Batch processing minimizes requests

## Performance Optimization

1. **Incremental Sync**:
   - Only syncs changes from last 5 minutes
   - Reduces API calls and processing time

2. **Realtime Broadcasts**:
   - Batched updates (not per-Pokémon)
   - Clients debounce updates (300ms)

3. **Error Handling**:
   - Failed syncs don't block webhook response
   - Retry logic in sync worker
   - Dead letter queue for persistent failures

## Future Enhancements

- Bidirectional sync: Supabase → Notion (draft state updates)
- Webhook retry queue with exponential backoff
- Webhook event replay for missed events
- Advanced filtering: Only sync specific property changes
- Webhook analytics dashboard
- Real-time collaboration features

## References

- [Notion Webhooks Documentation](https://developers.notion.com/reference/webhooks)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [n8n Documentation](https://docs.n8n.io/)
- [Draft Board Schema](./DRAFT-BOARD-NOTION-SCHEMA.md)
- [Notion Automation Setup](./NOTION-DRAFT-BOARD-AUTOMATION-SETUP.md)
