# Notion Trigger Setup Guide

## Why Notion Trigger Instead of Webhooks?

Notion webhooks are **unreliable** and often don't trigger when expected. The n8n **Notion Trigger node** uses **polling** to detect changes, which is more reliable.

### Benefits:
- ✅ **More reliable** - Polls for changes instead of waiting for webhooks
- ✅ **No webhook subscription needed** - Works directly with Notion API
- ✅ **Detects all changes** - Page updates, property changes, etc.
- ⚠️ **Polling interval**: Minimum 2 minutes (Notion's "Last edited time" limitation)

## Workflow Created

**Workflow ID**: `dYgyZkpuAXlmF5VE`  
**Workflow URL**: https://aab-n8n.moodmnky.com/workflow/dYgyZkpuAXlmF5VE

## Step-by-Step Setup

### Step 1: Open Workflow in n8n

1. Go to: https://aab-n8n.moodmnky.com
2. Navigate to: **Workflows** → **"Notion Draft Board Sync (Trigger)"**
3. Click to open the workflow

### Step 2: Set Up Notion API Credentials

1. **Click on the "Notion Trigger" node** (first node in the workflow)
2. **Click "Credential to connect with Notion"** dropdown
3. **Click "Create New Credential"** or select existing if you have one
4. **Choose "Internal Integration Secret"**
5. **Enter your Notion API Token**:
   - Get it from your `.env.local` file (`NOTION_API_KEY`)
   - Or from Notion integration settings: https://www.notion.so/my-integrations
   - Token starts with `ntn_` or `secret_`
6. **Click "Save"**

### Step 3: Configure Trigger Node

1. **Database ID**: Should be pre-filled with `5e58ccd73ceb44ed83de826b51cf5c36`
2. **Event**: Select **"Page Updated"** (detects property changes including checkbox)
3. **Polling Interval**: Set to **2 minutes** (minimum due to Notion limitations)
4. **Simple**: Leave unchecked (we need full page data)

### Step 4: Verify Integration Connection in Notion

1. **Open Draft Board database** in Notion
2. **Click "..."** (three dots menu) → **"Connections"**
3. **Verify your integration is connected**:
   - Should see "POKE MNKY" or your integration name
   - If not connected, click **"Add connections"** and select it

### Step 5: Activate Workflow

1. **Click the toggle switch** in the top-right of the workflow editor
2. **Workflow should turn green** (active)
3. **Wait 2 minutes** for first poll cycle

### Step 6: Test

1. **Make a change** in Notion Draft Board:
   - Check/uncheck "Added to Draft Board" checkbox
   - Change a "Point Value"
   - Add/remove a Pokémon
2. **Wait up to 2 minutes** (polling interval)
3. **Check n8n executions**:
   - Go to workflow → **"Executions"** tab
   - Should see a new execution appear
4. **Check Vercel logs** for API processing

## How It Works

```
Notion Database Change
  ↓ (polling every 2 minutes)
n8n Notion Trigger Node
  ↓ (detects page updated)
HTTP Request → /api/webhooks/notion
  ↓
API Processes Change
  ↓
Supabase Sync Runs
```

## Troubleshooting

### No Executions Appearing

1. **Check credentials are set**:
   - Open Notion Trigger node
   - Verify credentials dropdown shows your credential
   - If not, add credentials (Step 2 above)

2. **Check workflow is active**:
   - Toggle switch should be green/ON
   - If gray/OFF, click to activate

3. **Check integration connection**:
   - Verify integration is connected to Draft Board in Notion
   - Without connection, API calls will fail

4. **Check polling interval**:
   - Minimum is 2 minutes
   - Changes won't appear immediately
   - Wait at least 2 minutes after making a change

### Executions Failing

1. **Check execution logs** in n8n:
   - Click on failed execution
   - Look at "Trigger Sync" node error
   - Common issues:
     - API endpoint unreachable
     - Authentication errors
     - Invalid payload format

2. **Check Vercel logs**:
   - Look for `[Notion Webhook req_...]` entries
   - Verify API is receiving requests

### Changes Not Detected

1. **Notion limitation**: "Last edited time" only updates every minute
2. **Polling delay**: Up to 2 minutes after change
3. **Verify change was saved**: Check Notion database directly

## Comparison: Webhook vs Trigger

| Feature | Webhook | Notion Trigger |
|---------|---------|----------------|
| Reliability | ⚠️ Unreliable | ✅ Reliable |
| Setup Complexity | High (subscription needed) | Low (just credentials) |
| Real-time | ✅ Instant | ⚠️ 2 min delay |
| Maintenance | High (webhook failures) | Low (automatic polling) |
| Recommended | ❌ No | ✅ Yes |

## Next Steps

After setup is complete:

1. ✅ **Deactivate old webhook workflow** (optional, to avoid confusion)
2. ✅ **Monitor executions** for a few days
3. ✅ **Verify sync jobs** are created in Supabase
4. ✅ **Check data syncs** correctly to Supabase

## Related Files

- `scripts/create-notion-trigger-workflow.ts` - Workflow creation script
- `app/api/webhooks/notion/route.ts` - API endpoint (works with both webhooks and triggers)
- `lib/n8n/workflow-manager.ts` - n8n workflow management
