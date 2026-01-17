#!/bin/bash
# Fix Draft Pool MCP Server Issues
# Fixes:
# 1. get_available_pokemon: Change 'available' to 'is_available' (3 places)
# 2. get_draft_status: Change 'current_pick' to 'current_pick_number'

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup-$(date +%Y%m%d-%H%M%S)
echo "Created backup"

# Fix 1: get_available_pokemon - Change 'available' to 'is_available'
# Fix in select statement
sed -i "s/\.select('pokemon_name, point_value, generation, available')/\.select('pokemon_name, point_value, generation, is_available')/g" src/index.ts

# Fix in eq filter
sed -i "s/\.eq('available', true)/\.eq('is_available', true)/g" src/index.ts

# Fix in output schema
sed -i "s/available: z\.boolean()/is_available: z.boolean()/g" src/index.ts

# Fix 2: get_draft_status - Change 'current_pick' to 'current_pick_number'
# Fix in output schema
sed -i "s/current_pick: z\.number()/current_pick_number: z.number()/g" src/index.ts

# Fix in return statement
sed -i "s/current_pick: session\.current_pick || 0/current_pick_number: session.current_pick_number || 0/g" src/index.ts

echo "Applied fixes:"
echo "1. Changed 'available' to 'is_available' in get_available_pokemon"
echo "2. Changed 'current_pick' to 'current_pick_number' in get_draft_status"

# Rebuild and restart container
cd /home/moodmnky/POKE-MNKY
echo "Rebuilding container..."
docker compose up -d --build draft-pool-mcp-server

echo "Done! Container rebuilt and restarted"
ENDSSH
