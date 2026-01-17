#!/bin/bash
# Fix get_draft_status to return proper structured content even when no session found

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup2-$(date +%Y%m%d-%H%M%S)

# Fix: When no active session, return structured content matching schema instead of null
# Find the line with "structuredContent: null" and replace with proper default object
sed -i "s/structuredContent: null/structuredContent: { session_id: '', status: 'no_active_session', current_pick_number: 0, current_round: 0, current_team_id: null, total_picks: 0 }/g" src/index.ts

echo "Fixed get_draft_status to return proper structured content"

# Rebuild and restart
cd /home/moodmnky/POKE-MNKY
docker compose up -d --build draft-pool-mcp-server

echo "Done!"
ENDSSH
