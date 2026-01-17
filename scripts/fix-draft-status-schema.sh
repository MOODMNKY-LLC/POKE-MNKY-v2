#!/bin/bash
# Fix get_draft_status output schema to accept null for optional fields

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup4-$(date +%Y%m%d-%H%M%S)

# Fix: Make current_team_id nullable in output schema
sed -i "s/current_team_id: z\.string()\.optional()/current_team_id: z.string().nullable().optional()/g" src/index.ts

# Also fix return statements to use empty string instead of null for optional string fields
sed -i "s/current_team_id: null/current_team_id: ''/g" src/index.ts
sed -i "s/current_team_id: session\.current_team_id || null/current_team_id: session.current_team_id || ''/g" src/index.ts

echo "Fixed output schema and return statements"

# Rebuild
cd /home/moodmnky/POKE-MNKY
docker compose up -d --build draft-pool-mcp-server

echo "Done!"
ENDSSH
