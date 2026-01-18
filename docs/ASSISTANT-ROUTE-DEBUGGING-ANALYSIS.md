# Assistant Route Debugging Analysis

**Date**: January 18, 2026  
**Issue**: "messages do not match ModelMessage[] schema" error  
**Status**: In Progress - Added Debugging Logs

---

## Executive Summary

After analyzing the knowledge-base, MCP server configuration, and comparing with working routes (pokedex, draft-assistant), I've identified potential causes for the schema mismatch error and added comprehensive logging to diagnose the issue.

---

## Key Findings

### 1. MCP Server Configuration ✅

**Server Details** (from knowledge-base):
- **URL**: `https://mcp-draft-pool.moodmnky.com/mcp`
- **Version**: 1.0.1 (Production Ready)
- **Tools**: 9 tools available
  - `get_available_pokemon`
  - `get_draft_status`
  - `get_team_budget`
  - `get_team_picks`
  - `get_pokemon_types`
  - `get_smogon_meta`
  - `get_ability_mechanics`
  - `get_move_mechanics`
  - `analyze_pick_value`

**Current Configuration**: ✅ Matches knowledge-base documentation

### 2. Message Format Comparison

**Working Routes** (pokedex, draft-assistant, battle-strategy):
```typescript
const modelMessages = convertToModelMessages(messages || [])
```

**Assistant Route** (current):
```typescript
const modelMessages = convertToModelMessages(rawMessages)
```

**Pattern Match**: ✅ Same pattern as working routes

### 3. Potential Issues Identified

#### Issue A: Message Format from useChat
- `useChat` sends messages in UI message format (with `parts`, `role`, `id`)
- `convertToModelMessages` expects specific format
- **Hypothesis**: Messages might have `parts` array instead of `content` string

#### Issue B: Empty Messages Array
- If `rawMessages` is empty or malformed, conversion might fail
- **Hypothesis**: Need to handle empty arrays gracefully

#### Issue C: AI SDK Version Compatibility
- Different versions might handle message conversion differently
- **Hypothesis**: Version mismatch causing schema validation to fail

---

## Debugging Strategy

### Step 1: Added Comprehensive Logging ✅

**Added to `app/api/ai/assistant/route.ts`**:

1. **Raw Message Logging**:
   - Log message count
   - Log first message structure (role, parts, content, keys)
   - Log all messages' structure summary

2. **Conversion Result Logging**:
   - Log input/output counts
   - Log first converted message structure
   - Wrap conversion in try-catch for error details

3. **Error Handling**:
   - Catch conversion errors specifically
   - Return detailed error messages
   - Log full error stack

### Step 2: Test and Analyze

**Next Steps**:
1. Test the assistant route with a simple message
2. Check server logs for the detailed message format
3. Compare with pokedex route logs (if available)
4. Identify the exact format difference

### Step 3: Apply Fix

**Based on Logs**:
- If messages have `parts` array: Preprocess messages before conversion
- If messages are empty: Add better validation
- If format is different: Adjust conversion logic

---

## Comparison with Working Routes

### Pokedex Route (Working ✅)

```typescript
// Convert messages to model format
const modelMessages = convertToModelMessages(messages || [])

// Use streamText
const result = await streamText({
  model: openai(selectedModel),
  system: systemMessage,
  messages: modelMessages,
  tools,
  maxSteps: mcpEnabled ? 5 : 1,
})

// Return response
return result.toDataStreamResponse()
```

**Key Differences**:
- Uses `toDataStreamResponse()` (older API)
- Uses `maxSteps` instead of `stopWhen: stepCountIs(5)`
- No `validateUIMessages` call

### Assistant Route (Current - Failing ❌)

```typescript
// Convert UI messages to model format
const modelMessages = convertToModelMessages(rawMessages)

// Stream text with tool call limits
const result = await streamText({
  model: openai(model),
  system: systemMessage,
  messages: modelMessages,
  tools,
  stopWhen: stepCountIs(5),
})

// Use newer UI message stream API
return result.toUIMessageStreamResponse({
  consumeSseStream: consumeStream,
})
```

**Key Differences**:
- Uses `toUIMessageStreamResponse()` (newer API)
- Uses `stopWhen: stepCountIs(5)` instead of `maxSteps`
- Same conversion pattern as pokedex

---

## Potential Solutions

### Solution 1: Match Pokedex Route Pattern (Simplest)

**Change**:
```typescript
// Use toDataStreamResponse instead of toUIMessageStreamResponse
return result.toDataStreamResponse()

// Use maxSteps instead of stopWhen
maxSteps: mcpEnabled ? 5 : 1,
```

**Pros**: Proven to work with pokedex route  
**Cons**: Uses older API, might not support all features

### Solution 2: Preprocess Messages (If Format Issue)

**If messages have `parts` array**:
```typescript
// Preprocess messages to convert parts to content
const preprocessedMessages = rawMessages.map((msg: any) => {
  if (msg.parts && Array.isArray(msg.parts)) {
    return {
      ...msg,
      content: msg.parts.map((p: any) => p.text).join(' '),
    }
  }
  return msg
})

const modelMessages = convertToModelMessages(preprocessedMessages)
```

**Pros**: Handles UI message format correctly  
**Cons**: Might not be necessary if SDK handles it

### Solution 3: Use validateUIMessages (If Needed)

**If validation is required**:
```typescript
import { validateUIMessages } from 'ai'

const validatedMessages = await validateUIMessages({
  messages: rawMessages,
  tools,
})

const modelMessages = convertToModelMessages(validatedMessages)
```

**Pros**: Validates messages against tool schemas  
**Cons**: Previously caused schema mismatch errors

---

## Knowledge-Base Insights

### MCP Server Integration

From `knowledge-base/aab-battle-league/MCP-SERVER-COMPLETE-GUIDE.md`:

1. **Server Capabilities**: 25 total (9 tools, 3 prompts, 13 resources)
2. **External Use**: Supports REST API, OpenAPI, OpenAI function calling
3. **Production Ready**: Phase 3 optimizations (caching, rate limiting, logging)

### Message Format Expectations

From `knowledge-base/aab-battle-league/MCP-USAGE-EXAMPLES.md`:

- Messages should be in standard format for MCP integration
- Tool calls are handled automatically by the SDK
- No special preprocessing needed for standard useChat messages

---

## Next Steps

1. **Test with Logging** ✅
   - Send a test message through the assistant
   - Check server logs for message format details
   - Compare with expected format

2. **Analyze Logs**
   - Identify exact message structure
   - Compare with pokedex route (if logs available)
   - Determine if preprocessing is needed

3. **Apply Fix**
   - Based on log analysis, apply appropriate solution
   - Test thoroughly
   - Verify MCP tool calls work correctly

4. **Document Solution**
   - Update this document with final solution
   - Add comments to code explaining the fix
   - Update related documentation

---

## Testing Checklist

- [ ] Test simple message ("hello")
- [ ] Test message with MCP tool call ("what pokemon are available?")
- [ ] Check server logs for message format
- [ ] Verify conversion succeeds
- [ ] Verify streaming response works
- [ ] Verify MCP tools are called correctly
- [ ] Test error handling

---

## Related Documentation

- `docs/MNKY-COMMAND-ANALYSIS.md` - Analysis of mnky-command project patterns
- `knowledge-base/aab-battle-league/MCP-SERVER-COMPLETE-GUIDE.md` - MCP server documentation
- `knowledge-base/aab-battle-league/MCP-USAGE-EXAMPLES.md` - Usage examples
- `app/api/ai/pokedex/route.ts` - Working reference implementation

---

**Status**: Debugging in progress - Awaiting test results with new logging  
**Last Updated**: January 18, 2026
