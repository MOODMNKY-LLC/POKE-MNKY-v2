#!/bin/bash
# Properly fix get_draft_status return statement

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup3-$(date +%Y%m%d-%H%M%S)

# Use Python to properly fix the return statement
python3 << 'PYTHON'
import re

with open('src/index.ts', 'r') as f:
    content = f.read()

# Fix: Replace the return statement when no active session
# Find the pattern and replace with proper structured content
pattern = r"return \{\s*content: \[\{ type: 'text', text: 'No active draft session found' \}\],\s*structuredContent: null,\s*\};"

replacement = """return {
        content: [{ type: 'text', text: 'No active draft session found' }],
        structuredContent: {
          session_id: '',
          status: 'no_active_session',
          current_pick_number: 0,
          current_round: 0,
          current_team_id: null,
          total_picks: 0,
        },
      };"""

content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

with open('src/index.ts', 'w') as f:
    f.write(content)

print("Fixed get_draft_status return statement")
PYTHON

# Rebuild
cd /home/moodmnky/POKE-MNKY
docker compose up -d --build draft-pool-mcp-server

echo "Done!"
ENDSSH
