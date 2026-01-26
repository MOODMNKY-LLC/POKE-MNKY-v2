# POKE MNKY Draft Pool MCP Server - Complete Breakdown

**Date**: January 25, 2026  
**Server**: `poke-mnky-draft-pool`  
**Version**: 1.0.1  
**Status**: ✅ Production Ready

---

## Executive Summary

The **poke-mnky-draft-pool** MCP server is a remote HTTP-based service that provides AI agents and applications with structured access to draft pool data, team budgets, picks, and competitive meta information. It acts as a **secure, authenticated bridge** between your Next.js application and the Supabase database, enabling AI-powered draft assistance and analysis.

**Key Characteristics**:
- **Transport**: Streamable HTTP (remote access via HTTPS)
- **Protocol**: MCP (Model Context Protocol) - JSON-RPC over HTTP
- **Authentication**: Bearer token (API key)
- **Location**: Production server at `https://mcp-draft-pool.moodmnky.com/mcp`
- **Purpose**: Enable AI agents to query draft data without direct database access

---

## Architecture Overview

### What is an MCP Server?

**MCP (Model Context Protocol)** is a standardized protocol that allows AI models to interact with external tools and data sources. Think of it as a **secure API layer** that:

1. **Exposes structured tools** that AI models can call
2. **Provides authentication** to control access
3. **Returns structured data** in a format AI models understand
4. **Handles complex queries** that would be difficult to express in natural language

### Why Use MCP Instead of Direct Database Queries?

**Benefits**:
- ✅ **Security**: No need to expose database credentials to AI models
- ✅ **Abstraction**: Complex queries are encapsulated in tools
- ✅ **Caching**: Server can cache frequently accessed data
- ✅ **Rate Limiting**: Prevents abuse and overload
- ✅ **Standardization**: Works with any MCP-compatible AI system
- ✅ **Separation of Concerns**: Database logic stays on the server

**Trade-offs**:
- ⚠️ **Network Latency**: HTTP requests vs direct database access
- ⚠️ **Additional Infrastructure**: Requires running a separate server
- ⚠️ **Complexity**: More moving parts to manage

---

## Server Configuration

### Current Setup (Streamable HTTP)

```json
{
  "poke-mnky-draft-pool": {
    "type": "streamable-http",
    "url": "https://mcp-draft-pool.moodmnky.com/mcp",
    "description": "POKE MNKY Draft Pool MCP Server - Access to draft pool data, team budgets, picks, and draft status",
    "headers": {
      "Accept": "application/json, text/event-stream",
      "Authorization": "Bearer mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38"
    }
  }
}
```

### What Changed from Docker Setup?

**Previous Configuration** (Docker-based):
- Ran locally via Docker container
- Connected to local Supabase instance
- Required Docker image to be available
- Used stdio transport (standard input/output)

**Current Configuration** (Streamable HTTP):
- Runs on remote production server
- Connects to production Supabase database
- Accessible via HTTPS from anywhere
- Uses HTTP transport (REST API-like)

**Why the Change?**
- ✅ **Easier Development**: No need to run Docker locally
- ✅ **Consistent Data**: Always uses production database
- ✅ **Better Performance**: Server has optimized caching
- ✅ **Simpler Setup**: Just configure URL and API key

---

## Authentication

### Bearer Token Authentication

The server uses **Bearer token authentication** in the `Authorization` header:

```
Authorization: Bearer mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38
```

**How It Works**:
1. Every request includes the Bearer token in headers
2. Server validates the token
3. If valid, request proceeds; if invalid, returns 401 Unauthorized

**Security Considerations**:
- ⚠️ **Never commit** the API key to version control
- ⚠️ **Store in environment variables** (`.env.local`)
- ⚠️ **Rotate keys** periodically for security
- ⚠️ **Use different keys** for development vs production

### Environment Variables

**In `.env.local`** (for Next.js app):
```bash
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
MCP_API_KEY=mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38
```

**In Vercel** (production):
- Set via Vercel Dashboard → Settings → Environment Variables
- Same variables as `.env.local`

---

## Available Tools (9 Tools)

The MCP server exposes **9 tools** that can be called by AI agents or directly via REST API:

### 1. `get_available_pokemon`

**Purpose**: Query available Pokémon in the draft pool with filters

**Parameters**:
```typescript
{
  point_range?: [number, number],  // [min, max] point range
  generation?: number,              // Pokémon generation (1-9)
  type?: string,                    // Pokémon type (e.g., "Fire", "Water")
  season_id?: string,               // Optional season filter
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

**Use Cases**:
- "What Pokémon are available for 15-18 points?"
- "Show me all Generation 1 Pokémon"
- "What Fire-type Pokémon can I draft?"

**Database Tables**: `draft_pool`, `pokepedia_pokemon`

**Caching**: Yes (5 minutes TTL)

---

### 2. `get_draft_status`

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
  status: "active" | "completed" | "paused",
  current_pick: number,        // Current pick number
  current_round: number,       // Current round number
  current_team_id?: string,    // Team whose turn it is
  total_picks: number          // Total picks made
}
```

**Use Cases**:
- "What's the current draft status?"
- "Whose turn is it?"
- "How many picks have been made?"

**Database Tables**: `draft_sessions`, `seasons`

**Caching**: No (real-time data)

---

### 3. `get_team_budget`

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
  spent_points: number,     // Points spent so far
  remaining_points: number  // Points remaining
}
```

**Use Cases**:
- "How much budget does Team X have left?"
- "What's my remaining budget?"
- "How many points has Team Y spent?"

**Database Tables**: `draft_budgets`, `team_rosters`

**Caching**: No (real-time calculations)

---

### 4. `get_team_picks`

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

**Use Cases**:
- "What Pokémon has Team X drafted?"
- "Show me my current roster"
- "What picks has Team Y made?"

**Database Tables**: `team_rosters`, `draft_pool`

**Caching**: No (real-time roster data)

---

### 5. `get_pokemon_types`

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

**Use Cases**:
- "What type is Pikachu?"
- "What are Charizard's types?"
- "Is Gyarados Water/Flying?"

**Database Tables**: `pokepedia_pokemon`

**Caching**: Yes (10 minutes TTL)

---

### 6. `get_smogon_meta`

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

**Use Cases**:
- "What tier is Garchomp in?"
- "What's Pikachu's usage rate?"
- "What moves does Charizard commonly use?"

**Database Tables**: `smogon_meta_snapshot`

**Caching**: Yes (1 hour TTL)

---

### 7. `get_ability_mechanics`

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

**Use Cases**:
- "How does Intimidate work?"
- "What does Levitate do?"
- "Explain the ability Adaptability"

**Database Tables**: `pokepedia_abilities`

**Caching**: Yes (30 minutes TTL)

---

### 8. `get_move_mechanics`

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

**Use Cases**:
- "How does Earthquake work?"
- "What does Thunderbolt do?"
- "Explain the move Flamethrower"

**Database Tables**: `pokepedia_moves`

**Caching**: Yes (30 minutes TTL)

---

### 9. `analyze_pick_value`

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
  recommendation: string     // "Good value" | "High cost" | "Cannot afford"
}
```

**Use Cases**:
- "Is Pikachu worth 15 points for my team?"
- "Can I afford Charizard?"
- "Should I draft Garchomp?"

**Database Tables**: `draft_pool`, `draft_budgets`

**Caching**: No (dynamic calculations)

---

## Available Prompts (3 Prompts)

Prompts are **reusable workflows** that combine multiple tools:

### 1. `analyze_draft_strategy`

**Purpose**: Comprehensive draft strategy analysis

**Arguments**:
```typescript
{
  team_id: string,
  focus_area?: "budget" | "roster" | "remaining_picks" | "all",
  season_id?: string
}
```

**Returns**: Formatted analysis with budget, roster, recommendations

---

### 2. `analyze_type_coverage`

**Purpose**: Type coverage analysis

**Arguments**:
```typescript
{
  team_id: string,
  season_id?: string
}
```

**Returns**: Type coverage score, missing types, recommendations

---

### 3. `compare_teams`

**Purpose**: Side-by-side team comparison

**Arguments**:
```typescript
{
  team_id_1: string,
  team_id_2: string,
  comparison_type?: "roster" | "budget" | "value" | "all",
  season_id?: string
}
```

**Returns**: Budget comparison, roster comparison, strategic analysis

---

## Available Resources (13 Resources)

Resources provide **structured data access** for prompts:

### Draft Pool Resources (6)
1. `draft-board://current` - Current draft pool state
2. `team://{team_id}/roster` - Team roster data
3. `pokemon://{name}/types` - Pokémon type information
4. `pokemon://{name}/meta/{format}` - Competitive meta data
5. `mechanics://abilities/{name}` - Ability mechanics
6. `mechanics://moves/{name}` - Move mechanics

### Knowledge Base Resources (7)
7. `knowledge-base://index` - Knowledge base index
8. `knowledge-base://file/{path}` - Access any knowledge base file
9. `knowledge-base://category/{category}` - Category listing
10. `knowledge-base://readme` - Knowledge base README
11. `knowledge-base://data/extraction-summary` - Extraction summary
12. `knowledge-base://data/google-sheets` - Google Sheets metadata
13. `knowledge-base://data/google-sheets/{section}` - Google Sheets data sections

---

## How to Use During Development

### Method 1: Via Cursor AI (MCP Integration)

**How It Works**:
1. Cursor automatically loads MCP servers from `.cursor/mcp.json`
2. Tools become available to AI assistant
3. You can ask natural language questions
4. AI calls appropriate tools automatically

**Example Usage**:
```
You: "What Pokémon are available for 15-18 points in the draft pool?"

AI: [Calls get_available_pokemon tool]
    Here are the available Pokémon in the 15-18 point range:
    - Pikachu (15 points)
    - Squirtle (16 points)
    ...
```

**Benefits**:
- ✅ Natural language interface
- ✅ No code required
- ✅ AI handles tool selection
- ✅ Great for exploration and debugging

---

### Method 2: Via Next.js API Routes (OpenAI SDK)

**Use Case**: Building chat interfaces, AI assistants in your app

**Implementation**:
```typescript
// app/api/draft-assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MCP_SERVER_URL = process.env.MCP_DRAFT_POOL_SERVER_URL;
const MCP_API_KEY = process.env.MCP_API_KEY;

export async function POST(request: NextRequest) {
  const { message, teamId } = await request.json();

  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: [{ role: 'user', content: message }],
    tools: [{
      type: 'mcp',
      server_label: 'poke-mnky-draft-pool',
      server_url: MCP_SERVER_URL,
      server_description: 'Access to POKE MNKY draft pool and team data',
      authorization: `Bearer ${MCP_API_KEY}`,
    }],
  });

  return NextResponse.json({ response: response.output });
}
```

**Benefits**:
- ✅ Natural language chat interface
- ✅ AI decides which tools to use
- ✅ Handles multiple tool calls
- ✅ Generates natural language responses

---

### Method 3: Direct REST API Calls

**Use Case**: Direct tool calls, custom UI, explicit control

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

// Usage
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

---

### Method 4: Via OpenAI Functions Format

**Use Case**: Using OpenAI Chat Completions API with function calling

**Implementation**:
```typescript
// Fetch function definitions from MCP server
const functions = await fetch('https://mcp-draft-pool.moodmnky.com/functions', {
  headers: { 'Authorization': `Bearer ${MCP_API_KEY}` },
}).then(r => r.json());

// Use with OpenAI Chat Completions
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: message }],
  tools: functions.tools,
  tool_choice: 'auto',
});
```

**Benefits**:
- ✅ More control than Responses API
- ✅ Can use Chat Completions API
- ✅ Handles function calling
- ✅ More flexible than Responses API

---

## Development Workflow

### Step 1: Configure Environment Variables

**Create `.env.local`**:
```bash
# MCP Server Configuration
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
MCP_API_KEY=mnky_ce00aff692b6cc7fc6a6a782a5f47d1894f288be09d4d275d7ac31756942ae38

# OpenAI (for AI features)
OPENAI_API_KEY=sk-...
```

### Step 2: Restart Cursor

**Important**: After updating `.cursor/mcp.json`, you must:
1. **Close Cursor completely** (all windows)
2. **Reopen Cursor**
3. **Wait 10-15 seconds** for MCP servers to initialize

### Step 3: Verify MCP Server is Loaded

**Ask Cursor**:
```
What MCP tools are available from poke-mnky-draft-pool?
```

**Expected Response**: List of 9 tools

### Step 4: Test Tools

**Test via Cursor Chat**:
```
Use get_available_pokemon to find Pokémon with 20 points
```

**Test via Code**:
```typescript
// Create test file: scripts/test-mcp.ts
import { callMCPTool } from '@/lib/mcp-client';

async function test() {
  const result = await callMCPTool('get_available_pokemon', {
    point_range: [15, 18],
    limit: 5
  });
  console.log(result);
}

test();
```

### Step 5: Integrate into Your App

**Option A**: Add to existing API route (see `app/api/ai/pokedex/route.ts`)

**Option B**: Create new draft assistant route (see `MCP-SERVER-INTEGRATION-GUIDE.md`)

**Option C**: Use directly in components (see Method 3 above)

---

## Database Tables Accessed

The MCP server queries these Supabase tables:

### Core Draft Tables
- **`draft_pool`** - Available Pokémon with point values
- **`draft_sessions`** - Active draft sessions
- **`draft_budgets`** - Team budgets per season
- **`team_rosters`** - Team draft picks
- **`seasons`** - Season information

### Reference Data Tables
- **`pokepedia_pokemon`** - Pokémon metadata (types, generations)
- **`pokepedia_abilities`** - Ability mechanics
- **`pokepedia_moves`** - Move mechanics
- **`smogon_meta_snapshot`** - Competitive meta data

### Access Method
- Uses **Supabase Service Role Key** (bypasses RLS)
- All queries are server-side only
- No direct database access from client

---

## Error Handling

### Common Errors

#### 401 Unauthorized
**Cause**: Missing or invalid API key

**Solution**:
- Verify `MCP_API_KEY` is set in `.env.local`
- Check API key matches server configuration
- Ensure Bearer token format is correct

#### 404 Not Found
**Cause**: Invalid tool name or endpoint

**Solution**:
- Verify tool name matches exactly (case-sensitive)
- Check MCP server is running
- Verify URL is correct

#### 429 Too Many Requests
**Cause**: Rate limit exceeded

**Solution**:
- Wait before retrying
- Check rate limit headers
- Implement exponential backoff

#### 500 Internal Server Error
**Cause**: Server or database error

**Solution**:
- Check MCP server logs
- Verify database connection
- Check Supabase service role key

---

## Performance Considerations

### Caching

**Server-Side Caching**:
- `get_available_pokemon`: 5 minutes TTL
- `get_pokemon_types`: 10 minutes TTL
- `get_smogon_meta`: 1 hour TTL
- `get_ability_mechanics`: 30 minutes TTL
- `get_move_mechanics`: 30 minutes TTL

**No Caching** (Real-time):
- `get_draft_status`
- `get_team_budget`
- `get_team_picks`
- `analyze_pick_value`

### Rate Limiting

**Server Limits**:
- 100 requests per 15 minutes per API key
- Rate limit headers included in responses

**Client-Side Recommendations**:
- Implement request debouncing
- Cache results when appropriate
- Use streaming for long responses

---

## Security Best Practices

### ✅ DO:
- Store API keys in environment variables
- Never commit API keys to version control
- Use different keys for dev/staging/prod
- Rotate API keys periodically
- Validate user input before sending to MCP server
- Implement rate limiting on client side

### ❌ DON'T:
- Hardcode API keys in code
- Expose API keys to client-side code
- Share API keys publicly
- Trust user input without validation
- Bypass authentication
- Make excessive requests (respect rate limits)

---

## Troubleshooting

### Issue: MCP Server Not Loading in Cursor

**Symptoms**: Tools not available, errors in Cursor

**Solutions**:
1. Verify `.cursor/mcp.json` syntax is valid JSON
2. Restart Cursor completely
3. Check Cursor logs for MCP errors
4. Verify server URL is accessible
5. Test server health endpoint: `curl https://mcp-draft-pool.moodmnky.com/health`

### Issue: Authentication Errors

**Symptoms**: 401 Unauthorized errors

**Solutions**:
1. Verify API key in `.env.local`
2. Check Bearer token format: `Bearer {key}`
3. Ensure API key matches server configuration
4. Test with curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" \
        https://mcp-draft-pool.moodmnky.com/health
   ```

### Issue: Tool Calls Not Working

**Symptoms**: Tools return errors or no results

**Solutions**:
1. Verify tool name matches exactly
2. Check parameter types match schema
3. Verify required parameters are provided
4. Check server logs for errors
5. Test with direct REST API call first

---

## Comparison: MCP vs Direct Supabase Queries

### When to Use MCP:
- ✅ AI-powered features (chat assistants, recommendations)
- ✅ When you want structured tool access
- ✅ When you need caching and rate limiting
- ✅ When you want to separate concerns
- ✅ When building OpenAI-integrated features

### When to Use Direct Supabase:
- ✅ Simple CRUD operations
- ✅ Real-time subscriptions
- ✅ When you need maximum performance
- ✅ When you need RLS policies
- ✅ When building standard UI components

**Best Practice**: Use **both** - MCP for AI features, direct Supabase for standard UI.

---

## Next Steps

1. **Test MCP Server**: Verify all 9 tools work correctly
2. **Integrate into App**: Add to existing API routes or create new ones
3. **Build UI**: Create chat interface or tool-based components
4. **Monitor Performance**: Track response times and cache hit rates
5. **Iterate**: Add more tools or prompts as needed

---

## Resources

### Documentation
- **MCP Server Guide**: `MCP-SERVER-INTEGRATION-GUIDE.md`
- **Implementation Status**: `docs/MCP-SERVER-IMPLEMENTATION-STATUS.md`
- **Draftboard Breakdown**: `DRAFTBOARD-COMPREHENSIVE-BREAKDOWN.md`

### Code Examples
- **API Route**: `app/api/ai/pokedex/route.ts` (shows MCP integration)
- **MCP Client**: `lib/agents/mcp-servers.ts` (shared MCP configs)

### External Resources
- **MCP Protocol**: https://modelcontextprotocol.io
- **OpenAI SDK**: https://platform.openai.com/docs/api-reference
- **Supabase Docs**: https://supabase.com/docs

---

**Last Updated**: January 25, 2026  
**Status**: ✅ Production Ready  
**Version**: 1.0.1
