#!/bin/bash
# Deployment script for Integration Worker
# Run from WSL: ./scripts/integration-worker/deploy-to-server.sh

set -e

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"
SERVER_PATH="/home/moodmnky/POKE-MNKY"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/scripts/integration-worker"

echo "🚀 Deploying Integration Worker to server..."
echo "   Server: $SERVER_USER@$SERVER_HOST"
echo "   Path: $SERVER_PATH"
echo ""

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y sshpass
fi

# Read password (or use SSH key if available)
if [ -z "$SSH_PASSWORD" ]; then
    read -sp "Enter server password: " SSH_PASSWORD
    echo ""
fi

# Copy files to server
echo "📦 Copying files to server..."
sshpass -p "$SSH_PASSWORD" rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  "$WORKER_DIR/" \
  "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/scripts/integration-worker/"

# Deploy on server
echo ""
echo "🔧 Building and starting on server..."
sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /home/moodmnky/POKE-MNKY

echo "📋 Checking docker-compose.yml..."
if ! grep -q "integration-worker:" docker-compose.yml; then
    echo "⚠️  integration-worker service not found in docker-compose.yml"
    echo "   Please add it manually (see DEPLOYMENT-SERVER.md)"
    exit 1
fi

echo "📦 Building image..."
docker compose build integration-worker

echo "🔄 Starting service..."
docker compose up -d integration-worker

echo "⏳ Waiting for service to start..."
sleep 5

echo "📋 Checking status..."
docker compose ps integration-worker

echo ""
echo "📝 Recent logs:"
docker compose logs --tail=30 integration-worker

echo ""
echo "✅ Deployment complete!"
ENDSSH

echo ""
echo "✅ Local deployment script complete!"
echo ""
echo "📝 Next steps:"
echo "   1. SSH into server: ssh $SERVER_USER@$SERVER_HOST"
echo "   2. View logs: docker compose logs -f integration-worker"
echo "   3. Monitor for errors and verify functionality"
