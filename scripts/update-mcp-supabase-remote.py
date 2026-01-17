#!/usr/bin/env python3
"""Update remote Supabase MCP config to match correct format"""
import json
import os
from pathlib import Path

mcp_file = Path('.cursor/mcp.json')

# Read current config
with open(mcp_file, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Update remote supabase config to match format
# Check if we have SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in env
project_ref = os.getenv('SUPABASE_PROJECT_REF', 'chmrszrwlfeqovwxyrmt')
access_token = os.getenv('SUPABASE_ACCESS_TOKEN', '')

# Update supabase remote config
if 'supabase' in config['mcpServers']:
    # If it's just a URL, update to full format
    if isinstance(config['mcpServers']['supabase'], str) or 'url' in config['mcpServers']['supabase']:
        if access_token:
            config['mcpServers']['supabase'] = {
                "type": "http",
                "url": f"https://mcp.supabase.com/mcp?project_ref={project_ref}",
                "headers": {
                    "Authorization": f"Bearer {access_token}"
                }
            }
        else:
            # Keep URL format but add type
            if isinstance(config['mcpServers']['supabase'], str):
                config['mcpServers']['supabase'] = {
                    "type": "http",
                    "url": config['mcpServers']['supabase']
                }
            else:
                config['mcpServers']['supabase']['type'] = "http"

# Write back
with open(mcp_file, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("Updated remote Supabase MCP configuration")
print("\nCurrent supabase config:")
print(json.dumps(config['mcpServers'].get('supabase', {}), indent=2))
