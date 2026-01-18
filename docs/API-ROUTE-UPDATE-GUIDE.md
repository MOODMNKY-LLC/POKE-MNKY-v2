# API Route Update Guide for useChat Compatibility

**Date**: 2026-01-18  
**Purpose**: Guide for updating API routes to work with `useChat` hook

---

## 🔄 Current vs Required Format

### Current Format (JSON Response)
```typescript
// Current: app/api/ai/draft-assistant/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  const result = await getDraftRecommendation(body)
  return NextResponse.json({ recommendation: result })
}
```

### Required Format (Streaming Response)
```typescript
// Required for useChat compatibility
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: Request) {
  const { messages } = await request.json()
  
  const result = await streamText({
    model: openai('gpt-4o'),
    messages,
    tools: [...], // MCP tools
  })
  
  return result.toDataStreamResponse()
}
```

---

## 📝 Example: Draft Assistant Route Update

### Before (Current)
```typescript
// app/api/ai/draft-assistant/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  const { teamId, seasonId, context } = body
  
  const recommendation = await getDraftRecommendation({
    teamId,
    seasonId,
    context,
  })
  
  return NextResponse.json({ recommendation })
}
```

### After (useChat Compatible)
```typescript
// app/api/ai/draft-assistant/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, data } = await request.json()
    const { teamId, seasonId } = data || {}

    if (!teamId) {
      return new Response('teamId is required', { status: 400 })
    }

    // Build system message with context
    const systemMessage = `You are a draft assistant for POKE MNKY league.
Team ID: ${teamId}
${seasonId ? `Season ID: ${seasonId}` : ''}

Use MCP tools to:
- get_available_pokemon: Query draft pool
- get_team_budget: Check team budget
- get_team_picks: View current roster
- analyze_pick_value: Evaluate pick value
- get_draft_status: Check draft status

Provide specific, actionable recommendations.`

    const result = await streamText({
      model: openai('gpt-4o'),
      system: systemMessage,
      messages: messages || [],
      tools: {
        // MCP tools will be configured here
        // See MCP-SERVER-INTEGRATION-GUIDE.md for details
      },
      maxSteps: 5,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Draft assistant error:', error)
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    )
  }
}
```

---

## 🔧 Key Changes Required

### 1. Import Vercel AI SDK
```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
```

### 2. Extract Messages from Request
```typescript
const { messages, data } = await request.json()
// messages: Array of { role, content }
// data: Additional context (teamId, seasonId, etc.)
```

### 3. Use streamText Instead of Direct API Calls
```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  messages,
  tools: {...},
})
```

### 4. Return Streaming Response
```typescript
return result.toDataStreamResponse()
```

---

## 🛠️ MCP Tool Integration

### Option 1: Direct Tool Definitions
```typescript
const result = await streamText({
  model: openai('gpt-4o'),
  messages,
  tools: {
    get_available_pokemon: {
      description: 'Query draft pool with filters',
      parameters: z.object({
        point_range: z.array(z.number()).optional(),
        generation: z.number().optional(),
        type: z.string().optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ point_range, generation, type, limit }) => {
        // Call MCP server or database directly
        return await callMCPTool('get_available_pokemon', {
          point_range,
          generation,
          type,
          limit,
        })
      },
    },
    // ... other tools
  },
})
```

### Option 2: MCP Server Integration (Recommended)
```typescript
// Use OpenAI Responses API with MCP
import OpenAI from 'openai'

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const response = await openaiClient.responses.create({
  model: 'gpt-4o',
  input: messages,
  tools: [{
    type: 'mcp',
    server_label: 'poke-mnky-draft-pool',
    server_url: process.env.MCP_SERVER_URL,
    server_description: 'Access to POKE MNKY draft pool and team data',
  }],
})

// Convert to streaming format for useChat
// (This requires additional conversion logic)
```

---

## 📋 Route Update Checklist

### Draft Assistant Route
- [ ] Update to use `streamText`
- [ ] Add MCP tool integration
- [ ] Add system message with context
- [ ] Handle teamId/seasonId from data
- [ ] Test with useChat hook

### Battle Strategy Route
- [ ] Update to use `streamText`
- [ ] Add battle analysis tools
- [ ] Add matchup context
- [ ] Test streaming responses

### Free Agency Route
- [ ] Update to use `streamText`
- [ ] Add trade evaluation tools
- [ ] Add roster analysis tools
- [ ] Test tool calls

### Pokédex Route
- [ ] Update to use `streamText`
- [ ] Add Pokémon query tools
- [ ] Maintain existing functionality
- [ ] Test with selected Pokémon

---

## 🧪 Testing

### Test useChat Integration
```typescript
// In component
const { messages, sendMessage, status } = useChat({
  api: '/api/ai/draft-assistant',
  body: { teamId, seasonId },
})

// Send message
sendMessage({ text: 'What Pokémon are available?' })

// Check status
console.log(status) // 'streaming' | 'submitted' | 'idle'
```

### Verify Streaming
- Messages should appear incrementally
- Tool calls should display correctly
- Reasoning should stream if available
- Loading states should work

---

## 📚 Resources

- **Vercel AI SDK Docs**: https://sdk.vercel.ai/docs
- **streamText API**: https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text
- **MCP Integration Guide**: `MCP-SERVER-INTEGRATION-GUIDE.md`
- **useChat Hook**: https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat

---

**Last Updated**: 2026-01-18  
**Status**: 📋 Guide Created - Ready for Implementation
