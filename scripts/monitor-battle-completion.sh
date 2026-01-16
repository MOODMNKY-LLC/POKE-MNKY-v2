#!/bin/bash
# Monitor Integration Worker for Battle Completion
# Run from WSL: bash scripts/monitor-battle-completion.sh

SERVER_USER="moodmnky"
SERVER_HOST="10.3.0.119"
ROOM_ID="gen9randombattle-1"

if [ -z "$SSH_PASSWORD" ]; then
    read -sp "Enter server password: " SSH_PASSWORD
    echo ""
fi

echo "🔍 Monitoring Integration Worker for Battle Completion"
echo "======================================================"
echo ""
echo "Room ID: $ROOM_ID"
echo "Watching for completion events..."
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

sshpass -p "$SSH_PASSWORD" ssh "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
cd /home/moodmnky/POKE-MNKY
docker compose logs -f integration-worker | grep --line-buffered -E "(Battle completed|Processing battle|Parsed replay|Updated match|Updated standings|Discord)"
ENDSSH
