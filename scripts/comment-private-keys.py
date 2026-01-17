#!/usr/bin/env python3
"""Comment out entire private key blocks in .env file."""
import re
from pathlib import Path

def comment_private_keys(env_path: Path):
    """Comment out entire private key blocks."""
    backup_path = env_path.with_suffix('.env.backup4')
    
    content = env_path.read_text(encoding='utf-8')
    backup_path.write_text(content, encoding='utf-8')
    print(f"Created backup: {backup_path}")
    
    # Pattern to match entire private key blocks
    pattern = r'^([A-Z_]+_PRIVATE_KEY)=-----BEGIN PRIVATE KEY-----\n(?:.*\n)*?-----END PRIVATE KEY-----\n?'
    
    def comment_block(match):
        block = match.group(0)
        # Comment out each line
        commented = '\n'.join(f"# {line}" if line.strip() else "#" for line in block.split('\n'))
        return commented
    
    fixed_content = re.sub(pattern, comment_block, content, flags=re.MULTILINE)
    
    env_path.write_text(fixed_content, encoding='utf-8')
    print("Commented out private key blocks")
    return fixed_content != content

if __name__ == '__main__':
    env_file = Path('.env')
    if not env_file.exists():
        print(f"Error: {env_file} not found")
        exit(1)
    
    try:
        comment_private_keys(env_file)
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
