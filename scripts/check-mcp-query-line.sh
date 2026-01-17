#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== get_available_pokemon query line ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -B 2 -A 10 "\.eq.*available\|\.eq.*is_available" | head -15

echo ""
echo "=== get_draft_status current_pick usage ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -B 2 -A 2 "current_pick"
ENDSSH
