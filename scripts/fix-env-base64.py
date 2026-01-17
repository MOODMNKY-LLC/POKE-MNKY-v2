#!/usr/bin/env python3
"""
Fix .env file by base64 encoding private keys for Supabase CLI compatibility.
"""
import base64
import re
from pathlib import Path

def fix_env_file(env_path: Path):
    """Fix multi-line private keys by base64 encoding them."""
    backup_path = env_path.with_suffix('.env.backup3')
    
    # Read the file
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
            
            # Get the full key content
            full_key = '\n'.join(key_lines)
            # Extract just the key content (between BEGIN and END, including headers)
            key_match = re.search(r'-----BEGIN PRIVATE KEY-----\n(.*?)\n-----END PRIVATE KEY-----', full_key, re.DOTALL)
            if key_match:
                key_content = key_match.group(1)
                # Base64 encode the entire key (including headers)
                full_key_content = f"-----BEGIN PRIVATE KEY-----\n{key_content}\n-----END PRIVATE KEY-----"
                key_base64 = base64.b64encode(full_key_content.encode('utf-8')).decode('utf-8')
                # Create single-line version with base64
                single_line = f"{var_name}_BASE64={key_base64}"
                # Also keep original for reference (commented out)
                output_lines.append(f"# Original {var_name} (base64 encoded above):")
                output_lines.append(f"# {full_key.replace(chr(10), chr(10) + '# ')}")
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
        print(f"Fixed private keys in {env_path} (base64 encoded)")
        print("Note: Your app code will need to decode these keys using base64.b64decode()")
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
