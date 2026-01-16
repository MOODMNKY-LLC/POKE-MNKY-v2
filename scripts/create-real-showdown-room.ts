/**
 * Create Real Showdown Room by Starting a Battle
 * Uses Showdown's challenge system to create an actual battle room
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/create-real-showdown-room.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'http://pokemon-showdown:8000';

async function createRealShowdownRoom() {
  console.log('🚀 Creating Real Showdown Battle Room...\n');
  console.log(`Server: ${SHOWDOWN_SERVER_URL}\n`);

  // Convert HTTP/HTTPS URL to WebSocket URL
  const wsUrl = SHOWDOWN_SERVER_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket';

  console.log(`Connecting to: ${wsUrl}\n`);

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let roomId: string | null = null;
    let challengeStr: string | null = null;

    ws.on('open', () => {
      console.log('✅ Connected to Showdown server\n');
    });

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      const lines = message.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split('|');

        // Get challenge string for authentication
        if (parts[1] === 'challstr') {
          challengeStr = parts.slice(2).join('|');
          console.log('📋 Challenge string received');
          console.log('   Note: Authentication would be needed to create challenges');
          console.log('   For testing, you need to manually create a battle room\n');
        }

        // Check for room creation
        if (parts[0].startsWith('>') && parts[0].includes('battle')) {
          const detectedRoomId = parts[0].substring(1); // Remove '>'
          if (!roomId && detectedRoomId.startsWith('battle-')) {
            roomId = detectedRoomId;
            console.log(`✅ Room detected: ${roomId}`);
          }
        }

        // Check for room init
        if (parts[1] === 'init' && parts[0].startsWith('>')) {
          const detectedRoomId = parts[0].substring(1);
          roomId = detectedRoomId;
          console.log(`✅ Room initialized: ${roomId}`);
        }

        // Check for errors
        if (parts[1] === 'noinit' && parts[2] === 'nonexistent') {
          console.log(`❌ Room doesn't exist: ${parts[0]}`);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    ws.on('close', () => {
      console.log('\n🔌 WebSocket closed');
      if (roomId) {
        console.log(`\n✅ Room ID to use: ${roomId}`);
        console.log(`\n📋 Next Steps:`);
        console.log(`   1. Update match record with room ID: ${roomId}`);
        console.log(`   2. Integration Worker will detect it on next poll`);
        console.log(`   3. Complete battle in room: ${roomId}`);
      } else {
        console.log('\n⚠️  No room was created');
        console.log('\n💡 To create a room:');
        console.log('   1. Go to https://aab-play.moodmnky.com');
        console.log('   2. Challenge another player or accept a challenge');
        console.log('   3. Start the battle (this creates the room)');
        console.log('   4. Note the room ID from the URL');
        console.log('   5. Update the match record with that room ID');
      }
      resolve();
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      ws.close();
      resolve();
    }, 5000);
  });
}

createRealShowdownRoom().catch(console.error);
