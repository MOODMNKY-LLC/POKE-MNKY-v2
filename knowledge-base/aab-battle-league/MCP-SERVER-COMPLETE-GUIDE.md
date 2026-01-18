# MCP Server Complete Guide - Updated for External Use

**Date**: January 18, 2026  
**Version**: 1.0.1  
**Status**: ✅ **PRODUCTION READY WITH EXTERNAL USE OPTIMIZATION**

---

## Executive Summary

The **POKE MNKY Draft Pool MCP Server** is a comprehensive Model Context Protocol (MCP) server that provides programmatic access to league draft pool data, team information, and draft status. As of Version 1.0.1, it has been optimized for **external use cases** including Open WebUI, OpenAI SDK agents, and direct app integration, while maintaining full compatibility with Cursor IDE and other MCP clients.

---

## Table of Contents

1. [Server Overview](#server-overview)
2. [Complete Capabilities](#complete-capabilities)
3. [External Use Cases](#external-use-cases)
4. [API Endpoints](#api-endpoints)
5. [Integration Guides](#integration-guides)
6. [Architecture](#architecture)
7. [Configuration](#configuration)
8. [Testing & Validation](#testing--validation)

---

## Server Overview

### Server Details

- **Name**: `poke-mnky-draft-pool`
- **Version**: `1.0.1` (Updated January 18, 2026)
- **Transport**: Streamable HTTP (for remote access)
- **URL**: `https://mcp-draft-pool.moodmnky.com/mcp`
- **Protocol**: MCP (Model Context Protocol) - JSON-RPC over HTTP
- **REST API**: `https://mcp-draft-pool.moodmnky.com/api/{tool_name}`
- **OpenAPI Spec**: `https://mcp-draft-pool.moodmnky.com/openapi.json`
- **OpenAI Functions**: `https://mcp-draft-pool.moodmnky.com/functions`

### Key Features

- ✅ **9 Tools** - Execute actions and queries
- ✅ **2 Prompts** - Reusable workflow templates
- ✅ **2 Resources** - Structured data access
- ✅ **OpenAPI Specification** - Auto-generated API documentation
- ✅ **REST API** - Standard HTTP endpoints for all tools
- ✅ **OpenAI Function Calling** - SDK-friendly format
- ✅ **CORS Support** - Web app integration ready
- ✅ **Session Management** - Up to 100 concurrent sessions
- ✅ **Error Handling** - Comprehensive validation and error responses

---

## Complete Capabilities

### Total: 25 Capabilities

#### Tools (9) - Execute actions and queries

1. **`get_available_pokemon`** - Query draft pool with filters
   - Parameters: `point_range`, `generation`, `type`, `limit`
   - Returns: List of available Pokémon with point values

2. **`get_draft_status`** - Get current draft session status
   - Parameters: `season_id` (optional)
   - Returns: Current pick, round, whose turn, total picks

3. **`get_team_budget`** - Get team budget information
   - Parameters: `team_id` (required), `season_id` (optional)
   - Returns: Total points, spent points, remaining points

4. **`get_team_picks`** - Get team's draft picks
   - Parameters: `team_id` (required), `season_id` (optional)
   - Returns: List of drafted Pokémon with point values

5. **`get_pokemon_types`** - Get Pokémon type information
   - Parameters: `pokemon_name` (required)
   - Returns: Primary type, secondary type, types array

6. **`get_smogon_meta`** - Get competitive meta data from Smogon
   - Parameters: `pokemon_name` (required), `format` (optional), `source_date` (optional)
   - Returns: Tier, usage rate, roles, common moves/items/abilities

7. **`get_ability_mechanics`** - Get detailed ability mechanics
   - Parameters: `ability_name` (required)
   - Returns: Description and mechanics explanation

8. **`get_move_mechanics`** - Get detailed move mechanics
   - Parameters: `move_name` (required)
   - Returns: Description and mechanics explanation

9. **`analyze_pick_value`** - Analyze if a Pokémon pick is good value
   - Parameters: `pokemon_name` (required), `point_value` (required), `format` (optional)
   - Returns: Value analysis, score, recommendation

#### Prompts (3) - Reusable workflow templates

1. **`analyze_draft_strategy`** - Comprehensive draft strategy analysis
   - Arguments: `team_id` (required), `focus_area` (optional), `season_id` (optional)
   - Combines budget, roster, and recommendations
   - Embeds team roster resource for context

2. **`analyze_type_coverage`** - Type coverage analysis
   - Arguments: `team_id` (required), `season_id` (optional)
   - Analyzes team's type coverage, missing types, recommendations

3. **`compare_teams`** - Side-by-side team comparison
   - Arguments: `team_id_1` (required), `team_id_2` (required), `comparison_type` (optional)
   - Compares two teams' budgets, rosters, and strategies
   - Embeds both team roster resources

#### Resources (13) - Structured data access

**Draft Pool Resources** (6):
1. **`draft-board://current`** - Current draft pool state (static)
   - Contains all available Pokémon with point values
   - Updated in real-time

2. **`team://{team_id}/roster`** - Team roster data (dynamic template)
   - Contains team's drafted Pokémon
   - Used by prompts for context

3. **`pokemon://{name}/types`** - Pokémon type information (dynamic template)
   - Returns primary/secondary types for a Pokémon
   - JSON format

4. **`pokemon://{name}/meta/{format}`** - Pokémon competitive meta data (dynamic template)
   - Returns Smogon meta data (tier, usage, roles, sets)
   - Format parameter: e.g., "gen9ou"
   - JSON format

5. **`mechanics://abilities/{name}`** - Ability mechanics (dynamic template)
   - Detailed ability mechanics from Bulbapedia
   - Markdown format

6. **`mechanics://moves/{name}`** - Move mechanics (dynamic template)
   - Detailed move mechanics from Bulbapedia
   - Markdown format

**Knowledge Base Resources** (7):
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

## External Use Cases

### Use Case 1: Open WebUI Integration ✅

**Method**: OpenAPI Specification (Preferred)

**Setup**:
1. Go to **Admin Settings → External Tools**
2. Click **"+ Add Server"**
3. Set **Type** to **OpenAPI**
4. Enter URL: `https://mcp-draft-pool.moodmnky.com/openapi.json`
5. Add API Key in authentication section

**Result**: All 9 tools automatically discovered and available in chat

**Benefits**:
- ✅ Auto-discovery (no manual configuration)
- ✅ Complete API documentation
- ✅ All tools available immediately

### Use Case 2: OpenAI SDK Agent Integration ✅

**Method**: OpenAI Function Calling Format

**Endpoint**: `GET /functions`

**Usage**:
```python
import requests

# Get available functions
response = requests.get(
    "https://mcp-draft-pool.moodmnky.com/functions",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
functions = response.json()["tools"]

# Use with OpenAI client
import openai
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Get available Pokémon"}],
    tools=functions,
    tool_choice="auto"
)
```

**Benefits**:
- ✅ Direct SDK integration
- ✅ JSON Schema validation
- ✅ Standard OpenAI format

### Use Case 3: App Integration ✅

**Method**: REST API Endpoints

**Endpoints**: `POST /api/{tool_name}`

**Usage**:
```javascript
// Example: Get available Pokémon
const response = await fetch(
  'https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ limit: 10 })
  }
);
const data = await response.json();
console.log(data.pokemon); // Array of Pokémon
```

**Benefits**:
- ✅ Standard HTTP/REST
- ✅ JSON request/response
- ✅ Easy integration
- ✅ CORS support for web apps

### Use Case 4: Cursor IDE Integration ✅

**Method**: MCP Protocol (Original)

**Configuration** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "poke-mnky-draft-pool": {
      "type": "streamable-http",
      "url": "https://mcp-draft-pool.moodmnky.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

**Benefits**:
- ✅ Native MCP support
- ✅ Tools, prompts, and resources available
- ✅ Full MCP protocol features

---

## API Endpoints

### MCP Protocol Endpoint

**Endpoint**: `POST /mcp`

**Protocol**: JSON-RPC over HTTP (MCP)

**Usage**: For MCP clients (Cursor IDE, etc.)

**Example**:
```bash
curl -X POST https://mcp-draft-pool.moodmnky.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_available_pokemon",
      "arguments": {"limit": 5}
    },
    "id": 1
  }'
```

### REST API Endpoints

**Base URL**: `https://mcp-draft-pool.moodmnky.com/api`

**Method**: `POST`

**Authentication**: Bearer token or `X-API-Key` header

**Available Endpoints**:
- `POST /api/get_available_pokemon`
- `POST /api/get_draft_status`
- `POST /api/get_team_budget`
- `POST /api/get_team_picks`
- `POST /api/get_pokemon_types`
- `POST /api/get_smogon_meta`
- `POST /api/get_ability_mechanics`
- `POST /api/get_move_mechanics`
- `POST /api/analyze_pick_value`

**Example**:
```bash
curl -X POST https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"limit": 5}'
```

**Response Format**:
```json
{
  "pokemon": [
    {
      "pokemon_name": "Pikachu",
      "point_value": 15,
      "generation": 1,
      "available": true
    }
  ],
  "count": 1
}
```

### OpenAPI Specification

**Endpoint**: `GET /openapi.json`

**Purpose**: Auto-generated OpenAPI 3.0 specification

**Usage**: For Open WebUI, API documentation, SDK generation

**Example**:
```bash
curl https://mcp-draft-pool.moodmnky.com/openapi.json | jq '.paths | keys'
```

**Returns**: Complete OpenAPI 3.0 spec with:
- All 9 endpoints documented
- Request/response schemas
- Authentication requirements
- Error responses

### OpenAI Function Calling Format

**Endpoint**: `GET /functions`

**Purpose**: Returns tools in OpenAI function calling format

**Usage**: For OpenAI SDK agent integration

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://mcp-draft-pool.moodmnky.com/functions | jq '.tools[0]'
```

**Returns**:
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_available_pokemon",
        "description": "Get available Pokémon in the draft pool with optional filters",
        "parameters": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "number",
              "default": 100
            }
          }
        }
      }
    }
  ]
}
```

### Health Check

**Endpoint**: `GET /health`

**Purpose**: Server health and status

**Example**:
```bash
curl https://mcp-draft-pool.moodmnky.com/health | jq .
```

**Returns**:
```json
{
  "status": "ok",
  "service": "poke-mnky-draft-pool-mcp-server",
  "version": "1.0.1",
  "tools": {
    "count": 9,
    "available": [
      "get_available_pokemon",
      "get_draft_status",
      "get_team_budget",
      "get_team_picks",
      "get_pokemon_types",
      "get_smogon_meta",
      "get_ability_mechanics",
      "get_move_mechanics",
      "analyze_pick_value"
    ]
  }
}
```

---

## Integration Guides

### Open WebUI Integration

**Step 1**: Access Open WebUI Admin Settings

**Step 2**: Navigate to External Tools

**Step 3**: Add OpenAPI Server
- Type: **OpenAPI**
- URL: `https://mcp-draft-pool.moodmnky.com/openapi.json`
- Authentication: Bearer token with your `MCP_API_KEY`

**Step 4**: Verify
- All 9 tools should appear in the tools list
- Test by asking: "What Pokémon are available?"

**Result**: ✅ All tools available in Open WebUI chat

### OpenAI SDK Integration

**Step 1**: Get Functions
```python
import requests

response = requests.get(
    "https://mcp-draft-pool.moodmnky.com/functions",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
functions = response.json()["tools"]
```

**Step 2**: Use with OpenAI Client
```python
import openai

client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Get available Pokémon"}],
    tools=functions,
    tool_choice="auto"
)
```

**Step 3**: Handle Tool Calls
```python
# Process tool calls from response
for tool_call in response.choices[0].message.tool_calls:
    # Call REST API endpoint
    tool_response = requests.post(
        f"https://mcp-draft-pool.moodmnky.com/api/{tool_call.function.name}",
        headers={"Authorization": "Bearer YOUR_API_KEY"},
        json=json.loads(tool_call.function.arguments)
    )
```

**Result**: ✅ Full OpenAI SDK agent integration

### App Integration (JavaScript/TypeScript)

**Step 1**: Install Dependencies
```bash
npm install axios  # or use fetch API
```

**Step 2**: Create API Client
```typescript
const API_BASE = 'https://mcp-draft-pool.moodmnky.com';
const API_KEY = 'YOUR_API_KEY';

async function callTool(toolName: string, params: any) {
  const response = await fetch(`${API_BASE}/api/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(params)
  });
  return response.json();
}
```

**Step 3**: Use in App
```typescript
// Get available Pokémon
const pokemon = await callTool('get_available_pokemon', { limit: 10 });

// Get team budget
const budget = await callTool('get_team_budget', { team_id: 'team-123' });
```

**Result**: ✅ Direct app integration via REST API

### Cursor IDE Integration

**Step 1**: Configure `.cursor/mcp.json`
```json
{
  "mcpServers": {
    "poke-mnky-draft-pool": {
      "type": "streamable-http",
      "url": "https://mcp-draft-pool.moodmnky.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

**Step 2**: Restart Cursor

**Step 3**: Verify
- Ask Cursor: "What Pokémon are available?"
- Cursor should use MCP tools automatically

**Result**: ✅ Full MCP protocol support in Cursor IDE

---

## Architecture

### Updated Architecture (Version 1.0.1)

```
┌─────────────────────────────────────────────────────────┐
│   External Clients                                      │
│   - Open WebUI (OpenAPI)                                │
│   - OpenAI SDK Agents (/functions)                      │
│   - Web Apps (REST API)                                 │
│   - Cursor IDE (MCP Protocol)                           │
└──────────────┬──────────────────────────────────────────┘
               │
               ├─→ OpenAPI Spec (GET /openapi.json)
               ├─→ OpenAI Functions (GET /functions)
               ├─→ REST API (POST /api/{tool_name})
               └─→ MCP Protocol (POST /mcp)
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│   Draft Pool MCP Server (v1.0.1)                      │
│   - Express.js + MCP SDK                                │
│   - OpenAPI Generator                                   │
│   - REST API Layer                                      │
│   - Tool Registry                                       │
│   - 9 Tools                                             │
│   - 3 Prompts                                           │
│   - 7 Resources                                         │
│   - CORS Support                                        │
│   - OAuth 2.0 Support                                  │
│   - Response Caching (Phase 3)                         │
│   - Rate Limiting (Phase 3)                            │
│   - Request Logging (Phase 3)                          │
│   - Error Handling (Phase 3)                           │
│   - Session Management (100 max)                       │
└──────────────┬──────────────────────────────────────────┘
               │ Supabase Client
               │ (PostgreSQL)
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

### Request Flow

**REST API Request**:
```
Client → POST /api/get_available_pokemon
  → REST API Handler
  → Tool Registry
  → Tool Handler
  → Supabase Query
  → Response (JSON)
```

**MCP Protocol Request**:
```
Client → POST /mcp (JSON-RPC)
  → MCP Transport Handler
  → MCP Server
  → Tool Handler
  → Supabase Query
  → MCP Response Format
```

**OpenAPI Discovery**:
```
Client → GET /openapi.json
  → OpenAPI Generator
  → Tool Registry (reads all tools)
  → Generate OpenAPI Spec
  → Return JSON
```

---

## Configuration

### Environment Variables

```bash
# Required
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
MCP_API_KEY=your_api_key  # Required for production
PORT=3000                  # Default: 3000
MCP_TRANSPORT=http         # Default: http
ALLOWED_ORIGINS=*          # CORS origins (default: *)
KB_BASE_PATH=/app/knowledge-base/aab-battle-league
```

### Docker Compose Configuration

```yaml
draft-pool-mcp-server:
  build:
    context: ./tools/mcp-servers/draft-pool-server
    dockerfile: Dockerfile
  container_name: poke-mnky-draft-pool-mcp-server
  restart: unless-stopped
  networks:
    - poke-mnky-network
  volumes:
    - ./knowledge-base:/app/knowledge-base:ro
  ports:
    - "3001:3000"
  environment:
    - SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - MCP_API_KEY=${MCP_API_KEY}
    - PORT=3000
    - MCP_TRANSPORT=http
    - KB_BASE_PATH=/app/knowledge-base/aab-battle-league
```

---

## Testing & Validation

### Automated Test Suite

**Test Script**: `tools/mcp-servers/draft-pool-server/test-external-use.sh`

**Run Tests**:
```bash
cd /home/moodmnky/POKE-MNKY
./tools/mcp-servers/draft-pool-server/test-external-use.sh
```

**Test Coverage**:
- ✅ OpenAPI spec generation (9 endpoints)
- ✅ OpenAI functions format (9 functions)
- ✅ REST API endpoints (9/9 working)
- ✅ CORS support
- ✅ Error handling
- ✅ Health check

### Manual Verification

**Test OpenAPI Spec**:
```bash
curl https://mcp-draft-pool.moodmnky.com/openapi.json | jq '.paths | keys | length'
# Expected: 9
```

**Test OpenAI Functions**:
```bash
curl -H "Authorization: Bearer $API_KEY" \
  https://mcp-draft-pool.moodmnky.com/functions | jq '.tools | length'
# Expected: 9
```

**Test REST API**:
```bash
curl -X POST https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}'
# Expected: JSON with pokemon array
```

**Test Health Check**:
```bash
curl https://mcp-draft-pool.moodmnky.com/health | jq '.tools.count'
# Expected: 9
```

---

## Version History

### Version 1.0.1 (January 18, 2026)

**Phase 3 Features**:
- ✅ Response caching (in-memory)
- ✅ Rate limiting (per-client)
- ✅ Structured logging (JSON/text)
- ✅ Standardized error handling
- ✅ Enhanced health checks

**Previous Features**:
- ✅ OpenAPI specification generation
- ✅ Complete REST API coverage (9 endpoints)
- ✅ OpenAI function calling format endpoint
- ✅ CORS support for web apps
- ✅ Tool registry system
- ✅ OAuth 2.0 support
- ✅ Knowledge base resources

**Improvements**:
- ✅ Performance optimizations
- ✅ Better monitoring
- ✅ Improved error messages
- ✅ Production-ready features

**Backward Compatibility**:
- ✅ MCP protocol still works
- ✅ REST API unchanged
- ✅ No breaking changes

### Version 1.0.0 (January 17, 2026)

**Initial Release**:
- ✅ 5 tools
- ✅ 2 prompts
- ✅ 2 resources
- ✅ MCP protocol support
- ✅ Session management

---

## Quick Reference

### Endpoints Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/mcp` | POST | MCP protocol | ✅ |
| `/openapi.json` | GET | OpenAPI spec | ❌ |
| `/functions` | GET | OpenAI functions | ✅ |
| `/api/{tool_name}` | POST | REST API | ✅ |
| `/health` | GET | Health check | ❌ |

### Tool Quick Reference

| Tool Name | REST Endpoint | Purpose |
|-----------|---------------|---------|
| `get_available_pokemon` | `/api/get_available_pokemon` | Query draft pool |
| `get_draft_status` | `/api/get_draft_status` | Get draft status |
| `get_team_budget` | `/api/get_team_budget` | Get team budget |
| `get_team_picks` | `/api/get_team_picks` | Get team picks |
| `get_pokemon_types` | `/api/get_pokemon_types` | Get Pokémon types |
| `get_smogon_meta` | `/api/get_smogon_meta` | Get Smogon meta |
| `get_ability_mechanics` | `/api/get_ability_mechanics` | Get ability info |
| `get_move_mechanics` | `/api/get_move_mechanics` | Get move info |
| `analyze_pick_value` | `/api/analyze_pick_value` | Analyze pick value |

---

## Support & Resources

### Documentation

- **Implementation Report**: `tools/mcp-servers/draft-pool-server/PHASE-1-IMPLEMENTATION-REPORT.md`
- **External Use Guide**: `tools/mcp-servers/draft-pool-server/EXTERNAL-USE-IMPLEMENTATION-COMPLETE.md`
- **Test Script**: `tools/mcp-servers/draft-pool-server/test-external-use.sh`

### Related Documentation

- **Capabilities Guide**: `docs/MCP-CAPABILITIES-GUIDE-FOR-MATT.md`
- **League Alignment**: `docs/MCP-LEAGUE-SYSTEM-ALIGNMENT.md`
- **Complete Summary**: `docs/MCP-COMPLETE-SUMMARY.md`

---

**Last Updated**: January 18, 2026  
**Version**: 1.0.1  
**Status**: ✅ **PRODUCTION READY**
