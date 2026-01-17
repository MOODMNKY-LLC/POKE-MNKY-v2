#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Checking Session Management Code ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 10 "sessions\|Session" | head -50

echo ""
echo "=== Checking for Cleanup/Timeout Logic ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -i "cleanup\|timeout\|expire\|remove" | head -20

echo ""
echo "=== Checking Session Map/Storage ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 5 "Map\|Map<\|new Map" | head -20
ENDSSH
