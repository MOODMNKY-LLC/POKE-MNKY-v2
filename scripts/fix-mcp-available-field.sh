#!/bin/bash
# Fix the 'available' field name issue in MCP server

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'EOF'
cd /home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server

# Create backup
cp src/index.ts src/index.ts.backup

# Fix: Replace .eq('available', true) with .eq('is_available', true)
sed -i "s/\.eq('available', true)/\.eq('is_available', true)/g" src/index.ts

# Fix: Replace .select('pokemon_name, point_value, generation, available') 
# with .select('pokemon_name, point_value, generation, is_available')
sed -i "s/\.select('pokemon_name, point_value, generation, available')/\.select('pokemon_name, point_value, generation, is_available')/g" src/index.ts

# Also fix in output schema
sed -i "s/available: z\.boolean()/is_available: z.boolean()/g" src/index.ts

echo "Fixed available field references"
echo "Rebuilding container..."

cd /home/moodmnky/POKE-MNKY
docker-compose up -d --build draft-pool-mcp-server

echo "Done!"
EOF
