# Chat Component Infrastructure - Complete Analysis

**Date**: January 18, 2026  
**Focus**: AI Backend & Public vs Authenticated Versions

---

## 📋 Table of Contents

1. [Component Hierarchy](#component-hierarchy)
2. [Authentication Flow](#authentication-flow)
3. [AI Backend Architecture](#ai-backend-architecture)
4. [Public vs Authenticated Versions](#public-vs-authenticated-versions)
5. [MCP Integration](#mcp-integration)
6. [Data Flow](#data-flow)
7. [API Routes](#api-routes)
8. [Environment Variables](#environment-variables)
9. [Integration Points](#integration-points)
10. [Technical Stack](#technical-stack)

---

## 🏗️ Component Hierarchy

The chat component is built in a 4-level hierarchy:

```
AssistantProvider (Root)
  └── FloatingAssistantButton (FAB)
      └── UnifiedAssistantPopup (Container)
          └── BaseChatInterface (Core Chat UI)
```

### 1. AssistantProvider (`components/ai/assistant-provider.tsx`)

**Purpose**: Root provider that checks authentication and fetches context

**Responsibilities**:
- Checks Supabase authentication (`supabase.auth.getUser()`)
- Fetches context data based on current route:
  - `teamId` from user's profile (for `/draft` or `/dashboard/free-agency`)
  - `seasonId` from current season
- Passes `isAuthenticated` and `context` to FloatingAssistantButton

**Key Code**:
```typescript
const { data: { user } } = await supabase.auth.getUser()
setIsAuthenticated(!!user)

// Fetch team and season for draft/free-agency contexts
if (pathname.startsWith("/draft") || pathname.startsWith("/dashboard/free-agency")) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single()
  
  if (profile?.team_id) {
    newContext.teamId = profile.team_id
  }
}
```

### 2. FloatingAssistantButton (`components/ai/floating-assistant-button.tsx`)

**Purpose**: Floating action button (FAB) in bottom-right corner

**Responsibilities**:
- Renders gold glassmorphic button with POKE MNKY avatar
- Opens/closes UnifiedAssistantPopup
- Passes context and authentication status to popup

**Key Features**:
- Animated entrance/exit (Framer Motion)
- Gold gradient styling (Pokémon Gold theme)
- Sparkles badge indicator
- Mobile-optimized touch targets (44x44px minimum)

### 3. UnifiedAssistantPopup (`components/ai/unified-assistant-popup.tsx`)

**Purpose**: Container component with settings and agent selection

**Responsibilities**:
- Detects agent context from route (`detectAssistantContext`)
- Manages settings:
  - Agent type selection (general, draft, battle-strategy, free-agency, pokedex)
  - Model selection (gpt-5.2, gpt-4.1, gpt-5-mini)
  - MCP tools toggle (authenticated only)
  - Text-to-speech toggle
- Handles file uploads
- Handles voice input (SpeechRecognition API)
- Passes configuration to BaseChatInterface

**Key Features**:
- Context-aware agent detection
- Settings popover (authenticated users only)
- File upload support
- Voice input (STT) support
- Text-to-speech (TTS) support
- Mobile-responsive (Sheet on mobile, Dialog on desktop)

### 4. BaseChatInterface (`components/ai/base-chat-interface.tsx`)

**Purpose**: Core chat UI with message display and input

**Responsibilities**:
- Manages chat state with `useChat` hook (Vercel AI SDK)
- Displays messages (user + assistant)
- Handles message input and submission
- Shows quick actions (predefined prompts)
- Handles streaming responses
- **CRITICAL**: Intercepts fetch calls to fix `useChat` bug (rewrites `/api/chat` to correct endpoint)

**Key Features**:
- Streaming message display
- Quick action buttons
- Message history
- Loading states
- Error handling
- Auto-scroll to latest message

---

## 🔐 Authentication Flow

### Client-Side Authentication

**Location**: `components/ai/assistant-provider.tsx`

```typescript
// Check authentication
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
setIsAuthenticated(!!user)
```

**Flow**:
1. AssistantProvider checks Supabase auth on mount
2. Sets `isAuthenticated` state
3. Passes to FloatingAssistantButton → UnifiedAssistantPopup → BaseChatInterface
4. UI conditionally shows/hides features based on auth status

### Server-Side Authentication

**Location**: `app/api/ai/assistant/route.ts` (and all other API routes)

```typescript
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()
const isAuthenticated = !!user
```

**Flow**:
1. API route receives request
2. Checks authentication server-side (verifies token)
3. Conditionally enables MCP tools based on auth status
4. Adjusts system prompt based on auth status

---

## 🤖 AI Backend Architecture

### Core Components

#### 1. Message Conversion

**Location**: `app/api/ai/assistant/route.ts`

```typescript
// Convert UI messages to model format
const conversionResult = convertToModelMessages(rawMessages)
modelMessages = await Promise.resolve(conversionResult)
```

**Purpose**: Converts Vercel AI SDK UI message format to OpenAI model format

**Input Format** (UI Messages):
```typescript
{
  role: "user" | "assistant",
  parts: Array<{ type: "text", text: string }>
}
```

**Output Format** (Model Messages):
```typescript
{
  role: "user" | "assistant",
  content: string | Array<{ type: "text", text: string }>
}
```

#### 2. MCP Tool Configuration

**Location**: `app/api/ai/assistant/route.ts`

```typescript
// Build MCP tools configuration
const mcpConfig = {
  serverLabel: 'poke-mnky-draft-pool',
  serverUrl: mcpServerUrl,
  serverDescription: 'Access to POKE MNKY draft pool and team data...',
  requireApproval: 'never',
  headers: {
    'X-API-Key': mcpApiKey,
  },
}

const tools = effectiveMcpEnabled
  ? { mcp: openai.tools.mcp(mcpConfig) }
  : undefined
```

**Key Points**:
- Only enabled if `isAuthenticated && mcpEnabled`
- Uses `X-API-Key` header (not `Authorization: Bearer`) to avoid conflicts
- MCP server URL: `https://mcp-draft-pool.moodmnky.com/mcp` (production)
- API key from `MCP_API_KEY` environment variable

#### 3. Streaming Response

**Location**: `app/api/ai/assistant/route.ts`

```typescript
const result = await streamText({
  model: openai(model),
  system: systemMessage,
  messages: modelMessages,
  tools,
  toolChoice: tools ? 'auto' : undefined,
  maxSteps: tools ? 5 : 1, // Multi-step tool calls if MCP enabled
})

return result.toUIMessageStreamResponse({
  consumeSseStream: consumeStream,
})
```

**Key Points**:
- Uses Vercel AI SDK's `streamText` function
- Returns Server-Sent Events (SSE) stream
- `maxSteps: 5` allows multi-step tool calls (authenticated)
- `maxSteps: 1` prevents tool calls (unauthenticated)

---

## 🔄 Public vs Authenticated Versions

### Public Version (Unauthenticated)

**System Prompt**:
```
You are POKE MNKY, a friendly AI assistant for the Average at Best Battle League.

You help visitors with:
- General Pokémon information and competitive insights
- League rules and format explanations
- Basic strategy tips and guidance
- Answering questions about the platform

Note: Some advanced features like draft pool data, team-specific information, 
and real-time draft status require authentication.
```

**Features**:
- ❌ MCP tools disabled (`mcpEnabled = false`)
- ❌ No access to draft pool data
- ❌ No team-specific information
- ❌ No real-time draft status
- ✅ General Pokémon information
- ✅ League rules explanations
- ✅ Basic strategy tips
- ✅ Platform questions

**Configuration**:
```typescript
const effectiveMcpEnabled = false // Always false for unauthenticated
const tools = undefined // No tools
maxSteps: 1 // No tool calls allowed
```

**UI**:
- MCP toggle disabled (grayed out)
- Settings popover hidden
- "Sign in to access advanced features" message

### Authenticated Version

**System Prompt**:
```
You are POKE MNKY, an expert AI assistant for the Average at Best Battle League.

You help coaches with:
- Draft strategy and pick recommendations
- Battle analysis and move suggestions
- Free agency and trade evaluations
- Pokémon information and competitive insights
- General league questions and guidance

CRITICAL: You have access to MCP tools via the 'poke-mnky-draft-pool' server 
that provide real-time draft pool data.

When users ask about:
- Available Pokémon or point values → ALWAYS use mcp.get_available_pokemon tool first
- Draft status or whose turn → Use mcp.get_draft_status tool
- Team budgets or remaining points → Use mcp.get_team_budget tool (requires team_id)
- Team picks or rosters → Use mcp.get_team_picks tool (requires team_id)
- Pokémon types → Use mcp.get_pokemon_types tool
- Competitive meta → Use mcp.get_smogon_meta tool
- Ability/move mechanics → Use mcp.get_ability_mechanics or mcp.get_move_mechanics tools
- Pick value analysis → Use mcp.analyze_pick_value tool

IMPORTANT RULES:
1. ALWAYS use tools to get current, accurate data - never guess or make up information
2. When listing Pokémon, use mcp.get_available_pokemon to get the actual draft pool data
3. Include point values when discussing Pokémon availability
4. If a tool requires team_id and user hasn't provided it, ask for clarification
5. Present tool results clearly and format lists nicely for readability
```

**Features**:
- ✅ MCP tools enabled (if toggle is on)
- ✅ Access to draft pool data
- ✅ Team-specific information (teamId from profile)
- ✅ Real-time draft status
- ✅ All general features
- ✅ Context-aware responses (teamId, seasonId)

**Configuration**:
```typescript
const effectiveMcpEnabled = isAuthenticated && mcpEnabled
const tools = effectiveMcpEnabled ? { mcp: openai.tools.mcp(mcpConfig) } : undefined
maxSteps: tools ? 5 : 1 // Multi-step tool calls if MCP enabled
```

**UI**:
- MCP toggle enabled (can be toggled on/off)
- Settings popover visible
- Agent type selection available
- Model selection available
- "League Mode" badge when MCP enabled

---

## 🔌 MCP Integration

### MCP Server Configuration

**Server URL**: `https://mcp-draft-pool.moodmnky.com/mcp` (production)  
**API Key**: `MCP_API_KEY` environment variable  
**Authentication**: `X-API-Key` header

### Available Tools (9 Tools)

1. **`get_available_pokemon`** - Get draft pool Pokémon list with point values
2. **`get_draft_status`** - Get current draft status (whose turn, round, etc.)
3. **`get_team_budget`** - Get team's remaining budget (requires `team_id`)
4. **`get_team_picks`** - Get team's drafted Pokémon (requires `team_id`)
5. **`get_pokemon_types`** - Get Pokémon type information
6. **`get_smogon_meta`** - Get competitive meta data
7. **`get_ability_mechanics`** - Get ability mechanics
8. **`get_move_mechanics`** - Get move mechanics
9. **`analyze_pick_value`** - Analyze pick value

### Tool Call Flow

```
1. User asks: "What Pokémon are available?"
   ↓
2. LLM decides to use mcp.get_available_pokemon tool
   ↓
3. OpenAI SDK sends JSON-RPC request to MCP server:
   POST https://mcp-draft-pool.moodmnky.com/mcp
   Headers: { "X-API-Key": MCP_API_KEY }
   Body: {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "get_available_pokemon",
       "arguments": {}
     }
   }
   ↓
4. MCP server authenticates and executes tool
   ↓
5. MCP server returns result:
   {
     "jsonrpc": "2.0",
     "result": {
       "content": [
         {
           "type": "text",
           "text": "{\"pokemon\": [{\"name\": \"Pikachu\", \"points\": 20}, ...]}"
         }
       ]
     }
   }
   ↓
6. OpenAI SDK parses result and includes in LLM context
   ↓
7. LLM generates final response with tool data
   ↓
8. Response streamed back to client via SSE
```

### Tool Result Parsing

**Location**: `app/api/ai/assistant/route.ts` (onStepFinish callback)

The code handles multiple MCP result formats:

```typescript
// MCP tools return results in nested format:
// tr.output.output contains the actual result as a JSON string
// Structure: { output: { output: "{\"pokemon\": [...]}" } }
let actualResult = tr.result
if (actualResult === undefined || actualResult === null) {
  // Check for nested output structure (MCP format)
  if (tr.output && typeof tr.output === 'object') {
    if (tr.output.output && typeof tr.output.output === 'string') {
      try {
        actualResult = JSON.parse(tr.output.output)
      } catch (e) {
        actualResult = tr.output.output
      }
    }
  } else if (Array.isArray(tr.content) && tr.content.length > 0) {
    // Try content array format (MCP protocol)
    const firstContent = tr.content[0]
    if (firstContent.type === 'text' && firstContent.text) {
      try {
        actualResult = JSON.parse(firstContent.text)
      } catch {
        actualResult = firstContent.text
      }
    }
  }
}
```

---

## 📊 Data Flow

### Complete User Input → AI Response Flow

```
1. USER TYPES MESSAGE
   ↓
2. BaseChatInterface.handleSubmit()
   ↓
3. useChat.sendMessage({ text: input })
   ↓
4. POST /api/ai/assistant
   Body: {
     messages: [
       { role: "user", parts: [{ type: "text", text: "..." }] }
     ],
     model: "gpt-5.2",
     mcpEnabled: true,
     files: []
   }
   ↓
5. API Route: Check Authentication
   const { data: { user } } = await supabase.auth.getUser()
   const isAuthenticated = !!user
   ↓
6. API Route: Convert Messages
   const modelMessages = await convertToModelMessages(rawMessages)
   ↓
7. API Route: Configure MCP Tools
   const tools = isAuthenticated && mcpEnabled
     ? { mcp: openai.tools.mcp(mcpConfig) }
     : undefined
   ↓
8. API Route: Call OpenAI
   const result = await streamText({
     model: openai(model),
     system: systemMessage,
     messages: modelMessages,
     tools,
     maxSteps: tools ? 5 : 1,
   })
   ↓
9. LLM DECIDES TO USE TOOL (if authenticated + MCP enabled)
   ↓
10. OpenAI SDK: Call MCP Server
    POST https://mcp-draft-pool.moodmnky.com/mcp
    Headers: { "X-API-Key": MCP_API_KEY }
    ↓
11. MCP Server: Execute Tool & Return Result
    ↓
12. OpenAI SDK: Parse Result & Include in Context
    ↓
13. LLM: Generate Final Response
    ↓
14. API Route: Stream Response
    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
    })
    ↓
15. BaseChatInterface: Receive Stream
    useChat hook receives SSE stream
    ↓
16. BaseChatInterface: Update UI
    Messages state updated with streaming text
    ↓
17. USER SEES RESPONSE
```

---

## 🛣️ API Routes

### Route Structure

All routes follow the same pattern in `app/api/ai/`:

- `/api/ai/assistant` - General assistant (default)
- `/api/ai/draft-assistant` - Draft-specific assistant
- `/api/ai/battle-strategy` - Battle strategy assistant
- `/api/ai/free-agency` - Free agency assistant
- `/api/ai/pokedex` - Pokédex assistant

### Route Detection

**Location**: `lib/ai/assistant-context.ts`

```typescript
export function detectAssistantContext(
  pathname: string,
  additionalContext?: {...}
): AssistantContext {
  if (pathname.startsWith("/draft")) {
    return {
      agentType: "draft",
      apiEndpoint: "/api/ai/draft-assistant",
      ...
    }
  }
  // ... other routes
  return {
    agentType: "general",
    apiEndpoint: "/api/ai/assistant",
    ...
  }
}
```

### Route Differences

All routes share the same core logic but differ in:
1. **System Prompt**: Each route has a specialized system prompt
2. **Context Data**: Different context passed (teamId, seasonId, matchId, etc.)
3. **Quick Actions**: Different predefined prompts per agent type

---

## 🔧 Environment Variables

### Required Variables

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (client-side)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server-side only)

# MCP Server
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
MCP_API_KEY=mnky_...
```

### Variable Usage

- **Client-Side**: `NEXT_PUBLIC_*` variables (Supabase URL/anon key)
- **Server-Side**: All variables (API routes have access to all env vars)
- **MCP Server**: `MCP_DRAFT_POOL_SERVER_URL` and `MCP_API_KEY` (server-side only)

---

## 🔗 Integration Points

### 1. Supabase Auth

**Client-Side**:
- `components/ai/assistant-provider.tsx` - Checks auth, fetches profile
- Uses `createClient()` from `@/lib/supabase/client`

**Server-Side**:
- `app/api/ai/assistant/route.ts` - Verifies auth token
- Uses `createServerClient()` from `@/lib/supabase/server`

### 2. MCP Server

**HTTP-Based MCP**:
- URL: `https://mcp-draft-pool.moodmnky.com/mcp`
- Protocol: JSON-RPC over HTTP
- Authentication: `X-API-Key` header
- Transport: Server-Sent Events (SSE) for streaming

**Integration**:
- OpenAI SDK's `openai.tools.mcp()` function
- Configured with `serverUrl`, `headers`, `serverLabel`
- Tools automatically available to LLM when enabled

### 3. OpenAI SDK

**Vercel AI SDK**:
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/react` - React hooks (`useChat`)
- `ai` - Core SDK (`streamText`, `convertToModelMessages`, `consumeStream`)

**Key Functions**:
- `streamText()` - Streams LLM responses
- `convertToModelMessages()` - Converts UI messages to model format
- `toUIMessageStreamResponse()` - Returns SSE stream
- `consumeStream()` - Consumes SSE stream

### 4. Context Detection

**Route-Based Detection**:
- `detectAssistantContext()` analyzes current pathname
- Returns appropriate agent type and API endpoint
- Can be manually overridden in settings (authenticated only)

**Context Data**:
- `teamId` - From user's profile (authenticated only)
- `seasonId` - From current season
- `selectedPokemon` - From current page
- `team1Id`, `team2Id`, `matchId` - From battle/match pages

---

## 🛠️ Technical Stack

### Frontend

- **Framework**: Next.js 16 App Router
- **React**: React 19.2
- **TypeScript**: Strict mode enabled
- **UI Components**: Radix UI (Dialog, Sheet, Select, Popover, etc.)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend

- **API Routes**: Next.js API Routes (App Router)
- **AI SDK**: Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/react`, `ai`)
- **Auth**: Supabase Auth (client + server)
- **Database**: Supabase (PostgreSQL)
- **Streaming**: Server-Sent Events (SSE)

### MCP Integration

- **Protocol**: JSON-RPC over HTTP
- **Transport**: HTTP/SSE
- **Authentication**: API Key (`X-API-Key` header)
- **Server**: Custom MCP server (draft pool data)

### Browser APIs

- **Speech Recognition**: `window.SpeechRecognition` / `webkitSpeechRecognition`
- **Speech Synthesis**: `window.speechSynthesis`
- **File Upload**: HTML5 File API

---

## 🐛 Known Issues & Workarounds

### 1. useChat API Prop Bug

**Issue**: `@ai-sdk/react` v3.0.41 ignores `api` prop and defaults to `/api/chat`

**Workaround**: `BaseChatInterface` intercepts fetch calls:

```typescript
useEffect(() => {
  const originalFetch = window.fetch
  window.fetch = async function(...args) {
    const url = args[0]
    if (typeof url === 'string' && url === '/api/chat') {
      args[0] = stableApiEndpoint // Rewrite to correct endpoint
    }
    return originalFetch.apply(this, args)
  }
  return () => {
    window.fetch = originalFetch
  }
}, [stableApiEndpoint])
```

**Also**: Uses `key` prop to force remount when `apiEndpoint` changes:

```typescript
<BaseChatInterface
  key={agentContext.apiEndpoint || "/api/ai/assistant"}
  apiEndpoint={agentContext.apiEndpoint || "/api/ai/assistant"}
  ...
/>
```

### 2. MCP Tool Result Parsing

**Issue**: MCP tools return results in multiple formats (nested objects, JSON strings, content arrays)

**Workaround**: Comprehensive parsing logic in `onStepFinish` callback handles all formats

---

## 📝 Key Files Reference

### Components

- `components/ai/assistant-provider.tsx` - Root provider
- `components/ai/floating-assistant-button.tsx` - FAB button
- `components/ai/unified-assistant-popup.tsx` - Popup container
- `components/ai/base-chat-interface.tsx` - Core chat UI

### API Routes

- `app/api/ai/assistant/route.ts` - General assistant
- `app/api/ai/draft-assistant/route.ts` - Draft assistant
- `app/api/ai/battle-strategy/route.ts` - Battle strategy
- `app/api/ai/free-agency/route.ts` - Free agency
- `app/api/ai/pokedex/route.ts` - Pokédex

### Utilities

- `lib/ai/assistant-context.ts` - Context detection
- `lib/openai-client.ts` - OpenAI client config
- `lib/supabase/client.ts` - Supabase client (client-side)
- `lib/supabase/server.ts` - Supabase client (server-side)

---

## 🚀 Next Steps for Integration

### Potential Enhancements

1. **File Upload Processing**: Currently files are passed but not processed in API routes
2. **Voice Input Enhancement**: Add better error handling and feedback
3. **TTS Enhancement**: Add voice selection and rate/pitch controls
4. **Multi-Agent Support**: Allow multiple agents in one conversation
5. **Tool Result Display**: Show tool calls and results in UI (currently only logged)
6. **Context Persistence**: Save conversation context across sessions
7. **Rate Limiting**: Add rate limiting for API routes
8. **Error Recovery**: Better error handling and retry logic

### Integration Opportunities

1. **Discord Bot**: Use same API routes for Discord bot integration
2. **Mobile App**: API routes can be used by mobile app
3. **External Tools**: MCP server can be used by external tools
4. **Analytics**: Track tool usage and conversation patterns
5. **A/B Testing**: Test different system prompts and models

---

**Last Updated**: January 18, 2026  
**Status**: ✅ Complete Analysis
