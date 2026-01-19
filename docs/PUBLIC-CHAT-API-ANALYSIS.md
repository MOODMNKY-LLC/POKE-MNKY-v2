# Public Chat API Analysis & Expansion Plan

**Date**: January 18, 2026  
**Focus**: What's Currently Hooked Up & How to Expand

---

## 📊 Current State: What's Hooked Up for Public Users

### ✅ Currently Using: **Chat Completions API** (via Vercel AI SDK)

**Implementation**: `app/api/ai/assistant/route.ts`

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

const result = await streamText({
  model: openai(model), // Uses Chat Completions API under the hood
  system: systemMessage,
  messages: modelMessages,
  tools, // MCP tools (disabled for public)
  maxSteps: tools ? 5 : 1, // Public users: maxSteps: 1 (no tool calls)
})
```

**What This Means**:
- ✅ **Chat Completions API** - Standard OpenAI API
- ✅ **Vercel AI SDK** - Wrapper for streaming responses
- ✅ **Server-Sent Events (SSE)** - Streaming via `toUIMessageStreamResponse()`
- ❌ **No MCP Tools** - Disabled for public users (`maxSteps: 1`)
- ❌ **No Responses API** - Not being used
- ❌ **No Agents SDK** - Not being used

### Public User Capabilities

**What Public Users Get**:
- ✅ Basic chat interface
- ✅ Streaming responses
- ✅ General Pokémon information (from LLM knowledge)
- ✅ League rules explanations
- ✅ Basic strategy tips
- ❌ No real-time draft pool data
- ❌ No team-specific information
- ❌ No MCP tool access

**System Prompt** (Public):
```
You are POKE MNKY, a friendly AI assistant for the Average at Best Battle League.

You help visitors with:
- General Pokémon information and competitive insights
- League rules and format explanations
- Basic strategy tips and guidance
- Answering questions about the platform

Note: Some advanced features require authentication.
```

---

## 🔍 What's Available But Not Used

### 1. **Responses API** ❌ Not Used (Partially Implemented)

**Status**: Attempted but has issues

**Location**: `app/api/ai/pokedex-v2/route.ts`

**Issue**: SDK version compatibility
```typescript
// This exists but may not work:
const response = await createResponseWithMCP({
  model: AI_MODELS.POKEDEX_QA,
  input: [...],
  tools: [{ type: "mcp", ... }],
})
```

**Why Not Used**:
- SDK version issues (`openai.responses` may be undefined)
- Requires SDK update to v6+ (currently v6.0.0 installed)
- Needs testing and verification

**Benefits**:
- ✅ Native MCP tool support
- ✅ Built-in tools (web search, file search)
- ✅ Better tool calling performance
- ✅ Background mode for long-running tasks

### 2. **Agents SDK** ❌ Not Used (Installed But Separate)

**Status**: Installed but not integrated into chat component

**Package**: `@openai/agents@0.3.9` ✅ Installed

**Location**: `lib/agents/`
- `draft-assistant.ts` - Draft Assistant Agent
- `free-agency-agent.ts` - Free Agency Agent
- `battle-strategy-agent.ts` - Battle Strategy Agent

**Current Usage**: Separate API routes (not used by chat component)

**Why Not Used**:
- Agents are separate implementations
- Not integrated into unified chat component
- Would require refactoring to use Agents SDK

**Benefits**:
- ✅ Multi-step reasoning
- ✅ Tool orchestration
- ✅ Agent specialization
- ✅ Better context management

---

## 🚀 Expansion Options

### Option 1: Enable Responses API for Public Users ⭐ **RECOMMENDED**

**What**: Migrate from Chat Completions to Responses API

**Benefits**:
- ✅ Native MCP tool support (can enable public tools)
- ✅ Built-in tools (web search, file search, code interpreter)
- ✅ Better performance
- ✅ Background mode support

**Implementation**:

```typescript
// app/api/ai/assistant/route.ts
import { openai } from '@/lib/openai-client'

export async function POST(request: Request) {
  const body = await request.json()
  const { messages, useResponsesAPI = true } = body
  
  if (useResponsesAPI) {
    // Use Responses API
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: convertToResponsesFormat(messages),
      tools: [
        // Public tools (no auth required)
        {
          type: 'web_search',
          require_approval: 'never',
        },
        {
          type: 'file_search',
          require_approval: 'never',
        },
        // MCP tools (if authenticated)
        ...(isAuthenticated ? [{
          type: 'mcp',
          server_url: mcpServerUrl,
          server_label: 'poke-mnky-draft-pool',
          require_approval: 'never',
        }] : []),
      ],
    })
    
    return NextResponse.json({ 
      output_text: response.output_text,
      output: response.output,
    })
  } else {
    // Fallback to Chat Completions (current implementation)
    // ... existing code
  }
}
```

**Public Tools Available**:
- ✅ Web Search - Search the web for information
- ✅ File Search - Search uploaded files
- ✅ Code Interpreter - Execute Python code
- ❌ MCP Tools - Still require authentication

**Steps**:
1. Update OpenAI SDK to latest version (verify Responses API support)
2. Create `convertToResponsesFormat()` helper
3. Add public tools (web_search, file_search)
4. Keep Chat Completions as fallback
5. Test with public users

---

### Option 2: Enable Public MCP Tools ⭐ **HIGH VALUE**

**What**: Create public MCP tools that don't require authentication

**Benefits**:
- ✅ Real-time draft pool data for public users
- ✅ Pokémon information from actual data
- ✅ Competitive meta information
- ✅ Better user experience

**Implementation**:

```typescript
// Create public MCP tools (read-only, no team data)
const publicMcpTools = {
  get_available_pokemon: {
    description: 'Get list of available Pokémon in draft pool',
    requires_auth: false, // Public access
  },
  get_pokemon_types: {
    description: 'Get Pokémon type information',
    requires_auth: false,
  },
  get_smogon_meta: {
    description: 'Get competitive meta information',
    requires_auth: false,
  },
  // Team-specific tools still require auth
  get_team_budget: {
    description: 'Get team budget (requires authentication)',
    requires_auth: true,
  },
}
```

**MCP Server Changes Needed**:
- Add public endpoints (no API key required)
- Rate limiting for public endpoints
- Separate public/private tool lists

**Steps**:
1. Update MCP server to support public tools
2. Add rate limiting for public endpoints
3. Update API route to include public MCP tools
4. Test public access

---

### Option 3: Integrate Agents SDK ⭐ **ADVANCED**

**What**: Use Agents SDK for public chat component

**Benefits**:
- ✅ Multi-step reasoning
- ✅ Tool orchestration
- ✅ Agent specialization
- ✅ Better context management

**Implementation**:

```typescript
// app/api/ai/assistant/route.ts
import { Agent, run } from '@openai/agents'
import { draftPoolMCP } from '@/lib/agents/mcp-servers'

// Create public agent
const publicAssistantAgent = new Agent({
  name: 'poke-mnky-public',
  instructions: `You are POKE MNKY, a friendly AI assistant...`,
  model: 'gpt-4o',
  tools: [
    // Public MCP tools
    draftPoolMCP, // Only public tools enabled
  ],
})

export async function POST(request: Request) {
  const { messages } = await request.json()
  const lastMessage = messages[messages.length - 1]
  
  const result = await run(publicAssistantAgent, lastMessage.text)
  
  return NextResponse.json({
    output_text: result.finalOutput,
  })
}
```

**Challenges**:
- Agents SDK uses different response format
- Need to adapt to streaming (Agents SDK may not support SSE)
- More complex error handling

**Steps**:
1. Create public agent instance
2. Adapt response format for useChat
3. Handle streaming (if supported)
4. Test integration

---

### Option 4: Hybrid Approach ⭐ **BEST FOR EXPANSION**

**What**: Combine Responses API + Public MCP Tools

**Benefits**:
- ✅ Best of both worlds
- ✅ Public users get real data
- ✅ Authenticated users get full access
- ✅ Future-proof

**Implementation**:

```typescript
export async function POST(request: Request) {
  const { messages, model = 'gpt-4o' } = await request.json()
  const isAuthenticated = !!user
  
  // Use Responses API
  const response = await openai.responses.create({
    model,
    input: convertToResponsesFormat(messages),
    tools: [
      // Public tools (always available)
      {
        type: 'web_search',
        require_approval: 'never',
      },
      {
        type: 'mcp',
        server_url: mcpServerUrl,
        server_label: 'poke-mnky-draft-pool',
        require_approval: 'never',
        // Public tools only (no team-specific tools)
        allowed_tools: [
          'get_available_pokemon',
          'get_pokemon_types',
          'get_smogon_meta',
        ],
        ...(isAuthenticated && {
          // Full access for authenticated users
          allowed_tools: undefined, // All tools
        }),
      },
    ],
  })
  
  return NextResponse.json(response)
}
```

**Public Tools**:
- ✅ Web Search
- ✅ File Search (if files uploaded)
- ✅ Public MCP Tools (draft pool, types, meta)
- ❌ Team-specific MCP Tools (require auth)

**Authenticated Tools**:
- ✅ All public tools
- ✅ Team-specific MCP Tools (budget, picks, etc.)
- ✅ Full MCP access

---

## 📋 Implementation Priority

### Phase 1: Enable Public MCP Tools (Week 1) ⭐ **HIGHEST PRIORITY**

**Why**: Immediate value for public users
- Real draft pool data
- Better Pokémon information
- Competitive meta data

**Effort**: Medium
- Update MCP server (public endpoints)
- Update API route (include public tools)
- Test public access

### Phase 2: Migrate to Responses API (Week 2) ⭐ **HIGH VALUE**

**Why**: Better tool support and performance
- Native MCP integration
- Built-in tools (web search, file search)
- Better performance

**Effort**: Medium-High
- Update SDK (if needed)
- Migrate API route
- Test compatibility
- Keep fallback

### Phase 3: Add Built-in Tools (Week 3) ⭐ **NICE TO HAVE**

**Why**: Enhanced capabilities
- Web search for current information
- File search for uploaded files
- Code interpreter for calculations

**Effort**: Low
- Add tool configurations
- Test tool calls
- Handle tool results

### Phase 4: Integrate Agents SDK (Week 4+) ⭐ **ADVANCED**

**Why**: Multi-step reasoning and orchestration
- Better context management
- Tool orchestration
- Agent specialization

**Effort**: High
- Refactor chat component
- Adapt response format
- Handle streaming
- Test integration

---

## 🔧 Technical Requirements

### SDK Updates Needed

**Current**:
- `openai@6.0.0` ✅ Installed
- `@ai-sdk/openai@3.0.12` ✅ Installed
- `@openai/agents@0.3.9` ✅ Installed

**May Need**:
- Update `openai` to latest (verify Responses API support)
- Verify `@ai-sdk/openai` compatibility

### MCP Server Changes

**Current**:
- All tools require authentication

**Needed**:
- Public endpoints (no auth)
- Rate limiting for public endpoints
- Separate public/private tool lists

### API Route Changes

**Current**:
- Chat Completions API only
- MCP tools disabled for public

**Needed**:
- Responses API support
- Public MCP tools
- Built-in tools (web search, file search)

---

## 📊 Comparison Table

| Feature | Current (Public) | Option 1 (Responses API) | Option 2 (Public MCP) | Option 3 (Agents SDK) | Option 4 (Hybrid) |
|---------|------------------|--------------------------|----------------------|----------------------|-------------------|
| **API** | Chat Completions | Responses API | Chat Completions | Agents SDK | Responses API |
| **MCP Tools** | ❌ None | ❌ None | ✅ Public Only | ✅ Public Only | ✅ Public + Auth |
| **Built-in Tools** | ❌ None | ✅ Web/File Search | ❌ None | ❌ None | ✅ Web/File Search |
| **Real Data** | ❌ No | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Streaming** | ✅ Yes | ⚠️ Maybe | ✅ Yes | ⚠️ Maybe | ⚠️ Maybe |
| **Multi-step** | ❌ No | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Effort** | - | Medium | Medium | High | Medium-High |
| **Value** | - | Medium | High | High | Highest |

---

## 🎯 Recommended Path Forward

### Immediate (This Week)

1. **Enable Public MCP Tools** (Option 2)
   - Update MCP server for public endpoints
   - Add public tools to API route
   - Test public access

### Short-term (Next 2 Weeks)

2. **Migrate to Responses API** (Option 1)
   - Update SDK if needed
   - Migrate API route
   - Add built-in tools (web search, file search)
   - Keep Chat Completions as fallback

### Long-term (Next Month+)

3. **Hybrid Approach** (Option 4)
   - Combine Responses API + Public MCP Tools
   - Add built-in tools
   - Optimize for performance

---

## 📝 Next Steps

1. **Verify SDK Support**
   ```bash
   # Check if Responses API is available
   npm list openai
   # Should be v6.0.0+
   ```

2. **Test Responses API**
   ```typescript
   // Test if responses.create() works
   const test = await openai.responses.create({...})
   ```

3. **Update MCP Server**
   - Add public endpoints
   - Add rate limiting
   - Test public access

4. **Update API Route**
   - Add Responses API support
   - Add public MCP tools
   - Add built-in tools
   - Test with public users

---

**Last Updated**: January 18, 2026  
**Status**: 📋 Analysis Complete - Ready for Implementation
