#!/usr/bin/env python3
"""Fix LOGINSERVER_PRIVATE_KEY to single line format (uncommented)."""
import re
from pathlib import Path

def fix_loginserver_key(env_path: Path):
    """Convert LOGINSERVER_PRIVATE_KEY to single line format."""
    backup_path = env_path.with_suffix('.env.backup6')
    
    content = env_path.read_text(encoding='utf-8')
    backup_path.write_text(content, encoding='utf-8')
    print(f"Created backup: {backup_path}")
    
    # Find LOGINSERVER_PRIVATE_KEY block (handles both commented and uncommented)
    # Match the entire block including all commented lines
    pattern = r'(#\s*)?LOGINSERVER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n((?:#\s*.*\n)*?)#\s*-----END PRIVATE KEY-----\n?'
    
    def replace_key(match):
        # Extract the key content, removing comment markers and leading/trailing whitespace
        commented_lines = match.group(2)
        # Remove # and leading whitespace from each line
        key_lines = []
        for line in commented_lines.split('\n'):
            if line.strip():
                # Remove # and leading whitespace
                cleaned = re.sub(r'^#\s*', '', line)
                if cleaned.strip():  # Only add non-empty lines
                    key_lines.append(cleaned)
        
        # Join with \n escape sequences
        key_content = '\\n'.join(key_lines)
        
        # Create single-line version (uncommented)
        single_line = f"LOGINSERVER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n{key_content}\\n-----END PRIVATE KEY-----"
        return single_line
    
    fixed_content = re.sub(pattern, replace_key, content, flags=re.MULTILINE)
    
    if fixed_content != content:
        env_path.write_text(fixed_content, encoding='utf-8')
        print("Fixed LOGINSERVER_PRIVATE_KEY to single line format (uncommented)")
        return True
    else:
        print("No changes made - pattern might not match")
        # Try alternative pattern
        pattern2 = r'#\s*LOGINSERVER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n((?:#\s*.*\n)*?)#\s*-----END PRIVATE KEY-----'
        match = re.search(pattern2, content, re.MULTILINE)
        if match:
            print("Found key block, trying alternative replacement...")
            key_lines = []
            for line in match.group(1).split('\n'):
                if line.strip():
                    cleaned = re.sub(r'^#\s*', '', line)
                    if cleaned.strip():
                        key_lines.append(cleaned)
            key_content = '\\n'.join(key_lines)
            single_line = f"LOGINSERVER_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n{key_content}\\n-----END PRIVATE KEY-----"
            # Replace the entire commented block
            fixed_content = re.sub(pattern2, single_line, content, flags=re.MULTILINE)
            env_path.write_text(fixed_content, encoding='utf-8')
            print("Fixed using alternative method")
            return True
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
