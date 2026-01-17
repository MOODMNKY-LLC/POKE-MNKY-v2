#!/bin/bash
# Test the MCP tool directly via curl
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "Testing MCP tool with point_range [20, 20]..."
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_available_pokemon",
      "arguments": {
        "point_range": [20, 20],
        "limit": 10
      }
    }
  }' | jq .
ENDSSH
