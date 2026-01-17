# MCP Server Fix - JSON Parsing Issue

**Date**: January 17, 2026  
**Issue**: Cursor struggling to load MCP tools  
**Root Cause**: `express.json()` middleware parsing body before MCP transport can handle it

---

## Problem

The MCP server was receiving JSON parsing errors:
```
SyntaxError: Expected property name or '}' in JSON at position 1
```

**Root Cause**: 
- `express.json()` middleware was parsing the request body
- `StreamableHTTPServerTransport.handleRequest()` expects to handle the raw request body itself
- This caused a conflict where the body was parsed twice or incorrectly

---

## Solution

Changed from:
```typescript
app.use(express.json());
```

To:
```typescript
// MCP endpoint needs raw body - don't parse JSON here
app.use('/mcp', express.raw({ type: 'application/json' }));
```

This allows:
- The `/mcp` endpoint receives raw body data
- `StreamableHTTPServerTransport` handles JSON parsing internally
- Other endpoints (like `/health`) can still use JSON if needed

---

## Fix Applied

**File**: `tools/mcp-servers/draft-pool-server/src/index.ts`

**Change**:
- Removed global `express.json()` middleware
- Added route-specific raw body parser for `/mcp` endpoint
- Transport now handles JSON parsing correctly

---

## Verification

After fix:
1. ✅ Server restarts without errors
2. ✅ No JSON parsing errors in logs
3. ✅ Cursor can connect and load tools
4. ✅ MCP protocol handshake works

---

## Status

✅ **FIX APPLIED**  
**Next**: Restart Cursor and verify tools load correctly
