# OpenAI Capabilities Integration Plan for POKE-MNKY

**Date**: January 17, 2026  
**Status**: Comprehensive Research & Implementation Plan  
**Purpose**: Augment POKE-MNKY with latest OpenAI capabilities including Agents SDK, Responses API, Realtime API, GPT-5.2-Codex, and MCP server integration

---

## Executive Summary

This document outlines a comprehensive plan to integrate OpenAI's latest capabilities into the POKE-MNKY ecosystem, transforming it into an AI-powered platform with intelligent agents assisting coaches throughout the drafting, free agency, and battle processes.

**Key Integrations:**
1. **Agents SDK** - Build specialized agents for drafting, free agency, and battle strategy
2. **Responses API** - Migrate from Chat Completions to Responses API with MCP tool integration
3. **Realtime API** - Live draft assistance and real-time battle commentary
4. **GPT-5.2-Codex** - Advanced coding and strategic analysis capabilities
5. **MCP Servers** - Custom Model Context Protocol servers for league data access

---

## Current State Analysis

### Existing OpenAI Integration

**Current Implementation:**
- Uses OpenAI SDK v4+ with Chat Completions API
- Models: GPT-4.1, GPT-5.2, GPT-5-mini
- Endpoints:
  - `/api/ai/pokedex` - Pokédex Q&A with function calling
  - `/api/ai/weekly-recap` - Weekly recap generation
  - `/api/ai/coach` - Strategic team analysis
  - `/api/ai/parse-result` - Match result parsing
  - `/api/ai/sql` - Natural language → SQL queries

**Limitations:**
- No agent orchestration (single API calls)
- No MCP server integration
- No realtime capabilities
- Limited tool reuse across endpoints
- No multi-step agent workflows

### Server Infrastructure

**Available Docker Services:**
- Showdown Server (port 8000)
- Showdown Client (ports 8080, 8443)
- Loginserver (port 8001)
- PokéAPI Service (port 8002)
- Discord Bot
- Integration Worker
- Damage Calculator (port 5000)

**Server Location:** `moodmnky@10.3.0.119`  
**Docker Compose:** `/home/moodmnky/POKE-MNKY/docker-compose.yml`

---

## Phase 1: MCP Server Infrastructure

### Overview

Create custom Model Context Protocol (MCP) servers that expose league data and tools via a standardized interface. These servers will run on the Docker infrastructure and be accessible via OpenAI's Responses API.

### MCP Server Architecture

```
┌─────────────────────────────────────────────────────────┐
│              OpenAI Responses API                        │
│  (with MCP tool integration)                            │
└───────────────┬─────────────────────────────────────────┘
                │ HTTP/SSE or Streamable HTTP
                ▼
┌─────────────────────────────────────────────────────────┐
│         MCP Servers (Docker Containers)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Draft MCP    │  │ Battle MCP   │  │ Showdown MCP │ │
│  │ Server       │  │ Server       │  │ Server       │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ Supabase │      │ Showdown │      │ PokéAPI  │
    │ Database │      │ Server   │      │ Service  │
    └──────────┘      └──────────┘      └──────────┘
```

### MCP Server 1: Draft Pool Server

**Purpose:** Expose draft pool data and operations to AI agents

**Tools Exposed:**
- `get_available_pokemon` - Query available Pokémon in draft pool
- `get_draft_status` - Get current draft session status
- `get_team_budget` - Get team's remaining draft budget
- `get_team_picks` - Get team's current draft picks
- `analyze_pick_value` - Analyze if a pick is good value
- `suggest_draft_picks` - Suggest optimal picks based on team needs

**Implementation:**
```typescript
// tools/mcp-servers/draft-pool-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'poke-mnky-draft-pool',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Tool: Get available Pokémon
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_available_pokemon',
      description: 'Get available Pokémon in the draft pool with filters',
      inputSchema: {
        type: 'object',
        properties: {
          point_range: { type: 'array', items: { type: 'number' } },
          generation: { type: 'number' },
          type: { type: 'string' },
        },
      },
    },
    // ... more tools
  ],
}));

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'get_available_pokemon':
      // Query Supabase draft_pool table
      const pokemon = await supabase
        .from('draft_pool')
        .select('*')
        .eq('available', true)
        .gte('point_value', args.point_range?.[0] || 0)
        .lte('point_value', args.point_range?.[1] || 20);
      
      return { content: [{ type: 'text', text: JSON.stringify(pokemon) }] };
    
    // ... handle other tools
  }
});
```

**Docker Configuration:**
```yaml
# docker-compose.yml addition
poke-mnky-draft-mcp-server:
  build: ./tools/mcp-servers/draft-pool-server
  environment:
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  networks:
    - poke-mnky-network
  restart: unless-stopped
```

### MCP Server 2: Battle Strategy Server

**Purpose:** Expose battle state and strategy tools

**Tools Exposed:**
- `get_battle_state` - Get current battle state
- `analyze_matchup` - Analyze team matchup
- `suggest_moves` - Suggest optimal moves
- `calculate_damage` - Calculate damage for moves
- `get_team_coverage` - Get type coverage analysis

**Implementation:** Similar structure to Draft Pool Server, connecting to Supabase battles table and Showdown server APIs.

### MCP Server 3: Showdown Integration Server

**Purpose:** Bridge between OpenAI agents and Showdown services

**Tools Exposed:**
- `validate_team` - Validate team against roster
- `create_battle_room` - Create Showdown battle room
- `get_replay_data` - Extract data from replay
- `check_team_legality` - Check if team follows league rules

**Implementation:** Connects to Showdown server APIs and Supabase for roster validation.

### MCP Server Deployment

**Location:** `/home/moodmnky/POKE-MNKY/tools/mcp-servers/`

**Structure:**
```
tools/mcp-servers/
├── draft-pool-server/
│   ├── src/
│   │   └── index.ts
│   ├── Dockerfile
│   └── package.json
├── battle-strategy-server/
│   └── ...
└── showdown-integration-server/
    └── ...
```

**Transport:** HTTP/SSE (for remote access via Responses API)

---

## Phase 2: Responses API Migration

### Overview

Migrate existing Chat Completions endpoints to Responses API, enabling:
- Built-in tools (web search, file search, computer use)
- MCP server integration
- Better tool calling performance
- Background mode for long-running tasks

### Migration Strategy

**Step 1: Update OpenAI Client**

```typescript
// lib/openai-client.ts
import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Add Responses API client
export const responsesClient = {
  create: async (params: {
    model: string
    input: Array<{ role: string; content: string }>
    tools?: Array<{ type: string; [key: string]: any }>
    stream?: boolean
  }) => {
    return openai.responses.create(params)
  },
}
```

**Step 2: Migrate Pokédex Endpoint**

```typescript
// app/api/ai/pokedex/route.ts (Updated)
import { responsesClient, AI_MODELS } from "@/lib/openai-client"

export async function POST(request: Request) {
  const { query } = await request.json()

  // Use Responses API with MCP tool
  const response = await responsesClient.create({
    model: AI_MODELS.POKEDEX_QA,
    input: [
      {
        role: "user",
        content: query,
      },
    ],
    tools: [
      {
        type: "mcp",
        server_label: "poke-mnky-draft-pool",
        server_url: process.env.MCP_DRAFT_POOL_SERVER_URL,
        server_description: "Access to Pokémon draft pool and team data",
      },
    ],
  })

  return NextResponse.json({
    answer: response.output[0]?.content?.[0]?.text || "No response",
  })
}
```

**Step 3: Add Built-in Tools**

```typescript
// Example: Enhanced coach endpoint with web search
const response = await responsesClient.create({
  model: AI_MODELS.STRATEGY_COACH,
  input: [{ role: "user", content: query }],
  tools: [
    {
      type: "web_search", // Built-in tool
    },
    {
      type: "mcp",
      server_label: "poke-mnky-battle-strategy",
      server_url: process.env.MCP_BATTLE_STRATEGY_SERVER_URL,
    },
  ],
})
```

### Benefits of Migration

1. **Better Tool Performance:** Responses API handles multiple tool calls more efficiently
2. **Built-in Tools:** Web search, file search, computer use available out of the box
3. **MCP Integration:** Standardized way to connect to custom tools
4. **Background Mode:** Long-running tasks (like team analysis) can run asynchronously
5. **Streaming:** Better streaming support for real-time updates

---

## Phase 3: Agents SDK Integration

### Overview

Build specialized AI agents using OpenAI's Agents SDK to assist coaches with:
- Draft strategy and pick recommendations
- Free agency decisions
- Battle strategy and move selection
- Team building and optimization

### Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Agent Orchestration Layer                  │
│  (Agents SDK - Python/TypeScript)                       │
└───────────────┬─────────────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Draft   │ │ Free    │ │ Battle  │
│ Agent   │ │ Agency  │ │ Agent   │
│         │ │ Agent   │ │         │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┼───────────┘
                 ▼
     ┌─────────────────────┐
     │  Responses API      │
     │  (with MCP tools)   │
     └─────────────────────┘
```

### Agent 1: Draft Assistant Agent

**Purpose:** Help coaches make optimal draft picks

**Capabilities:**
- Analyze team needs (type coverage, roles)
- Suggest picks based on budget and availability
- Warn about budget constraints
- Provide pick value analysis
- Track draft trends

**Implementation:**

```typescript
// lib/agents/draft-assistant.ts
import { Agent, Runner } from '@openai/agents'

export const draftAssistantAgent = new Agent({
  name: "Draft Assistant",
  instructions: `You are an expert Pokémon draft league assistant. Help coaches make optimal draft picks by:
- Analyzing team needs (type coverage, roles, synergy)
- Suggesting picks based on budget and availability
- Warning about budget constraints
- Providing pick value analysis
- Tracking draft trends`,
  model: "gpt-5.2",
  tools: [
    {
      type: "mcp",
      server_label: "poke-mnky-draft-pool",
      server_url: process.env.MCP_DRAFT_POOL_SERVER_URL,
    },
  ],
})

export async function getDraftRecommendation(
  teamId: string,
  seasonId: string,
  context: string
) {
  const result = await Runner.run(draftAssistantAgent, {
    input: `Team ID: ${teamId}, Season: ${seasonId}
    
Context: ${context}

Analyze the team's needs and suggest optimal draft picks.`,
  })

  return result.final_output
}
```

**API Endpoint:**

```typescript
// app/api/ai/draft-assistant/route.ts
import { getDraftRecommendation } from "@/lib/agents/draft-assistant"

export async function POST(request: Request) {
  const { teamId, seasonId, context } = await request.json()
  
  const recommendation = await getDraftRecommendation(
    teamId,
    seasonId,
    context
  )
  
  return NextResponse.json({ recommendation })
}
```

### Agent 2: Free Agency Agent

**Purpose:** Assist with free agency decisions

**Capabilities:**
- Analyze team weaknesses
- Suggest free agency targets
- Evaluate trade proposals
- Calculate transaction value
- Track waiver priorities

**Implementation:** Similar structure to Draft Assistant Agent, with tools for free agency data.

### Agent 3: Battle Strategy Agent

**Purpose:** Provide battle strategy and move recommendations

**Capabilities:**
- Analyze team matchups
- Suggest optimal moves
- Calculate damage scenarios
- Predict opponent strategies
- Provide real-time battle advice

**Implementation:** Uses Battle Strategy MCP server and Showdown Integration MCP server.

### Agent Orchestration

**Multi-Agent Workflows:**

```typescript
// lib/agents/orchestrator.ts
import { Agent, Runner } from '@openai/agents'

// Triage agent decides which specialist agent to use
const triageAgent = new Agent({
  name: "Triage",
  instructions: "Route user queries to the appropriate specialist agent",
  model: "gpt-5-mini",
})

const draftAgent = new Agent({ /* ... */ })
const freeAgencyAgent = new Agent({ /* ... */ })
const battleAgent = new Agent({ /* ... */ })

export async function routeQuery(query: string, context: any) {
  // Triage agent decides routing
  const routing = await Runner.run(triageAgent, {
    input: `Query: ${query}\nContext: ${JSON.stringify(context)}`,
  })
  
  const agentType = routing.final_output // "draft", "free_agency", "battle"
  
  switch (agentType) {
    case "draft":
      return Runner.run(draftAgent, { input: query })
    case "free_agency":
      return Runner.run(freeAgencyAgent, { input: query })
    case "battle":
      return Runner.run(battleAgent, { input: query })
  }
}
```

---

## Phase 4: Realtime API Integration

### Overview

Integrate OpenAI's Realtime API for:
- Live draft assistance (voice/text)
- Real-time battle commentary
- Interactive coaching during battles
- Mobile voice interactions

### Use Case 1: Live Draft Assistance

**Implementation:**

```typescript
// app/api/ai/realtime/draft-assistant/route.ts
import { RealtimeAgent } from '@openai/agents'

export async function POST(request: Request) {
  const { teamId, seasonId } = await request.json()
  
  const agent = new RealtimeAgent({
    name: "Draft Assistant",
    instructions: "Help with live draft picks in real-time",
    model: "gpt-realtime",
    tools: [
      {
        type: "mcp",
        server_label: "poke-mnky-draft-pool",
        server_url: process.env.MCP_DRAFT_POOL_SERVER_URL,
      },
    ],
  })
  
  // Return WebSocket connection for realtime interaction
  // (Implementation depends on Next.js WebSocket support)
}
```

**Frontend Integration:**

```typescript
// components/draft/realtime-assistant.tsx
export function RealtimeDraftAssistant({ teamId, seasonId }) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  
  useEffect(() => {
    const websocket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=gpt-realtime`
    )
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // Handle realtime events
    }
    
    setWs(websocket)
  }, [])
  
  // ... UI for realtime interaction
}
```

### Use Case 2: Real-time Battle Commentary

**Implementation:** Similar to draft assistant, but focused on battle state and move recommendations.

---

## Phase 5: GPT-5.2-Codex Integration

### Overview

Leverage GPT-5.2-Codex for:
- Complex drafting strategy analysis
- Team optimization algorithms
- Custom tool generation
- Code-based analysis workflows

### Use Case 1: Advanced Draft Strategy Analysis

```typescript
// lib/agents/codex-draft-strategist.ts
import { Agent } from '@openai/agents'

export const codexDraftStrategist = new Agent({
  name: "Codex Draft Strategist",
  instructions: `You are an advanced draft strategist. Use code to:
- Analyze draft trends and patterns
- Optimize team composition algorithms
- Generate custom analysis tools
- Perform complex statistical analysis`,
  model: "gpt-5.2-codex",
  tools: [
    {
      type: "code_interpreter", // Built-in Code Interpreter tool
    },
    {
      type: "mcp",
      server_label: "poke-mnky-draft-pool",
      server_url: process.env.MCP_DRAFT_POOL_SERVER_URL,
    },
  ],
})
```

### Use Case 2: Team Optimization Tool Generator

**Purpose:** Generate custom tools for team analysis

```typescript
// Agent generates Python code for team optimization
const optimizationCode = await codexDraftStrategist.generate({
  input: "Generate a Python function to optimize team type coverage",
})

// Execute generated code via Code Interpreter
const result = await executeCode(optimizationCode)
```

---

## Implementation Roadmap

### Week 1-2: MCP Server Infrastructure

**Tasks:**
- [ ] Set up MCP server development environment
- [ ] Create Draft Pool MCP Server
- [ ] Create Battle Strategy MCP Server
- [ ] Create Showdown Integration MCP Server
- [ ] Deploy MCP servers to Docker
- [ ] Test MCP server connectivity

**Deliverables:**
- 3 MCP servers running on Docker
- Documentation for each server
- Test suite for MCP tools

### Week 3-4: Responses API Migration

**Tasks:**
- [ ] Update OpenAI client for Responses API
- [ ] Migrate Pokédex endpoint
- [ ] Migrate Coach endpoint
- [ ] Migrate Weekly Recap endpoint
- [ ] Add MCP tool integration
- [ ] Add built-in tools where appropriate
- [ ] Test all migrated endpoints

**Deliverables:**
- All AI endpoints using Responses API
- MCP tools integrated
- Performance benchmarks

### Week 5-6: Agents SDK Integration

**Tasks:**
- [ ] Set up Agents SDK development environment
- [ ] Build Draft Assistant Agent
- [ ] Build Free Agency Agent
- [ ] Build Battle Strategy Agent
- [ ] Create agent orchestration layer
- [ ] Build API endpoints for agents
- [ ] Create frontend components for agent interactions

**Deliverables:**
- 3 specialized agents operational
- Agent orchestration system
- UI components for agent interactions

### Week 7-8: Realtime API Integration

**Tasks:**
- [ ] Set up Realtime API infrastructure
- [ ] Build live draft assistant
- [ ] Build real-time battle commentary
- [ ] Create WebSocket handling
- [ ] Build frontend realtime UI
- [ ] Test realtime interactions

**Deliverables:**
- Live draft assistance working
- Real-time battle commentary operational
- Realtime UI components

### Week 9-10: GPT-5.2-Codex Integration

**Tasks:**
- [ ] Set up Codex agent workflows
- [ ] Build advanced draft strategy analysis
- [ ] Create team optimization tools
- [ ] Generate custom analysis code
- [ ] Integrate Code Interpreter
- [ ] Test complex analysis workflows

**Deliverables:**
- Codex-powered analysis tools
- Custom tool generation system
- Advanced strategy analysis

---

## Technical Specifications

### Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# MCP Servers
MCP_DRAFT_POOL_SERVER_URL=http://poke-mnky-draft-mcp-server:3000
MCP_BATTLE_STRATEGY_SERVER_URL=http://poke-mnky-battle-mcp-server:3000
MCP_SHOWDOWN_SERVER_URL=http://poke-mnky-showdown-mcp-server:3000

# Supabase (for MCP servers)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# Showdown (for MCP servers)
SHOWDOWN_SERVER_URL=https://aab-showdown.moodmnky.com
SHOWDOWN_API_KEY=...
```

### Dependencies

**New Packages:**
```json
{
  "dependencies": {
    "@openai/agents": "^1.0.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "openai": "^4.77.3"
  }
}
```

### Docker Services

**New Services in docker-compose.yml:**
```yaml
poke-mnky-draft-mcp-server:
  build: ./tools/mcp-servers/draft-pool-server
  ports:
    - "3001:3000"
  environment:
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  networks:
    - poke-mnky-network

poke-mnky-battle-mcp-server:
  build: ./tools/mcp-servers/battle-strategy-server
  ports:
    - "3002:3000"
  # ... similar config

poke-mnky-showdown-mcp-server:
  build: ./tools/mcp-servers/showdown-integration-server
  ports:
    - "3003:3000"
  # ... similar config
```

---

## Cost Considerations

### Current Usage (Estimated)
- ~1,624 API calls/month
- Cost: ~$24/month (without optimization)

### With New Capabilities

**Additional Usage:**
- Agent workflows: +200 calls/month
- Realtime API: +100 sessions/month
- Codex analysis: +50 calls/month

**Optimization Strategies:**
- Response caching (60-70% hit rate)
- Use GPT-5-mini for simple tasks
- Background mode for long-running tasks
- Stream responses where possible

**Projected Cost:** ~$40-50/month (with optimizations)

---

## Security Considerations

### MCP Server Security

1. **Authentication:** MCP servers require API keys
2. **Network Isolation:** MCP servers on internal Docker network
3. **Rate Limiting:** Implement rate limits on MCP tools
4. **Input Validation:** Validate all inputs to MCP tools
5. **Access Control:** Use Supabase RLS for data access

### Agent Security

1. **Tool Approval:** Require approval for sensitive operations
2. **Sandboxing:** Code Interpreter runs in sandboxed environment
3. **Audit Logging:** Log all agent actions
4. **User Permissions:** Respect user roles and permissions

---

## Success Metrics

### User Engagement
- 50%+ of coaches use draft assistant
- 30%+ use free agency agent
- 20%+ use battle strategy agent

### Performance
- <2s response time for agent queries
- <500ms for MCP tool calls
- 99%+ uptime for MCP servers

### Cost Efficiency
- 60%+ cache hit rate
- <$50/month OpenAI costs
- Cost per user <$2/month

---

## Next Steps

1. **Immediate:** Review and approve this plan
2. **Week 1:** Set up MCP server development environment
3. **Week 2:** Begin MCP server implementation
4. **Ongoing:** Iterate based on user feedback

---

## References

- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [OpenAI Responses API Guide](https://platform.openai.com/docs/guides/responses)
- [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [GPT-5.2-Codex Announcement](https://openai.com/index/introducing-gpt-5-2-codex/)

---

**Document Status**: Ready for Implementation  
**Last Updated**: January 17, 2026  
**Next Review**: After Phase 1 completion
