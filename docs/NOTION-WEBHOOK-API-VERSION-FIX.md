# Notion Webhook API Version Fix

## The Issue

Notion webhook subscriptions have an **API version setting** that controls the format of webhook payloads. If this is set incorrectly or to an old version, webhooks may fail.

## Current Status

- **Our API Client Version**: `2022-06-28` (old, but stable)
- **Latest Notion API Version**: `2025-09-03` (has breaking changes)
- **Webhook Subscription API Version**: Set in Notion UI (check your webhook settings)

## How to Fix

### Step 1: Check API Version in Notion Webhook Settings

1. Go to: https://www.notion.so/my-integrations
2. Click on "POKE MNKY" integration
3. Go to "Webhooks" tab
4. Click "Edit subscription" on your webhook
5. Look for **"API version"** dropdown/field
6. **Set it to**: `2022-06-28` (to match our current implementation)

**OR** if you want to use the latest:

1. Update our code to use `2022-06-28` (keep current for now - safer)
2. Or upgrade to `2025-09-03` (requires code changes due to breaking changes)

### Step 2: Verify Webhook Response Format

Notion expects a **200 OK** response with valid JSON. Our endpoint returns:

```json
{
  "success": true,
  "job_id": "uuid",
  "message": "Webhook received, sync started"
}
```

This should be fine, but let's ensure the n8n workflow passes it through correctly.

### Step 3: Check What's Actually Failing

In Notion's "View failed events", you should see:
- **Error code** (e.g., 404, 500, timeout)
- **Error message**
- **Timestamp**

This will tell us exactly why webhooks are failing.

## Recommended Action

**For now, keep API version `2022-06-28`** in Notion webhook settings to match our code. The issue is more likely:

1. **Integration not connected to database** (most critical)
2. **n8n workflow not responding correctly**
3. **Webhook URL incorrect**
4. **Response format issue**

## Testing After Fix

1. Set API version to `2022-06-28` in Notion webhook settings
2. Make sure integration is connected to database
3. Make a test change in Notion
4. Check n8n executions - should see success
5. Check "View failed events" - should stop failing

## If Still Failing

Check the actual error in "View failed events":
- **404**: Webhook URL wrong or n8n workflow not active
- **500**: Our API endpoint is erroring
- **Timeout**: n8n workflow taking too long
- **Invalid response**: Response format issue
