# Notion Webhook Verification Guide

## Understanding the 404 Error

When Notion tries to verify your webhook subscription, it sends a POST request to your webhook URL with a `verification_token` in the JSON body. The **404 error** means the endpoint doesn't exist yet.

**Where the token is sent:**
- Notion sends a POST request to: `https://aab-n8n.moodmnky.com/webhook/notion-draft-board`
- The request body contains: `{ "verification_token": "abc123..." }`

**How to retrieve it:**
- The token is in the request body JSON payload
- Your webhook receiver needs to extract it and return it to Notion

## Solution Options

### Option 1: Use n8n Workflow (Current Setup)

**Pros:**
- Centralized workflow management
- Can add filtering, logging, error handling
- Can integrate with Discord notifications

**Steps:**

1. **Create the n8n workflow** (must be done first):
   ```bash
   # Run the setup script
   pnpm exec tsx --env-file=.env.local scripts/setup-notion-webhook-verification.ts
   ```

2. **Activate the workflow in n8n**:
   - Go to: `https://aab-n8n.moodmnky.com`
   - Find the "Notion Draft Board Sync" workflow
   - Click "Activate" (toggle switch)
   - Copy the webhook URL (should be: `https://aab-n8n.moodmnky.com/webhook/notion-draft-board`)

3. **Update n8n workflow to handle verification**:
   - The workflow needs to forward the entire webhook payload to `/api/webhooks/notion`
   - Currently it calls `/api/sync/notion/pull` which doesn't handle verification tokens
   - **Temporary fix**: Update the HTTP Request node in n8n to:
     - URL: `https://poke-mnky.moodmnky.com/api/webhooks/notion`
     - Method: POST
     - Body: Pass through entire webhook payload (`{{ $json.body }}`)
     - Headers: Forward `x-notion-signature` header if present

4. **Retry verification in Notion**:
   - Go back to Notion webhook settings
   - Click "Verify subscription" again
   - The token will be forwarded through n8n to your API
   - Your API will return it to Notion automatically

### Option 2: Use Direct API Endpoint (Simpler)

**Pros:**
- Simpler setup (no n8n needed for verification)
- Direct connection, fewer moving parts
- Already handles verification tokens automatically

**Steps:**

1. **Use the direct webhook URL**:
   ```
   https://poke-mnky.moodmnky.com/api/webhooks/notion
   ```

2. **Configure in Notion**:
   - Go to: https://www.notion.so/my-integrations
   - Select your integration
   - Go to "Webhooks" tab
   - Set Webhook URL to: `https://poke-mnky.moodmnky.com/api/webhooks/notion`
   - Select events: `database.content_updated`, `page.properties_updated`
   - Click "Save"

3. **Verification happens automatically**:
   - Your `/api/webhooks/notion` endpoint already handles verification tokens
   - It extracts `verification_token` from the request body
   - Returns it to Notion automatically (see `app/api/webhooks/notion/route.ts` lines 73-89)

4. **Optional: Add n8n later**:
   - You can still use n8n for additional processing
   - Configure n8n to listen to your API endpoint or Supabase changes
   - Or update Notion webhook to point to n8n after verification succeeds

## How Verification Works

### Initial Verification Request

When you first set up a webhook, Notion sends:

```json
POST https://your-webhook-url
Content-Type: application/json

{
  "verification_token": "secret_abc123xyz..."
}
```

### Your Handler Response

Your endpoint should return:

```json
{
  "verification_token": "secret_abc123xyz..."
}
```

This proves you can receive and process webhooks from Notion.

### Regular Webhook Requests

After verification, Notion sends signed requests:

```
POST https://your-webhook-url
x-notion-signature: sha256=abc123...
Content-Type: application/json

{
  "type": "database.content_updated",
  "data": {
    "database_id": "5e58ccd7...",
    ...
  }
}
```

## Current Implementation Status

Your `/api/webhooks/notion` endpoint (`app/api/webhooks/notion/route.ts`) already handles:

✅ Verification token extraction (lines 73-89)  
✅ Signature verification (lines 29-66)  
✅ Draft Board filtering (lines 128-134)  
✅ Sync job creation (lines 171-193)  
✅ Async sync execution (lines 196-232)  

**The endpoint is ready!** You just need to:
1. Deploy it to production (if not already deployed)
2. Point Notion webhook to the correct URL
3. Ensure the URL is publicly accessible

## Troubleshooting

### 404 Error
- **Cause**: Endpoint doesn't exist or isn't accessible
- **Fix**: 
  - Deploy your changes to Vercel
  - Verify the URL is correct
  - Check if the endpoint is behind authentication (it shouldn't be)

### Invalid Verification Token
- **Cause**: Token wasn't extracted/returned correctly
- **Fix**: Check webhook handler logs, ensure token is returned in response

### Webhook Not Receiving Events
- **Cause**: Webhook not active, wrong database ID, or events not selected
- **Fix**: 
  - Verify webhook is active in Notion
  - Check database ID matches: `5e58ccd73ceb44ed83de826b51cf5c36`
  - Ensure events are selected: `database.content_updated`, `page.properties_updated`

## Recommended Approach

**For now**: Use **Option 2 (Direct API)** to get verification working quickly.

**Later**: If you want n8n in the flow, update the n8n workflow to forward webhooks to `/api/webhooks/notion` instead of calling `/api/sync/notion/pull` directly.

This gives you:
- ✅ Immediate verification success
- ✅ Full webhook handling (verification + regular webhooks)
- ✅ Option to add n8n processing layer later
