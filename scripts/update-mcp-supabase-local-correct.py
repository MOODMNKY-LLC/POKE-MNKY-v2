#!/usr/bin/env python3
"""Update mcp.json with correct Supabase local MCP format"""
import json
from pathlib import Path

mcp_file = Path('.cursor/mcp.json')

# Read current config
with open(mcp_file, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Update supabase-local with correct format
# For local Supabase, we use the Secret key as Authorization Bearer token
# From supabase status: Secret = sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
config['mcpServers']['supabase-local'] = {
    "type": "http",
    "url": "http://127.0.0.1:54321/mcp",
    "headers": {
        "Authorization": "Bearer sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
    },
    "description": "Supabase Local MCP Server - Direct access to local Supabase instance for database queries, schema inspection, and migrations"
}

# Write back
with open(mcp_file, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("Updated supabase-local MCP configuration with correct format")
print("\nConfiguration:")
print(json.dumps(config['mcpServers']['supabase-local'], indent=2))
