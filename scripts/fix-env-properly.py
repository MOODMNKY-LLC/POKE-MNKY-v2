#!/usr/bin/env python3
"""
Properly fix .env file for Supabase CLI compatibility.
Reads the file, extracts private keys, and converts them to single-line format.
"""
import re
from pathlib import Path

def fix_env_file(env_path: Path):
    """Fix multi-line private keys in .env file."""
    backup_path = env_path.with_suffix('.env.backup2')
    
    # Read the file as raw text
    content = env_path.read_text(encoding='utf-8')
    
    # Create backup
    backup_path.write_text(content, encoding='utf-8')
    print(f"Created backup: {backup_path}")
    
    lines = content.split('\n')
    output_lines = []
    i = 0
    changed = False
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is a private key variable start
        if re.match(r'^([A-Z_]+_PRIVATE_KEY)=-----BEGIN PRIVATE KEY-----', line):
            var_name = line.split('=')[0]
            # Collect all lines until END PRIVATE KEY
            key_lines = [line]
            i += 1
            while i < len(lines) and '-----END PRIVATE KEY-----' not in lines[i]:
                key_lines.append(lines[i])
                i += 1
            if i < len(lines):
                key_lines.append(lines[i])  # Add the END line
            
            # Combine into single line with \n escapes
            full_key = '\n'.join(key_lines)
            # Extract just the key content (between BEGIN and END)
            key_match = re.search(r'-----BEGIN PRIVATE KEY-----\n(.*?)\n-----END PRIVATE KEY-----', full_key, re.DOTALL)
            if key_match:
                key_content = key_match.group(1)
                # Replace actual newlines with \n escape sequences
                key_content_escaped = key_content.replace('\n', '\\n')
                # Create single-line version
                single_line = f"{var_name}=-----BEGIN PRIVATE KEY-----\\n{key_content_escaped}\\n-----END PRIVATE KEY-----"
                output_lines.append(single_line)
                changed = True
            else:
                # Fallback: just add the lines as-is
                output_lines.extend(key_lines)
        else:
            output_lines.append(line)
        
        i += 1
    
    if changed:
        # Write back
        env_path.write_text('\n'.join(output_lines), encoding='utf-8')
        print(f"Fixed private keys in {env_path}")
        return True
    else:
        print("No changes needed")
        return False

if __name__ == '__main__':
    env_file = Path('.env')
    if not env_file.exists():
        print(f"Error: {env_file} not found")
        exit(1)
    
    try:
        fix_env_file(env_file)
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
