# AI Agent Ecosystem - Complete Breakdown

**Date**: January 17, 2026  
**Status**: ✅ **FULLY OPERATIONAL**

---

## 📋 Table of Contents

1. [AI Agents Overview](#ai-agents-overview)
2. [MCP Servers Configured](#mcp-servers-configured)
3. [Tools Available](#tools-available)
4. [Functionality & Use Cases](#functionality--use-cases)
5. [API Routes](#api-routes)
6. [Frontend Integration](#frontend-integration)
7. [Current Limitations](#current-limitations)

---

## 🤖 AI Agents Overview

You have **3 specialized AI agents** built with OpenAI's Agents SDK (`@openai/agents`):

### 1. **Draft Assistant Agent** (`lib/agents/draft-assistant.ts`)

**Purpose**: Helps coaches make optimal draft picks

**Model**: `gpt-5.2` (AI_MODELS.STRATEGY_COACH)

**Capabilities**:
- Analyzes team needs (type coverage, roles, synergy)
- Suggests picks based on budget and availability
- Warns about budget constraints
- Provides pick value analysis
- Tracks draft trends and patterns
- Considers team composition balance

**MCP Server**: `poke-mnky-draft-pool`

**API Route**: `/api/ai/draft-assistant`

**Functions**:
- `getDraftRecommendation()` - Full analysis with recommendations
- `suggestDraftPick()` - Quick pick suggestion

---

### 2. **Free Agency Agent** (`lib/agents/free-agency-agent.ts`)

**Purpose**: Assists with free agency decisions and trade proposals

**Model**: `gpt-5.2` (AI_MODELS.STRATEGY_COACH)

**Capabilities**:
- Analyzes team weaknesses and gaps
- Suggests free agency targets based on team needs
- Evaluates trade proposals and their value
- Calculates transaction value and impact
- Tracks waiver priorities and availability
- Provides strategic advice on roster moves

**MCP Server**: `poke-mnky-draft-pool`

**API Route**: `/api/ai/free-agency`

**Functions**:
- `evaluateFreeAgencyTarget()` - Evaluate a specific Pokémon
- `evaluateTradeProposal()` - Analyze trade value
- `suggestFreeAgencyTargets()` - Suggest targets based on needs

---

### 3. **Battle Strategy Agent** (`lib/agents/battle-strategy-agent.ts`)

**Purpose**: Provides battle strategy and move recommendations

**Model**: `gpt-4.1` (AI_MODELS.BATTLE_CHOICE)

**Capabilities**:
- Analyzes team matchups and type advantages
- Suggests optimal moves and strategies
- Calculates damage scenarios and outcomes
- Predicts opponent strategies
- Provides real-time battle advice
- Recommends Tera type usage
- Identifies counter-strategies

**MCP Server**: `poke-mnky-draft-pool`

**API Route**: `/api/ai/battle-strategy`

**Functions**:
- `analyzeMatchup()` - Analyze team vs team matchup
- `suggestBattleMoves()` - Suggest moves for active Pokémon
- `recommendTeraTypes()` - Recommend Tera types for Pokémon

---

## 🔌 MCP Servers Configured

### 1. **poke-mnky-draft-pool** (Primary MCP Server)

**Type**: Docker container (local)  
**Image**: `moodmnky/poke-mnky-draft-pool-mcp:latest`  
**URL**: `http://127.0.0.1:54321/mcp` (local Supabase)  
**Status**: ✅ **ACTIVE**

**Connected to**: All 3 AI agents

**Tools Available** (5 tools):
1. `get_available_pokemon` - Query draft pool with filters
2. `get_draft_status` - Get current draft session status
3. `get_team_budget` - Get team's draft budget
4. `get_team_picks` - Get team's draft picks
5. `analyze_pick_value` - Analyze if a pick is good value

---

### 2. **supabase-local** (Cursor MCP)

**Type**: Streamable HTTP  
**URL**: `http://127.0.0.1:54321/mcp`  
**Status**: ✅ **CONFIGURED** (for Cursor IDE use)

**Purpose**: Direct database access for development/debugging

---

### 3. **supabase** (Remote MCP)

**Type**: HTTP  
**URL**: `https://mcp.supabase.com/mcp?project_ref=chmrszrwlfeqovwxyrmt`  
**Status**: ✅ **CONFIGURED** (for Cursor IDE use)

**Purpose**: Production database access

---

### 4. **shadcn** (UI Component MCP)

**Type**: npx command  
**Command**: `npx shadcn@latest mcp`  
**Status**: ✅ **CONFIGURED** (for Cursor IDE use)

**Purpose**: UI component generation

---

### 5. **wolfram-alpha** (Computational MCP)

**Type**: Docker container  
**Image**: `mcp/wolfram-alpha`  
**Status**: ✅ **CONFIGURED** (for Cursor IDE use)

**Purpose**: Mathematical/computational queries

---

## 🛠️ Tools Available

### MCP Tools (from `poke-mnky-draft-pool`)

#### 1. `get_available_pokemon`
**Purpose**: Query available Pokémon in draft pool

**Parameters**:
- `point_range` (optional): `[min, max]` point values
- `generation` (optional): Generation number (1-9)
- `type` (optional): Pokémon type filter
- `limit` (optional): Max results (default: 100)

**Returns**: Array of available Pokémon with:
- `pokemon_name`
- `point_value`
- `is_available`
- `generation`
- `pokemon_id`

**Used by**: All 3 agents

---

#### 2. `get_draft_status`
**Purpose**: Get current draft session status

**Parameters**:
- `season_id` (optional): Filter by season

**Returns**: Draft session info:
- `current_pick_number`
- `current_round`
- `current_team_id`
- `draft_type`
- `status`

**Used by**: Draft Assistant Agent

---

#### 3. `get_team_budget`
**Purpose**: Get team's draft budget

**Parameters**:
- `team_id` (required)
- `season_id` (optional)

**Returns**: Budget info:
- `total_points` (120)
- `spent_points`
- `remaining_points`

**Used by**: Draft Assistant, Free Agency Agents

---

#### 4. `get_team_picks`
**Purpose**: Get team's current draft picks

**Parameters**:
- `team_id` (required)
- `season_id` (optional)

**Returns**: Array of picks with:
- `pokemon_name`
- `point_value`
- `round`
- `pick_number`

**Used by**: All 3 agents

---

#### 5. `analyze_pick_value`
**Purpose**: Analyze if a Pokémon pick is good value

**Parameters**:
- `pokemon_name` (required)
- `team_id` (required)
- `season_id` (optional)

**Returns**: Value analysis:
- `value_score` (1-10)
- `reasoning`
- `recommendation`

**Used by**: Draft Assistant Agent

---

### Function Tools (Built-in)

#### `get_pokemon` (Pokédex API Route)
**Purpose**: Fetch canonical Pokémon data

**Parameters**:
- `pokemon_name_or_id` (required)

**Returns**: Pokémon data:
- `name`, `types`, `base_stats`
- `abilities`, `tier`, `draft_cost`

**Used by**: Pokédex AI Assistant (`/api/ai/pokedex`)

---

## 🎯 Functionality & Use Cases

### Draft Assistant Use Cases

1. **"What should I pick? I have 45 points left and need a water type."**
   - Agent calls: `get_team_picks` → `get_available_pokemon` (filter: water type, ≤45 points) → `analyze_pick_value` → Returns ranked recommendations

2. **"Analyze my team's needs"**
   - Agent calls: `get_team_picks` → Analyzes type coverage → `get_available_pokemon` → Suggests fills for gaps

3. **"Is [Pokémon] a good pick for me?"**
   - Agent calls: `get_team_picks` → `analyze_pick_value` → `get_team_budget` → Returns value analysis

---

### Free Agency Use Cases

1. **"Should I pick up [Pokémon]?"**
   - Agent calls: `get_team_picks` → `get_available_pokemon` → Analyzes fit → Returns recommendation

2. **"Evaluate this trade: Giving [Pokémon A], Receiving [Pokémon B]"**
   - Agent calls: `get_team_picks` (both teams) → Analyzes value → Returns trade evaluation

3. **"What free agents should I target?"**
   - Agent calls: `get_team_picks` → Analyzes weaknesses → `get_available_pokemon` → Returns target suggestions

---

### Battle Strategy Use Cases

1. **"How should I approach this matchup against Team X?"**
   - Agent calls: `get_team_picks` (both teams) → Analyzes type matchups → Returns strategy

2. **"What move should I use? My [Pokémon] vs their [Pokémon]"**
   - Agent uses battle state + team data → Suggests optimal moves

3. **"What Tera type should I use for [Pokémon]?"**
   - Agent calls: `get_team_picks` (both teams) → Analyzes coverage → Recommends Tera types

---

## 🌐 API Routes

### 1. `/api/ai/draft-assistant` ✅

**Method**: POST  
**Auth**: Required (Supabase auth)

**Actions**:
- `recommendation` (default): Full analysis
- `suggest`: Quick pick suggestion

**Request**:
```json
{
  "teamId": "uuid",
  "seasonId": "uuid",
  "action": "recommendation" | "suggest",
  "budgetRemaining": 45,
  "pointRange": [15, 20],
  "context": "Need water type"
}
```

**Response**:
```json
{
  "teamId": "uuid",
  "recommendation": {
    "recommendations": [...],
    "teamNeeds": {...},
    "warnings": [...],
    "finalOutput": "..."
  }
}
```

---

### 2. `/api/ai/free-agency` ✅

**Method**: POST  
**Auth**: Required

**Actions**:
- `evaluate`: Evaluate a specific Pokémon
- `trade`: Evaluate a trade proposal
- `suggest`: Suggest free agency targets

**Request**:
```json
{
  "teamId": "uuid",
  "action": "evaluate" | "trade" | "suggest",
  "pokemonName": "Pikachu",
  "proposedTrade": {
    "giving": ["Pokémon A"],
    "receiving": ["Pokémon B"]
  },
  "needs": ["water type", "special attacker"]
}
```

---

### 3. `/api/ai/battle-strategy` ✅

**Method**: POST  
**Auth**: Required

**Actions**:
- `matchup`: Analyze team matchup
- `moves`: Suggest battle moves
- `tera`: Recommend Tera types

**Request**:
```json
{
  "action": "matchup" | "moves" | "tera",
  "team1Id": "uuid",
  "team2Id": "uuid",
  "activePokemon": "Pikachu",
  "opponentActivePokemon": "Charizard",
  "battleState": {
    "hazards": ["stealth-rock"],
    "weather": "rain"
  }
}
```

---

### 4. `/api/ai/pokedex` ✅

**Method**: POST  
**Auth**: Not required (public)

**Features**:
- Toggle between Responses API (with MCP) and Chat Completions
- Uses `get_pokemon` function tool
- Can use MCP tools when Responses API enabled

**Request**:
```json
{
  "query": "What Pokémon have 20 points?",
  "useResponsesAPI": true
}
```

**Response**:
```json
{
  "answer": "...",
  "pokemon_referenced": ["Pikachu", "Charizard"],
  "source": "responses_api_mcp" | "chat_completions"
}
```

---

## 💻 Frontend Integration

### Pokédex Page (`app/pokedex/page.tsx`)

**AI Features**:
- ✅ AI assistant chat interface
- ✅ Toggle between Responses API and Chat Completions
- ✅ Conversation history (localStorage, last 10)
- ✅ Copy response functionality
- ✅ Suggested prompts
- ✅ Response source indicator

**UI Components**:
- MagicCard, BlurFade, ShimmerButton (Magic UI Design)
- Switch, Label (shadcn/ui)

---

### Draft Room (Planned)

**Integration Points**:
- Draft Assistant Agent for pick recommendations
- Real-time MCP tool calls during draft
- Budget tracking and warnings

---

### Battle Interface (Planned)

**Integration Points**:
- Battle Strategy Agent for move suggestions
- Matchup analysis before battles
- Tera type recommendations

---

## ⚠️ Current Limitations

### 1. **MCP Connection Management**

**Issue**: Each agent creates its own MCP connection  
**Impact**: Multiple connections to same server  
**Status**: ⚠️ **ACCEPTABLE** (connections are lightweight)

**Future Improvement**: Shared MCP connection pool

---

### 2. **Error Handling**

**Issue**: Limited error recovery in agent functions  
**Impact**: Failures may not be gracefully handled  
**Status**: ⚠️ **BASIC** (try/catch in place, but could be better)

---

### 3. **Response Parsing**

**Issue**: Agent responses are raw text (`finalOutput`)  
**Impact**: Structured data parsing is manual  
**Status**: ⚠️ **MANUAL** (interfaces defined but not auto-parsed)

**Example**: `DraftRecommendationResult` has empty arrays - needs parsing logic

---

### 4. **MCP Server Availability**

**Issue**: Local Docker container must be running  
**Impact**: Agents fail if MCP server is down  
**Status**: ⚠️ **REQUIRES MANUAL START**

**Solution**: Health checks + graceful fallback

---

### 5. **Frontend Integration**

**Issue**: Agents SDK routes exist but not integrated into UI  
**Impact**: Can't use agents from frontend yet  
**Status**: ⚠️ **BACKEND ONLY**

**Next Steps**: Create React hooks/components for agent calls

---

## 📊 Summary

### ✅ What Works

- ✅ 3 specialized AI agents operational
- ✅ 5 MCP tools available via `poke-mnky-draft-pool`
- ✅ Multi-step reasoning and tool orchestration
- ✅ API routes ready for frontend integration
- ✅ Pokédex AI assistant with MCP integration

### ⚠️ What Needs Work

- ⚠️ Response parsing (structured output)
- ⚠️ Frontend integration (React hooks/components)
- ⚠️ Error handling improvements
- ⚠️ MCP connection pooling
- ⚠️ Health checks and fallbacks

### 🚀 Potential Enhancements

- 🚀 Conversation history for agents
- 🚀 Streaming responses
- 🚀 Multi-agent orchestration
- 🚀 Custom tools beyond MCP
- 🚀 Agent specialization (e.g., type-specific agents)

---

## 🔗 Related Documentation

- [Agents SDK Installation Guide](./AGENTS-SDK-INSTALLATION-GUIDE.md)
- [Agents SDK Capabilities](./AGENTS-SDK-CAPABILITIES.md)
- [Agents SDK Walkthrough](./AGENTS-SDK-WALKTHROUGH.md)
- [MCP Server Implementation Status](./MCP-SERVER-IMPLEMENTATION-STATUS.md)
- [OpenAI MCP Ecosystem Breakdown](./OPENAI-MCP-ECOSYSTEM-BREAKDOWN.md)
