# MCP Server Fix - Session Management

**Date**: January 17, 2026  
**Issue**: Cursor struggling to load MCP tools  
**Root Cause**: Missing proper session management for Streamable HTTP transport

---

## Problem

The MCP server was creating a new transport for every request instead of reusing sessions. This caused:
- JSON parsing errors
- Failed tool loading in Cursor
- No session persistence

---

## Solution

Implemented proper session management following MCP SDK best practices:

### Key Changes

1. **Session Storage**: Added `Map` to store transports by session ID
2. **Session Reuse**: Check for existing session before creating new one
3. **Session Lifecycle**: Proper initialization and cleanup handlers
4. **Error Handling**: Better error responses with JSON-RPC format

### Code Changes

**Before**:
```typescript
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({...});
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

**After**:
```typescript
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.has(sessionId)) {
    // Reuse existing session
    transport = transports.get(sessionId)!;
  } else {
    // Create new transport for new session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      enableJsonResponse: true,
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        console.log('MCP session initialized:', id);
      },
      onsessionclosed: (id) => {
        transports.delete(id);
        console.log('MCP session closed:', id);
      },
    });
    await server.connect(transport);
  }
  
  await transport.handleRequest(req, res, req.body);
});
```

---

## Benefits

1. ✅ **Proper Session Management**: Sessions are reused across requests
2. ✅ **Better Error Handling**: JSON-RPC compliant error responses
3. ✅ **Resource Cleanup**: Sessions are properly cleaned up on close
4. ✅ **Cursor Compatibility**: Matches Cursor's expected MCP behavior

---

## Status

✅ **FIX APPLIED**  
**Next**: Restart Cursor and verify tools load correctly
