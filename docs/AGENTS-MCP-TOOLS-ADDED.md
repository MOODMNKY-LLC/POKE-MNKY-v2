# AI Agents - Additional MCP Tools Added

**Date**: January 17, 2026  
**Status**: ✅ **IMPLEMENTATION COMPLETE**

---

## 🎯 Overview

All three AI agents have been equipped with additional MCP (Model Context Protocol) tools to enhance their capabilities:

1. **Sequential Thinking** - Structured reasoning and problem-solving
2. **Brave Search** - Web search with citation support
3. **Tavily** - AI-optimized web search with advanced filtering
4. **Firecrawl** - Web scraping, crawling, and content extraction
5. **Fetch** - Simple HTTP fetching

---

## 📋 MCP Servers Added

### 1. Sequential Thinking (`mcp/sequentialthinking`)

**Type**: Docker (stdio)  
**API Key**: Not required  
**Purpose**: Provides structured reasoning capabilities for complex multi-step analysis

**Use Cases**:
- Breaking down complex draft decisions
- Multi-step trade analysis
- Battle strategy planning
- Problem-solving workflows

**Tools Available**: Structured reasoning tools for step-by-step analysis

---

### 2. Brave Search (`mcp/brave-search`)

**Type**: Docker (stdio)  
**API Key**: `BRAVE_API_KEY`  
**Purpose**: Web search with strong citation support and operator-based queries

**Use Cases**:
- Researching Pokémon competitive usage
- Finding move set recommendations
- Searching for meta trends
- Citation-required research

**Tools Available**:
- `brave_web_search` - General web search
- `brave_local_search` - Local business/place search

**API Key**: `***REMOVED***` (from Notion Credentials)

---

### 3. Tavily (`mcp/tavily`)

**Type**: Docker (stdio)  
**API Key**: `TAVILY_API_KEY`  
**Purpose**: AI-optimized web search with advanced filtering and content extraction

**Use Cases**:
- Fast AI agent searches
- Domain-filtered searches
- Real-time information gathering
- RAG pipeline optimization

**Tools Available**:
- `tavily-search` - AI-optimized search
- `tavily-extract` - Content extraction from URLs
- `tavily-crawl` - Website crawling
- `tavily-map` - Website structure mapping

**API Key**: `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` (from Notion Credentials)

---

### 4. Firecrawl (`mcp/firecrawl`)

**Type**: Docker (stdio)  
**API Key**: `FIRECRAWL_API_KEY`  
**Purpose**: Web scraping, crawling, and content extraction

**Use Cases**:
- Extracting content from strategy guides
- Crawling competitive resources
- Batch content extraction
- Building knowledge bases

**Tools Available**:
- `firecrawl_scrape` - Single page scraping
- `firecrawl_crawl` - Multi-page crawling
- `firecrawl_map` - Site structure mapping
- `firecrawl_search` - Search and extract
- `firecrawl_extract` - Structured data extraction

**API Key**: `***REMOVED***` (from Notion Credentials)

---

### 5. Fetch (`mcp/fetch`)

**Type**: Docker (stdio)  
**API Key**: Not required  
**Purpose**: Simple HTTP fetching and content retrieval

**Use Cases**:
- Quick URL fetching
- Simple content retrieval
- Lightweight alternative to Firecrawl

**Tools Available**:
- `fetch` - HTTP fetch with markdown conversion

---

## 🔧 Implementation Details

### Shared MCP Configuration

**File**: `lib/agents/mcp-servers.ts`

This module provides:
- Pre-configured MCP server instances
- Helper functions for initialization/cleanup
- Server groupings (all, research-focused, draft-focused)

### Updated Agents

All three agents now use the shared MCP servers:

1. **Draft Assistant** (`lib/agents/draft-assistant.ts`)
   - Uses: Draft Pool + Sequential Thinking
   - Can access: All MCP servers via `getDraftMCPServers()`

2. **Free Agency Agent** (`lib/agents/free-agency-agent.ts`)
   - Uses: All MCP servers
   - Can research Pokémon, analyze trades, extract content

3. **Battle Strategy Agent** (`lib/agents/battle-strategy-agent.ts`)
   - Uses: All MCP servers
   - Can research moves, strategies, extract battle guides

---

## 🔑 Environment Variables

Add these to your `.env.local` file:

```bash
# MCP Server API Keys (from Notion Credentials database)
BRAVE_API_KEY=***REMOVED***
TAVILY_API_KEY=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
FIRECRAWL_API_KEY=***REMOVED***

# Draft Pool MCP Server (existing)
MCP_DRAFT_POOL_SERVER_URL=http://127.0.0.1:54321/mcp
```

**Note**: The API keys are also hardcoded as fallbacks in `mcp-servers.ts` for development, but environment variables are preferred.

---

## 🐳 Docker Requirements

All stdio-based MCP servers require Docker to be running. The agents will spawn Docker containers for:

- `mcp/sequentialthinking`
- `mcp/brave-search`
- `mcp/tavily`
- `mcp/firecrawl`
- `mcp/fetch`

**Requirements**:
- Docker Desktop or Docker Engine running
- Docker socket accessible from Node.js process
- Sufficient permissions to run Docker commands

**Note**: In serverless environments (Vercel), Docker commands may not work. Consider:
- Using HTTP-based MCP servers instead
- Running agents in a containerized environment
- Using a separate service for MCP server management

---

## 📊 Agent Capabilities Enhanced

### Draft Assistant

**Before**:
- ✅ Draft pool data access
- ✅ Team budget tracking
- ✅ Pick recommendations

**After**:
- ✅ All previous capabilities
- ✅ Sequential thinking for complex analysis
- ✅ Web research for Pokémon strategies
- ✅ Meta trend analysis
- ✅ Competitive usage research

**Example Use Case**:
```
User: "What should I pick? I have 45 points and need a water type."

Agent Process:
1. Get team roster (Draft Pool MCP)
2. Analyze type coverage (Sequential Thinking)
3. Research water type Pokémon competitive usage (Brave Search/Tavily)
4. Extract move set recommendations (Firecrawl)
5. Filter by budget (Draft Pool MCP)
6. Rank recommendations (Sequential Thinking)
7. Return final answer
```

---

### Free Agency Agent

**Before**:
- ✅ Team data access
- ✅ Trade evaluation
- ✅ Target suggestions

**After**:
- ✅ All previous capabilities
- ✅ Research Pokémon competitive usage
- ✅ Extract strategy guides
- ✅ Multi-step trade analysis
- ✅ Meta trend research

**Example Use Case**:
```
User: "Should I pick up Flutter Mane?"

Agent Process:
1. Get team roster (Draft Pool MCP)
2. Research Flutter Mane competitive usage (Brave Search)
3. Extract move set recommendations (Firecrawl)
4. Analyze team fit (Sequential Thinking)
5. Evaluate value (Draft Pool MCP)
6. Return recommendation with sources
```

---

### Battle Strategy Agent

**Before**:
- ✅ Team roster access
- ✅ Matchup analysis
- ✅ Move suggestions

**After**:
- ✅ All previous capabilities
- ✅ Research move sets and strategies
- ✅ Extract battle guides
- ✅ Damage calculation research
- ✅ Counter-strategy research

**Example Use Case**:
```
User: "What moves should I use? My Pikachu vs their Charizard."

Agent Process:
1. Get both team rosters (Draft Pool MCP)
2. Research Pikachu move sets (Tavily)
3. Extract damage calculations (Firecrawl)
4. Analyze type matchups (Sequential Thinking)
5. Consider opponent's likely moves (Sequential Thinking)
6. Return optimal move recommendation
```

---

## ⚠️ Important Notes

### Docker Command Execution

The stdio-based MCP servers spawn Docker containers. This means:

1. **Docker must be running** - Agents will fail if Docker is not available
2. **Performance** - Container startup adds latency (~1-2 seconds per server)
3. **Resource usage** - Each agent call may spawn multiple containers
4. **Serverless limitations** - May not work in Vercel/serverless environments

### Error Handling

The implementation includes:
- Try/catch around MCP connections
- Graceful fallback if servers are unavailable
- Warning logs for connection failures
- Agents can still function with partial MCP availability

### Connection Management

- MCP servers are initialized on-demand when agents are used
- Connections are cached and reused when possible
- Cleanup functions properly close all connections

---

## 🧪 Testing

To test the new MCP tools:

1. **Ensure Docker is running**
   ```bash
   docker ps
   ```

2. **Test Draft Assistant with research**
   ```typescript
   const result = await getDraftRecommendation({
     teamId: 'your-team-id',
     context: 'Research competitive water type Pokémon and suggest the best pick'
   })
   ```

3. **Test Free Agency Agent with research**
   ```typescript
   const result = await evaluateFreeAgencyTarget({
     teamId: 'your-team-id',
     pokemonName: 'Flutter Mane'
   })
   ```

4. **Test Battle Strategy Agent with research**
   ```typescript
   const result = await suggestBattleMoves(
     'team-1',
     'team-2',
     'Pikachu',
     'Charizard'
   )
   ```

---

## 📚 Related Documentation

- [AI Agent Ecosystem Breakdown](./AI-AGENT-ECOSYSTEM-BREAKDOWN.md)
- [Agents SDK Installation Guide](./AGENTS-SDK-INSTALLATION-GUIDE.md)
- [Agents SDK Capabilities](./AGENTS-SDK-CAPABILITIES.md)
- [MCP Server Implementation Status](./MCP-SERVER-IMPLEMENTATION-STATUS.md)

---

## 🔄 Next Steps

1. ✅ **Add environment variables** to `.env.local`
2. ✅ **Test Docker connectivity** - Ensure Docker is accessible
3. ⚠️ **Monitor performance** - Watch for container startup latency
4. 🔮 **Future**: Consider HTTP-based MCP servers for production
5. 🔮 **Future**: Add connection pooling for better performance
