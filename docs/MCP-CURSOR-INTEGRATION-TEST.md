# MCP Server - Cursor Integration Test

**Date**: January 17, 2026  
**Purpose**: Test MCP server locally through Cursor's MCP integration  
**Status**: 🧪 **READY FOR TESTING**

---

## Configuration Added

### `.cursor/mcp.json`

Added `poke-mnky-draft-pool` MCP server to Cursor configuration:

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

## Testing Instructions

### Step 1: Restart Cursor

After adding the MCP server configuration, **restart Cursor** to load the new MCP server.

### Step 2: Verify MCP Server is Available

Once Cursor restarts, you should see MCP tools available. Check for tools like:
- `get_available_pokemon`
- `get_draft_status`
- `get_team_budget`
- `get_team_picks`
- `analyze_pick_value`

### Step 3: Test MCP Tools

Try using the MCP tools directly in Cursor chat:

**Example Queries**:
1. "Use the get_available_pokemon tool to find Pokemon with 20 points"
2. "Check the draft status using get_draft_status"
3. "Get team budget for team ID [some-team-id]"
4. "List picks for team ID [some-team-id]"
5. "Analyze pick value for Pikachu on team [some-team-id]"

---

## Expected Behavior

### Tool Discovery

Cursor should automatically discover the 5 MCP tools:
1. ✅ `get_available_pokemon`
2. ✅ `get_draft_status`
3. ✅ `get_team_budget`
4. ✅ `get_team_picks`
5. ✅ `analyze_pick_value`

### Tool Execution

When you ask Cursor to use these tools, it should:
1. Connect to MCP server via Cloudflare Tunnel
2. Call the appropriate tool
3. Return structured data
4. Use the data to answer your question

---

## Verification Checklist

- [ ] Cursor restarted after adding MCP config
- [ ] MCP server appears in available tools
- [ ] `get_available_pokemon` works
- [ ] `get_draft_status` works
- [ ] `get_team_budget` works
- [ ] `get_team_picks` works
- [ ] `analyze_pick_value` works
- [ ] Data returned is accurate
- [ ] No errors in execution

---

## Troubleshooting

### Issue: MCP Server Not Appearing

**Possible Causes**:
1. Cursor not restarted
2. Invalid URL format
3. Server not accessible

**Fix**:
1. Restart Cursor completely
2. Verify URL is correct: `https://mcp-draft-pool.moodmnky.com/mcp`
3. Test health endpoint: `curl https://mcp-draft-pool.moodmnky.com/health`

### Issue: Tool Calls Failing

**Possible Causes**:
1. Server not running
2. Network connectivity issue
3. Authentication required

**Fix**:
1. Check server status: `docker ps | grep draft-pool`
2. Check server logs: `docker logs poke-mnky-draft-pool-mcp-server`
3. Verify Cloudflare Tunnel is active

---

## Benefits of Local Testing

1. **No API Costs**: Test without OpenAI API calls
2. **Faster Iteration**: Immediate feedback
3. **Debug Easier**: See exact tool calls and responses
4. **Verify Logic**: Ensure tools work correctly before Responses API testing

---

**Status**: ✅ **CONFIGURATION ADDED**  
**Next**: Restart Cursor and test MCP tools
