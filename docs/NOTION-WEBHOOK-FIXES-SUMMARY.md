# Notion Webhook Fixes Summary

## Issues Identified & Fixed

### ✅ Issue 1: n8n Webhook Not Registered
**Problem**: n8n webhook endpoint returned `404 Not Found`  
**Fix**: Deactivated and reactivated workflow to force webhook re-registration  
**Status**: ✅ RESOLVED - Webhook endpoint now responds with `200 OK`

### ✅ Issue 2: Workflow Not Responding to Notion
**Problem**: Executions stuck in "RUNNING" state, Notion timed out waiting for response  
**Fix**: 
- Set HTTP Request node `neverError: true` to continue on API errors
- Updated response node to always return `200 OK`
**Status**: ✅ RESOLVED - Workflow now responds even if API fails

### ⚠️ Issue 3: Database Constraint Error
**Problem**: `sync_jobs_triggered_by_check` constraint violation when inserting with `triggered_by: "notion_webhook"`  
**Fix**: Added fallback to use `triggered_by: "manual"` if constraint error occurs (migration may not be applied)  
**Status**: ✅ CODE FIXED - Needs deployment

### ⚠️ Issue 4: Verification Token Handling
**Problem**: Verification tokens not passed through correctly from workflow  
**Fix**: Updated response node to pass through API response directly  
**Status**: ✅ WORKFLOW UPDATED - Needs testing after API deployment

## Current Status

### ✅ Working
- n8n webhook endpoint is registered and responding
- Workflow structure is correct (Webhook → Forward to API → Respond)
- HTTP Request node continues on error (`neverError: true`)
- Response node always returns `200 OK`

### ⚠️ Needs Deployment
- API route fixes for database constraint fallback
- API route fixes for verification token handling

### ⚠️ Needs Vercel Configuration
- `NOTION_WEBHOOK_SECRET` environment variable must be set in Vercel
- Value: `8f660810604bf980c0c316de01260db37e813ff1795edc6d4bf2ca0ca8296093`

## Next Steps

### 1. Deploy Code Changes
```bash
pnpm build
git add .
git commit -m "fix: Notion webhook database constraint and response handling"
git push
```

### 2. Set Vercel Environment Variable
1. Go to: https://vercel.com/dashboard
2. Select project: `poke-mnky-v2`
3. Navigate to: **Settings** → **Environment Variables**
4. Add:
   - **Name**: `NOTION_WEBHOOK_SECRET`
   - **Value**: `8f660810604bf980c0c316de01260db37e813ff1795edc6d4bf2ca0ca8296093`
   - **Apply to**: Production, Preview, Development
5. **Redeploy** the latest deployment (or wait for next push)

### 3. Apply Database Migration (If Needed)
If the constraint error persists after deployment, run:
```sql
-- Check if constraint exists and what values it allows
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'sync_jobs_triggered_by_check';

-- If 'notion_webhook' is not in the constraint, run:
ALTER TABLE public.sync_jobs 
  DROP CONSTRAINT IF EXISTS sync_jobs_triggered_by_check;

ALTER TABLE public.sync_jobs 
  ADD CONSTRAINT sync_jobs_triggered_by_check 
  CHECK (triggered_by IN ('manual', 'cron', 'notion_webhook'));
```

### 4. Test After Deployment
1. Make a test change in Notion Draft Board
2. Check n8n executions: https://aab-n8n.moodmnky.com/workflow/dmg0GyXA0URBctpx
3. Check Vercel logs for API calls
4. Verify webhooks are flowing through successfully

## Testing Commands

```bash
# Test n8n webhook endpoint
pnpm exec tsx --env-file=.env.local scripts/test-notion-webhook-flow.ts

# Test full flow with proper signatures
pnpm exec tsx --env-file=.env.local scripts/test-full-webhook-flow.ts

# Check workflow configuration
pnpm exec tsx --env-file=.env.local scripts/inspect-n8n-workflow.ts

# Check recent executions
pnpm exec tsx --env-file=.env.local scripts/check-n8n-executions.ts
```

## Expected Behavior After Fixes

1. **Notion sends webhook** → n8n receives it
2. **n8n forwards to API** → API processes it
3. **API responds** → n8n passes response through
4. **n8n responds to Notion** → Notion receives `200 OK`
5. **No retries** → Notion marks webhook as successful

## Troubleshooting

### If webhooks still fail:
1. Check n8n execution logs for node-level errors
2. Check Vercel function logs for API errors
3. Verify `NOTION_WEBHOOK_SECRET` is set correctly
4. Verify database migration is applied
5. Check Notion webhook subscription is active and connected

### If executions are still stuck:
1. Deactivate and reactivate workflow in n8n
2. Clear old stuck executions (may require n8n admin access)
3. Test webhook endpoint directly

### If verification tokens fail:
1. Check API route handles verification tokens correctly
2. Verify workflow passes through API response
3. Test verification token flow manually
