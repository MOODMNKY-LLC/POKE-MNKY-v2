#!/bin/bash
# Test Room Subscription
# Run after creating test match: bash scripts/integration-worker/test-room-subscription.sh

set -e

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"

if [ -z "$SSH_PASSWORD" ]; then
    read -sp "Enter server password: " SSH_PASSWORD
    echo ""
fi

echo "🔍 Checking Room Subscription Status"
echo "===================================="
echo ""

sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY

echo "Recent Room Manager logs:"
docker compose logs --tail=50 integration-worker | grep -E "(RoomManager|Synced|Subscribed|Unsubscribed)" | tail -10

echo ""
echo "Current active subscriptions (if any):"
docker compose logs integration-worker | grep "Subscribed to room" | tail -5

echo ""
echo "✅ Check above for 'Synced 1 active rooms' and 'Subscribed to room: battle-gen9avgatbest-test123'"
ENDSSH
