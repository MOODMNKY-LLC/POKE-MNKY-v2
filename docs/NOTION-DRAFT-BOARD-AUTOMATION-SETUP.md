# Notion Draft Board Automation Setup Guide

This guide explains how to set up automated synchronization between the Notion Draft Board and Supabase using Notion webhooks and n8n workflows.

## Overview

The automation architecture enables real-time synchronization of draft board changes from Notion to Supabase:

```
Notion Database Change
  ↓ (webhook: database.content_updated)
n8n Webhook Trigger
  ↓
n8n HTTP Request Node
  ↓ (POST /api/sync/notion/pull with scope=["draft_board"])
Next.js API Route
  ↓
Notion Sync Worker
  ↓
Supabase draft_pool table
```

## Prerequisites

- Notion workspace with Draft Board database access
- n8n instance (self-hosted or cloud)
- Next.js application deployed with webhook endpoint accessible
- Environment variables configured (see below)

## Environment Variables

### Required in `.env.local` (Next.js App)

```bash
# Notion API
NOTION_API_KEY=secret_...

# Notion Webhook Secret (generate a random string)
NOTION_WEBHOOK_SECRET=your-random-secret-string-here

# Notion Sync Secret (for API authentication)
NOTION_SYNC_SECRET=your-sync-secret-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (for webhook callbacks)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Generate Webhook Secret

```bash
# Generate a random secret (32+ characters recommended)
openssl rand -hex 32
```

## Step 1: Configure Notion Webhook Integration

### Option A: Notion Integration Webhooks (Recommended)

1. **Create Notion Integration**:
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Name: "POKE MNKY Draft Board Sync"
   - Workspace: Select your workspace
   - Capabilities: Enable "Read content" and "Update content"
   - Click "Submit"

2. **Get Integration Token**:
   - Copy the "Internal Integration Token" (starts with `secret_`)
   - Add to `NOTION_API_KEY` in environment variables

3. **Connect Integration to Draft Board**:
   - Open your Draft Board database in Notion
   - Click "..." (three dots) → "Connections" → "Add connections"
   - Select "POKE MNKY Draft Board Sync"

4. **Set Up Webhook Subscription** (via API):
   ```bash
   curl -X POST https://api.notion.com/v1/subscriptions \
     -H "Authorization: Bearer $NOTION_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "parent": {
         "database_id": "5e58ccd73ceb44ed83de826b51cf5c36"
       },
       "webhook_url": "https://your-n8n-instance.com/webhook/notion-draft-board",
       "events": ["database.content_updated", "page.properties_updated"]
     }'
   ```

### Option B: Notion Database Automation (Alternative)

If webhook subscriptions are not available, use Notion's built-in database automations:

1. **Open Draft Board Database** in Notion
2. **Click "Automations"** (top right)
3. **Create New Automation**:
   - Trigger: "When a property changes"
   - Property: "Added to Draft Board" (checkbox)
   - Action: "Send webhook"
   - Webhook URL: `https://your-n8n-instance.com/webhook/notion-draft-board`
   - Method: POST
   - Body: Include database_id and page_id

**Limitations**:
- Limited to 5 webhook actions per automation
- Requires Notion paid plan
- Only sends property values, not full content

## Step 2: Create n8n Workflow

### Workflow Structure

1. **Webhook Trigger Node**:
   - Name: "Notion Webhook"
   - Method: POST
   - Path: `/webhook/notion-draft-board`
   - Response Mode: "Respond When Last Node Finishes"
   - Save webhook URL for Notion configuration

2. **IF Node** (Filter Draft Board Events):
   - Condition: Check if `body.data.database_id === "5e58ccd73ceb44ed83de826b51cf5c36"`
   - OR: Check if `body.database_id === "5e58ccd73ceb44ed83de826b51cf5c36"`
   - If true → Continue
   - If false → End workflow

3. **HTTP Request Node**:
   - Method: POST
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
   - Options:
     - Response Format: JSON
     - Ignore SSL Issues: false

4. **Error Handler Node** (Optional):
   - If HTTP Request fails:
     - Send notification (Discord/Slack/Email)
     - Log error to database

### n8n Workflow JSON Export

```json
{
  "name": "Notion Draft Board Sync",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "notion-draft-board",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Notion Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "webhookId": "notion-draft-board"
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.body.data.database_id }}",
              "operation": "equals",
              "value2": "5e58ccd73ceb44ed83de826b51cf5c36"
            }
          ]
        }
      },
      "id": "if-filter",
      "name": "Filter Draft Board",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "={{ $env.NEXT_PUBLIC_APP_URL }}/api/sync/notion/pull",
        "authentication": "headerAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "=Bearer {{ $env.NOTION_SYNC_SECRET }}"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": []
        },
        "specifyBody": "json",
        "jsonBody": "={\n  \"scope\": [\"draft_board\"],\n  \"incremental\": true,\n  \"since\": \"{{ $now.minus({ minutes: 5 }).toISO() }}\"\n}",
        "options": {}
      },
      "id": "http-request",
      "name": "Trigger Sync",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Notion Webhook": {
      "main": [[{ "node": "Filter Draft Board", "type": "main", "index": 0 }]]
    },
    "Filter Draft Board": {
      "main": [[{ "node": "Trigger Sync", "type": "main", "index": 0 }]]
    }
  }
}
```

## Step 3: Test Webhook Integration

### Test Notion Webhook

1. **Make a change in Notion Draft Board**:
   - Check/uncheck "Added to Draft Board" for a Pokémon
   - Change "Point Value"
   - Change "Status"

2. **Verify n8n receives webhook**:
   - Check n8n workflow execution logs
   - Should see webhook trigger fired

3. **Verify sync executes**:
   - Check `/admin/draft-board-management` page
   - View "Sync Status" panel
   - Should see new sync job with status "completed"

4. **Verify Supabase updated**:
   - Query `draft_pool` table
   - Check `updated_at` timestamp
   - Verify changes match Notion

### Manual Sync Test

```bash
curl -X POST https://your-app.vercel.app/api/sync/notion/pull \
  -H "Authorization: Bearer $NOTION_SYNC_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": ["draft_board"],
    "incremental": true
  }'
```

Expected response:
```json
{
  "success": true,
  "job_id": "uuid-here",
  "status": "running",
  "message": "Sync job started"
}
```

## Step 4: Fallback Scheduled Sync (Optional)

Create a scheduled n8n workflow as a fallback if webhooks fail:

1. **Cron Trigger Node**:
   - Cron Expression: `*/15 * * * *` (every 15 minutes)

2. **HTTP Request Node**:
   - Same as webhook workflow
   - URL: `/api/sync/notion/pull`
   - Body: `{ "scope": ["draft_board"], "incremental": true }`

This ensures sync happens even if webhooks are delayed or fail.

## Troubleshooting

### Webhook Not Received

1. **Check n8n webhook URL**:
   - Must be publicly accessible
   - HTTPS required (unless localhost)
   - Verify webhook path matches

2. **Check Notion integration**:
   - Integration connected to Draft Board database
   - Integration has read/update permissions

3. **Check webhook subscription**:
   - Verify subscription exists via Notion API
   - Check webhook URL is correct

### Sync Fails

1. **Check API endpoint**:
   - Verify `/api/sync/notion/pull` is accessible
   - Check authentication (NOTION_SYNC_SECRET)

2. **Check sync logs**:
   - View `sync_jobs` table in Supabase
   - Check `error_log` column for details

3. **Check Notion API**:
   - Verify `NOTION_API_KEY` is valid
   - Check API rate limits

### Sync Too Slow

1. **Enable incremental sync**:
   - Use `incremental: true` in sync request
   - Set `since` parameter to last sync time

2. **Optimize batch size**:
   - Default is 50 entries per batch
   - Adjust in `notion-sync-worker.ts` if needed

## Monitoring

### Sync Status Dashboard

Access `/admin/draft-board-management` to view:
- Last sync time
- Sync job status
- Pokémon synced count
- Error logs

### Database Queries

```sql
-- Recent sync jobs
SELECT 
  job_id,
  job_type,
  status,
  triggered_by,
  created_at,
  completed_at,
  pokemon_synced,
  pokemon_failed
FROM sync_jobs
WHERE config->>'scope' @> '["draft_board"]'
ORDER BY created_at DESC
LIMIT 10;

-- Failed syncs
SELECT *
FROM sync_jobs
WHERE status = 'failed'
  AND config->>'scope' @> '["draft_board"]'
ORDER BY created_at DESC;
```

## Security Considerations

1. **Webhook Secret Verification**:
   - `/api/webhooks/notion` verifies signature
   - Prevents unauthorized webhook calls

2. **API Authentication**:
   - `/api/sync/notion/pull` requires `NOTION_SYNC_SECRET`
   - Never expose secret in client-side code

3. **Rate Limiting**:
   - Notion API has rate limits
   - Incremental sync reduces API calls
   - Batch processing minimizes requests

## Next Steps

- Set up error notifications (Discord/Slack)
- Add sync analytics dashboard
- Implement retry logic for failed syncs
- Add webhook signature verification in n8n (if Notion provides signatures)

## References

- [Notion API Documentation](https://developers.notion.com/reference)
- [Notion Webhooks Guide](https://developers.notion.com/reference/webhooks)
- [n8n Documentation](https://docs.n8n.io/)
- [Draft Board Schema](./DRAFT-BOARD-NOTION-SCHEMA.md)
