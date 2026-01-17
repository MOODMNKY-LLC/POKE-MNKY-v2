#!/bin/bash
# Export Docker image from remote server for local use

sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "=== Exporting Draft Pool MCP Docker Image ==="
docker save poke-mnky-draft-pool-mcp-server:latest | gzip > /tmp/draft-pool-mcp.tar.gz
echo "✅ Image exported to /tmp/draft-pool-mcp.tar.gz"
echo "Size: $(du -h /tmp/draft-pool-mcp.tar.gz | cut -f1)"
ENDSSH

echo ""
echo "To import locally, run:"
echo "  scp moodmnky@10.3.0.119:/tmp/draft-pool-mcp.tar.gz ."
echo "  docker load < draft-pool-mcp.tar.gz"
