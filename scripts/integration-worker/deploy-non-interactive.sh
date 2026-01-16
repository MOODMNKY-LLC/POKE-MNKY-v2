#!/bin/bash
# Non-Interactive Deployment Script
# Usage: SSH_PASSWORD="your-password" bash deploy-non-interactive.sh

set -e

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"
SERVER_PATH="/home/moodmnky/POKE-MNKY"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/scripts/integration-worker"

# Check for password
if [ -z "$SSH_PASSWORD" ]; then
    echo "❌ SSH_PASSWORD environment variable not set"
    echo "   Usage: SSH_PASSWORD='your-password' bash deploy-non-interactive.sh"
    exit 1
fi

echo "🚀 Deploying Integration Worker (Non-Interactive Mode)"
echo "======================================================"
echo ""

# Phase 1: File Transfer
echo "📦 Phase 1: Copying files to server..."
sshpass -p "$SSH_PASSWORD" rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '*.log' \
  --exclude '.git' \
  "$WORKER_DIR/" \
  "$SERVER_USER@$SERVER_HOST:$SERVER_PATH/scripts/integration-worker/"

if [ $? -eq 0 ]; then
    echo "✅ Files copied successfully"
else
    echo "❌ File transfer failed!"
    exit 1
fi

# Phase 2: Server Configuration and Deployment
echo ""
echo "🔧 Phase 2: Configuring and deploying on server..."

sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /home/moodmnky/POKE-MNKY

echo "📋 Checking docker-compose.yml..."
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found!"
    exit 1
fi

# Backup docker-compose.yml
if [ ! -f docker-compose.yml.backup ]; then
    cp docker-compose.yml docker-compose.yml.backup
    echo "✅ Created backup"
fi

# Check if service already exists
if grep -q "integration-worker:" docker-compose.yml; then
    echo "⚠️  integration-worker service already exists"
    echo "   Skipping service addition (verify configuration manually)"
else
    echo "📝 Adding integration-worker service..."
    cat >> docker-compose.yml << 'EOFSERVICE'

# Integration Worker Service
integration-worker:
  build:
    context: .
    dockerfile: scripts/integration-worker/Dockerfile
  container_name: poke-mnky-integration-worker
  restart: unless-stopped
  environment:
    - NODE_ENV=production
    - SHOWDOWN_SERVER_URL=http://pokemon-showdown:8000
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - DISCORD_RESULTS_CHANNEL_ID=${DISCORD_RESULTS_CHANNEL_ID:-}
  networks:
    - poke-mnky-network
  depends_on:
    - pokemon-showdown
  volumes:
    - ./logs/integration-worker:/app/logs
  healthcheck:
    test: ["CMD", "node", "-e", "process.exit(0)"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
EOFSERVICE
    echo "✅ Service added to docker-compose.yml"
fi

# Check .env file
echo "📋 Checking .env file..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found - creating template"
    touch .env
fi

# Verify required variables (warn if missing)
if ! grep -q "SUPABASE_URL=" .env; then
    echo "⚠️  WARNING: SUPABASE_URL not found in .env"
    echo "   Add: SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co"
fi

if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
    echo "⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found in .env"
    echo "   Add your service role key"
fi

echo ""
echo "📦 Building Docker image..."
docker compose build integration-worker

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Image built successfully"

echo ""
echo "🔄 Starting service..."
docker compose up -d integration-worker

if [ $? -ne 0 ]; then
    echo "❌ Service start failed!"
    exit 1
fi

echo "⏳ Waiting for service to initialize..."
sleep 10

echo ""
echo "📋 Service status:"
docker compose ps integration-worker

echo ""
echo "📝 Recent logs:"
docker compose logs --tail=50 integration-worker

ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment Complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Monitor logs: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker compose logs -f integration-worker'"
    echo "   2. Verify .env file has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    echo "   3. Check service is running: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker compose ps integration-worker'"
else
    echo ""
    echo "❌ Deployment failed! Check errors above."
    exit 1
fi
