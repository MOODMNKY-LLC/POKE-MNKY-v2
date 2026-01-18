# MCP Server Integration Guide for App Agent

**Date**: January 18, 2026  
**Purpose**: Comprehensive guide for integrating the Draft Pool MCP Server into the Next.js app  
**Status**: ✅ Production Ready - Ready for Integration

---

## Executive Summary

This guide provides **complete, step-by-step instructions** for integrating the POKE MNKY Draft Pool MCP Server into the Next.js application. The server is production-ready with Phase 3 optimizations (caching, rate limiting, logging, error handling) and provides multiple integration methods optimized for OpenAI SDK usage.

**Key Points**:
- ✅ Server is production-ready at `https://mcp-draft-pool.moodmnky.com/mcp`
- ✅ OpenAI SDK already configured and prepared for MCP use
- ✅ Multiple integration methods available (REST API, OpenAI Functions, MCP Protocol)
- ✅ Comprehensive tool, prompt, and resource documentation included
- ✅ Clear UI/UX requirements for chat interface integration

---

## Table of Contents

1. [Server Overview](#server-overview)
2. [Integration Architecture](#integration-architecture)
3. [Available Tools, Prompts & Resources](#available-tools-prompts--resources)
4. [Integration Methods](#integration-methods)
5. [Chat Interface Requirements](#chat-interface-requirements)
6. [Implementation Steps](#implementation-steps)
7. [Use Cases & Examples](#use-cases--examples)
8. [Error Handling](#error-handling)
9. [Testing & Validation](#testing--validation)

---

## Server Overview

### Server Details

- **Name**: `poke-mnky-draft-pool`
- **Version**: `1.0.1` (Production Ready)
- **Base URL**: `https://mcp-draft-pool.moodmnky.com`
- **MCP Endpoint**: `https://mcp-draft-pool.moodmnky.com/mcp`
- **REST API Base**: `https://mcp-draft-pool.moodmnky.com/api`
- **OpenAPI Spec**: `https://mcp-draft-pool.moodmnky.com/openapi.json`
- **OpenAI Functions**: `https://mcp-draft-pool.moodmnky.com/functions`

### Authentication

**Required**: API Key or OAuth Token

**Methods**:
1. **API Key** (Recommended for app integration):
   - Header: `Authorization: Bearer YOUR_API_KEY`
   - Or: `X-API-Key: YOUR_API_KEY`

2. **OAuth 2.0** (For external clients):
   - Token endpoint: `POST /token`
   - Use token in: `Authorization: Bearer {token}`

**Environment Variable**: `MCP_API_KEY` (already configured)

---

## Integration Architecture

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│   Next.js App (Frontend)                               │
│   - Chat Interface Component                           │
│   - Message Input                                      │
│   - Tool Call Display                                  │
│   - Response Rendering                                 │
└──────────────┬──────────────────────────────────────────┘
               │ HTTP/HTTPS
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│   Next.js API Route (/app/api/draft-assistant/route.ts) │
│   - OpenAI SDK Integration                             │
│   - MCP Tool Calling                                   │
│   - Response Streaming                                  │
│   - Error Handling                                     │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│   Draft Pool MCP Server                                 │
│   - REST API Endpoints                                  │
│   - Tool Execution                                      │
│   - Caching (Phase 3)                                   │
│   - Rate Limiting (Phase 3)                             │
└──────────────┬──────────────────────────────────────────┘
               │ Supabase Client
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│   Supabase Database                                     │
│   - draft_pool                                         │
│   - draft_budgets                                      │
│   - team_rosters                                       │
│   - draft_sessions                                     │
│   - seasons                                            │
│   - teams                                              │
│   - pokepedia_pokemon                                  │
│   - smogon_meta_snapshot                               │
│   - pokepedia_abilities                                 │
│   - pokepedia_moves                                     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input**: User types question in chat interface
2. **API Route**: Next.js API route receives request
3. **OpenAI SDK**: Calls OpenAI with MCP tools configured
4. **Tool Calls**: OpenAI decides which tools to call
5. **MCP Server**: API route calls MCP server REST endpoints
6. **Database**: MCP server queries Supabase
7. **Response**: Results returned to OpenAI
8. **AI Response**: OpenAI generates natural language response
9. **UI Update**: Chat interface displays response

---

## Available Tools, Prompts & Resources

### Tools (9) - Execute Actions

#### 1. `get_available_pokemon`

**Purpose**: Query draft pool with filters

**Parameters**:
```typescript
{
  point_range?: [number, number],  // [min, max] point range
  generation?: number,              // Pokémon generation
  type?: string,                    // Pokémon type
  limit?: number                    // Max results (default: 100)
}
```

**Returns**:
```typescript
{
  pokemon: Array<{
    pokemon_name: string,
    point_value: number,
    generation?: number,
    available: boolean
  }>,
  count: number
}
```

**Cached**: Yes (5 minutes TTL)

**Use Cases**:
- "What Pokémon are available for 15-18 points?"
- "Show me all Generation 1 Pokémon in the draft pool"
- "What Fire-type Pokémon can I draft?"

**Example Request**:
```typescript
{
  point_range: [15, 18],
  generation: 1,
  limit: 10
}
```

#### 2. `get_draft_status`

**Purpose**: Get current draft session status

**Parameters**:
```typescript
{
  season_id?: string  // Optional, defaults to current season
}
```

**Returns**:
```typescript
{
  session_id: string,
  status: string,           // "active" | "completed" | "paused"
  current_pick: number,     // Current pick number
  current_round: number,    // Current round number
  current_team_id?: string, // Team whose turn it is
  total_picks: number       // Total picks made
}
```

**Cached**: No (real-time data)

**Use Cases**:
- "What's the current draft status?"
- "Whose turn is it?"
- "How many picks have been made?"

#### 3. `get_team_budget`

**Purpose**: Get team budget information

**Parameters**:
```typescript
{
  team_id: string,      // Required
  season_id?: string    // Optional, defaults to current season
}
```

**Returns**:
```typescript
{
  team_id: string,
  total_points: number,      // Total budget (usually 120)
  spent_points: number,      // Points spent so far
  remaining_points: number   // Points remaining
}
```

**Cached**: No (real-time calculations)

**Use Cases**:
- "How much budget does Team X have left?"
- "What's my remaining budget?"
- "How many points has Team Y spent?"

#### 4. `get_team_picks`

**Purpose**: Get team's draft picks

**Parameters**:
```typescript
{
  team_id: string,      // Required
  season_id?: string    // Optional, defaults to current season
}
```

**Returns**:
```typescript
{
  team_id: string,
  picks: Array<{
    pokemon_name: string,
    point_value: number,
    draft_round: number,
    draft_order: number
  }>,
  total_picks: number,
  total_points_spent: number
}
```

**Cached**: No (real-time roster data)

**Use Cases**:
- "What Pokémon has Team X drafted?"
- "Show me my current roster"
- "What picks has Team Y made?"

#### 5. `get_pokemon_types`

**Purpose**: Get Pokémon type information

**Parameters**:
```typescript
{
  pokemon_name: string  // Required
}
```

**Returns**:
```typescript
{
  pokemon_name: string,
  type_primary: string,
  type_secondary?: string,
  types: string[]  // [primary, secondary] or [primary]
}
```

**Cached**: Yes (10 minutes TTL)

**Use Cases**:
- "What type is Pikachu?"
- "What are Charizard's types?"
- "Is Gyarados Water/Flying?"

#### 6. `get_smogon_meta`

**Purpose**: Get competitive meta data from Smogon

**Parameters**:
```typescript
{
  pokemon_name: string,     // Required
  format?: string,          // Optional (e.g., "gen9ou")
  source_date?: string      // Optional ISO date
}
```

**Returns**:
```typescript
{
  pokemon_name: string,
  format: string,
  tier: string,             // "OU" | "UU" | "RU" | etc.
  usage_rate?: number,      // Usage percentage
  roles?: string[],         // ["Wallbreaker", "Setup Sweeper", etc.]
  common_moves?: string[],  // Common moveset
  common_items?: string[],  // Common items
  common_abilities?: string[] // Common abilities
}
```

**Cached**: Yes (1 hour TTL)

**Use Cases**:
- "What tier is Garchomp in?"
- "What's Pikachu's usage rate?"
- "What moves does Charizard commonly use?"

#### 7. `get_ability_mechanics`

**Purpose**: Get detailed ability mechanics

**Parameters**:
```typescript
{
  ability_name: string  // Required
}
```

**Returns**:
```typescript
{
  ability_name: string,
  description: string,
  mechanics: string  // Detailed mechanics explanation
}
```

**Cached**: Yes (30 minutes TTL)

**Use Cases**:
- "How does Intimidate work?"
- "What does Levitate do?"
- "Explain the ability Adaptability"

#### 8. `get_move_mechanics`

**Purpose**: Get detailed move mechanics

**Parameters**:
```typescript
{
  move_name: string  // Required
}
```

**Returns**:
```typescript
{
  move_name: string,
  description: string,
  mechanics: string  // Detailed mechanics explanation
}
```

**Cached**: Yes (30 minutes TTL)

**Use Cases**:
- "How does Earthquake work?"
- "What does Thunderbolt do?"
- "Explain the move Flamethrower"

#### 9. `analyze_pick_value`

**Purpose**: Analyze if a Pokémon pick is good value

**Parameters**:
```typescript
{
  pokemon_name: string,  // Required
  team_id: string,       // Required
  season_id?: string     // Optional, defaults to current season
}
```

**Returns**:
```typescript
{
  pokemon_name: string,
  point_value: number,
  team_budget_remaining: number,
  can_afford: boolean,
  budget_percentage: number,  // Percentage of total budget
  recommendation: string      // "Good value" | "High cost" | "Cannot afford"
}
```

**Cached**: No (dynamic calculations)

**Use Cases**:
- "Is Pikachu worth 15 points for my team?"
- "Can I afford Charizard?"
- "Should I draft Garchomp?"

### Prompts (3) - Reusable Workflows

#### 1. `analyze_draft_strategy`

**Purpose**: Comprehensive draft strategy analysis

**Arguments**:
```typescript
{
  team_id: string,                    // Required
  focus_area?: "budget" | "roster" | "remaining_picks" | "all",  // Optional
  season_id?: string                  // Optional
}
```

**Returns**: Formatted analysis message with:
- Budget analysis
- Roster composition
- Recommended next picks
- Strategic considerations

**Use Cases**:
- "Analyze my draft strategy"
- "What should I focus on next?"
- "Give me a comprehensive strategy analysis"

#### 2. `analyze_type_coverage`

**Purpose**: Type coverage analysis

**Arguments**:
```typescript
{
  team_id: string,      // Required
  season_id?: string    // Optional
}
```

**Returns**: Formatted analysis with:
- Type coverage score
- Missing types
- Recommendations for type coverage

**Use Cases**:
- "Analyze my team's type coverage"
- "What types am I missing?"
- "How can I improve my type coverage?"

#### 3. `compare_teams`

**Purpose**: Side-by-side team comparison

**Arguments**:
```typescript
{
  team_id_1: string,                    // Required
  team_id_2: string,                    // Required
  comparison_type?: "roster" | "budget" | "value" | "all",  // Optional
  season_id?: string                    // Optional
}
```

**Returns**: Formatted comparison with:
- Budget comparison
- Roster comparison
- Strategic analysis

**Use Cases**:
- "Compare Team A and Team B"
- "How does my team compare to Team X?"
- "Show me a comparison of two teams"

### Resources (13) - Structured Data Access

#### Draft Pool Resources (6)

1. **`draft-board://current`** - Current draft pool state
   - Type: Static resource
   - Returns: All available Pokémon with point values
   - Use Cases: Access current draft board state

2. **`team://{team_id}/roster`** - Team roster data
   - Type: Dynamic template resource
   - Parameters: `team_id` (in URI)
   - Returns: Team's drafted Pokémon
   - Use Cases: Access team roster for prompts

3. **`pokemon://{name}/types`** - Pokémon type information
   - Type: Dynamic template resource
   - Parameters: `name` (Pokémon name)
   - Returns: Primary/secondary types
   - Use Cases: Get type information for a Pokémon

4. **`pokemon://{name}/meta/{format}`** - Pokémon competitive meta data
   - Type: Dynamic template resource
   - Parameters: `name` (Pokémon name), `format` (e.g., "gen9ou")
   - Returns: Smogon meta data (tier, usage, roles, sets)
   - Use Cases: Get competitive meta information

5. **`mechanics://abilities/{name}`** - Ability mechanics
   - Type: Dynamic template resource
   - Parameters: `name` (ability name)
   - Returns: Detailed ability mechanics from Bulbapedia
   - Use Cases: Get detailed ability information

6. **`mechanics://moves/{name}`** - Move mechanics
   - Type: Dynamic template resource
   - Parameters: `name` (move name)
   - Returns: Detailed move mechanics from Bulbapedia
   - Use Cases: Get detailed move information

#### Knowledge Base Resources (7)

7. **`knowledge-base://index`** - Knowledge base index
   - Lists all available knowledge base documents
   - JSON format with categories and file listings

8. **`knowledge-base://file/{path}`** - Access any knowledge base file
   - Dynamic template resource
   - Returns markdown content of specified file

9. **`knowledge-base://category/{category}`** - Category listing
   - Lists all files in a knowledge base category
   - JSON format

10. **`knowledge-base://readme`** - Knowledge base README
    - Main knowledge base overview and structure
    - Markdown format

11. **`knowledge-base://data/extraction-summary`** - Extraction summary
    - Summary of Google Sheets data extraction
    - JSON format

12. **`knowledge-base://data/google-sheets`** - Google Sheets metadata
    - Metadata about extracted Google Sheets data
    - JSON format

13. **`knowledge-base://data/google-sheets/{section}`** - Google Sheets data sections
    - Access specific sections of extracted data
    - Dynamic template resource
    - Sections: masterDataSheet, draftBoard, teamsPages, dataSheet, pokedex, divisions, standings

---

## Integration Methods

### Method 1: OpenAI Responses API (Recommended)

**Best For**: Natural language chat interface with AI-powered responses

**How It Works**:
1. User asks question in natural language
2. OpenAI SDK calls Responses API with MCP server configured
3. OpenAI decides which tools to call
4. Tool results returned to OpenAI
5. OpenAI generates natural language response

**Implementation**:

```typescript
// app/api/draft-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://mcp-draft-pool.moodmnky.com/mcp';
const MCP_API_KEY = process.env.MCP_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { message, teamId, seasonId } = await request.json();

    // Build user message with context
    const userMessage = teamId 
      ? `${message}\n\nContext: I'm Team ${teamId}${seasonId ? ` in Season ${seasonId}` : ''}.`
      : message;

    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: userMessage,
        }
      ],
      tools: [{
        type: 'mcp',
        server_label: 'poke-mnky-draft-pool',
        server_url: MCP_SERVER_URL,
        server_description: 'Access to POKE MNKY draft pool and team data. Provides tools for querying available Pokémon, checking draft status, analyzing team budgets and rosters, and getting competitive meta information.',
      }],
    });

    return NextResponse.json({ 
      response: response.output,
      usage: response.usage 
    });
  } catch (error: any) {
    console.error('Draft assistant error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
```

**Benefits**:
- ✅ Natural language interface
- ✅ AI decides which tools to use
- ✅ Handles multiple tool calls automatically
- ✅ Generates natural language responses
- ✅ No manual tool calling logic needed

### Method 2: Direct REST API Calls

**Best For**: Direct tool calls, custom UI, or when you need explicit control

**How It Works**:
1. User selects specific action or tool
2. App directly calls MCP server REST endpoint
3. Results displayed in UI

**Implementation**:

```typescript
// lib/mcp-client.ts
const MCP_API_BASE = 'https://mcp-draft-pool.moodmnky.com/api';
const MCP_API_KEY = process.env.MCP_API_KEY;

export async function callMCPTool(
  toolName: string, 
  params: Record<string, any>
): Promise<any> {
  const response = await fetch(`${MCP_API_BASE}/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MCP_API_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `API error: ${response.statusText}`);
  }

  return response.json();
}

// Usage in component
const pokemon = await callMCPTool('get_available_pokemon', { 
  point_range: [15, 18],
  limit: 10 
});
```

**Benefits**:
- ✅ Direct control over tool calls
- ✅ No OpenAI API costs
- ✅ Faster for simple queries
- ✅ Can build custom UI

### Method 3: OpenAI Functions Format

**Best For**: Using OpenAI Chat Completions API with function calling

**How It Works**:
1. Fetch function definitions from MCP server
2. Use with OpenAI Chat Completions API
3. Handle tool calls manually

**Implementation**:

```typescript
// lib/mcp-functions.ts
const MCP_FUNCTIONS_URL = 'https://mcp-draft-pool.moodmnky.com/functions';
const MCP_API_KEY = process.env.MCP_API_KEY;

export async function getMCPFunctions() {
  const response = await fetch(MCP_FUNCTIONS_URL, {
    headers: {
      'Authorization': `Bearer ${MCP_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch functions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.tools; // Array of OpenAI function definitions
}

// Usage in API route
import OpenAI from 'openai';
import { getMCPFunctions } from '@/lib/mcp-functions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  // Get MCP functions
  const functions = await getMCPFunctions();
  
  // Call OpenAI with functions
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: message }],
    tools: functions,
    tool_choice: 'auto',
  });

  // Handle tool calls
  const message = completion.choices[0].message;
  
  if (message.tool_calls) {
    // Execute tool calls and return results
    // (See full implementation in examples section)
  }

  return NextResponse.json({ response: message.content });
}
```

**Benefits**:
- ✅ More control than Responses API
- ✅ Can use Chat Completions API
- ✅ Handles function calling
- ✅ More flexible than Responses API

---

## Chat Interface Requirements

### UI Components Needed

#### 1. Chat Message Input

**Requirements**:
- Text input field
- Send button
- Optional: Team ID selector (if user has multiple teams)
- Optional: Season selector (if multiple seasons)
- Loading state during AI processing
- Error display for failed requests

**Example Component Structure**:
```typescript
// app/components/draft-assistant/ChatInput.tsx
'use client';

interface ChatInputProps {
  onSend: (message: string, teamId?: string) => void;
  disabled?: boolean;
  teamId?: string;
}

export function ChatInput({ onSend, disabled, teamId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim(), teamId);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about the draft pool, your team, or strategy..."
        disabled={disabled}
        className="flex-1 px-4 py-2 border rounded-lg"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
```

#### 2. Message Display

**Requirements**:
- Display user messages
- Display AI responses
- Display tool calls (optional, for transparency)
- Display tool results (optional, for debugging)
- Markdown rendering for AI responses
- Code block syntax highlighting
- Loading indicators during streaming

**Message Types**:
- **User Message**: User's question/input
- **AI Response**: Natural language response from OpenAI
- **Tool Call** (optional): Which tool was called with what parameters
- **Tool Result** (optional): Raw tool result data
- **Error**: Error messages

**Example Component Structure**:
```typescript
// app/components/draft-assistant/MessageDisplay.tsx
'use client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'error';
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
    result?: any;
  }>;
  timestamp: Date;
}

interface MessageDisplayProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageDisplay({ messages, isLoading }: MessageDisplayProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`p-4 rounded-lg ${
            message.role === 'user' 
              ? 'bg-blue-100 ml-auto max-w-[80%]' 
              : 'bg-gray-100 mr-auto max-w-[80%]'
          }`}
        >
          {message.role === 'tool' && (
            <div className="text-xs text-gray-500 mb-2">
              🔧 Called tool: {message.toolCalls?.[0]?.name}
            </div>
          )}
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          {message.toolCalls && message.toolCalls[0]?.result && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-gray-500">
                View tool result
              </summary>
              <pre className="mt-2 p-2 bg-gray-800 text-gray-100 rounded overflow-auto">
                {JSON.stringify(message.toolCalls[0].result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
      {isLoading && (
        <div className="p-4 bg-gray-100 rounded-lg mr-auto max-w-[80%]">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-gray-600">Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 3. Tool Call Visualization (Optional)

**Requirements**:
- Show which tools are being called
- Display tool parameters
- Show tool results (collapsible)
- Visual indicators for tool execution

**Example**:
```typescript
// app/components/draft-assistant/ToolCallDisplay.tsx
'use client';

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
  status: 'pending' | 'executing' | 'completed' | 'error';
}

export function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  return (
    <div className="border-l-4 border-blue-500 pl-4 py-2 my-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">🔧 {toolCall.name}</span>
        <span className={`text-xs px-2 py-1 rounded ${
          toolCall.status === 'completed' ? 'bg-green-100 text-green-800' :
          toolCall.status === 'executing' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {toolCall.status}
        </span>
      </div>
      {toolCall.arguments && (
        <details className="mt-1">
          <summary className="text-xs text-gray-500 cursor-pointer">
            Parameters
          </summary>
          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </details>
      )}
      {toolCall.result && (
        <details className="mt-1">
          <summary className="text-xs text-gray-500 cursor-pointer">
            Result
          </summary>
          <pre className="mt-1 text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">
            {JSON.stringify(toolCall.result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
```

#### 4. Quick Actions / Tool Shortcuts

**Requirements**:
- Quick access to common queries
- Pre-filled prompts for common tasks
- Visual buttons for common actions

**Example**:
```typescript
// app/components/draft-assistant/QuickActions.tsx
'use client';

const QUICK_ACTIONS = [
  { label: 'Available Pokémon', prompt: 'What Pokémon are available in the draft pool?' },
  { label: 'My Budget', prompt: 'How much budget do I have left?' },
  { label: 'My Roster', prompt: 'Show me my current roster' },
  { label: 'Draft Status', prompt: 'What\'s the current draft status?' },
  { label: 'Strategy Analysis', prompt: 'Analyze my draft strategy' },
];

export function QuickActions({ onAction }: { onAction: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.prompt)}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

### Chat Interface Layout

**Recommended Layout**:
```
┌─────────────────────────────────────────────────────────┐
│  Draft Assistant                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Quick Actions Bar]                                   │
│  [Available Pokémon] [My Budget] [My Roster] ...       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Message Display Area]                                │
│                                                         │
│  User: What Pokémon are available?                     │
│                                                         │
│  Assistant: Here are the available Pokémon...          │
│  [Tool Call: get_available_pokemon]                     │
│                                                         │
│  User: How much budget do I have?                      │
│                                                         │
│  Assistant: You have 60 points remaining...             │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Chat Input]                                           │
│  [Ask about the draft pool...] [Send]                   │
└─────────────────────────────────────────────────────────┘
```

### State Management

**Required State**:
- Messages array (user + assistant messages)
- Loading state (is processing)
- Error state (error messages)
- Team ID (current user's team)
- Season ID (current season)

**Example State Management**:
```typescript
// app/components/draft-assistant/useDraftAssistant.ts
'use client';

import { useState, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
}

export function useDraftAssistant(teamId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/draft-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message, 
          teamId 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response received',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
  };
}
```

---

## Implementation Steps

### Step 1: Set Up API Route

**File**: `app/api/draft-assistant/route.ts`

**Actions**:
1. Create API route file
2. Import OpenAI SDK
3. Configure MCP server URL and API key
4. Implement POST handler
5. Add error handling

**Code**: See "Method 1: OpenAI Responses API" section above

### Step 2: Create Chat Components

**Files**:
- `app/components/draft-assistant/ChatInput.tsx`
- `app/components/draft-assistant/MessageDisplay.tsx`
- `app/components/draft-assistant/QuickActions.tsx`
- `app/components/draft-assistant/useDraftAssistant.ts`

**Actions**:
1. Create component directory
2. Implement each component
3. Add TypeScript types
4. Add styling

### Step 3: Create Main Chat Interface

**File**: `app/components/draft-assistant/DraftAssistant.tsx`

**Actions**:
1. Combine all components
2. Add state management
3. Add error handling
4. Add loading states

**Code**:
```typescript
// app/components/draft-assistant/DraftAssistant.tsx
'use client';

import { ChatInput } from './ChatInput';
import { MessageDisplay } from './MessageDisplay';
import { QuickActions } from './QuickActions';
import { useDraftAssistant } from './useDraftAssistant';

interface DraftAssistantProps {
  teamId?: string;
  seasonId?: string;
}

export function DraftAssistant({ teamId, seasonId }: DraftAssistantProps) {
  const { messages, isLoading, error, sendMessage } = useDraftAssistant(teamId);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Draft Assistant</h2>
        <p className="text-sm text-gray-600">
          Ask questions about the draft pool, your team, or strategy
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <QuickActions onAction={sendMessage} />
        <MessageDisplay messages={messages} isLoading={isLoading} />
        {error && (
          <div className="p-4 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <div className="p-4 border-t">
        <ChatInput 
          onSend={sendMessage} 
          disabled={isLoading}
          teamId={teamId}
        />
      </div>
    </div>
  );
}
```

### Step 4: Integrate into Draft Page

**File**: `app/draft/page.tsx` (or wherever draft interface is)

**Actions**:
1. Import DraftAssistant component
2. Add to draft page layout
3. Pass team ID from user context
4. Style to match existing UI

**Code**:
```typescript
// app/draft/page.tsx
import { DraftAssistant } from '@/components/draft-assistant/DraftAssistant';
import { useUser } from '@/hooks/useUser'; // Your user hook

export default function DraftPage() {
  const { user } = useUser();
  const teamId = user?.teamId; // Get team ID from user context

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Existing draft interface */}
      <div className="lg:col-span-2">
        {/* Draft board, picks, etc. */}
      </div>

      {/* Draft Assistant Sidebar */}
      <div className="lg:col-span-1">
        <DraftAssistant teamId={teamId} />
      </div>
    </div>
  );
}
```

### Step 5: Add Environment Variables

**File**: `.env.local`

**Add**:
```bash
OPENAI_API_KEY=sk-...  # Your OpenAI API key
MCP_API_KEY=your_mcp_api_key  # MCP server API key
MCP_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
```

### Step 6: Install Dependencies

**Command**:
```bash
npm install openai react-markdown
# or
pnpm add openai react-markdown
```

---

## Use Cases & Examples

### Use Case 1: Query Available Pokémon

**User Input**: "What Pokémon are available for 15-18 points?"

**Flow**:
1. User sends message
2. API route calls OpenAI Responses API
3. OpenAI calls `get_available_pokemon` tool with `point_range: [15, 18]`
4. MCP server returns filtered Pokémon list
5. OpenAI generates response: "Here are the available Pokémon in the 15-18 point range: Pikachu (15), Squirtle (16), ..."

**UI Display**:
- User message bubble
- AI response bubble with formatted list
- Optional: Tool call indicator showing `get_available_pokemon` was called

### Use Case 2: Check Team Budget

**User Input**: "How much budget do I have left?"

**Flow**:
1. User sends message
2. API route includes team ID in context
3. OpenAI calls `get_team_budget` tool with `team_id`
4. MCP server returns budget information
5. OpenAI generates response: "You have 60 points remaining out of your 120 point budget. You've spent 60 points so far."

**UI Display**:
- User message bubble
- AI response with budget breakdown
- Optional: Visual budget bar/gauge

### Use Case 3: Analyze Draft Strategy

**User Input**: "Analyze my draft strategy"

**Flow**:
1. User sends message
2. API route includes team ID
3. OpenAI calls `analyze_draft_strategy` prompt
4. Prompt internally calls multiple tools (`get_team_budget`, `get_team_picks`, etc.)
5. OpenAI generates comprehensive strategy analysis

**UI Display**:
- User message bubble
- AI response with formatted analysis
- Sections: Budget, Roster, Recommendations

### Use Case 4: Compare Teams

**User Input**: "Compare my team to Team X"

**Flow**:
1. User sends message
2. API route extracts team IDs
3. OpenAI calls `compare_teams` prompt with both team IDs
4. Prompt internally calls tools for both teams
5. OpenAI generates side-by-side comparison

**UI Display**:
- User message bubble
- AI response with comparison table
- Budget comparison, roster comparison, strategic analysis

### Use Case 5: Get Competitive Meta Info

**User Input**: "What tier is Garchomp in?"

**Flow**:
1. User sends message
2. OpenAI calls `get_smogon_meta` tool with `pokemon_name: "Garchomp"`
3. MCP server returns meta data (cached)
4. OpenAI generates response: "Garchomp is in the OU (OverUsed) tier with a usage rate of..."

**UI Display**:
- User message bubble
- AI response with tier information
- Optional: Visual tier badge

---

## Error Handling

### Error Types

#### 1. Authentication Errors (401)

**Cause**: Missing or invalid API key

**Handling**:
```typescript
if (response.status === 401) {
  return NextResponse.json(
    { error: 'Authentication failed. Please check your API key.' },
    { status: 401 }
  );
}
```

**UI Display**: Show error message, prompt user to check configuration

#### 2. Rate Limit Errors (429)

**Cause**: Too many requests

**Handling**:
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  return NextResponse.json(
    { 
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter 
    },
    { status: 429 }
  );
}
```

**UI Display**: Show rate limit message with retry timer

#### 3. Validation Errors (400)

**Cause**: Invalid tool parameters

**Handling**:
```typescript
if (response.status === 400) {
  const error = await response.json();
  return NextResponse.json(
    { error: error.error?.message || 'Invalid request' },
    { status: 400 }
  );
}
```

**UI Display**: Show validation error message

#### 4. Server Errors (500)

**Cause**: MCP server or database error

**Handling**:
```typescript
if (response.status >= 500) {
  return NextResponse.json(
    { error: 'Server error. Please try again later.' },
    { status: 500 }
  );
}
```

**UI Display**: Show generic error message, log for debugging

### Error Display Component

```typescript
// app/components/draft-assistant/ErrorMessage.tsx
'use client';

interface ErrorMessageProps {
  error: string;
  retryAfter?: number;
  onRetry?: () => void;
}

export function ErrorMessage({ error, retryAfter, onRetry }: ErrorMessageProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-2">
        <span className="text-red-600">⚠️</span>
        <div className="flex-1">
          <p className="text-red-800 font-semibold">Error</p>
          <p className="text-red-700 text-sm">{error}</p>
          {retryAfter && (
            <p className="text-red-600 text-xs mt-1">
              Retry after {retryAfter} seconds
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## Testing & Validation

### Test Cases

#### 1. Basic Query Test

**Test**: "What Pokémon are available?"

**Expected**:
- ✅ API route receives request
- ✅ OpenAI SDK configured correctly
- ✅ MCP tool called successfully
- ✅ Response returned to UI
- ✅ Message displayed correctly

#### 2. Team-Specific Query Test

**Test**: "How much budget do I have?" (with team ID)

**Expected**:
- ✅ Team ID passed correctly
- ✅ `get_team_budget` tool called
- ✅ Correct team's budget returned
- ✅ Response formatted correctly

#### 3. Error Handling Test

**Test**: Invalid API key

**Expected**:
- ✅ 401 error caught
- ✅ Error message displayed
- ✅ User-friendly error shown
- ✅ No crash

#### 4. Rate Limit Test

**Test**: Send 100+ requests rapidly

**Expected**:
- ✅ Rate limit enforced
- ✅ 429 error returned
- ✅ Rate limit message displayed
- ✅ Retry-after information shown

#### 5. Streaming Test (if implemented)

**Test**: Long response with streaming

**Expected**:
- ✅ Response streams correctly
- ✅ UI updates incrementally
- ✅ No UI freezing
- ✅ Complete response received

### Validation Checklist

- [ ] API route created and working
- [ ] OpenAI SDK configured correctly
- [ ] MCP server URL configured
- [ ] API key authentication working
- [ ] Chat input component working
- [ ] Message display component working
- [ ] Error handling implemented
- [ ] Loading states working
- [ ] Quick actions working
- [ ] Team ID passed correctly
- [ ] All 9 tools accessible
- [ ] Prompts working
- [ ] Error messages user-friendly
- [ ] UI matches design system
- [ ] Mobile responsive
- [ ] Accessibility considerations

---

## Advanced Features (Optional)

### Feature 1: Streaming Responses

**Implementation**: Use OpenAI streaming API

**Benefits**: Real-time response display, better UX

**Code**:
```typescript
const stream = await openai.responses.create({
  model: 'gpt-4o',
  input: [{ role: 'user', content: message }],
  tools: [{ type: 'mcp', ... }],
  stream: true,
});

// Stream response chunks
for await (const chunk of stream) {
  // Update UI with chunk
}
```

### Feature 2: Tool Call Visualization

**Implementation**: Display tool calls in UI

**Benefits**: Transparency, debugging, user education

**Code**: See ToolCallDisplay component above

### Feature 3: Conversation History

**Implementation**: Store messages in database or localStorage

**Benefits**: Persistent chat history, context across sessions

**Code**:
```typescript
// Store messages
localStorage.setItem('draft-assistant-history', JSON.stringify(messages));

// Load messages
const history = JSON.parse(localStorage.getItem('draft-assistant-history') || '[]');
```

### Feature 4: Suggested Follow-ups

**Implementation**: Generate follow-up questions based on response

**Benefits**: Better UX, guides user to useful queries

**Code**:
```typescript
// After receiving response, generate follow-ups
const followUps = await generateFollowUps(response);
// Display as clickable suggestions
```

---

## Performance Considerations

### Caching

**MCP Server**: Already implements caching for static data

**App Level**: Consider caching:
- Team ID (from user context)
- Season ID (current season)
- Common queries (if appropriate)

### Rate Limiting

**MCP Server**: Enforces rate limits (100 requests per 15 minutes)

**App Level**: Consider:
- Client-side rate limiting (prevent spam)
- Debouncing for rapid inputs
- Queue system for multiple requests

### Optimization

**Recommendations**:
- Use React.memo for message components
- Virtualize long message lists
- Lazy load chat interface
- Optimize bundle size

---

## Security Considerations

### API Key Security

**✅ DO**:
- Store API keys in environment variables
- Never expose API keys to client
- Use server-side API routes only
- Rotate API keys regularly

**❌ DON'T**:
- Hardcode API keys
- Expose API keys in client code
- Commit API keys to git
- Share API keys publicly

### Input Validation

**✅ DO**:
- Validate user input
- Sanitize messages
- Limit message length
- Validate team ID (ensure user owns team)

**❌ DON'T**:
- Trust user input
- Allow SQL injection
- Allow XSS attacks
- Bypass authentication

---

## Troubleshooting

### Issue: OpenAI API Errors

**Symptoms**: 424 Failed Dependency, 500 errors

**Solutions**:
- Verify MCP server URL is public (not localhost)
- Check MCP server is running
- Verify API key is correct
- Check MCP server logs

### Issue: Tool Calls Not Working

**Symptoms**: AI doesn't call tools, generic responses

**Solutions**:
- Verify MCP server URL is correct
- Check tool descriptions are clear
- Verify OpenAI model supports function calling
- Check API route logs

### Issue: Slow Responses

**Symptoms**: Long wait times

**Solutions**:
- Check MCP server cache hit rate
- Verify database performance
- Consider caching common queries
- Optimize tool calls

### Issue: Authentication Errors

**Symptoms**: 401 Unauthorized

**Solutions**:
- Verify MCP_API_KEY is set
- Check API key is correct
- Verify API key has proper permissions
- Check MCP server authentication logs

---

## Next Steps

1. **Implement API Route**: Create `/app/api/draft-assistant/route.ts`
2. **Create Components**: Build chat interface components
3. **Integrate**: Add to draft page
4. **Test**: Validate all functionality
5. **Polish**: Improve UI/UX
6. **Deploy**: Deploy to production

---

## Resources

### Documentation

- **MCP Server Guide**: `knowledge-base/aab-battle-league/MCP-SERVER-PRODUCTION-GUIDE.md`
- **Phase 3 Features**: `tools/mcp-servers/draft-pool-server/PHASE-3-COMPLETE.md`
- **OpenAI SDK Docs**: https://platform.openai.com/docs/api-reference

### Code Examples

- **API Route**: See "Method 1: OpenAI Responses API" section
- **Components**: See "Chat Interface Requirements" section
- **Error Handling**: See "Error Handling" section

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **READY FOR IMPLEMENTATION**  
**Version**: 1.0.1
