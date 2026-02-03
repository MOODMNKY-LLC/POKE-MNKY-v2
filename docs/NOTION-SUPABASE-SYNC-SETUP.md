# Notion → Supabase Sync Workflow Setup

**Workflow ID**: `AeazX7cYBLeNmRBJ`  
**Workflow Name**: "Notion Draft Board → Supabase Sync"  
**n8n Dashboard**: https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ

---

## Overview

This workflow uses **native n8n nodes** (Notion Trigger, Supabase, Discord) to sync changes from the Notion Draft Board to Supabase `draft_pool` table. This approach is more reliable than webhooks and doesn't require our custom API endpoint.

### Workflow Flow

1. **Notion Trigger** → Polls for page updates (every 2 minutes)
2. **Filter Added to Draft Board** → Only processes rows with checkbox = true
3. **Get Page Data** → Retrieves full Notion page details
4. **Get Current Season** → Queries Supabase for current season (`is_current = true`)
5. **Transform to Supabase** → Maps Notion properties to Supabase columns
6. **Upsert to Supabase** → Updates/inserts into `draft_pool` table
7. **Discord Notification** → Sends update notification

---

## Prerequisites

- ✅ Notion Draft Board database exists (`5e58ccd73ceb44ed83de826b51cf5c36`)
- ✅ Notion integration is connected to Draft Board
- ✅ Supabase `draft_pool` table exists
- ✅ At least one season exists with `is_current = true`
- ✅ Discord webhook URL available (optional)

---

## Step-by-Step Setup

### 1. Open Workflow in n8n

Go to: https://aab-n8n.moodmnky.com/workflow/AeazX7cYBLeNmRBJ

### 2. Set Up Notion API Credentials

**Node**: "Notion Trigger"

1. Click on the **"Notion Trigger"** node
2. Click **"Credential to connect with"** → **"Create New Credential"**
3. Select **"Internal Integration Secret"**
4. Enter your Notion API Token:
   - Get from: `.env.local` → `NOTION_API_KEY`
   - Or from Notion → Settings → Connections → Integrations → POKE MNKY
5. Click **"Save"**
6. The node should now show your credential name

**Important**: Make sure the Notion integration is connected to the Draft Board database:
- Open Draft Board in Notion
- Click **"..."** → **"Connections"** → Ensure **"POKE MNKY"** is connected

### 3. Set Up Supabase Credentials

**Nodes**: "Get Current Season" AND "Upsert to Supabase"

You need to set up Supabase credentials for **both** Supabase nodes:

#### For "Get Current Season" Node:

1. Click on **"Get Current Season"** node
2. Click **"Credential to connect with"** → **"Create New Credential"**
3. Select **"Supabase"**
4. Fill in:
   - **Host**: Extract from `NEXT_PUBLIC_SUPABASE_URL`
     - Example: If URL is `https://chmrszrwlfeqovwxyrmt.supabase.co`
     - Host is: `chmrszrwlfeqovwxyrmt.supabase.co`
   - **Service Role Secret**: From `SUPABASE_SERVICE_ROLE_KEY` (in `.env.local`)
5. Click **"Save"**

#### For "Upsert to Supabase" Node:

1. Click on **"Upsert to Supabase"** node
2. Click **"Credential to connect with"** → Select the **same credential** you just created
3. Both nodes should now use the same Supabase credential

### 4. Set Up Discord Webhook (Optional)

**Node**: "Discord Notification"

1. Click on **"Discord Notification"** node
2. In the **"Webhook URL"** field, enter your Discord webhook URL
   - Or use n8n environment variable: `{{ $env.DISCORD_WEBHOOK_URL }}`
   - To set environment variable: n8n Settings → Environment Variables

### 5. Configure Notion Trigger

**Node**: "Notion Trigger"

1. Click on **"Notion Trigger"** node
2. Verify settings:
   - **Database ID**: `5e58ccd73ceb44ed83de826b51cf5c36` (should be pre-filled)
   - **Event**: `Page Updated`
   - **Polling Interval**: `2 minutes` (minimum)
3. Click **"Save"**

### 6. Verify Function Node Logic

**Node**: "Transform to Supabase"

The function node should:
- Extract Notion properties (Name, Point Value, Status, etc.)
- Map Status to enum (`available`, `banned`, `unavailable`, `drafted`)
- Get season ID from "Get Current Season" node
- Validate required fields

**No changes needed** unless you want to customize the mapping logic.

### 7. Verify Supabase Upsert Configuration

**Node**: "Upsert to Supabase"

1. Click on **"Upsert to Supabase"** node
2. Verify:
   - **Table**: `draft_pool`
   - **Match Columns**: `season_id`, `pokemon_name` (unique constraint)
   - **Columns Mapping**: Should map all fields correctly
3. Click **"Save"**

### 8. Activate Workflow

1. Click **"Active"** toggle in the top-right corner
2. Workflow should turn green and show "Active"
3. The trigger will start polling Notion every 2 minutes

---

## Testing

### Test 1: Manual Execution

1. Click **"Execute Workflow"** button
2. Select **"Notion Trigger"** as the starting node
3. Click **"Execute"**
4. Check execution logs:
   - Should see Notion page data
   - Should see season query result
   - Should see transformed data
   - Should see Supabase upsert result
   - Should see Discord notification (if configured)

### Test 2: Real Notion Change

1. Open Notion Draft Board
2. Find a Pokémon row
3. Check **"Added to Draft Board"** checkbox
4. Wait 2 minutes (or trigger manually)
5. Check n8n executions:
   - Should see new execution
   - Should see successful sync
6. Check Supabase:
   - Query `draft_pool` table
   - Should see the Pokémon with correct data

### Test 3: Verify Discord Notification

1. Make a change in Notion
2. Wait for workflow execution
3. Check Discord channel
4. Should see notification with Pokémon details

---

## Troubleshooting

### Error: "The service refused the connection"

**Cause**: Supabase host URL is incorrect or credentials are wrong.

**Fix**:
1. Check Supabase host in credentials
2. Ensure it's the full hostname (e.g., `chmrszrwlfeqovwxyrmt.supabase.co`)
3. Verify Service Role Key is correct

### Error: "No current season found"

**Cause**: No season exists with `is_current = true` in Supabase.

**Fix**:
1. Query Supabase `seasons` table
2. Set `is_current = true` for the active season:
   ```sql
   UPDATE seasons SET is_current = true WHERE name = 'Season 6';
   ```

### Error: "Pokemon name is required"

**Cause**: Notion page doesn't have a "Name" property or it's empty.

**Fix**:
1. Check Notion Draft Board
2. Ensure "Name" property exists and has a value
3. Verify property name matches exactly: `Name`

### Workflow Not Triggering

**Possible Causes**:
1. Workflow not activated
2. Notion integration not connected to database
3. Polling interval too long
4. "Added to Draft Board" checkbox not checked

**Fix**:
1. Verify workflow is active (green toggle)
2. Check Notion → Connections → POKE MNKY is connected
3. Reduce polling interval (minimum 2 minutes)
4. Ensure checkbox is checked for rows you want to sync

### Supabase Upsert Failing

**Possible Causes**:
1. Missing required fields (`season_id`, `pokemon_name`)
2. Invalid enum value for `status`
3. Point value out of range (must be 1-20)
4. Constraint violation

**Fix**:
1. Check execution logs for specific error
2. Verify transform function outputs correct data
3. Check Supabase table constraints
4. Ensure season_id is valid UUID

---

## Data Mapping

### Notion → Supabase

| Notion Property | Supabase Column | Notes |
|----------------|-----------------|-------|
| `Name` (Title) | `pokemon_name` | Required |
| `Point Value` (Number) | `point_value` | Required, 1-20 |
| `Status` (Select) | `status` | Mapped to enum |
| `Tera Captain Eligible` (Checkbox) | `tera_captain_eligible` | Boolean |
| `Pokemon ID (PokeAPI)` (Number) | `pokemon_id` | Optional |
| `Notes` (Rich Text) | `banned_reason` | Optional |
| `Added to Draft Board` (Checkbox) | — | Filter only |

### Status Mapping

| Notion Status | Supabase Status |
|--------------|-----------------|
| `Available` | `available` |
| `Banned` | `banned` |
| `Unavailable` | `unavailable` |
| `Drafted` | `drafted` |

---

## Benefits of This Approach

✅ **Native Nodes**: Uses n8n's built-in Notion and Supabase nodes (more reliable)  
✅ **No API Endpoint**: Doesn't require our custom `/api/webhooks/notion` endpoint  
✅ **Direct Sync**: Notion → Supabase without intermediate steps  
✅ **Built-in Retries**: n8n handles retries automatically  
✅ **Error Handling**: Better error messages and debugging  
✅ **Polling**: More reliable than webhooks (Notion webhooks are inconsistent)  
✅ **Notifications**: Discord integration included  

---

## Next Steps

- ✅ Workflow created and configured
- ⏳ Set up credentials (Notion, Supabase, Discord)
- ⏳ Activate workflow
- ⏳ Test with real Notion changes
- ⏳ Monitor executions and logs
- ⏳ Adjust polling interval if needed

---

## Related Documentation

- [Notion Draft Board Schema](./DRAFT-BOARD-NOTION-SCHEMA.md)
- [Supabase Draft Pool Schema](../DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md)
- [n8n Workflow Manager](../lib/n8n/workflow-manager.ts)
