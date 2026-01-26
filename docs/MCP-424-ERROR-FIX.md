# MCP 424 Failed Dependency Error - Fix Guide

**Date**: January 25, 2026  
**Error**: `424 Failed Dependency - Error retrieving tool list from MCP server`  
**Status**: 🔧 Fixing

---

## Problem

When using `openai.tools.mcp()` in the Vercel AI SDK, you get:
```
Error retrieving tool list from MCP server: 'poke-mnky-draft-pool'. 
Http status code: 424 (Failed Dependency)
```

## Root Causes

### 1. Environment Variable Format Issues

**Problem**: `.env.local` had quotes and Windows line endings (`\r\n`)

**Fix**: Remove quotes and ensure Unix line endings:
```bash
# ❌ Wrong
MCP_API_KEY="mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38\r\n"

# ✅ Correct
MCP_API_KEY=mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38
```

### 2. MCP Server Accessibility

**Problem**: OpenAI's SDK needs to reach the MCP server to retrieve the tool list. If the server is not publicly accessible, it will fail.

**Solution**: Ensure MCP server URL is publicly accessible:
- ✅ `https://mcp-draft-pool.moodmnky.com/mcp` (Public - Works)
- ❌ `http://localhost:3001/mcp` (Local only - Won't work)
- ❌ `http://10.3.0.119:3001/mcp` (Private network - Won't work)

### 3. Authorization Header Format

**Problem**: The authorization header might not be formatted correctly.

**Current Implementation**:
```typescript
tools.mcp = openai.tools.mcp({
  serverLabel: 'poke-mnky-draft-pool',
  serverUrl: mcpServerUrl,
  serverDescription: '...',
  requireApproval: 'never',
  authorization: `Bearer ${mcpApiKey}`, // ✅ Correct format
})
```

**Verify**: The `authorization` parameter should include `Bearer ` prefix.

---

## Debugging Steps

### Step 1: Verify Environment Variables

```bash
# Check if variables are set correctly
echo $MCP_API_KEY
echo $MCP_DRAFT_POOL_SERVER_URL

# In Node.js/Next.js
console.log('MCP_API_KEY:', process.env.MCP_API_KEY?.substring(0, 10) + '...')
console.log('MCP_SERVER_URL:', process.env.MCP_DRAFT_POOL_SERVER_URL)
```

**Expected**:
- No quotes around values
- No `\r\n` at the end
- Values match what you expect

### Step 2: Test MCP Server Health

```bash
curl -k -X GET \
  -H "Authorization: Bearer YOUR_API_KEY" \
  https://mcp-draft-pool.moodmnky.com/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "poke-mnky-draft-pool-mcp-server",
  "version": "1.0.1",
  "tools": {
    "count": 9,
    "available": [...]
  }
}
```

### Step 3: Test MCP Tool List Endpoint

```bash
curl -k -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  https://mcp-draft-pool.moodmnky.com/mcp
```

**Expected Response**: JSON-RPC response with tool list

### Step 4: Check Server Logs

If the server is running in Docker:
```bash
docker logs poke-mnky-draft-pool-mcp-server -f
```

Look for:
- Authentication errors (401)
- Tool list requests
- Any errors

---

## Solutions

### Solution 1: Clean Environment Variables

**Fix `.env.local`**:
```bash
# Remove quotes and \r\n
MCP_API_KEY=mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
```

**Restart Next.js dev server** after changes.

### Solution 2: Verify MCP Server is Public

**Check**:
- Server URL is `https://` (not `http://`)
- URL is publicly accessible (not localhost or private IP)
- SSL certificate is valid
- Server is running and healthy

### Solution 3: Add Debug Logging

**In API route** (`app/api/ai/pokedex/route.ts`):
```typescript
const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp'
const mcpApiKey = process.env.MCP_API_KEY

// Debug logging
console.log('[MCP Config]', {
  serverUrl: mcpServerUrl,
  hasApiKey: !!mcpApiKey,
  apiKeyPrefix: mcpApiKey?.substring(0, 10) + '...',
  serverUrlIsPublic: mcpServerUrl.startsWith('https://'),
})
```

### Solution 4: Fallback Without MCP

**Temporary workaround** - Disable MCP if it fails:
```typescript
// Conditionally add MCP tools
if (mcpEnabled && mcpApiKey && mcpServerUrl) {
  try {
    tools.mcp = openai.tools.mcp({
      serverLabel: 'poke-mnky-draft-pool',
      serverUrl: mcpServerUrl,
      serverDescription: '...',
      requireApproval: 'never',
      authorization: `Bearer ${mcpApiKey}`,
    })
  } catch (error) {
    console.error('[MCP] Failed to configure MCP tools:', error)
    // Continue without MCP tools
  }
}
```

---

## Common Issues

### Issue 1: Environment Variables Not Loading

**Symptoms**: `process.env.MCP_API_KEY` is `undefined`

**Solutions**:
1. Restart Next.js dev server
2. Check `.env.local` file exists
3. Verify variable names match exactly (case-sensitive)
4. Check for typos

### Issue 2: Server Not Accessible

**Symptoms**: 424 or connection errors

**Solutions**:
1. Verify server URL is public (`https://`)
2. Test server health endpoint
3. Check Cloudflare Tunnel is active (if using)
4. Verify DNS resolves correctly

### Issue 3: Authentication Failing

**Symptoms**: 401 Unauthorized

**Solutions**:
1. Verify API key is correct
2. Check Bearer token format: `Bearer ${key}`
3. Test with curl to verify auth works
4. Check server logs for auth errors

---

## Testing After Fix

### Test 1: Basic Query

```typescript
// Send message via chat interface
"What Pokémon are available?"
```

**Expected**: Should use MCP tools without 424 error

### Test 2: Check Console Logs

Look for:
- ✅ No 424 errors
- ✅ MCP tool calls executing
- ✅ Successful responses

### Test 3: Verify Tool Calls

Check that tools are being called:
- `get_available_pokemon`
- `get_draft_status`
- etc.

---

## Prevention

### Best Practices

1. **Environment Variables**:
   - Never use quotes in `.env.local`
   - Use Unix line endings (`\n`, not `\r\n`)
   - Keep values on single lines

2. **MCP Server**:
   - Always use public HTTPS URLs
   - Keep server healthy and accessible
   - Monitor server logs

3. **Error Handling**:
   - Add try-catch around MCP configuration
   - Log errors for debugging
   - Provide fallback behavior

---

## Related Documentation

- `MCP-DRAFT-POOL-SERVER-BREAKDOWN.md` - Complete MCP server guide
- `MCP-AUTHENTICATION-FIX.md` - Previous auth fixes
- `MCP-SERVER-INTEGRATION-GUIDE.md` - Integration guide

---

**Status**: 🔧 In Progress  
**Last Updated**: January 25, 2026
