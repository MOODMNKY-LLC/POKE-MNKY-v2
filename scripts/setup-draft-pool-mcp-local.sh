#!/bin/bash
# Complete setup: Export Docker image from server and import locally

set -e

echo "=== Setting up Draft Pool MCP Docker Image Locally ==="
echo ""

# Step 1: Export from remote server
echo "Step 1: Exporting image from remote server..."
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 << 'ENDSSH'
echo "Exporting Docker image..."
docker save poke-mnky-draft-pool-mcp-server:latest | gzip > /tmp/draft-pool-mcp.tar.gz
echo "✅ Image exported"
echo "Size: $(du -h /tmp/draft-pool-mcp.tar.gz | cut -f1)"
ENDSSH

# Step 2: Copy to local machine
echo ""
echo "Step 2: Copying image to local machine..."
scp moodmnky@10.3.0.119:/tmp/draft-pool-mcp.tar.gz ./draft-pool-mcp.tar.gz

# Step 3: Import into local Docker
echo ""
echo "Step 3: Importing image into local Docker..."
docker load < ./draft-pool-mcp.tar.gz

# Step 4: Verify
echo ""
echo "Step 4: Verifying image..."
if docker images | grep -q "poke-mnky-draft-pool-mcp-server"; then
  echo "✅ Image imported successfully!"
  docker images | grep "poke-mnky-draft-pool-mcp-server"
else
  echo "❌ Failed to import image"
  exit 1
fi

# Step 5: Cleanup
echo ""
echo "Step 5: Cleaning up temporary files..."
rm -f ./draft-pool-mcp.tar.gz
sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 'rm -f /tmp/draft-pool-mcp.tar.gz'

echo ""
echo "=== Setup Complete ==="
echo "✅ Docker image is now available locally"
echo "⚠️  Restart Cursor to load the new MCP configuration"
