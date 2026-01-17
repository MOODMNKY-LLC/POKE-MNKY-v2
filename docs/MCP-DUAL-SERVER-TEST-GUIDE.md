# Dual MCP Server Test Guide

**Date**: January 17, 2026  
**Status**: ✅ **CONFIGURED AND READY FOR TESTING**

---

## Configuration Complete

Both MCP servers are now configured in `.cursor/mcp.json`:

### 1. Supabase Local MCP (`supabase-local`)
- **Type**: `streamable-http`
- **URL**: `http://127.0.0.1:54321/mcp`
- **Purpose**: Direct access to local Supabase instance
- **Capabilities**:
  - Database queries
  - Schema inspection
  - Table operations
  - Migration management

### 2. Poke-MNKY Draft Pool MCP (`poke-mnky-draft-pool`)
- **Type**: `streamable-http`
- **URL**: `https://mcp-draft-pool.moodmnky.com/mcp`
- **Purpose**: Draft pool operations and team management
- **Capabilities**:
  - Get available Pokemon
  - Get draft status
  - Get team budgets
  - Get team picks
  - Analyze pick value

---

## Testing Instructions

### Step 1: Restart Cursor

**IMPORTANT**: Restart Cursor completely to load the new `supabase-local` MCP server.

1. Close Cursor completely
2. Reopen Cursor
3. Wait for MCP servers to initialize

### Step 2: Verify Both MCP Servers are Loaded

After restart, verify both servers are available:

1. Check MCP tools in Cursor chat
2. Ask: "What MCP tools are available from supabase-local?"
3. Ask: "What MCP tools are available from poke-mnky-draft-pool?"

---

## Comprehensive Test Scenarios

### Test 1: Supabase Local - Database Query

**Query**: "Use supabase-local to query the draft_pool table and show me Pokemon with 20 points"

**Expected**: Direct database query via Supabase Local MCP

### Test 2: Draft Pool MCP - Get Available Pokemon

**Query**: "Use poke-mnky-draft-pool to get available Pokemon with 20 points"

**Expected**: Structured response from Draft Pool MCP server

### Test 3: Combined Workflow - Schema + Data

**Query**: "First, use supabase-local to check the schema of the draft_pool table, then use poke-mnky-draft-pool to get available Pokemon with 20 points"

**Expected**: 
1. Schema information from Supabase Local
2. Pokemon data from Draft Pool MCP

### Test 4: Combined Workflow - Cross-Reference

**Query**: "Use supabase-local to query team_rosters table, then use poke-mnky-draft-pool to get the draft status and see which team is currently picking"

**Expected**:
1. Team roster data from Supabase Local
2. Draft status from Draft Pool MCP
3. Cross-referenced information

### Test 5: Error Handling

**Query**: "Use supabase-local to query a non-existent table, then use poke-mnky-draft-pool to get draft status"

**Expected**: 
1. Error from Supabase Local (table doesn't exist)
2. Successful response from Draft Pool MCP
3. Both servers work independently

---

## Expected Results

### Supabase Local MCP Tools

You should see tools like:
- `query_database` - Execute SQL queries
- `list_tables` - List all tables
- `get_table_schema` - Get table schema
- `run_migration` - Run database migrations

### Draft Pool MCP Tools

You should see:
- ✅ `get_available_pokemon`
- ✅ `get_draft_status`
- ✅ `get_team_budget`
- ✅ `get_team_picks`
- ✅ `analyze_pick_value`

---

## Advanced Test: Tandem Workflow

### Scenario: Draft Analysis Workflow

**Query**: 
```
1. Use supabase-local to query the draft_pool table and get all Pokemon with point_value >= 18
2. Use poke-mnky-draft-pool to get the current draft status
3. Use poke-mnky-draft-pool to get available Pokemon (excluding already drafted)
4. Cross-reference the results to suggest the best available high-value picks
```

**Expected Flow**:
1. Supabase Local queries `draft_pool` table directly
2. Draft Pool MCP provides current draft state
3. Draft Pool MCP filters out drafted Pokemon
4. Combined analysis suggests optimal picks

---

## Troubleshooting

### Issue: Supabase Local MCP not loading

**Solution**:
1. Verify Supabase is running: `supabase status`
2. Check MCP endpoint: `curl http://127.0.0.1:54321/mcp`
3. Restart Cursor

### Issue: Draft Pool MCP not loading

**Solution**:
1. Verify server is running: `curl https://mcp-draft-pool.moodmnky.com/mcp`
2. Check Cloudflare Tunnel status
3. Verify network connectivity

### Issue: Both servers work independently but not together

**Solution**:
- This is expected - each MCP server operates independently
- Use them sequentially in your queries
- Cursor will call each server as needed

---

## Success Criteria

✅ Both MCP servers appear in Cursor's tool list  
✅ Supabase Local can query local database  
✅ Draft Pool MCP can access draft pool data  
✅ Both servers work in tandem workflows  
✅ Error handling works correctly  
✅ Performance is acceptable  

---

## Next Steps

After successful testing:

1. Document any issues found
2. Optimize queries if needed
3. Add more combined workflows
4. Integrate into production AI assistant features

---

**Ready to test!** Restart Cursor and begin with Test 1.
