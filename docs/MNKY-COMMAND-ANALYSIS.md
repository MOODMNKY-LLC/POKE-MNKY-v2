# MNKY Command Project Analysis - Chat Interface Deep Dive

**Date**: 2026-01-18  
**Purpose**: Analyze mnky-command project's chat interface implementation to identify solutions for our streaming response issues

---

## Executive Summary

The `mnky-command` project uses a **working chat interface** with agent-based tool switching. Key findings reveal they use:
- **`toUIMessageStreamResponse`** (newer API) instead of `toDataStreamResponse`
- **`gpt-4o`** models (fully supported) instead of `gpt-5.2`
- **`validateUIMessages`** for message validation
- **Agent-based tool selection** for switching between different tool sets

---

## Key Findings

### 1. API Response Format

**Their Implementation:**
```typescript
return result.toUIMessageStreamResponse({
  consumeSseStream: consumeStream,
})
```

**Our Current Implementation:**
```typescript
return result.toDataStreamResponse()
```

**Key Difference:**
- `toUIMessageStreamResponse` is the **newer API** designed specifically for UI message streaming
- `toDataStreamResponse` is the older API that may have compatibility issues
- `toUIMessageStreamResponse` works better with `useChat` hook

### 2. Model Selection

**Their Models:**
```typescript
mood: "openai/gpt-4o",      // Creative responses
sage: "openai/gpt-4o-mini", // Educational content
code: "openai/gpt-4o",      // Technical analysis
```

**Our Current Model:**
```typescript
STRATEGY_COACH: "gpt-5.2"  // May not be fully supported
```

**Key Insight:**
- `gpt-4o` is **fully supported** by `@ai-sdk/openai` v3.0.12
- `gpt-5.2` may have compatibility issues with the current SDK version
- This is likely the **root cause** of our `toDataStreamResponse is not a function` error

### 3. Message Validation

**Their Implementation:**
```typescript
const messages = await validateUIMessages<AgentChatMessage>({
  messages: rawMessages,
  tools,
})

const prompt = convertToModelMessages(messages)
```

**Benefits:**
- Validates messages against tool schemas before processing
- Catches errors early
- Ensures message format compatibility

### 4. Agent-Based Tool Selection

**Their Architecture:**
```typescript
const agent = agentPersonalities[agentType]  // "mood" | "sage" | "code"
const tools = getToolsForAgent(agentType)    // Different tools per agent

const result = streamText({
  model: config.model,
  system: agent.systemPrompt,
  prompt,
  tools,
  stopWhen: stepCountIs(5), // Limit tool call loops
})
```

**Key Features:**
- Different agents have different tools
- Agent switching changes available tools dynamically
- Each agent has its own system prompt and model config
- Tool call limits prevent infinite loops

### 5. Tool Call Limits

**Their Implementation:**
```typescript
stopWhen: stepCountIs(5), // Limit tool call loops
```

**Benefits:**
- Prevents infinite tool call loops
- Better error handling
- More predictable behavior

---

## Architecture Comparison

### mnky-command Architecture

```
Frontend (useChat)
    ↓
API Route (/api/ai/chat)
    ↓
validateUIMessages() → Validates messages
    ↓
convertToModelMessages() → Converts to model format
    ↓
streamText() with agent-specific tools
    ↓
toUIMessageStreamResponse() → Returns UI stream
```

### Our Current Architecture

```
Frontend (useChat)
    ↓
API Route (/api/ai/assistant)
    ↓
convertToModelMessages() → Converts messages
    ↓
streamText() with MCP tools
    ↓
toDataStreamResponse() → Returns data stream (FAILING)
```

---

## Recommended Solutions

### Solution 1: Update to `toUIMessageStreamResponse` (RECOMMENDED)

**Update `app/api/ai/assistant/route.ts`:**

```typescript
import {
  streamText,
  convertToModelMessages,
  validateUIMessages,
  consumeStream,
  stepCountIs,
} from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messages: rawMessages, model = 'gpt-4o', mcpEnabled = true } = body

    // Validate messages
    const messages = await validateUIMessages({
      messages: rawMessages,
      tools: mcpEnabled ? { mcp: openai.tools.mcp({...}) } : undefined,
    })

    const prompt = convertToModelMessages(messages)

    const result = await streamText({
      model: openai(model),
      system: systemMessage,
      prompt,
      tools: mcpEnabled ? { mcp: openai.tools.mcp({...}) } : undefined,
      stopWhen: stepCountIs(5), // Limit tool calls
    })

    // Use newer API
    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    // Error handling
  }
}
```

**Benefits:**
- Uses the newer, more stable API
- Better compatibility with `useChat`
- Proper message validation
- Tool call limits

### Solution 2: Switch to `gpt-4o` Temporarily

**Update `lib/openai-client.ts`:**

```typescript
export const AI_MODELS = {
  STRATEGY_COACH: "gpt-4o",  // Changed from "gpt-5.2"
  // ... other models
}
```

**Benefits:**
- Fully supported by current SDK version
- Proven to work with their implementation
- Can switch back to `gpt-5.2` when SDK support improves

### Solution 3: Implement Agent-Based Tool Selection (OPTIONAL)

**Create `lib/ai/agents.ts`:**

```typescript
export type AgentType = "general" | "draft" | "battle" | "free-agency"

export const agentConfig = {
  general: {
    model: "gpt-4o",
    tools: { mcp: openai.tools.mcp({...}) },
    systemPrompt: "...",
  },
  draft: {
    model: "gpt-4o",
    tools: { mcp: openai.tools.mcp({...}) },
    systemPrompt: "...",
  },
  // ... other agents
}
```

**Benefits:**
- Cleaner architecture
- Easier to switch between different tool sets
- Better organization

---

## Implementation Priority

### High Priority (Fix Current Issue)
1. ✅ Update to `toUIMessageStreamResponse`
2. ✅ Add `validateUIMessages`
3. ✅ Add `stepCountIs(5)` for tool call limits
4. ⚠️ Consider switching to `gpt-4o` temporarily

### Medium Priority (Architecture Improvements)
1. Implement agent-based tool selection
2. Add proper error handling
3. Improve message validation

### Low Priority (Future Enhancements)
1. Add agent switching UI
2. Implement tool visibility toggles
3. Add agent-specific system prompts

---

## Code Examples

### Updated Route Implementation

```typescript
// app/api/ai/assistant/route.ts
import {
  streamText,
  convertToModelMessages,
  validateUIMessages,
  consumeStream,
  stepCountIs,
} from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { AI_MODELS } from '@/lib/openai-client'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messages: rawMessages, model = 'gpt-4o', mcpEnabled = true } = body

    // Validate messages
    if (!rawMessages || !Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || 
      'https://mcp-draft-pool.moodmnky.com/mcp'

    const systemMessage = `You are POKE MNKY...`

    const tools = mcpEnabled
      ? {
          mcp: openai.tools.mcp({
            serverLabel: 'poke-mnky-draft-pool',
            serverUrl: mcpServerUrl,
            serverDescription: 'Access to POKE MNKY draft pool and team data.',
            requireApproval: 'never',
          }),
        }
      : undefined

    // Validate messages against tools
    const messages = await validateUIMessages({
      messages: rawMessages,
      tools,
    })

    // Convert to model format
    const prompt = convertToModelMessages(messages)

    // Stream text with tool call limits
    const result = await streamText({
      model: openai(model),
      system: systemMessage,
      prompt,
      tools,
      stopWhen: stepCountIs(5), // Prevent infinite tool call loops
    })

    // Use newer UI message stream API
    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
  } catch (error) {
    console.error('[General Assistant] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Assistant failed' },
      { status: 500 }
    )
  }
}
```

---

## Testing Checklist

After implementing changes:

- [ ] Test basic chat functionality
- [ ] Test with MCP tools enabled
- [ ] Test with MCP tools disabled
- [ ] Test tool call limits (should stop after 5 steps)
- [ ] Test error handling
- [ ] Test message validation
- [ ] Verify streaming works correctly
- [ ] Check browser console for errors
- [ ] Check server logs for errors

---

## References

- **mnky-command Repository**: https://github.com/MOODMNKY-LLC/mnky-command
- **Chat Route**: `app/api/ai/chat/route.ts`
- **Tools Configuration**: `lib/ai/tools.ts`
- **Agent Configuration**: `lib/ai/agents.ts`
- **Client Configuration**: `lib/ai/client.ts`

---

## Conclusion

The `mnky-command` project provides a **proven, working solution** that addresses our streaming response issues. Key takeaways:

1. **Use `toUIMessageStreamResponse`** instead of `toDataStreamResponse`
2. **Use `gpt-4o`** instead of `gpt-5.2` until SDK support improves
3. **Add `validateUIMessages`** for better error handling
4. **Add tool call limits** with `stepCountIs(5)`
5. **Consider agent-based architecture** for better organization

These changes should resolve our `toDataStreamResponse is not a function` error and provide a more stable foundation for our chat interface.
