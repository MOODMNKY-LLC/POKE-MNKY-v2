# Notion Webhook Quick Debug Checklist

## Current Status

✅ **Code Deployed**: Enhanced logging is now live  
✅ **n8n Workflow**: Active and webhook endpoint registered  
✅ **Webhook Subscription**: Active in Notion  
✅ **Integration Connection**: Confirmed by user  
⚠️  **Environment Variable**: `NOTION_WEBHOOK_SECRET` needs to be set in Vercel  

## Step-by-Step Debugging

### Step 1: Verify Integration Connection (CRITICAL)

**This is the #1 reason webhooks fail!**

1. Open Draft Board database in Notion
2. Click "..." → "Connections"
3. **Verify "POKE MNKY" appears in the list**
4. If NOT connected:
   - Click "Add connections"
   - Select "POKE MNKY" or "POKE MNKY Draft Board Sync"
   - Verify it appears

**Without this connection, webhooks won't work!**

### Step 2: Verify Webhook URL in Notion

1. Go to: https://www.notion.so/my-integrations
2. Click "POKE MNKY" → "Webhooks" tab
3. Click "Edit subscription"
4. **Verify Webhook URL is exactly**:
   ```
   https://aab-n8n.moodmnky.com/webhook/notion-draft-board
   ```
5. **Check API version** (if visible):
   - Should be: `2022-06-28` (to match our code)
   - If set to newer version, change it

### Step 3: Test Webhook Manually

**Option A: Trigger via n8n UI**
1. Go to n8n: `https://aab-n8n.moodmnky.com`
2. Open workflow: "Notion Draft Board Sync"
3. Click "Execute Workflow" button (if available)
4. Or use "Test workflow" feature

**Option B: Make a change in Notion**
1. Open Draft Board
2. Change a "Point Value" for any Pokémon
3. **Immediately** check n8n executions
4. Should see new execution within 1-2 seconds

### Step 4: Check n8n Execution Logs

1. Go to: `https://aab-n8n.moodmnky.com`
2. Navigate: **Workflows** → **"Notion Draft Board Sync"** → **"Executions"**
3. Click on **most recent execution** (if any)
4. Look for:
   - **Which node failed?** (likely "Forward to API")
   - **Error message** (exact text)
   - **HTTP status code** (404, 500, timeout, etc.)
   - **Request data** (what was sent)
   - **Response data** (if any)

### Step 5: Check Vercel Logs (After Deployment)

1. Go to: https://vercel.com/dashboard
2. Select project: **poke-mnky-v2**
3. Go to: **Deployments** → Latest → **"Functions"**
4. Find: `/api/webhooks/notion`
5. Click → **"Logs"** tab
6. Look for entries starting with `[Notion Webhook req_...]`
7. Check timestamps around when Notion shows failures

### Step 6: Test API Endpoint Directly

```bash
# Test if endpoint is accessible
curl -X POST https://poke-mnky.moodmnky.com/api/webhooks/notion \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}' \
  -v
```

**Expected**: Should return `{"error": "Invalid signature"}` or similar (confirms endpoint works)

## Common Issues & Fixes

### Issue: "Method not allowed"
**Fix**: Check n8n HTTP Request node method is POST

### Issue: "404 Not Found"
**Fix**: 
- Verify webhook URL in Notion matches exactly
- Check n8n workflow is active
- Verify webhook path: `notion-draft-board`

### Issue: "Connection timeout"
**Fix**: 
- Check API endpoint is deployed
- Verify Vercel deployment succeeded
- Check if API is taking too long (>10 seconds)

### Issue: "Invalid signature"
**Fix**: 
- Verify `NOTION_WEBHOOK_SECRET` is set in Vercel
- Check signature header is being forwarded correctly

### Issue: No executions in n8n
**Fix**: 
- Integration not connected to database (most common!)
- Webhook URL incorrect
- n8n workflow not active

## What to Share for Further Debugging

When asking for help, provide:

1. **n8n Execution Error**:
   - Which node failed?
   - Exact error message
   - HTTP status code

2. **Vercel Logs** (if available):
   - Any `[Notion Webhook req_...]` entries
   - Error messages

3. **Notion Webhook Settings**:
   - Webhook URL (first 50 chars)
   - API version (if visible)
   - Integration connection status

4. **Test Results**:
   - Did manual test trigger execution?
   - What happened when you made a change?

## Next Actions

1. ✅ **Webhook Registration Fixed**: n8n webhook endpoint is now registered and responding
2. ⚠️  **Set Environment Variable in Vercel**:
   - Go to: https://vercel.com/dashboard → Select project → Settings → Environment Variables
   - Add: `NOTION_WEBHOOK_SECRET` = `8f660810604bf980c0c316de01260db37e813ff1795edc6d4bf2ca0ca8296093`
   - Apply to: Production, Preview, Development
   - Redeploy the latest deployment (or wait for next push)
3. ✅ **Make a test change** in Notion Draft Board after Vercel redeploys
4. ✅ **Check n8n executions** - should see webhook events flowing through
5. ✅ **Check Vercel logs** - should see `[Notion Webhook req_...]` entries

## Recent Fixes

### ✅ Webhook Registration Issue (RESOLVED)
**Problem**: n8n webhook endpoint returned `404 Not Found` - "webhook not registered"  
**Solution**: Deactivated and reactivated the workflow programmatically to force webhook re-registration  
**Status**: Webhook endpoint now responds with `200 OK` ✅

### ⚠️  Environment Variable (ACTION REQUIRED)
**Problem**: API endpoint returns `500` - "Webhook secret not configured"  
**Solution**: Set `NOTION_WEBHOOK_SECRET` in Vercel environment variables  
**Status**: Waiting for Vercel configuration ⏳
