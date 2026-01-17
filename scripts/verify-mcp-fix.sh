#!/bin/bash
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
docker exec poke-mnky-draft-pool-mcp-server cat /app/src/index.ts | grep -A 15 "get_available_pokemon" | head -25
ENDSSH
