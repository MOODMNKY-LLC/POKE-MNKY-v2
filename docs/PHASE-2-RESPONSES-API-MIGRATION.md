# Phase 2: Responses API Migration

**Date**: January 17, 2026  
**Status**: In Progress  
**Phase 1 Status**: ✅ Complete and Deployed

---

## Overview

Migrating OpenAI API calls from Chat Completions API to Responses API to enable:
- MCP server tool integration
- Built-in tools (web search, file search, computer use)
- Better tool calling performance
- Background mode for long-running tasks

---

## Implementation Status

### ✅ Completed

1. **OpenAI Client Updated**
   - Added `responses` getter to openai client
   - Added `createResponseWithMCP` helper function
   - File: `lib/openai-client.ts`

2. **Pokédex Endpoint Enhanced**
   - Added Responses API support with MCP tools
   - Fallback to Chat Completions API
   - Backward compatible
   - File: `app/api/ai/pokedex/route.ts`

3. **New V2 Endpoint Created**
   - Dedicated Responses API endpoint
   - File: `app/api/ai/pokedex-v2/route.ts`

### 🚧 In Progress

- Testing Responses API integration
- Verifying MCP tool calls work correctly

### 📋 Remaining Endpoints to Migrate

1. `/api/ai/coach` - Strategic team analysis
2. `/api/ai/weekly-recap` - Weekly recap generation
3. `/api/ai/parse-result` - Match result parsing
4. `/api/ai/sql` - Natural language → SQL queries

---

## Usage

### Enable Responses API

**Option 1: Per-request**
```typescript
const response = await fetch('/api/ai/pokedex', {
  method: 'POST',
  body: JSON.stringify({
    query: 'What Pokémon are available in the draft pool?',
    useResponsesAPI: true, // Enable Responses API
  }),
})
```

**Option 2: Environment Variable**
```bash
# In Vercel environment variables (Production)
ENABLE_RESPONSES_API=true
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp

# In .env.local (Local Development)
ENABLE_RESPONSES_API=false
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp
```

### MCP Server Integration

The Responses API automatically uses the MCP server when enabled:

```typescript
tools: [
  {
    type: 'mcp',
    server_label: 'poke-mnky-draft-pool',
    server_url: 'http://10.3.0.119:3001/mcp',
    server_description: 'Access to POKE MNKY draft pool and team data',
  },
]
```

---

## Response Format

### Responses API Response
```json
{
  "answer": "Based on the draft pool...",
  "pokemon_referenced": ["pikachu", "charizard"],
  "source": "responses_api_mcp"
}
```

### Chat Completions Response (Fallback)
```json
{
  "answer": "Based on the data...",
  "pokemon_referenced": ["pikachu"],
  "source": "chat_completions"
}
```

---

## Testing

### Test Responses API Endpoint

```bash
# Test with Responses API enabled
curl -X POST http://localhost:3000/api/ai/pokedex \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What Pokémon are available for 15-18 points?",
    "useResponsesAPI": true
  }'
```

### Test MCP Tool Integration

The MCP server should be called automatically when:
1. Query relates to draft pool data
2. Responses API is enabled
3. MCP server URL is configured

---

## Migration Strategy

### Phase 2A: Pokédex Endpoint (Current)
- ✅ Enhanced with Responses API support
- ✅ Backward compatible
- ✅ Can be enabled per-request or globally

### Phase 2B: Coach Endpoint
- Add Responses API support
- Integrate MCP tools for team data
- Add built-in web search for strategy research

### Phase 2C: Weekly Recap Endpoint
- Migrate to Responses API
- Use background mode for long-running generation
- Add file search for historical data

### Phase 2D: Parse Result Endpoint
- Migrate to Responses API
- Use structured output format
- Improve parsing accuracy

### Phase 2E: SQL Endpoint
- Migrate to Responses API
- Add Code Interpreter tool
- Improve SQL generation

---

## Environment Variables

**Production (Vercel):**
```bash
# Enable Responses API globally
ENABLE_RESPONSES_API=true

# MCP Server URL (Cloudflare Tunnel)
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp

# OpenAI API Key (already configured)
OPENAI_API_KEY=sk-...
```

**Local Development (.env.local):**
```bash
# Enable Responses API globally (optional)
ENABLE_RESPONSES_API=false

# MCP Server URL (Network IP for local access)
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp
```

**Note:** The MCP server is accessible via:
- **Production**: `https://mcp-draft-pool.moodmnky.com/mcp` (Cloudflare Tunnel)
- **Local/Network**: `http://10.3.0.119:3001/mcp` (Direct network IP)

---

## Benefits of Migration

1. **MCP Integration**: Direct access to draft pool data via MCP tools
2. **Better Tool Performance**: Responses API handles multiple tool calls more efficiently
3. **Built-in Tools**: Web search, file search, computer use available
4. **Background Mode**: Long-running tasks can run asynchronously
5. **Streaming**: Better streaming support for real-time updates

---

## Next Steps

1. ✅ Update OpenAI client
2. ✅ Migrate Pokédex endpoint
3. ⏳ Test MCP integration
4. ⏳ Migrate Coach endpoint
5. ⏳ Migrate Weekly Recap endpoint
6. ⏳ Migrate Parse Result endpoint
7. ⏳ Migrate SQL endpoint

---

**Status**: Phase 2A Complete (Pokédex Endpoint)  
**Next**: Testing and Phase 2B (Coach Endpoint)
