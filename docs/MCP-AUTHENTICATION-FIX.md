# MCP Authentication Fix

**Date**: January 18, 2026  
**Issue**: 401 Unauthorized when retrieving MCP tool list  
**Status**: Fixed

---

## Problem

The OpenAI SDK's MCP tool integration was failing with:
```
Error retrieving tool list from MCP server: 'poke-mnky-draft-pool'. 
Http status code: 401 (Unauthorized)
```

## Root Cause

The MCP server requires Bearer token authentication via `Authorization` header, but we weren't configuring authentication in the `openai.tools.mcp()` call.

## Solution

The `openai.tools.mcp()` function supports an `authorization` parameter that automatically becomes the `Authorization` header when the SDK calls the MCP server.

### Configuration

```typescript
const tools = {
  mcp: openai.tools.mcp({
    serverLabel: 'poke-mnky-draft-pool',
    serverUrl: mcpServerUrl,
    serverDescription: '...',
    requireApproval: 'never',
    // Add authorization parameter
    authorization: `Bearer ${process.env.MCP_API_KEY}`,
  }),
}
```

### Environment Variable

Ensure `MCP_API_KEY` is set in your environment:
- **Local**: `.env.local`
- **Production**: Vercel Dashboard → Settings → Environment Variables

---

## Alternative Approaches

If `authorization` parameter doesn't work, you can also use `headers`:

```typescript
headers: {
  'Authorization': `Bearer ${mcpApiKey}`,
  // Or: 'X-API-Key': mcpApiKey,
}
```

---

## Testing

After adding authentication:

1. **Check Environment Variable**:
   ```bash
   echo $MCP_API_KEY  # Should show your API key
   ```

2. **Test Chat Route**:
   - Send: `"What Pokémon are available?"`
   - Should no longer get 401 error
   - Tool calls should execute successfully

3. **Check Server Logs**:
   - Should see successful tool execution
   - No 401 errors

---

## Related Documentation

- `knowledge-base/aab-battle-league/MCP-SERVER-COMPLETE-GUIDE.md` - MCP server auth requirements
- OpenAI SDK MCP Tool Documentation - `authorization` and `headers` parameters

---

**Status**: Fixed  
**Last Updated**: January 18, 2026
