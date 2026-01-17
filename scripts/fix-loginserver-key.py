#!/usr/bin/env python3
"""Fix LOGINSERVER_PRIVATE_KEY to single line format."""
import re
from pathlib import Path

def fix_loginserver_key(env_path: Path):
    """Convert LOGINSERVER_PRIVATE_KEY to single line with \n escapes."""
    backup_path = env_path.with_suffix('.env.backup5')
    
    content = env_path.read_text(encoding='utf-8')
    backup_path.write_text(content, encoding='utf-8')
    print(f"Created backup: {backup_path}")
    
    # Find LOGINSERVER_PRIVATE_KEY block (even if commented)
    pattern = r'(#?\s*LOGINSERVER_PRIVATE_KEY)=-----BEGIN PRIVATE KEY-----\n((?:.*\n)*?)-----END PRIVATE KEY-----'
    
    def replace_key(match):
        comment_prefix = match.group(1).startswith('#') and '# ' or ''
        var_name = 'LOGINSERVER_PRIVATE_KEY'
        key_content = match.group(2)
        # Remove trailing newlines
        key_content = key_content.rstrip('\n')
        # Replace actual newlines with \n escape sequences
        key_content_escaped = key_content.replace('\n', '\\n')
        # Create single-line version
        single_line = f"{comment_prefix}{var_name}=-----BEGIN PRIVATE KEY-----\\n{key_content_escaped}\\n-----END PRIVATE KEY-----"
        return single_line
    
    fixed_content = re.sub(pattern, replace_key, content, flags=re.MULTILINE)
    
    if fixed_content != content:
        env_path.write_text(fixed_content, encoding='utf-8')
        print("Fixed LOGINSERVER_PRIVATE_KEY to single line format")
        return True
    else:
        print("No changes made")
        return False

if __name__ == '__main__':
    env_file = Path('.env')
    if not env_file.exists():
        print(f"Error: {env_file} not found")
        exit(1)
    
    try:
        fix_loginserver_key(env_file)
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
