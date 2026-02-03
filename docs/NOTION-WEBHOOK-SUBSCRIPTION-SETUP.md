# Notion Webhook Subscription Setup Guide

## Understanding the Issue

**Verification ≠ Active Subscription**

When you verify a webhook in Notion, you're only confirming that your endpoint can receive requests. **You still need to create an active webhook subscription** that will actually send events when the database changes.

## How Notion Webhooks Work

1. **Verification** - Confirms your endpoint is reachable
2. **Subscription** - Actually creates the webhook that sends events
3. **Events** - Notion sends webhooks when changes occur

## Step-by-Step Setup

### Option 1: Via Notion Integration Settings (Recommended)

1. **Go to Notion Integration Settings**:
   - Visit: https://www.notion.so/profile/integrations
   - Or: https://www.notion.so/my-integrations
   - Find your "POKE MNKY Draft Board Sync" integration

2. **Navigate to Webhooks Tab**:
   - Click on your integration
   - Look for "Webhooks" or "Subscriptions" tab
   - Click "Create webhook" or "Add webhook"

3. **Configure Webhook**:
   - **Webhook URL**: `https://aab-n8n.moodmnky.com/webhook/notion-draft-board`
   - **Parent**: Select your Draft Board database (ID: `5e58ccd73ceb44ed83de826b51cf5c36`)
   - **Events**: Select:
     - `database.content_updated`
     - `page.properties_updated`
   - Click "Create" or "Save"

4. **Verify Subscription**:
   - Notion will send a verification request
   - Your n8n workflow should receive it and forward to your API
   - Your API will return the verification token
   - Notion will mark the subscription as "Active"

### Option 2: Via Notion API (Programmatic)

If the UI doesn't work, you can create subscriptions via API:

```bash
curl -X POST https://api.notion.com/v1/subscriptions \
  -H "Authorization: Bearer $NOTION_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Notion-Version: 2022-06-28" \
  -d '{
    "parent": {
      "database_id": "5e58ccd73ceb44ed83de826b51cf5c36"
    },
    "webhook_url": "https://aab-n8n.moodmnky.com/webhook/notion-draft-board",
    "events": [
      "database.content_updated",
      "page.properties_updated"
    ]
  }'
```

**Note**: Notion's webhook subscription API may require specific permissions or may not be available for all integration types.

## Verifying Your Subscription is Active

### Check in Notion UI

1. Go to your integration settings
2. Check the "Webhooks" tab
3. You should see your subscription listed as "Active"
4. It should show:
   - Webhook URL
   - Parent database
   - Events subscribed to
   - Status: "Active" or "Verified"

### Check via Admin Dashboard

1. Go to `/admin/draft-board-management`
2. Check the "Webhook Status" panel
3. Should show active subscriptions

### Check n8n Executions

1. Go to `https://aab-n8n.moodmnky.com`
2. Navigate to: Workflows → "Notion Draft Board Sync" → Executions
3. Make a change in Notion
4. You should see a new execution appear within seconds

## Troubleshooting

### No Webhooks Received

**Check 1: Is the subscription active?**
- Go to Notion integration settings
- Verify subscription shows as "Active" (not just "Verified")
- If it's not active, you may need to create it again

**Check 2: Are the events configured?**
- Verify `database.content_updated` is selected
- Verify `page.properties_updated` is selected
- Some changes might not trigger webhooks (e.g., view changes, comments)

**Check 3: Is the database connected to the integration?**
- Open your Draft Board database in Notion
- Click "..." → "Connections"
- Verify "POKE MNKY Draft Board Sync" is connected
- If not, click "Add connections" and select it

**Check 4: Is the n8n workflow active?**
- Go to n8n dashboard
- Verify workflow toggle is ON (green)
- Check workflow execution logs for errors

**Check 5: What changes trigger webhooks?**
- ✅ Property changes (Point Value, Status, etc.)
- ✅ Page creation/deletion
- ✅ Database schema changes
- ❌ View changes (filtering, sorting)
- ❌ Comments
- ❌ Page content edits (if not tracked by properties)

### Webhook Received But Sync Fails

1. Check n8n execution logs for the "Forward to API" node
2. Check your API logs (Vercel deployment logs)
3. Verify `NOTION_API_KEY` is valid
4. Check Supabase connection

### Verification Works But No Events

This is the most common issue - **verification confirms the endpoint works, but you still need an active subscription**.

**Solution**: Create the webhook subscription in Notion integration settings (see Option 1 above).

## Testing the Integration

1. **Make a test change**:
   - Open Draft Board in Notion
   - Change a "Point Value" for any Pokémon
   - Or check/uncheck "Added to Draft Board"

2. **Check n8n**:
   - Within 1-2 seconds, you should see a new execution
   - Status should be "Success"

3. **Check Supabase**:
   - Query `draft_pool` table
   - Changes should appear within seconds

4. **Check Admin Dashboard**:
   - Go to `/admin/draft-board-management`
   - "Sync Status" should show a new sync job
   - Status should be "completed"

## Common Mistakes

1. **Only verifying, not creating subscription** - Verification is just the first step
2. **Wrong webhook URL** - Must match exactly: `https://aab-n8n.moodmnky.com/webhook/notion-draft-board`
3. **Integration not connected to database** - Must add connection in Notion
4. **Wrong events selected** - Need `database.content_updated` and `page.properties_updated`
5. **n8n workflow not active** - Check the toggle switch in n8n

## Next Steps

Once your subscription is active and you're receiving webhooks:

1. ✅ Monitor sync jobs in admin dashboard
2. ✅ Check n8n execution logs periodically
3. ✅ Set up Discord notifications (optional)
4. ✅ Test with various property changes
5. ✅ Verify Supabase data updates correctly
