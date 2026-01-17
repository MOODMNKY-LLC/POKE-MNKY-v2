#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Checking get_draft_status return when no session ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -B 5 -A 10 "No active draft session found"
ENDSSH
