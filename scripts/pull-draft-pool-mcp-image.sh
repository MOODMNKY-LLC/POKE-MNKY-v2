#!/bin/bash
# Pull or build the Draft Pool MCP Docker image locally

echo "=== Checking for Draft Pool MCP Docker Image ==="

# Check if image exists locally
if docker images | grep -q "poke-mnky-draft-pool-mcp-server"; then
  echo "✅ Image exists locally"
  docker images | grep "poke-mnky-draft-pool-mcp-server"
else
  echo "❌ Image not found locally"
  echo ""
  echo "Options:"
  echo "1. Pull from remote server (if accessible)"
  echo "2. Build locally from source"
  echo ""
  echo "To pull from remote server, you'll need to:"
  echo "  - Export image from server: docker save poke-mnky-draft-pool-mcp-server:latest | gzip > draft-pool-mcp.tar.gz"
  echo "  - Copy to local machine"
  echo "  - Import: docker load < draft-pool-mcp.tar.gz"
  echo ""
  echo "Or build locally from: tools/mcp-servers/draft-pool-server/"
fi
