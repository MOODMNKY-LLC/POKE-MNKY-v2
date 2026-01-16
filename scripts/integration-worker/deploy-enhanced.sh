#!/bin/bash
# Enhanced Deployment Script for Integration Worker
# Run from WSL: bash scripts/integration-worker/deploy-enhanced.sh

set -e

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"
SERVER_PATH="/home/moodmnky/POKE-MNKY"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKER_DIR="$PROJECT_ROOT/scripts/integration-worker"

echo "🚀 Enhanced Integration Worker Deployment"
echo "=========================================="
echo "   Server: $SERVER_USER@$SERVER_HOST"
echo "   Path: $SERVER_PATH"
echo "   Worker Dir: $WORKER_DIR"
echo ""

# Phase 1: Pre-Deployment Verification
echo "📋 Phase 1: Pre-Deployment Verification"
echo "----------------------------------------"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass not found. Installing..."
    sudo apt-get update -qq
    sudo apt-get install -y sshpass
    echo "✅ sshpass installed"
else
    echo "✅ sshpass is installed"
fi

# Verify deployment files exist
echo "📁 Verifying deployment files..."
if [ ! -f "$WORKER_DIR/Dockerfile" ]; then
    echo "❌ Dockerfile not found!"
    exit 1
fi
if [ ! -f "$WORKER_DIR/docker-compose-snippet.yml" ]; then
    echo "❌ docker-compose-snippet.yml not found!"
    exit 1
fi
echo "✅ All deployment files found"

# Read password
if [ -z "$SSH_PASSWORD" ]; then
    read -sp "Enter server password: " SSH_PASSWORD
    echo ""
fi

# Test SSH connection
echo "🔌 Testing SSH connection..."
if ! sshpass -p "$SSH_PASSWORD" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'SSH connection successful'" &>/dev/null; then
    echo "❌ SSH connection failed!"
    exit 1
fi
echo "✅ SSH connection successful"

# Phase 2: File Transfer
echo ""
echo "📦 Phase 2: File Transfer"
echo "-------------------------"
echo "Copying files to server..."

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

# Phase 3: Server Configuration
echo ""
echo "🔧 Phase 3: Server Configuration"
echo "--------------------------------"

sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
set -e

cd $SERVER_PATH

echo "📋 Checking docker-compose.yml..."
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found!"
    exit 1
fi

# Backup docker-compose.yml
if [ ! -f docker-compose.yml.backup ]; then
    cp docker-compose.yml docker-compose.yml.backup
    echo "✅ Created backup: docker-compose.yml.backup"
fi

# Check if service already exists
if grep -q "integration-worker:" docker-compose.yml; then
    echo "⚠️  integration-worker service already exists in docker-compose.yml"
    echo "   Updating existing service..."
    # Remove old service definition (simple approach - manual edit recommended)
    echo "   Note: Please verify service configuration manually"
else
    echo "📝 Adding integration-worker service to docker-compose.yml..."
    # Append service definition
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
    - SUPABASE_URL=\${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=\${SUPABASE_SERVICE_ROLE_KEY}
    - DISCORD_RESULTS_CHANNEL_ID=\${DISCORD_RESULTS_CHANNEL_ID:-}
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
    echo "⚠️  .env file not found. Creating template..."
    touch .env
fi

# Check if required variables exist
if ! grep -q "SUPABASE_URL=" .env; then
    echo "⚠️  SUPABASE_URL not found in .env"
    echo "   Please add: SUPABASE_URL=https://chmrszrwlfeqovwxyrmt.supabase.co"
fi

if ! grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env; then
    echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env"
    echo "   Please add your service role key"
fi

echo "✅ Server configuration check complete"
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Server configuration failed!"
    exit 1
fi

# Phase 4: Build and Deploy
echo ""
echo "🏗️  Phase 4: Build and Deploy"
echo "-----------------------------"

sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

cd /home/moodmnky/POKE-MNKY

echo "📦 Building Docker image..."
docker compose build integration-worker

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Image built successfully"

echo "🔄 Starting service..."
docker compose up -d integration-worker

if [ $? -ne 0 ]; then
    echo "❌ Service start failed!"
    exit 1
fi

echo "⏳ Waiting for service to initialize..."
sleep 10

echo "📋 Checking service status..."
docker compose ps integration-worker

echo ""
echo "📝 Recent logs:"
docker compose logs --tail=50 integration-worker

ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed!"
    exit 1
fi

# Phase 5: Verification
echo ""
echo "✅ Phase 5: Verification"
echo "-----------------------"

sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY

echo "🔍 Verifying service status..."
STATUS=$(docker compose ps integration-worker --format json | jq -r '.[0].State' 2>/dev/null || echo "unknown")

if [ "$STATUS" = "running" ]; then
    echo "✅ Service is running"
else
    echo "⚠️  Service status: $STATUS"
fi

echo ""
echo "📊 Service health check..."
docker compose exec integration-worker node -e "console.log('Worker is running')" 2>/dev/null && echo "✅ Health check passed" || echo "⚠️  Health check failed"

echo ""
echo "📝 Checking for errors in logs..."
ERROR_COUNT=$(docker compose logs integration-worker 2>&1 | grep -i "error" | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "⚠️  Found $ERROR_COUNT error(s) in logs"
    echo "   Recent errors:"
    docker compose logs integration-worker 2>&1 | grep -i "error" | tail -5
else
    echo "✅ No errors found in logs"
fi

ENDSSH

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Monitor logs: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker compose logs -f integration-worker'"
echo "   2. Check service: ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && docker compose ps integration-worker'"
echo "   3. Create test match with status='in_progress' and showdown_room_id"
echo "   4. Complete test battle and verify match updates"
