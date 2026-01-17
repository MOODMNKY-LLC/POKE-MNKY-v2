#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Recent Logs (excluding session creation) ==="
docker logs poke-mnky-draft-pool-mcp-server --tail 500 2>&1 | grep -v "Created new session" | tail -50

echo ""
echo "=== Checking for Errors ==="
docker logs poke-mnky-draft-pool-mcp-server 2>&1 | grep -i "error\|exception\|crash\|failed" | tail -30

echo ""
echo "=== Container Status ==="
docker ps | grep draft-pool-mcp-server

echo ""
echo "=== Memory Usage ==="
docker stats poke-mnky-draft-pool-mcp-server --no-stream --format "table {{.MemUsage}}\t{{.MemPerc}}"
ENDSSH
