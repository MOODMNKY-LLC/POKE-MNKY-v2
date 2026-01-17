#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== get_available_pokemon return statement ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 50 "async ({ point_range" | grep -A 30 "return {" | head -35

echo ""
echo "=== get_draft_status return statement ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 80 "async ({ season_id })" | grep -A 40 "return {" | head -45
ENDSSH
