# MCP Tool Call Debugging Guide

**Date**: January 18, 2026  
**Issue**: Tools configured but not executing  
**Status**: Debugging in Progress

---

## Current Status

✅ **Authentication**: Fixed - Using `X-API-Key` header  
✅ **MCP Server**: Accessible and working (direct tests pass)  
✅ **Tool Configuration**: Tools are being passed to `streamText`  
⚠️ **Tool Execution**: Need to verify if tools are actually being called

---

## Changes Made

### 1. Enhanced System Prompt
Updated system message to explicitly instruct when to use tools:
- "When users ask about Available Pokémon → Use get_available_pokemon tool"
- "ALWAYS use the available tools to get current, accurate data"

### 2. Explicit Tool Choice
Added `toolChoice: 'auto'` to ensure tools are enabled:
```typescript
toolChoice: tools ? 'auto' : undefined,
```

### 3. Enhanced Logging
Added comprehensive step logging:
- Step number and type
- Text preview
- Tool call count
- Tool result count
- Detailed tool call information

---

## Testing Instructions

### Step 1: Check Server Logs

When you send a message like "What Pokemon are available?", look for these log entries:

**Expected Logs:**
```
[General Assistant] Tool configuration: {
  mcpEnabled: true,
  hasTools: true,
  toolCount: 1,
  hasMcpTool: true
}

[General Assistant] Step finished: {
  stepNumber: 'tool-call',
  hasToolCalls: true,
  toolCallCount: 1
}

[General Assistant] ✅ Tool calls executed: {
  count: 1,
  tools: [{
    toolName: 'get_available_pokemon',
    args: { limit: 10 }
  }]
}

[General Assistant] ✅ Tool results received: {
  count: 1,
  results: [{
    toolName: 'get_available_pokemon',
    resultPreview: '{"pokemon":[...]}'
  }]
}
```

**If you see "⚠️ Step finished but no tool calls":**
- The model is not choosing to use tools
- May need more explicit prompt or tool descriptions

### Step 2: Test Queries

Try these queries in order of explicitness:

1. **Most Explicit**:
   ```
   Use the get_available_pokemon tool to show me Pokemon in the draft pool with their point values.
   ```

2. **Explicit**:
   ```
   What Pokemon are available in the draft pool? Use the get_available_pokemon tool to check.
   ```

3. **Natural Language**:
   ```
   What Pokemon are available in the draft pool? Show me their names and point values.
   ```

4. **Point Value Query**:
   ```
   Show me Pokemon that cost 20 points in the draft pool.
   ```

### Step 3: Check Browser Console

Open browser DevTools → Console tab and look for:
- Tool call events in the stream
- Any errors related to tool execution
- Network tab → Check the SSE stream for tool events

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "assistant" or "SSE"
3. Click on the request
4. Go to "Response" or "Preview" tab
5. Look for events like:
   ```json
   {"type": "tool-call", "toolName": "get_available_pokemon", ...}
   {"type": "tool-result", "toolName": "get_available_pokemon", ...}
   ```

---

## Common Issues & Solutions

### Issue 1: Tools Not Being Called

**Symptoms:**
- No tool call logs in server
- Assistant responds but doesn't use tools
- "⚠️ Step finished but no tool calls" in logs

**Possible Causes:**
1. Model not understanding when to use tools
2. Tool descriptions not clear enough
3. System prompt not explicit enough
4. Model choosing not to use tools

**Solutions:**
- ✅ Enhanced system prompt (already done)
- ✅ Added explicit toolChoice: 'auto' (already done)
- Try: Make query even more explicit
- Try: Use `toolChoice: 'required'` for testing (forces tool usage)

### Issue 2: Tools Called But Not Visible in UI

**Symptoms:**
- Tool calls in server logs ✅
- But no tool cards in UI ❌

**Possible Causes:**
- UI not rendering tool calls correctly
- Stream events not being parsed correctly
- Tool call format mismatch

**Solutions:**
- Check `base-chat-interface.tsx` for Tool component rendering
- Verify stream events include tool-call type
- Check if `toUIMessageStreamResponse` is handling tool calls

### Issue 3: Tool Calls Fail Silently

**Symptoms:**
- Tool calls in logs ✅
- But no tool results ❌
- Or error in tool execution

**Possible Causes:**
- MCP server error
- Authentication issue
- Tool execution timeout

**Solutions:**
- Check MCP server logs
- Verify authentication is working
- Check tool execution timeout settings

---

## Next Steps

1. **Test with explicit query**: "Use the get_available_pokemon tool..."
2. **Check server logs**: Look for tool call logs
3. **Check browser console**: Look for tool events
4. **Report findings**: What logs do you see?

---

## Debugging Commands

### Test MCP Server Directly
```bash
# Test functions endpoint
curl -H "X-API-Key: $MCP_API_KEY" \
  https://mcp-draft-pool.moodmnky.com/functions

# Test tool call
curl -X POST \
  -H "X-API-Key: $MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 5}' \
  https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon
```

### Test Assistant Route (requires auth)
```bash
# This requires a valid session - use browser instead
# Or add authentication to test script
```

---

**Last Updated**: January 18, 2026  
**Status**: Ready for Testing
