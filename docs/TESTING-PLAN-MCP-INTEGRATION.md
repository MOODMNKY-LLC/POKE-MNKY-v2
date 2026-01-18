# Testing Plan: MCP Integration & Tool Call Visibility

**Date**: January 18, 2026  
**Purpose**: Verify current implementation before building new features  
**Status**: Ready for Execution

---

## Test Objectives

1. ✅ Verify MCP tools are accessible from chat route
2. ✅ Verify tool calls are executed when requested
3. ✅ Verify tool call events are emitted in stream
4. ✅ Verify UI renders tool calls correctly
5. ✅ Verify tool results are displayed

---

## Test Cases

### Test 1: Simple Tool Call - Get Available Pokémon

**Goal**: Verify basic tool call execution and visibility

**Steps**:
1. Open chat interface
2. Send message: "What Pokémon are available in the draft pool?"
3. Observe:
   - Does assistant respond?
   - Do tool call cards appear?
   - Is tool executed?
   - Are results shown?

**Expected Behavior**:
- Assistant says it will check
- Tool call card appears: "get_available_pokemon"
- Tool executes (check server logs)
- Results displayed in tool card
- Assistant summarizes results

**Success Criteria**:
- ✅ Tool call card visible
- ✅ Tool executed successfully
- ✅ Results displayed
- ✅ Assistant response includes tool data

---

### Test 2: Server-Side Tool Execution Verification

**Goal**: Verify MCP server is actually being called

**Steps**:
1. Check server logs when sending test message
2. Look for:
   - MCP tool call requests
   - Tool execution logs
   - Tool results

**Expected Logs**:
```
[General Assistant] Tool call: get_available_pokemon
[MCP] Calling tool: get_available_pokemon
[MCP] Tool result: { pokemon: [...], count: X }
```

**Success Criteria**:
- ✅ MCP server receives requests
- ✅ Tools execute successfully
- ✅ Results returned

---

### Test 3: Stream Event Verification

**Goal**: Verify tool call events are in the stream

**Steps**:
1. Intercept network requests
2. Check SSE stream events
3. Look for tool call events

**Expected Events**:
```json
{"type": "assistant_text_delta", "delta": "I'll check..."}
{"type": "tool_call", "toolName": "get_available_pokemon", ...}
{"type": "tool_result", "toolCallId": "...", "result": {...}}
{"type": "assistant_text_delta", "delta": "Based on the draft pool..."}
```

**Success Criteria**:
- ✅ Tool call events present in stream
- ✅ Tool result events present
- ✅ Events properly formatted

---

### Test 4: UI Component Rendering

**Goal**: Verify Tool component receives and renders tool calls

**Steps**:
1. Check React DevTools
2. Inspect Tool components
3. Verify props are correct

**Expected Props**:
```typescript
{
  toolName: "get_available_pokemon",
  type: "tool-call",
  state: "output-available",
  input: {...},
  output: {...}
}
```

**Success Criteria**:
- ✅ Tool component receives props
- ✅ Tool renders correctly
- ✅ Input/output displayed

---

### Test 5: Multiple Tool Calls

**Goal**: Verify multiple tool calls work sequentially

**Steps**:
1. Send: "What Pokémon are available and what's my team budget?"
2. Observe multiple tool calls

**Expected Behavior**:
- Multiple tool call cards appear
- Tools execute in sequence
- Results displayed for each

**Success Criteria**:
- ✅ Multiple tool calls work
- ✅ Sequential execution
- ✅ All results displayed

---

## Debugging Checklist

If tests fail, check:

### Tool Calls Not Visible
- [ ] Check server logs for tool execution
- [ ] Verify MCP server URL is correct
- [ ] Verify MCP_API_KEY is set
- [ ] Check network tab for MCP requests
- [ ] Verify tool configuration in route

### Tool Calls Not Executing
- [ ] Verify MCP server is accessible
- [ ] Check MCP server logs
- [ ] Verify tool names match MCP server
- [ ] Check authentication headers

### Tool Calls Execute But Not Displayed
- [ ] Check stream events format
- [ ] Verify Tool component is rendering
- [ ] Check useChat hook configuration
- [ ] Verify message parts include tool-call

### Tool Results Not Shown
- [ ] Check tool result format
- [ ] Verify ToolOutput component
- [ ] Check for errors in console
- [ ] Verify result parsing

---

## Test Execution

### Manual Testing Steps

1. **Start Dev Server**
   ```bash
   pnpm dev
   ```

2. **Open Browser**
   - Navigate to app
   - Open chat interface
   - Open DevTools (Network + Console tabs)

3. **Run Test 1**
   - Send test message
   - Observe UI
   - Check console logs
   - Check network requests

4. **Run Test 2**
   - Check terminal/server logs
   - Look for MCP calls
   - Verify tool execution

5. **Run Test 3**
   - Inspect SSE stream in Network tab
   - Check event format
   - Verify tool events

6. **Run Test 4**
   - Use React DevTools
   - Inspect Tool components
   - Check props

---

## Expected Results Summary

| Test | Tool Call Visible | Tool Executed | Results Shown | Status |
|------|-------------------|---------------|---------------|--------|
| Test 1 | ? | ? | ? | Pending |
| Test 2 | N/A | ? | N/A | Pending |
| Test 3 | ? | ? | ? | Pending |
| Test 4 | ? | N/A | ? | Pending |
| Test 5 | ? | ? | ? | Pending |

---

## Next Steps After Testing

### If All Tests Pass ✅
- Proceed with command panel implementation
- Enhance tool call display if needed
- Add more tool types

### If Tests Fail ❌
- Document specific failures
- Debug root cause
- Fix issues before proceeding
- Re-test

---

## Test Messages

Use these messages for testing:

1. **Simple tool call**: "What Pokémon are available?"
2. **Tool with parameters**: "Show me Pokémon worth 20 points"
3. **Multiple tools**: "What's my team budget and available picks?"
4. **Tool that might fail**: "Get Pokémon that don't exist" (test error handling)

---

**Status**: Ready for Execution  
**Last Updated**: January 18, 2026
