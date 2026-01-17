#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== get_draft_status output schema ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 15 "outputSchema:" | grep -A 10 "get_draft_status" | head -20
ENDSSH
