#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Session Reuse Logic ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | awk '/if.*sessionId.*sessions.has/,/}/ {print NR": "$0}' | head -30

echo ""
echo "=== Session Creation Logic ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | awk '/Created new session/,/}/ {print NR": "$0}' | head -20

echo ""
echo "=== MCP Session ID Header Handling ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 5 -B 5 "mcp-session-id\|MCP-Session-Id" | head -30
ENDSSH
