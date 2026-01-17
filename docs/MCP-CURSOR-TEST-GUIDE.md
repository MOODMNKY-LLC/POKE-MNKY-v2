# MCP Server - Cursor Integration Test Guide

**Date**: January 17, 2026  
**Status**: ✅ **CONFIGURED AND READY**

---

## ✅ Configuration Complete

The MCP server has been added to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=chmrszrwlfeqovwxyrmt"
    },
    "poke-mnky-draft-pool": {
      "type": "streamable-http",
      "url": "https://mcp-draft-pool.moodmnky.com/mcp",
      "description": "POKE MNKY Draft Pool MCP Server - Access to draft pool data, team budgets, picks, and draft status"
    }
  }
}
```

---

## 🧪 How to Test

### Step 1: Restart Cursor

**IMPORTANT**: You must restart Cursor for the MCP configuration to load.

1. Close Cursor completely
2. Reopen Cursor
3. Wait for MCP servers to initialize

### Step 2: Verify MCP Server is Loaded

After restart, the MCP server should be available. You can verify by:

1. Looking for MCP tools in the chat interface
2. Asking Cursor: "What MCP tools are available?"
3. Checking if draft pool tools appear

### Step 3: Test Each Tool

Try these queries to test each MCP tool:

#### Test 1: Get Available Pokemon
```
Use the get_available_pokemon tool to find Pokemon in the draft pool with 20 points
```

#### Test 2: Get Draft Status
```
Check the current draft status using get_draft_status
```

#### Test 3: Get Team Budget
```
Get the draft budget for team [team-id-here] using get_team_budget
```

#### Test 4: Get Team Picks
```
List all draft picks for team [team-id-here] using get_team_picks
```

#### Test 5: Analyze Pick Value
```
Analyze the value of picking Pikachu for team [team-id-here] using analyze_pick_value
```

---

## ✅ Expected Results

### Tool Discovery

You should see 5 tools available:
1. ✅ `get_available_pokemon`
2. ✅ `get_draft_status`
3. ✅ `get_team_budget`
4. ✅ `get_team_picks`
5. ✅ `analyze_pick_value`

### Tool Execution

Each tool should:
- ✅ Connect to MCP server successfully
- ✅ Return structured JSON data
- ✅ Provide accurate information
- ✅ Handle errors gracefully

---

## 🔍 Verification

### Check Server Status

```bash
curl https://mcp-draft-pool.moodmnky.com/health
# Expected: {"status":"ok","service":"poke-mnky-draft-pool-mcp-server"}
```

### Check MCP Protocol

```bash
curl -X POST https://mcp-draft-pool.moodmnky.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

---

## 📊 Test Results

_After restarting Cursor, test each tool and document results here..._

---

## 🎯 Success Criteria

- [ ] MCP server appears in Cursor's available tools
- [ ] All 5 tools are discoverable
- [ ] Tools execute successfully
- [ ] Data returned is accurate
- [ ] No errors occur

---

**Status**: ✅ **READY FOR TESTING**  
**Next**: Restart Cursor and begin testing
