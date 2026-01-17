#!/usr/bin/env python3
"""Update supabase-local MCP URL with project_ref from config.toml"""
import json
import re
from pathlib import Path

mcp_file = Path('.cursor/mcp.json')
config_file = Path('supabase/config.toml')

# Read project_id from config.toml
project_id = None
if config_file.exists():
    content = config_file.read_text(encoding='utf-8')
    match = re.search(r'project_id\s*=\s*"([^"]+)"', content)
    if match:
        project_id = match.group(1)
        print(f"Found project_id: {project_id}")

if not project_id:
    print("Warning: Could not find project_id in config.toml")
    project_id = "POKE-MNKY-v2"  # Fallback

# Read current mcp.json
with open(mcp_file, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Update supabase-local URL with project_ref
if 'supabase-local' in config['mcpServers']:
    config['mcpServers']['supabase-local']['url'] = f"http://127.0.0.1:54321/mcp?project_ref={project_id}"
    print(f"Updated URL: {config['mcpServers']['supabase-local']['url']}")

# Write back
with open(mcp_file, 'w', encoding='utf-8') as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

print("\nUpdated supabase-local MCP configuration:")
print(json.dumps(config['mcpServers']['supabase-local'], indent=2))
