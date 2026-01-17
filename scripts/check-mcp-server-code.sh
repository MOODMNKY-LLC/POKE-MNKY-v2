#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Checking get_available_pokemon tool ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 20 "get_available_pokemon" | grep -E "(available|is_available)" | head -5

echo ""
echo "=== Checking get_draft_status tool ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 30 "get_draft_status" | head -35
ENDSSH
