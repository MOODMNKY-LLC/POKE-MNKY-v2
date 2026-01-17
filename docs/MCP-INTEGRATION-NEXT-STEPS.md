# MCP Integration - Next Steps

**Date**: January 17, 2026  
**Status**: ✅ Core Tests Passing  
**Ready For**: End-to-End Testing & Phase 2B

---

## ✅ Test Results Summary

All core functionality tests passed:
- ✅ Health Endpoint - Server accessible
- ✅ MCP Initialize - Protocol handshake working
- ✅ MCP Tools List - Tools available (session handling noted)
- ✅ MCP Tool Call - Tools callable (session handling noted)
- ✅ Responses API Helper - Code integration complete
- ✅ Environment Variables - Configured correctly

**Status**: ✅ **READY FOR INTEGRATION TESTING**

---

## 🎯 Immediate Next Steps

### 1. End-to-End Testing (Priority: HIGH)

**Goal**: Verify Responses API integration works with actual OpenAI API calls

**Steps**:
1. **Enable Responses API**
   ```bash
   # In .env.local (for local testing)
   ENABLE_RESPONSES_API=true
   ```

2. **Test Pokédex Endpoint**
   ```bash
   # Test with draft pool query
   curl -X POST http://localhost:3000/api/ai/pokedex \
     -H "Content-Type: application/json" \
     -d '{
       "query": "What Pokemon are available in the draft pool with 20 points?",
       "useResponsesAPI": true
     }'
   ```

3. **Monitor Results**
   - Check response includes `source: "responses_api_mcp"`
   - Verify MCP tools are called (check server logs)
   - Validate answer quality
   - Monitor OpenAI API costs

4. **Test Scenarios**:
   - ✅ Draft pool queries
   - ✅ Team budget queries
   - ✅ Draft status queries
   - ✅ Pick value analysis

**Success Criteria**:
- [ ] Responses API returns valid responses
- [ ] MCP tools are called correctly
- [ ] Answers are accurate and helpful
- [ ] No errors in logs

---

### 2. Phase 2B: Coach Endpoint Migration (Priority: MEDIUM)

**Goal**: Migrate Coach endpoint to use Responses API with MCP tools

**Current Endpoint**: `app/api/ai/coach/route.ts`

**Changes Needed**:
1. Add Responses API support (similar to Pokédex)
2. Integrate MCP tools:
   - `get_team_budget` - For budget analysis
   - `get_team_picks` - For roster analysis
   - `get_available_pokemon` - For recommendations
   - `analyze_pick_value` - For value assessment
3. Add built-in web search for strategy research
4. Maintain backward compatibility

**Implementation Steps**:
```typescript
// Add to app/api/ai/coach/route.ts
if (useResponsesAPI || process.env.ENABLE_RESPONSES_API === "true") {
  const mcpServerUrl = process.env.MCP_DRAFT_POOL_SERVER_URL || "http://10.3.0.119:3001/mcp"
  
  const response = await createResponseWithMCP({
    model: AI_MODELS.COACH,
    input: [{ role: "user", content: query }],
    tools: [
      {
        type: "mcp",
        server_label: "poke-mnky-draft-pool",
        server_url: mcpServerUrl,
        server_description: "Access to POKE MNKY draft pool and team data",
      },
      {
        type: "web_search", // Built-in OpenAI web search
      },
    ],
  })
}
```

**Testing**:
- Test team analysis queries
- Test strategy recommendations
- Verify MCP tool calls
- Validate web search integration

---

### 3. Phase 2C: Weekly Recap Endpoint (Priority: LOW)

**Goal**: Migrate Weekly Recap endpoint to Responses API

**Current Endpoint**: `app/api/ai/weekly-recap/route.ts`

**Changes Needed**:
1. Add Responses API support
2. Use background mode for long-running tasks
3. Add file search for historical data
4. Integrate MCP tools for match data

**Features**:
- Background processing for long recaps
- File search for previous recaps
- MCP tools for match/team data

---

### 4. Phase 2D: Parse Result Endpoint (Priority: LOW)

**Goal**: Migrate Parse Result endpoint to Responses API

**Current Endpoint**: `app/api/ai/parse-result/route.ts`

**Changes Needed**:
1. Add Responses API support
2. Improve parsing accuracy
3. Better error handling

---

### 5. Phase 2E: SQL Endpoint (Priority: LOW)

**Goal**: Migrate SQL endpoint to Responses API

**Current Endpoint**: `app/api/ai/sql/route.ts`

**Changes Needed**:
1. Add Responses API support
2. Add Code Interpreter tool for SQL execution
3. Enhanced schema understanding

---

## 🚀 Phase 3: Agents SDK Integration (Future)

**Goal**: Build AI agents for draft assistance, free agency, and battle strategy

### 3.1 Install Agents SDK

```bash
npm install @openai/agents
```

### 3.2 Draft Assistant Agent

**Purpose**: Assist coaches during draft with pick recommendations

**Features**:
- Real-time draft pool access via MCP
- Budget analysis
- Team composition analysis
- Pick recommendations based on:
  - Remaining budget
  - Team needs (types, roles)
  - Value analysis

**MCP Tools Used**:
- `get_available_pokemon`
- `get_team_budget`
- `get_team_picks`
- `analyze_pick_value`

### 3.3 Free Agency Agent

**Purpose**: Assist with free agency decisions and trade proposals

**Features**:
- Team roster analysis
- Free agency recommendations
- Trade proposal evaluation
- Value comparison

**MCP Tools Used**:
- `get_team_budget`
- `get_team_picks`
- `get_available_pokemon`
- `analyze_pick_value`

### 3.4 Battle Strategy Agent

**Purpose**: Provide battle strategy recommendations

**Features**:
- Team matchup analysis
- Move recommendations
- Tera type suggestions
- Counter-strategy suggestions

**Integration**:
- Pokemon Showdown battle data
- MCP tools for team data
- Web search for meta strategies

---

## 📋 Testing Checklist

### Phase 2A (Current) ✅
- [x] MCP server deployed
- [x] Health checks passing
- [x] Code integration complete
- [ ] End-to-end test with OpenAI API
- [ ] Verify MCP tool calls
- [ ] Validate response quality

### Phase 2B (Next)
- [ ] Coach endpoint migrated
- [ ] MCP tools integrated
- [ ] Web search integrated
- [ ] Tests passing
- [ ] Documentation updated

### Phase 2C-E (Future)
- [ ] Weekly Recap migrated
- [ ] Parse Result migrated
- [ ] SQL endpoint migrated

### Phase 3 (Future)
- [ ] Agents SDK installed
- [ ] Draft Assistant built
- [ ] Free Agency Agent built
- [ ] Battle Strategy Agent built

---

## 🔧 Configuration

### Environment Variables

**Required**:
```bash
# MCP Server URLs
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp  # Production
MCP_DRAFT_POOL_SERVER_URL=http://10.3.0.119:3001/mcp              # Local

# Responses API (optional, defaults to false)
ENABLE_RESPONSES_API=false  # Set to true to enable

# OpenAI API Key (required for Responses API)
OPENAI_API_KEY=sk-...
```

### MCP Server Status

**Production**: `https://mcp-draft-pool.moodmnky.com/mcp`
- ✅ Deployed and running
- ✅ Health checks passing
- ✅ Cloudflare Tunnel active

**Local**: `http://10.3.0.119:3001/mcp`
- ✅ Network accessible
- ✅ For local development

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

1. **MCP Server**:
   - Health check status
   - Response times
   - Tool call success rate
   - Error rates

2. **Responses API**:
   - API call success rate
   - Response quality
   - Cost per request
   - Tool usage frequency

3. **Integration**:
   - Endpoint usage
   - Fallback rate (to Chat Completions)
   - User satisfaction

### Logging

**MCP Server Logs**:
```bash
# On server
docker logs poke-mnky-draft-pool-mcp-server -f
```

**Next.js Logs**:
- Check Vercel logs for production
- Check local console for development

---

## 🎓 Learning Resources

### OpenAI Responses API
- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [MCP Integration Guide](https://platform.openai.com/docs/guides/mcp)

### Agents SDK
- [OpenAI Agents SDK Documentation](https://github.com/openai/agents)
- [Agent Examples](https://github.com/openai/agents/tree/main/examples)

### MCP Protocol
- [MCP Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)

---

## ⚠️ Important Notes

1. **Cost Management**:
   - Responses API may have different pricing than Chat Completions
   - Monitor usage and costs
   - Consider rate limiting

2. **Session Management**:
   - MCP Streamable HTTP requires proper session handling
   - OpenAI Responses API handles this automatically
   - Direct JSON-RPC calls require manual session management

3. **Error Handling**:
   - Always fallback to Chat Completions API
   - Log errors for debugging
   - Provide user-friendly error messages

4. **Testing**:
   - Test with actual API calls before production
   - Verify MCP tool calls work correctly
   - Monitor for errors and edge cases

---

## 🎯 Success Criteria

### Phase 2A (Current)
- [x] MCP server deployed ✅
- [x] Code integration complete ✅
- [ ] End-to-end test successful
- [ ] Production deployment verified

### Phase 2B (Next)
- [ ] Coach endpoint migrated
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Production deployment

### Phase 3 (Future)
- [ ] Agents SDK integrated
- [ ] Draft Assistant operational
- [ ] Free Agency Agent operational
- [ ] Battle Strategy Agent operational

---

**Next Action**: Enable Responses API and run end-to-end test with Pokédex endpoint.

**Estimated Time**: 
- End-to-end test: 30 minutes
- Phase 2B implementation: 2-3 hours
- Phase 2B testing: 1 hour

**Status**: ✅ **READY TO PROCEED**
