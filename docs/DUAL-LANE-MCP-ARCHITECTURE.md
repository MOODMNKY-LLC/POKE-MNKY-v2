# Dual-Lane MCP Architecture - Implementation Plan

**Date**: January 18, 2026  
**Status**: Design Phase  
**Purpose**: ChatGPT-style tool interface + Command Panel for heavy analysis

---

## Executive Summary

This document outlines the implementation of a **dual-lane architecture** for integrating your MCP server into the Next.js app:

1. **Chat Lane (GPT-4 series)**: Conversational ChatGPT-style interface with visible tool calls
2. **Command Panel Lane (GPT-5 series)**: Structured workflows for heavy analysis and team uploads

Both lanes leverage your existing MCP server capabilities (9 tools, 3 prompts, 13 resources) via REST API, OpenAPI, and OpenAI function format.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App (Frontend)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐ │
│  │   Chat Interface      │    │   Command Panel          │ │
│  │   (GPT-4 series)      │    │   (GPT-5 series)         │ │
│  │                       │    │                          │ │
│  │ - Conversational      │    │ - Structured workflows   │ │
│  │ - Visible tool calls  │    │ - Button-driven          │ │
│  │ - Real-time streaming │    │ - Heavy analysis          │ │
│  │ - Tool cards          │    │ - Team upload → analysis │ │
│  └───────────┬───────────┘    └──────────┬───────────────┘ │
│              │                           │                  │
│              └───────────┬───────────────┘                  │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Backend)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐    ┌──────────────────────────┐ │
│  │  POST /api/chat       │    │  POST /api/analysis-jobs │ │
│  │  (SSE Streaming)       │    │  (Structured Jobs)       │ │
│  │                       │    │                          │ │
│  │ - GPT-4o model        │    │ - GPT-5 model            │ │
│  │ - Event streaming     │    │ - Deterministic workflow │ │
│  │ - Tool call events   │    │ - Tool orchestration     │ │
│  │ - MCP tool access    │    │ - MCP prompt access      │ │
│  └───────────┬───────────┘    └──────────┬───────────────┘ │
│              │                           │                  │
└──────────────┼───────────────────────────┼──────────────────┘
               │                           │
               │                           │
               ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│         MCP Server (poke-mnky-draft-pool)                   │
│         https://mcp-draft-pool.moodmnky.com                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  REST API: POST /api/{tool_name}                            │
│  OpenAI Functions: GET /functions                           │
│  OpenAPI Spec: GET /openapi.json                            │
│  MCP Protocol: POST /mcp                                    │
│                                                              │
│  9 Tools: get_available_pokemon, get_draft_status, etc.     │
│  3 Prompts: analyze_draft_strategy, analyze_type_coverage,   │
│            compare_teams                                    │
│  13 Resources: draft-board://current, team://{id}/roster,   │
│               knowledge-base://*                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Lane 1: Chat Interface (GPT-4 series)

### Purpose
ChatGPT-style conversational interface where users can ask questions and see tool calls happen in real-time.

### Model Choice
- **Primary**: `gpt-4o` (proven for tool-heavy chat)
- **Fallback**: `gpt-4o-mini` (for simpler queries)

### Key Features
- ✅ Real-time streaming responses
- ✅ Visible tool call cards (ChatGPT-style)
- ✅ Tool execution transparency
- ✅ Natural conversation flow
- ✅ MCP tool integration via OpenAI function format

### Event Stream Format

The chat route should emit events like:

```typescript
// Assistant text streaming
{ type: "assistant_text_delta", messageId: "m1", delta: "I'll check..." }

// Tool call started
{ 
  type: "tool_call_started",
  messageId: "m1",
  toolCallId: "t1",
  tool: { name: "get_available_pokemon", arguments: { limit: 10 } }
}

// Tool call completed
{
  type: "tool_call_completed",
  messageId: "m1",
  toolCallId: "t1",
  tool: { name: "get_available_pokemon" },
  result: { pokemon: [...], count: 10 }
}

// Assistant continues
{ type: "assistant_text_delta", messageId: "m1", delta: "\n\nBased on the draft pool..." }

// Message completed
{ type: "assistant_message_completed", messageId: "m1" }
```

### Implementation: `/api/ai/assistant` (Enhanced)

**Current State**: Uses `toUIMessageStreamResponse` which should support tool calls, but needs enhancement.

**Enhancement Needed**:
1. Ensure tool calls are properly surfaced in the stream
2. Add explicit tool call event emission
3. Improve tool call visibility in UI

---

## Lane 2: Command Panel (GPT-5 series)

### Purpose
Structured workflows triggered by buttons for heavy analysis, team uploads, and deterministic operations.

### Model Choice
- **Primary**: `gpt-5.2` (when fully supported) or `gpt-4o` (temporary)
- **Use Case**: Deep analysis, multi-step reasoning, synthesis

### Key Features
- ✅ Button-driven workflows
- ✅ Pre-structured prompts
- ✅ Deterministic tool orchestration
- ✅ Rich structured outputs
- ✅ Team upload → analysis pipeline

### Command Panel Buttons

#### 1. "Assess Type Coverage"
- **Trigger**: Button click
- **Workflow**: 
  1. Call MCP prompt `analyze_type_coverage` (if team_id available)
  2. OR call `get_team_picks` → analyze types → GPT-5 synthesis
- **Output**: Structured type coverage analysis + narrative

#### 2. "Run Draft Strategy Analysis"
- **Trigger**: Button click
- **Workflow**:
  1. Call MCP prompt `analyze_draft_strategy`
  2. GPT-5 synthesizes recommendations
- **Output**: Strategy recommendations + budget analysis

#### 3. "Compare Teams"
- **Trigger**: Button click (requires 2 team IDs)
- **Workflow**:
  1. Call MCP prompt `compare_teams`
  2. GPT-5 synthesizes comparison
- **Output**: Side-by-side comparison + insights

#### 4. "Calculate Point Total" (New)
- **Trigger**: Button click (with uploaded team)
- **Workflow**:
  1. Parse uploaded team roster
  2. Call `get_available_pokemon` for each Pokémon to get point values
  3. Sum points
  4. GPT-5 provides analysis
- **Output**: Point total + budget impact analysis

#### 5. "Analyze Team Upload" (New)
- **Trigger**: File upload + button click
- **Workflow**:
  1. Parse uploaded team (Showdown format or JSON)
  2. Extract Pokémon list
  3. Call multiple MCP tools:
     - `get_pokemon_types` for each
     - `get_smogon_meta` for each
     - `analyze_pick_value` for each
  4. GPT-5 synthesizes comprehensive analysis
- **Output**: Full team analysis report

### Implementation: `/api/ai/analysis-jobs/run`

**New Route**: Structured job execution endpoint

**Input Format**:
```typescript
{
  jobType: "assess_type_coverage" | "draft_strategy" | "compare_teams" | "calculate_points" | "analyze_team",
  parameters: {
    teamId?: string,
    teamId2?: string,
    uploadedTeam?: Array<{ name: string, ... }>,
    seasonId?: string,
  }
}
```

**Output Format**: SSE stream with structured events

---

## Team Upload → Analysis Workflow

### Use Case
User uploads a team (Showdown format or JSON) and wants comprehensive analysis.

### Workflow Steps

1. **Upload & Parse**
   - User uploads team file or pastes Showdown format
   - Parse into structured roster format

2. **MCP Tool Calls** (Parallel where possible)
   - `get_pokemon_types` for each Pokémon
   - `get_smogon_meta` for each Pokémon
   - `analyze_pick_value` for each Pokémon
   - `get_available_pokemon` to check availability and points

3. **Analysis** (GPT-5)
   - Type coverage analysis
   - Role distribution
   - Synergy assessment
   - Weakness identification
   - Meta alignment check

4. **Structured Output**
   - Type coverage chart
   - Role distribution
   - Point total
   - Recommendations
   - Narrative summary

### MCP Server Extension (Optional)

**Option 1**: Extend MCP server with new tools
- `calculate_team_points` - Accept roster, return total points
- `assess_type_coverage_from_roster` - Accept roster, return coverage analysis
- `analyze_uploaded_team` - Comprehensive analysis endpoint

**Option 2**: Keep compute in Next.js app
- Use existing MCP tools
- Perform calculations in app
- Use GPT-5 for synthesis only

**Recommendation**: Start with Option 2, migrate to Option 1 if team analysis becomes core feature.

---

## Implementation Plan

### Phase 1: Enhance Chat Route (Week 1)

**Goal**: Ensure tool calls are properly visible in chat

**Tasks**:
1. ✅ Verify `toUIMessageStreamResponse` emits tool call events
2. ✅ Test tool call visibility in `BaseChatInterface`
3. ✅ Enhance tool call display (if needed)
4. ✅ Add tool call status indicators
5. ✅ Test with all 9 MCP tools

**Files to Modify**:
- `app/api/ai/assistant/route.ts` - Ensure tool events are emitted
- `components/ai/base-chat-interface.tsx` - Verify tool rendering

### Phase 2: Create Command Panel Route (Week 1-2)

**Goal**: Implement structured job execution endpoint

**Tasks**:
1. Create `app/api/ai/analysis-jobs/run/route.ts`
2. Implement job type routing
3. Integrate MCP prompts (`analyze_draft_strategy`, etc.)
4. Add GPT-5 synthesis layer
5. Implement SSE streaming for job progress

**New Files**:
- `app/api/ai/analysis-jobs/run/route.ts`
- `lib/ai/analysis-jobs.ts` - Job orchestration logic
- `lib/ai/mcp-client.ts` - MCP REST API client

### Phase 3: Command Panel UI (Week 2)

**Goal**: Build button-driven command panel

**Tasks**:
1. Create `components/ai/command-panel.tsx`
2. Implement button components
3. Add team upload component
4. Integrate with analysis job route
5. Display structured results

**New Files**:
- `components/ai/command-panel.tsx`
- `components/ai/command-button.tsx`
- `components/ai/team-upload.tsx`
- `components/ai/analysis-results.tsx`

### Phase 4: Team Upload → Analysis (Week 2-3)

**Goal**: Complete team upload workflow

**Tasks**:
1. Implement team parser (Showdown format + JSON)
2. Create analysis workflow orchestration
3. Integrate multiple MCP tool calls
4. Build structured output components
5. Add visualization components (type coverage, etc.)

**New Files**:
- `lib/team-parser.ts` (enhance existing)
- `lib/analysis/orchestrator.ts`
- `components/ai/analysis/type-coverage-chart.tsx`
- `components/ai/analysis/role-distribution.tsx`
- `components/ai/analysis/team-summary.tsx`

### Phase 5: MCP Server Extension (Optional, Week 3-4)

**Goal**: Add team analysis tools to MCP server

**Tasks**:
1. Design new tool schemas
2. Implement tools in MCP server
3. Update OpenAPI spec
4. Test integration
5. Update documentation

**New Tools**:
- `calculate_team_points`
- `assess_type_coverage_from_roster`
- `analyze_uploaded_team`

---

## Technical Details

### MCP Integration Pattern

**For Chat Route**:
```typescript
// Load tools from MCP server
const mcpFunctions = await fetch(
  'https://mcp-draft-pool.moodmnky.com/functions',
  { headers: { 'Authorization': `Bearer ${MCP_API_KEY}` } }
).then(r => r.json())

// Use with OpenAI SDK
const tools = {
  mcp: openai.tools.mcp({
    serverLabel: 'poke-mnky-draft-pool',
    serverUrl: mcpServerUrl,
    serverDescription: '...',
    requireApproval: 'never',
  }),
  // OR use individual tools from /functions endpoint
  ...mcpFunctions.tools.reduce((acc, tool) => {
    acc[tool.function.name] = tool.function
    return acc
  }, {})
}
```

**For Command Panel Route**:
```typescript
// Call MCP REST API directly
const response = await fetch(
  `https://mcp-draft-pool.moodmnky.com/api/${toolName}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_API_KEY}`
    },
    body: JSON.stringify(arguments)
  }
)
const result = await response.json()
```

### Event Stream Implementation

**Chat Route** (SSE):
```typescript
const encoder = new TextEncoder()

const stream = new ReadableStream({
  async start(controller) {
    // Stream assistant text
    for await (const chunk of result.textStream) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type: 'assistant_text_delta',
          delta: chunk
        })}\n\n`)
      )
    }
    
    // Stream tool calls
    for await (const toolCall of result.toolCalls) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type: 'tool_call_started',
          toolCallId: toolCall.toolCallId,
          tool: { name: toolCall.toolName, arguments: toolCall.args }
        })}\n\n`)
      )
      
      // Execute tool
      const result = await callMcpTool(toolCall.toolName, toolCall.args)
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          type: 'tool_call_completed',
          toolCallId: toolCall.toolCallId,
          result
        })}\n\n`)
      )
    }
  }
})

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

---

## UI Components

### Tool Call Card (ChatGPT-style)

```tsx
<Tool>
  <ToolHeader
    title="get_available_pokemon"
    type="tool-call"
    state="output-available"
  />
  <ToolContent>
    <ToolInput input={{ limit: 10 }} />
    <ToolOutput output={{ pokemon: [...], count: 10 }} />
  </ToolContent>
</Tool>
```

### Command Panel Button

```tsx
<CommandButton
  label="Assess Type Coverage"
  icon={<ShieldIcon />}
  onClick={() => runAnalysisJob('assess_type_coverage', { teamId })}
  disabled={!teamId}
/>
```

### Team Upload Component

```tsx
<TeamUpload
  onUpload={(team) => {
    // Parse team
    const parsed = parseTeam(team)
    // Trigger analysis
    runAnalysisJob('analyze_team', { uploadedTeam: parsed })
  }}
  accept=".txt,.json"
/>
```

---

## Model Selection Strategy

### GPT-4 Series (Chat Lane)
- **Use For**: Conversational chat, tool transparency, UX
- **Model**: `gpt-4o` (primary), `gpt-4o-mini` (fallback)
- **Why**: Predictable tool usage, good UX, proven for chat

### GPT-5 Series (Command Panel)
- **Use For**: Heavy analysis, synthesis, multi-step reasoning
- **Model**: `gpt-5.2` (when supported) or `gpt-4o` (temporary)
- **Why**: Better reasoning, planning, synthesis capabilities

### Hybrid Approach
- Chat agent (GPT-4) can call analysis engine (GPT-5) as a tool
- User sees seamless experience
- Architecture separates concerns

---

## Next Steps

1. **Immediate**: Fix current chat route tool call visibility issue
2. **Week 1**: Implement command panel route
3. **Week 2**: Build command panel UI
4. **Week 3**: Add team upload workflow
5. **Week 4**: Optional MCP server extensions

---

## Related Documentation

- `knowledge-base/aab-battle-league/MCP-SERVER-COMPLETE-GUIDE.md` - MCP server capabilities
- `knowledge-base/aab-battle-league/MCP-USAGE-EXAMPLES.md` - Usage examples
- `docs/ASSISTANT-ROUTE-DEBUGGING-ANALYSIS.md` - Current debugging analysis
- `app/api/ai/assistant/route.ts` - Current chat route implementation

---

**Status**: Ready for Implementation  
**Last Updated**: January 18, 2026
