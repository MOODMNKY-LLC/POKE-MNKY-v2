# Notion Webhook Debugging Guide

Since Notion's "View failed events" doesn't show detailed errors, use these methods to debug:

## Method 1: Check n8n Execution Logs (Most Detailed)

1. **Go to n8n Dashboard**:
   - Visit: `https://aab-n8n.moodmnky.com`
   - Navigate to: **Workflows** → **"Notion Draft Board Sync"**
   - Click on **"Executions"** tab

2. **View Execution Details**:
   - Click on any failed execution (red status)
   - You'll see:
     - **Which node failed** (likely "Forward to API")
     - **Exact error message**
     - **Request/response data**
     - **HTTP status code**

3. **Common Errors to Look For**:
   - **404**: API endpoint not found
   - **500**: Our API is erroring
   - **Timeout**: Request taking too long
   - **Method not allowed**: Wrong HTTP method
   - **Connection refused**: Can't reach the API

## Method 2: Check Vercel Deployment Logs

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/dashboard
   - Select your project: **poke-mnky-v2**
   - Go to **"Deployments"** → Latest deployment
   - Click **"Functions"** tab
   - Find: `/api/webhooks/notion`

2. **View Function Logs**:
   - Click on the function
   - Check **"Logs"** tab
   - Look for entries starting with `[Notion Webhook req_...]`
   - You'll see:
     - When webhooks are received
     - What payloads look like
     - Any errors that occur

3. **Search for Errors**:
   - Look for `ERROR` or `[Notion Webhook]` in logs
   - Check timestamps around when Notion shows failures

## Method 3: Test Webhook Directly

Test if the endpoint is accessible:

```bash
# Test the endpoint directly
curl -X POST https://poke-mnky.moodmnky.com/api/webhooks/notion \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}' \
  -v
```

Expected response: `{"error": "Invalid signature"}` or similar (this confirms endpoint is working)

## Method 4: Check n8n Workflow Execution Data

In n8n, when you click on a failed execution:

1. **Look at "Forward to API" node**:
   - Check the **error message**
   - Check **input data** (what was sent)
   - Check **output data** (if any)

2. **Common Issues**:
   - **"Method not allowed"**: n8n might be sending wrong method
   - **"Connection timeout"**: API taking too long to respond
   - **"Invalid JSON"**: Body format issue
   - **"404 Not Found"**: URL incorrect

## Method 5: Enhanced Logging (Just Added)

I've added detailed logging to `/api/webhooks/notion`. After deploying, check Vercel logs for:

- `[Notion Webhook req_...] Received webhook request` - Confirms webhook received
- `[Notion Webhook req_...] Body length: X bytes` - Shows payload size
- `[Notion Webhook req_...] Headers: {...}` - Shows request headers
- `[Notion Webhook req_...] Parsed payload: {...}` - Shows event type and database ID
- `[Notion Webhook req_...] Error: {...}` - Shows any errors

## Quick Debugging Checklist

1. ✅ **n8n workflow active?** (Check toggle in n8n dashboard)
2. ✅ **Webhook URL correct?** (`https://aab-n8n.moodmnky.com/webhook/notion-draft-board`)
3. ✅ **Integration connected to database?** (Check Connections in Notion)
4. ✅ **API endpoint deployed?** (Check Vercel deployments)
5. ✅ **Environment variables set?** (`NOTION_WEBHOOK_SECRET`, etc.)

## Next Steps

1. **Deploy the updated webhook endpoint** (with enhanced logging)
2. **Check n8n execution logs** for the most recent failure
3. **Check Vercel logs** for webhook activity
4. **Share the error details** from n8n or Vercel logs

The n8n execution logs will show you the exact error - that's your best source of truth!
