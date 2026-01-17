#!/bin/bash
# Final fix for get_draft_status using Python

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup5-$(date +%Y%m%d-%H%M%S)

# Use Python to fix
python3 << 'PYTHON'
import re

with open('src/index.ts', 'r') as f:
    content = f.read()

# Fix output schema
content = re.sub(
    r'current_team_id: z\.string\(\)\.optional\(\)',
    r'current_team_id: z.string().nullable().optional()',
    content
)

# Fix return statements - replace null with empty string
content = re.sub(
    r"current_team_id: null",
    r"current_team_id: ''",
    content
)

content = re.sub(
    r"current_team_id: session\.current_team_id \|\| null",
    r"current_team_id: session.current_team_id || ''",
    content
)

with open('src/index.ts', 'w') as f:
    f.write(content)

print("Fixed!")
PYTHON

# Rebuild
cd /home/moodmnky/POKE-MNKY
docker compose up -d --build draft-pool-mcp-server

echo "Done!"
ENDSSH
