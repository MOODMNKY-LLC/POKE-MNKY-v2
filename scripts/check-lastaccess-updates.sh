#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Checking lastAccess Updates ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 5 -B 5 "lastAccess" | head -40

echo ""
echo "=== Checking Session Creation ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 15 "Created new session" | head -30

echo ""
echo "=== Checking Request Handlers ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 10 "app.post\|app.use" | head -30
ENDSSH
