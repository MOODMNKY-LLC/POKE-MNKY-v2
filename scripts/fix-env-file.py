#!/usr/bin/env python3
"""
Fix .env file for Supabase CLI compatibility.
Converts multi-line private keys to single-line format with \n escape sequences.
"""
import re
import sys
from pathlib import Path

def fix_env_file(env_path: Path):
    """Fix multi-line private keys in .env file."""
    backup_path = env_path.with_suffix('.env.backup')
    
    # Read the file
    content = env_path.read_text(encoding='utf-8')
    
    # Create backup
    backup_path.write_text(content, encoding='utf-8')
    print(f"Created backup: {backup_path}")
    
    # Pattern to match private key variables with multi-line values
    # Matches: VARIABLE_NAME=-----BEGIN PRIVATE KEY-----\n...content...\n-----END PRIVATE KEY-----
    pattern = r'^([A-Z_]+_PRIVATE_KEY)=-----BEGIN PRIVATE KEY-----\n((?:[^\n]+\n)*?)-----END PRIVATE KEY-----\n'
    
    def replace_key(match):
        var_name = match.group(1)
        key_content = match.group(2)
        # Remove trailing newlines and replace actual newlines with \n escape sequences
        key_content = key_content.rstrip('\n')
        key_content = key_content.replace('\n', '\\n')
        return f"{var_name}=-----BEGIN PRIVATE KEY-----\\n{key_content}\\n-----END PRIVATE KEY-----"
    
    # Replace all private key patterns
    fixed_content = re.sub(pattern, replace_key, content, flags=re.MULTILINE)
    
    # Write back
    env_path.write_text(fixed_content, encoding='utf-8')
    print(f"Fixed private keys in {env_path}")
    
    return fixed_content != content

if __name__ == '__main__':
    env_file = Path('.env')
    if not env_file.exists():
        print(f"Error: {env_file} not found")
        sys.exit(1)
    
    try:
        fixed = fix_env_file(env_file)
        if fixed:
            print("Successfully fixed .env file")
        else:
            print("No changes made (keys might already be fixed)")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
