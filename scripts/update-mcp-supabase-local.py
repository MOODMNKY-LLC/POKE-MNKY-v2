#!/usr/bin/env python3
"""Add supabase-local MCP server to mcp.json"""
import json
from pathlib import Path

mcp_file = Path('.cursor/mcp.json')

# Read current config
with open(mcp_file, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Add supabase-local configuration
config['mcpServers']['supabase-local'] = {
    "type": "streamable-http",
    "url": "http://127.0.0.1:54321/mcp",
    "description": "Supabase Local MCP Server - Direct access to local Supabase instance for database queries, schema inspection, and migrations"
}

# Write back
with open(mcp_file, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("Added supabase-local to mcp.json")
print("\nUpdated configuration:")
print(json.dumps(config, indent=2))
