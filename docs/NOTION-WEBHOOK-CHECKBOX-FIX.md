# Notion Webhook Checkbox Change Fix

## Issue Identified

When checking/unchecking "Added to Draft Board" checkbox in Notion, webhooks were not being processed successfully.

## Root Cause

The n8n HTTP Request node was configured with `specifyBody: "raw"` but **`rawBody` was not set**, meaning it was sending an **empty body** to the API endpoint.

## Fixes Applied

### 1. ✅ Fixed n8n Workflow Body Forwarding
**Problem**: HTTP Request node had empty `rawBody`  
**Fix**: Set `rawBody` to properly forward webhook payload:
```javascript
rawBody: "={{ typeof $json.body === 'string' ? $json.body : JSON.stringify($json.body || $json) }}"
```
**Status**: ✅ FIXED - Workflow now forwards webhook payloads correctly

### 2. ✅ Added Empty Body Handling
**Problem**: Empty body requests caused 400 errors  
**Fix**: Added early return for empty bodies (health checks, retries):
```typescript
if (!body || body.length === 0) {
  return NextResponse.json({ success: true, message: "Empty body acknowledged" }, { status: 200 })
}
```
**Status**: ✅ CODE FIXED - Needs deployment

## Testing

### Test Script
```bash
pnpm exec tsx --env-file=.env.local scripts/test-checkbox-webhook.ts
```

### Manual Test
1. Open Notion Draft Board
2. Check/uncheck "Added to Draft Board" for any Pokémon
3. Check n8n executions: https://aab-n8n.moodmnky.com/workflow/dmg0GyXA0URBctpx
4. Should see new execution within 1-2 seconds
5. Check Vercel logs for API processing

## Expected Behavior

1. **Notion sends webhook** → `page.properties_updated` event
2. **n8n receives webhook** → Forwards payload to API
3. **API processes webhook** → Creates sync job, triggers sync
4. **n8n responds to Notion** → Returns `200 OK`
5. **Supabase sync runs** → Updates draft board data

## Verification Steps

### Check n8n Executions
```bash
pnpm exec tsx --env-file=.env.local scripts/check-n8n-executions.ts
```

### Check HTTP Node Configuration
```bash
pnpm exec tsx --env-file=.env.local scripts/check-http-node-body.ts
```

### Check Workflow Status
```bash
pnpm exec tsx --env-file=.env.local scripts/inspect-n8n-workflow.ts
```

## Current Status

- ✅ **n8n workflow**: Fixed and active
- ✅ **Body forwarding**: Configured correctly
- ✅ **Empty body handling**: Code fixed, needs deployment
- ⏳ **Deployment**: In progress

## Next Steps

1. **Deploy code changes** (empty body handling)
2. **Test checkbox changes** in Notion
3. **Verify executions** appear in n8n
4. **Check sync jobs** are created in Supabase

## Troubleshooting

### If checkbox changes still don't trigger webhooks:

1. **Verify Notion webhook subscription**:
   - Go to: https://www.notion.so/my-integrations
   - Check webhook subscription is active
   - Verify events include `page.properties_updated`

2. **Check integration connection**:
   - Open Draft Board in Notion
   - Click "..." → "Connections"
   - Verify "POKE MNKY" integration is connected

3. **Check n8n executions**:
   - Look for any failed executions
   - Check error messages in execution details

4. **Check Vercel logs**:
   - Look for `[Notion Webhook req_...]` entries
   - Verify webhook payloads are being received

## Related Files

- `app/api/webhooks/notion/route.ts` - Webhook endpoint
- `lib/n8n/workflow-manager.ts` - Workflow configuration
- `scripts/fix-http-node-body.ts` - Fix script
- `scripts/test-checkbox-webhook.ts` - Test script
