/**
 * Debug Room Creation Issue
 * Checks WebSocket messages and room subscription status
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/debug-room-issue.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'http://pokemon-showdown:8000';
const ROOM_ID = 'battle-gen9avgatbest-test123';

async function debugRoomIssue() {
  console.log('🔍 Debugging Room Subscription Issue...\n');
  console.log(`Server: ${SHOWDOWN_SERVER_URL}`);
  console.log(`Room ID: ${ROOM_ID}\n`);

  // Convert HTTP/HTTPS URL to WebSocket URL
  const wsUrl = SHOWDOWN_SERVER_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket';

  console.log(`Connecting to: ${wsUrl}\n`);

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      console.log('✅ Connected to Showdown server\n');
      
      // Subscribe to room
      console.log(`Attempting to subscribe to: ${ROOM_ID}`);
      ws.send(`|/join ${ROOM_ID}`);
      
      // Also try without "battle-" prefix
      const altRoomId = ROOM_ID.replace(/^battle-/, '');
      console.log(`Also trying alternative format: ${altRoomId}`);
      ws.send(`|/join ${altRoomId}`);
    });

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      console.log(`📨 Received: ${message}`);
      
      // Check for error messages
      if (message.includes('error') || message.includes('invalid') || message.includes('not found')) {
        console.log(`\n⚠️  ERROR DETECTED in message`);
      }
      
      // Check for room join confirmation
      if (message.includes('|init|') || message.includes('|users|')) {
        console.log(`\n✅ Room join successful!`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(`\n🔌 WebSocket closed: ${code} - ${reason.toString()}`);
      resolve();
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏱️  Timeout reached');
      ws.close();
      resolve();
    }, 10000);
  });
}

debugRoomIssue().catch(console.error);
