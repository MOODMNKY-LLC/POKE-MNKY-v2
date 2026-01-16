/**
 * Test Room Subscription to Verify Room is Active
 * Checks if room gen9randombattle-1 is receiving WebSocket messages
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/test-room-subscription.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'http://pokemon-showdown:8000';
const ROOM_ID = 'gen9randombattle-1';

async function testRoomSubscription() {
  console.log('🔍 Testing Room Subscription...\n');
  console.log(`Room ID: ${ROOM_ID}\n`);

  // Convert HTTP/HTTPS URL to WebSocket URL
  const wsUrl = SHOWDOWN_SERVER_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket';

  console.log(`Connecting to: ${wsUrl}\n`);

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(wsUrl);
    let roomJoined = false;
    let messagesReceived = 0;

    ws.on('open', () => {
      console.log('✅ Connected to Showdown server\n');
      console.log(`Subscribing to room: ${ROOM_ID}`);
      ws.send(`|/join ${ROOM_ID}`);
    });

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      const lines = message.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split('|');
        const roomPrefix = parts[0];

        // Check if message is from our room
        if (roomPrefix === `>${ROOM_ID}` || roomPrefix.startsWith(`>${ROOM_ID}`)) {
          messagesReceived++;
          console.log(`📨 Message from room: ${line.substring(0, 100)}...`);
          
          // Check for room init
          if (parts[1] === 'init') {
            roomJoined = true;
            console.log(`\n✅ Room joined successfully!`);
          }
        }

        // Check for errors
        if (parts[1] === 'noinit') {
          if (parts[2] === 'nonexistent') {
            console.log(`\n❌ Room doesn't exist: ${roomPrefix}`);
          } else {
            console.log(`\n⚠️  Room init failed: ${parts.slice(2).join('|')}`);
          }
        }

        // Check for battle events
        if (parts[1] === 'win' || parts[1] === 'tie' || parts[1] === 'draw') {
          console.log(`\n🎮 Battle completion detected: ${parts[1]}`);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log(`\n🔌 WebSocket closed`);
      console.log(`\n📊 Summary:`);
      console.log(`   Room joined: ${roomJoined ? '✅ Yes' : '❌ No'}`);
      console.log(`   Messages received: ${messagesReceived}`);
      
      if (!roomJoined && messagesReceived === 0) {
        console.log(`\n💡 Room might be inactive or format might be different`);
        console.log(`   Try checking if battle is actually happening in the room`);
      }
      
      resolve();
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      ws.close();
      resolve();
    }, 15000);
  });
}

testRoomSubscription().catch(console.error);
