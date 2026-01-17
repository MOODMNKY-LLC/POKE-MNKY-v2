#!/usr/bin/env python3
"""Fix supabase-local MCP to use streamable-http transport"""
import json
from pathlib import Path

mcp_file = Path('.cursor/mcp.json')

# Read current config
with open(mcp_file, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Supabase local MCP requires streamable-http (needs text/event-stream)
# Based on error: "Client must accept both application/json and text/event-stream"
config['mcpServers']['supabase-local'] = {
    "type": "streamable-http",
    "url": "http://127.0.0.1:54321/mcp",
    "description": "Supabase Local MCP Server - Direct access to local Supabase instance for database queries, schema inspection, and migrations"
}

# Write back
with open(mcp_file, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("Fixed supabase-local MCP to use streamable-http transport")
print("\nConfiguration:")
print(json.dumps(config['mcpServers']['supabase-local'], indent=2))
