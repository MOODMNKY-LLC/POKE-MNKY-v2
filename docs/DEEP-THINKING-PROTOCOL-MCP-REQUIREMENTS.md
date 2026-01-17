# Deep Thinking Protocol - MCP Server Requirements

**Date**: January 17, 2026  
**Status**: 📋 **ANALYSIS COMPLETE**

---

## 🎯 Overview

The Deep Thinking Protocol requires specific MCP servers to function properly. This document identifies all required servers and their current status.

---

## 📋 Required MCP Servers (From Protocol)

According to `.cursor/rules/deep-thinking.mdc`, the protocol explicitly requires:

### 1. **Brave Search** ✅ (Currently Configured)
**Protocol Requirement**: 
- Use for broad context with `max_results=20`
- Initial landscape analysis
- Broad context gathering

**Current Status**: 
- ✅ Configured as stdio (Docker)
- ⚠️ Needs HTTP endpoint for agent use
- ✅ API key available: `***REMOVED***`

**Protocol Usage**:
```
1. START: Brave Search for landscape
2. ANALYZE: Sequential Thinking
3. DIVE: Tavily Search for depth
4. PROCESS: Sequential Thinking
5. REPEAT until theme exhausted
```

---

### 2. **Tavily Search** ✅ (Currently Configured)
**Protocol Requirement**:
- Set `search_depth="advanced"` for deep dives
- Deep investigation phase
- Targeting identified gaps

**Current Status**:
- ✅ Configured as stdio (Docker)
- ⚠️ Needs HTTP endpoint for agent use
- ✅ API key available: `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`

**Protocol Usage**:
- Deep investigation after initial Brave Search
- Advanced search depth required
- Domain filtering capabilities

---

### 3. **Sequential Thinking** ✅ (Currently Configured)
**Protocol Requirement**:
- Maintain minimum 5 thoughts per analysis
- Deep Sequential Thinking for:
  - Extract key patterns
  - Identify underlying trends
  - Map knowledge structure
  - Form initial hypotheses
  - Note critical uncertainties

**Current Status**:
- ✅ Configured as stdio (Docker)
- ⚠️ Needs HTTP endpoint for agent use
- ✅ No API key required

**Protocol Usage**:
- After each search (Brave or Tavily)
- Minimum 5 thoughts per analysis
- Comprehensive Sequential Thinking for hypothesis testing

---

## 🔍 Additional Tools (Implicitly Required)

While not explicitly listed in the protocol, these tools enhance the deep thinking capability:

### 4. **Firecrawl** ✅ (Currently Configured)
**Purpose**: 
- Extract content from URLs found via search
- Deep content extraction
- Batch processing

**Current Status**:
- ✅ Configured as stdio (Docker)
- ⚠️ Needs HTTP endpoint for agent use
- ✅ API key available: `***REMOVED***`

**Protocol Benefit**:
- Extract detailed content from search results
- Process multiple sources efficiently
- Build comprehensive knowledge base

---

### 5. **Fetch** ✅ (Currently Configured)
**Purpose**:
- Simple HTTP fetching
- Quick content retrieval
- Lightweight alternative

**Current Status**:
- ✅ Configured as stdio (Docker)
- ⚠️ Needs HTTP endpoint for agent use
- ✅ No API key required

---

## 📊 Current Status Summary

| MCP Server | Required by Protocol | Currently Configured | Type | HTTP Endpoint Needed |
|------------|---------------------|---------------------|------|---------------------|
| **Brave Search** | ✅ YES (Explicit) | ✅ Yes | Stdio | ⚠️ **YES** |
| **Tavily Search** | ✅ YES (Explicit) | ✅ Yes | Stdio | ⚠️ **YES** |
| **Sequential Thinking** | ✅ YES (Explicit) | ✅ Yes | Stdio | ⚠️ **YES** |
| **Firecrawl** | ⚠️ Implicit | ✅ Yes | Stdio | ⚠️ **YES** |
| **Fetch** | ⚠️ Implicit | ✅ Yes | Stdio | ⚠️ **YES** |

---

## 🚨 Critical Issue

**All required MCP servers are currently configured as stdio (Docker commands), but the Deep Thinking Protocol requires them to work seamlessly in agent workflows.**

### Problems with Current Stdio Setup:

1. **Agent Compatibility**: 
   - Agents need HTTP endpoints for reliable operation
   - Stdio requires Docker subprocess spawning
   - Not ideal for serverless environments

2. **Protocol Requirements**:
   - Protocol expects seamless tool transitions
   - Sequential Thinking must maintain state between searches
   - HTTP endpoints provide better connection management

3. **Performance**:
   - Container startup overhead (~1-2 seconds per server)
   - No connection reuse
   - Limited scalability

---

## ✅ Solution: HTTP Endpoints Required

To fully implement the Deep Thinking Protocol for agents, **all 5 MCP servers must be hosted as HTTP endpoints**:

### Required HTTP Endpoints:

1. **Sequential Thinking MCP**
   - URL: `https://mcp-sequential.moodmnky.com/mcp`
   - Port: 3002
   - Priority: **HIGHEST** (used after every search)

2. **Brave Search MCP**
   - URL: `https://mcp-brave.moodmnky.com/mcp`
   - Port: 3003
   - Priority: **HIGH** (initial landscape analysis)

3. **Tavily Search MCP**
   - URL: `https://mcp-tavily.moodmnky.com/mcp`
   - Port: 3004
   - Priority: **HIGH** (deep investigation)

4. **Firecrawl MCP**
   - URL: `https://mcp-firecrawl.moodmnky.com/mcp`
   - Port: 3005
   - Priority: **MEDIUM** (content extraction)

5. **Fetch MCP**
   - URL: `https://mcp-fetch.moodmnky.com/mcp`
   - Port: 3006
   - Priority: **MEDIUM** (simple fetching)

---

## 🔄 Protocol Workflow with HTTP MCPs

### Phase 1: Initial Engagement
- ✅ User asks clarifying questions
- ✅ Agent reflects understanding

### Phase 2: Research Planning
- ✅ Agent presents research plan
- ✅ Lists 3-5 major themes
- ✅ Outlines investigation approach

### Phase 3: Research Cycles (Requires HTTP MCPs)

**For EACH theme:**

1. **Initial Landscape Analysis**
   ```
   → Brave Search MCP (HTTP) - max_results=20
   → Sequential Thinking MCP (HTTP) - min 5 thoughts
   → Extract patterns, trends, hypotheses
   ```

2. **Deep Investigation**
   ```
   → Tavily Search MCP (HTTP) - search_depth="advanced"
   → Sequential Thinking MCP (HTTP) - comprehensive analysis
   → Test hypotheses, find contradictions
   ```

3. **Content Extraction** (if needed)
   ```
   → Firecrawl MCP (HTTP) - extract from URLs
   → Fetch MCP (HTTP) - quick content retrieval
   → Sequential Thinking MCP (HTTP) - integrate findings
   ```

4. **Knowledge Integration**
   ```
   → Sequential Thinking MCP (HTTP) - connect findings
   → Map relationships
   → Build unified understanding
   ```

### Phase 4: Final Report
- ✅ Comprehensive academic narrative
- ✅ Evidence from all sources
- ✅ Proper citations and analysis

---

## 🎯 Implementation Priority

### Phase 1: Core Protocol Servers (CRITICAL)
1. ✅ **Sequential Thinking** - Used after every search
2. ✅ **Brave Search** - Initial landscape analysis
3. ✅ **Tavily Search** - Deep investigation

### Phase 2: Enhancement Servers (IMPORTANT)
4. ✅ **Firecrawl** - Content extraction
5. ✅ **Fetch** - Simple fetching

---

## 📝 Updated Agent Instructions

Once HTTP endpoints are available, update agent instructions to include Deep Thinking Protocol:

```typescript
export const draftAssistantAgent = new Agent({
  name: 'Draft Assistant',
  instructions: `You are an expert Pokémon draft league assistant. 

When conducting deep research, follow the Deep Thinking Protocol:
1. Use Brave Search for broad context (max_results=20)
2. Use Sequential Thinking for analysis (minimum 5 thoughts)
3. Use Tavily Search for deep dives (search_depth="advanced")
4. Use Sequential Thinking to process findings
5. Repeat until theme exhausted

Always maintain research state between tool transitions.
Connect findings explicitly and build coherent narratives.
...`,
  mcpServers: [/* HTTP-based MCP servers */],
})
```

---

## 🔧 Next Steps

1. ✅ **Identify Required Servers** - COMPLETE (this document)
2. ⏳ **Host as HTTP Endpoints** - Create HTTP MCP servers on your server
3. ⏳ **Update Agent Configuration** - Switch from stdio to HTTP
4. ⏳ **Test Protocol Workflow** - Verify Deep Thinking Protocol works end-to-end
5. ⏳ **Update Agent Instructions** - Include protocol guidelines

---

## 📚 Related Documentation

- **Deep Thinking Protocol**: `.cursor/rules/deep-thinking.mdc`
- **MCP Hosting Recommendation**: `docs/MCP-SERVERS-HOSTING-RECOMMENDATION.md`
- **Current MCP Configuration**: `lib/agents/mcp-servers.ts`
- **Draft Pool MCP Pattern**: `docs/MCP-SERVER-IMPLEMENTATION-STATUS.md`

---

## ✅ Summary

**All 5 MCP servers required for Deep Thinking Protocol are currently configured, but they need to be hosted as HTTP endpoints to work properly with agents.**

**Critical Servers** (explicitly required):
- ✅ Brave Search
- ✅ Tavily Search  
- ✅ Sequential Thinking

**Enhancement Servers** (implicitly useful):
- ✅ Firecrawl
- ✅ Fetch

**Action Required**: Host all 5 as HTTP endpoints following the draft pool MCP pattern.
