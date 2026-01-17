#!/usr/bin/env python3
"""Update .env files with MCP server configuration"""

import re
import os

def update_env_file(filepath: str, mcp_url: str, is_local: bool = False):
    """Add MCP server configuration to .env file"""
    
    if not os.path.exists(filepath):
        print(f"File {filepath} does not exist")
        return False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if MCP vars already exist
    if 'MCP_DRAFT_POOL_SERVER_URL' in content:
        print(f"MCP vars already exist in {filepath}, skipping")
        return False
    
    # Find OpenAI API section
    openai_pattern = r'(# OpenAI API.*?# -----------------------------------------------------------------------------\s+OPENAI_API_KEY=.*?\n)'
    match = re.search(openai_pattern, content, re.DOTALL)
    
    if not match:
        # Try simpler pattern
        openai_pattern = r'(# OpenAI API.*?\nOPENAI_API_KEY=.*?\n)'
        match = re.search(openai_pattern, content, re.DOTALL)
    
    if match:
        insert_pos = match.end()
        
        env_type = "Local Development" if is_local else "Production"
        url_type = "Network IP (for local dev)" if is_local else "Cloudflare Tunnel URL (Production)"
        
        mcp_section = f"""
# -----------------------------------------------------------------------------
# MCP Server Configuration (OpenAI Responses API Integration)
# -----------------------------------------------------------------------------
# Draft Pool MCP Server - {url_type}
MCP_DRAFT_POOL_SERVER_URL={mcp_url}
# Enable Responses API globally (optional)
ENABLE_RESPONSES_API=false
"""
        
        new_content = content[:insert_pos] + mcp_section + content[insert_pos:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"Updated {filepath}")
        return True
    else:
        print(f"Could not find OpenAI API section in {filepath}")
        # Append at end instead
        mcp_section = f"""
# -----------------------------------------------------------------------------
# MCP Server Configuration (OpenAI Responses API Integration)
# -----------------------------------------------------------------------------
# Draft Pool MCP Server
MCP_DRAFT_POOL_SERVER_URL={mcp_url}
# Enable Responses API globally (optional)
ENABLE_RESPONSES_API=false
"""
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(mcp_section)
        print(f"Appended MCP config to {filepath}")
        return True

if __name__ == '__main__':
    # Update .env (production)
    update_env_file(
        '.env',
        'https://mcp-draft-pool.moodmnky.com/mcp',
        is_local=False
    )
    
    # Update .env.local (local development)
    if os.path.exists('.env.local'):
        update_env_file(
            '.env.local',
            'http://10.3.0.119:3001/mcp',
            is_local=True
        )
    else:
        print("⚠️  .env.local not found, skipping")
