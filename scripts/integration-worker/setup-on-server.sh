#!/bin/bash
# Setup script to run ON THE SERVER
# Adds integration-worker service to docker-compose.yml

set -e

COMPOSE_FILE="/home/moodmnky/POKE-MNKY/docker-compose.yml"
WORKER_DIR="/home/moodmnky/POKE-MNKY/scripts/integration-worker"

echo "🔧 Setting up Integration Worker on Server"
echo "=========================================="
echo ""

# Check if docker-compose.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ docker-compose.yml not found at $COMPOSE_FILE"
    exit 1
fi

# Check if integration-worker directory exists
if [ ! -d "$WORKER_DIR" ]; then
    echo "❌ Integration worker directory not found at $WORKER_DIR"
    exit 1
fi

# Backup docker-compose.yml
echo "📋 Backing up docker-compose.yml..."
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if service already exists
if grep -q "integration-worker:" "$COMPOSE_FILE"; then
    echo "⚠️  Integration worker service already exists"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 0
    fi
    # Remove existing service block (simple approach - between integration-worker: and next service or end)
    sed -i '/^  integration-worker:/,/^  [a-z]/ { /^  [a-z]/!d; }' "$COMPOSE_FILE" 2>/dev/null || true
fi

# Add integration-worker service
echo "📋 Adding integration-worker service to docker-compose.yml..."

# Create service definition
SERVICE_DEF=$(cat <<'EOF'
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
      - DISCORD_RESULTS_CHANNEL_ID=${DISCORD_RESULTS_CHANNEL_ID}
    networks:
      - poke-mnky-network
    depends_on:
      - pokemon-showdown
EOF
)

# Append to docker-compose.yml before the last line (or networks section)
if grep -q "^networks:" "$COMPOSE_FILE"; then
    # Insert before networks section
    sed -i "/^networks:/i\\$SERVICE_DEF" "$COMPOSE_FILE"
else
    # Append before last line
    sed -i "$ i\\$SERVICE_DEF" "$COMPOSE_FILE"
fi

echo "✅ Service added to docker-compose.yml"
echo ""
echo "📋 Building integration-worker..."
cd /home/moodmnky/POKE-MNKY
docker compose build integration-worker

echo ""
echo "📋 Starting integration-worker..."
docker compose up -d integration-worker

echo ""
echo "✅ Integration Worker deployed!"
echo ""
echo "📋 View logs:"
echo "   docker compose logs -f integration-worker"
echo ""
echo "📋 Check status:"
echo "   docker compose ps integration-worker"
