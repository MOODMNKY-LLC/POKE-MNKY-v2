#!/usr/bin/env python3
"""Fix supabase-local MCP config based on Supabase docs - simplify for local dev"""
import json
from pathlib import Path

mcp_file = Path('.cursor/mcp.json')

# Read current config
with open(mcp_file, 'r', encoding='utf-8') as f:
    config = json.load(f)

# According to Supabase docs, for local dev:
# - Just use the URL, no headers needed (local dev doesn't require auth)
# - The endpoint is at /mcp (not /functions/v1/mcp for built-in MCP)
# - No project_ref needed for local (it's automatic)
# - Type should be "http" (not "streamable-http")

config['mcpServers']['supabase-local'] = {
    "type": "http",
    "url": "http://127.0.0.1:54321/mcp"
}

# Write back
with open(mcp_file, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("Fixed supabase-local MCP configuration (simplified for local dev)")
print("\nConfiguration:")
print(json.dumps(config['mcpServers']['supabase-local'], indent=2))
print("\nNote: Local Supabase MCP doesn't require headers or project_ref")
