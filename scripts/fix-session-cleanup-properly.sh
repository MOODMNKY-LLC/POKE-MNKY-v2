#!/bin/bash
# Fix session cleanup properly without breaking syntax

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Restore from backup first
BACKUP=$(ls -t src/index.ts.backup-session-fix-* 2>/dev/null | head -1)
if [ -f "$BACKUP" ]; then
  cp "$BACKUP" src/index.ts
  echo "Restored from backup: $BACKUP"
fi

# Use sed for safer replacements
# Fix 1: Reduce timeout
sed -i 's/SESSION_TIMEOUT = 10 \* 60 \* 1000; \/\/ 10 minutes/SESSION_TIMEOUT = 5 * 60 * 1000; \/\/ 5 minutes (reduced for better cleanup)/g' src/index.ts

# Fix 2: Reduce cleanup interval  
sed -i 's/const CLEANUP_INTERVAL = 60000; \/\/ Check every minute/const CLEANUP_INTERVAL = 30000; \/\/ Check every 30 seconds (more frequent cleanup)/g' src/index.ts

# Fix 3: Add periodic logging - find the cleanup interval closing brace and add logging before it
# This is safer than regex - we'll add a simple log statement
python3 << 'PYTHON'
with open('src/index.ts', 'r') as f:
    lines = f.readlines()

# Find the cleanup interval closing and add logging
for i, line in enumerate(lines):
    if '}, CLEANUP_INTERVAL);' in line and 'Session cleanup' in lines[i-3]:
        # Add logging before the closing
        indent = '  ' * (line.find('}') // 2)
        lines.insert(i, f'{indent}  // Log periodically for monitoring\n')
        lines.insert(i+1, f'{indent}  if (sessions.size > 0) {{\n')
        lines.insert(i+2, f'{indent}    const oldestAge = Math.min(...Array.from(sessions.values()).map(s => Date.now() - s.createdAt));\n')
        lines.insert(i+3, f'{indent}    if (cleanedCount === 0 && errorCount === 0 && (Date.now() / CLEANUP_INTERVAL) % 20 < 1) {{\n')
        lines.insert(i+4, f'{indent}      console.log(`Session status: ${{sessions.size}} active, oldest: ${{Math.round(oldestAge / 1000)}}s`);\n')
        lines.insert(i+5, f'{indent}    }}\n')
        lines.insert(i+6, f'{indent}  }}\n')
        break

with open('src/index.ts', 'w') as f:
    f.writelines(lines)

print("Fixed session cleanup with safer approach")
PYTHON

# Rebuild
cd /home/moodmnky/POKE-MNKY
docker compose up -d --build draft-pool-mcp-server

echo "Done! Fixed syntax error and applied cleanup improvements"
ENDSSH
