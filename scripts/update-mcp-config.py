#!/usr/bin/env python3
"""
Update .cursor/mcp.json to add poke-mnky-draft-pool MCP server
"""

import json
import os
from pathlib import Path

# Path to mcp.json
mcp_json_path = Path(__file__).parent.parent / ".cursor" / "mcp.json"

# Read existing config
if mcp_json_path.exists():
    with open(mcp_json_path, 'r') as f:
        config = json.load(f)
else:
    config = {"mcpServers": {}}

# Add poke-mnky-draft-pool server
if "mcpServers" not in config:
    config["mcpServers"] = {}

config["mcpServers"]["poke-mnky-draft-pool"] = {
    "type": "streamable-http",
    "url": "https://mcp-draft-pool.moodmnky.com/mcp",
    "description": "POKE MNKY Draft Pool MCP Server - Access to draft pool data, team budgets, picks, and draft status"
}

# Write back
with open(mcp_json_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f"Updated {mcp_json_path}")
print("\nAdded poke-mnky-draft-pool MCP server configuration")
print("\nIMPORTANT: Restart Cursor for changes to take effect!")
