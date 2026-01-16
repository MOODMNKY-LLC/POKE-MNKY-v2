# Supabase MCP Configuration

## Local Supabase MCP Setup

Based on `supabase status`, add the following to `.cursor/mcp.json`:

\`\`\`json
{
  "mcpServers": {
    "supabase-dev": {
      "url": "http://127.0.0.1:54321/mcp"
    },
    // ... other MCP servers
  }
}
\`\`\`

## Connection Details

From `supabase status`:
- **MCP Endpoint**: `http://127.0.0.1:54321/mcp`
- **REST API**: `http://127.0.0.1:54321/rest/v1`
- **Database URL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio**: `http://127.0.0.1:54323`

## Usage

After adding to `mcp.json`, restart Cursor to enable Supabase MCP tools.

The MCP server provides:
- Direct database queries
- Schema inspection
- Migration management
- Table operations

---

**Note**: The MCP endpoint is already available via the `mcp_POKE-MNKY-v2-supabase_*` tools in this session.
