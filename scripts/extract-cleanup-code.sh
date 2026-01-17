#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Extracting Cleanup Code ==="
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts > /tmp/mcp-server-code.ts

# Find cleanup interval
echo "=== Cleanup Interval Code ==="
grep -n "setInterval" /tmp/mcp-server-code.ts | head -3

# Extract cleanup function
echo ""
echo "=== Full Cleanup Function ==="
awk '/Cleanup inactive sessions/,/}, CLEANUP_INTERVAL/ {print NR": "$0}' /tmp/mcp-server-code.ts | head -40

# Check if cleanup is actually being called
echo ""
echo "=== Checking for Cleanup Logs in Code ==="
grep -n "Session cleanup\|Cleaned up\|removed.*sessions" /tmp/mcp-server-code.ts

# Check session map updates
echo ""
echo "=== Session lastAccess Updates ==="
grep -n "lastAccess.*Date.now\|lastAccess.*=" /tmp/mcp-server-code.ts | head -10

rm /tmp/mcp-server-code.ts
ENDSSH
