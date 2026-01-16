#!/bin/bash
# Integration Worker Testing Script
# Run from WSL: bash scripts/integration-worker/test-worker.sh

set -e

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"
SERVER_PATH="/home/moodmnky/POKE-MNKY"

echo "🧪 Integration Worker Testing Suite"
echo "===================================="
echo ""

# Check if password is set
if [ -z "$SSH_PASSWORD" ]; then
    read -sp "Enter server password: " SSH_PASSWORD
    echo ""
fi

# Phase 1: Basic Connectivity
echo "📋 Phase 1: Basic Connectivity Tests"
echo "-----------------------------------"

echo "1.1 Checking service status..."
sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY
echo "Service Status:"
docker compose ps integration-worker
echo ""
ENDSSH

echo "1.2 Checking recent logs..."
sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY
echo "Recent Logs (last 20 lines):"
docker compose logs --tail=20 integration-worker
echo ""
ENDSSH

echo "1.3 Verifying WebSocket connection..."
sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY
echo "WebSocket Status:"
docker compose logs integration-worker | grep -E "(ShowdownMonitor|Connected)" | tail -3
echo ""
ENDSSH

echo "1.4 Verifying database connection..."
sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY
echo "Room Manager Status:"
docker compose logs integration-worker | grep -E "(RoomManager|Synced)" | tail -3
echo ""
ENDSSH

echo "✅ Phase 1 Complete"
echo ""
echo "📋 Phase 2: Room Polling Test"
echo "-----------------------------"
echo ""
echo "Next steps:"
echo "1. Create a test match in Supabase with:"
echo "   - status = 'in_progress'"
echo "   - showdown_room_id = 'battle-gen9avgatbest-test123'"
echo "   - team1_id and team2_id (use existing teams)"
echo ""
echo "2. Wait 35 seconds for polling cycle"
echo ""
echo "3. Run: bash scripts/integration-worker/test-room-subscription.sh"
echo ""
