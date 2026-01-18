# Manual Testing Guide: MCP Chat Integration

**Date**: January 18, 2026  
**Purpose**: Step-by-step manual testing to verify tool call visibility  
**Status**: Ready for Execution

---

## Pre-Test Checklist

- [ ] Dev server is running (`pnpm dev`)
- [ ] You're logged in to the app
- [ ] Browser DevTools are open (Network + Console tabs)
- [ ] Chat interface is accessible

---

## Test 1: Basic Tool Call Visibility

### Steps

1. **Open Chat Interface**
   - Navigate to the app
   - Open the unified assistant popup
   - Ensure you're logged in

2. **Send Test Message**
   - Type: `"What Pokémon are available in the draft pool?"`
   - Send the message

3. **Observe UI**
   - ✅ Does assistant start responding?
   - ✅ Do tool call cards appear?
   - ✅ Is tool name visible? (`get_available_pokemon`)
   - ✅ Are tool results displayed?

4. **Check Browser Console**
   - Look for: `[General Assistant]` logs
   - Look for: Tool call logs
   - Look for: Any errors

5. **Check Network Tab**
   - Find: `POST /api/ai/assistant`
   - Check: Response is SSE stream
   - Inspect: Stream events (look for tool-call events)

### Expected Results

**UI Should Show**:
- Assistant message bubble
- Tool call card with:
  - Tool name: `get_available_pokemon` or `mcp`
  - Status: "Running" → "Completed"
  - Input: `{ limit: ... }` (if visible)
  - Output: `{ pokemon: [...], count: ... }`

**Console Should Show**:
```
[General Assistant] Raw messages received: ...
[General Assistant] Successfully converted messages: ...
```

**Network Tab Should Show**:
- SSE stream events
- Tool call events in the stream

---

## Test 2: Server Logs Verification

### Steps

1. **Check Terminal/Server Logs**
   - Look for: `[General Assistant]` logs
   - Look for: MCP tool call logs
   - Look for: Tool execution results

2. **Expected Logs**:
```
[General Assistant] Raw messages received: { count: 1, ... }
[General Assistant] Successfully converted messages: { inputCount: 1, outputCount: 1 }
```

### What to Look For

- ✅ Messages are received correctly
- ✅ Conversion succeeds
- ✅ Tool calls are executed
- ❌ Any errors or warnings

---

## Test 3: Stream Event Inspection

### Steps

1. **Open Network Tab**
2. **Find**: `POST /api/ai/assistant` request
3. **Click**: "Preview" or "Response" tab
4. **Look For**: SSE events like:
   ```
   data: {"type":"text-delta","textDelta":"I'll check..."}
   data: {"type":"tool-call","toolCallId":"...","toolName":"get_available_pokemon",...}
   data: {"type":"tool-result","toolCallId":"...","result":{...}}
   ```

### Expected Events

- `text-delta` events (assistant text)
- `tool-call` events (tool invocation)
- `tool-result` events (tool results)
- `text-delta` events (assistant continuation)

---

## Test 4: Multiple Tool Calls

### Steps

1. **Send**: `"What Pokémon are available and what's the current draft status?"`
2. **Observe**: Multiple tool call cards should appear
3. **Verify**: Both tools execute and show results

### Expected Behavior

- Two tool call cards:
  - `get_available_pokemon`
  - `get_draft_status`
- Both show results
- Assistant synthesizes both results

---

## Test 5: Tool Call Error Handling

### Steps

1. **Send**: `"Get Pokémon that doesn't exist"` (or invalid request)
2. **Observe**: How errors are handled
3. **Verify**: Error is displayed in tool card

### Expected Behavior

- Tool call card shows error state
- Error message is visible
- Assistant handles error gracefully

---

## Debugging Checklist

### If Tool Calls Don't Appear

1. **Check Console**:
   - [ ] Any errors?
   - [ ] Are messages being sent?
   - [ ] Is conversion succeeding?

2. **Check Network**:
   - [ ] Is request successful (200)?
   - [ ] Is response an SSE stream?
   - [ ] Are tool-call events in stream?

3. **Check Server Logs**:
   - [ ] Are tools configured?
   - [ ] Are tool calls being executed?
   - [ ] Are results being returned?

4. **Check UI**:
   - [ ] Is Tool component rendering?
   - [ ] Are message parts correct?
   - [ ] Is tool-call case being hit?

### If Tool Calls Execute But Don't Display

1. **Check Message Parts**:
   - Inspect `message.parts` in React DevTools
   - Verify `part.type === "tool-call"`
   - Check `toolPart` properties

2. **Check Tool Component**:
   - Verify props are correct
   - Check for rendering errors
   - Verify Tool component is imported

---

## Test Results Template

```
Test 1: Basic Tool Call
  Tool Call Visible: [ ] Yes [ ] No
  Tool Executed: [ ] Yes [ ] No
  Results Shown: [ ] Yes [ ] No
  Notes: ________________

Test 2: Server Logs
  Messages Received: [ ] Yes [ ] No
  Conversion Success: [ ] Yes [ ] No
  Tool Execution: [ ] Yes [ ] No
  Notes: ________________

Test 3: Stream Events
  SSE Stream: [ ] Yes [ ] No
  Tool Events Present: [ ] Yes [ ] No
  Event Format: [ ] Correct [ ] Incorrect
  Notes: ________________

Test 4: Multiple Tools
  Multiple Cards: [ ] Yes [ ] No
  Sequential Execution: [ ] Yes [ ] No
  Notes: ________________

Test 5: Error Handling
  Error Displayed: [ ] Yes [ ] No
  Graceful Handling: [ ] Yes [ ] No
  Notes: ________________
```

---

## Next Steps After Testing

### If All Tests Pass ✅
- Proceed with command panel implementation
- Enhance tool display if needed
- Add more tool types

### If Tests Fail ❌
- Document specific failures
- Check debugging checklist
- Fix issues before proceeding
- Re-test

---

## Quick Test Commands

Use these messages for quick testing:

1. **Simple**: `"What Pokémon are available?"`
2. **With Params**: `"Show me Pokémon worth 20 points"`
3. **Multiple**: `"What's my team budget and available picks?"`
4. **Error Test**: `"Get invalid Pokémon"`

---

**Status**: Ready for Manual Testing  
**Last Updated**: January 18, 2026
