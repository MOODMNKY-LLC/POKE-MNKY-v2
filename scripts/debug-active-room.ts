/**
 * Debug Active Room - Check if room is actually active and receiving messages
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/debug-active-room.ts <room-id>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'http://pokemon-showdown:8000';
const roomIdFromUrl = process.argv[2] || 'gen9randombattle-1';

// Try ALL possible formats
const formatsToTry = [
  roomIdFromUrl,                                    // gen9randombattle-1
  `battle-${roomIdFromUrl}`,                       // battle-gen9randombattle-1
  roomIdFromUrl.replace(/^battle-/, ''),          // Remove battle- if present
];

async function debugActiveRoom() {
  console.log('🔍 Debugging Active Room...\n');
  console.log(`Room ID from URL: ${roomIdFromUrl}`);
  console.log(`Testing formats: ${formatsToTry.join(', ')}\n`);

  const wsUrl = SHOWDOWN_SERVER_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket';

  console.log(`Connecting to: ${wsUrl}\n`);

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(wsUrl);
    let messagesReceived = 0;
    const roomMessages: string[] = [];

    ws.on('open', () => {
      console.log('✅ Connected to Showdown server\n');
      
      // Try each format
      formatsToTry.forEach((format, index) => {
        setTimeout(() => {
          console.log(`\n📤 Attempting to join: ${format}`);
          ws.send(`|/join ${format}`);
        }, index * 2000);
      });
    });

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      messagesReceived++;
      
      // Log ALL messages to see what we're getting
      const lines = message.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split('|');
        const roomPrefix = parts[0];
        
        // Check if this message is related to any of our test rooms
        const isRelevant = formatsToTry.some(format => 
          roomPrefix.includes(format) || 
          roomPrefix === `>${format}` ||
          line.includes(format)
        );
        
        if (isRelevant || parts[1] === 'init' || parts[1] === 'noinit' || parts[1] === 'users') {
          console.log(`📨 [${messagesReceived}] ${line.substring(0, 150)}`);
          roomMessages.push(line);
          
          // Check for room init (room exists)
          if (parts[1] === 'init') {
            const detectedRoom = roomPrefix.substring(1);
            console.log(`\n✅ ROOM EXISTS: ${detectedRoom}`);
            console.log(`   This is the correct format to use!`);
          }
          
          // Check for room doesn't exist
          if (parts[1] === 'noinit' && parts[2] === 'nonexistent') {
            const testedRoom = roomPrefix.substring(1);
            console.log(`\n❌ Room doesn't exist: ${testedRoom}`);
          }
          
          // Check for users list (room is active)
          if (parts[1] === 'users') {
            console.log(`\n👥 Room has users (ACTIVE): ${roomPrefix.substring(1)}`);
            console.log(`   Users: ${parts.slice(2).join(', ')}`);
          }
          
          // Check for battle events
          if (parts[1] === 'player' || parts[1] === 'teamsize' || parts[1] === 'gametype') {
            console.log(`\n🎮 Battle activity detected in: ${roomPrefix.substring(1)}`);
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log(`\n🔌 WebSocket closed`);
      console.log(`\n📊 Summary:`);
      console.log(`   Total messages received: ${messagesReceived}`);
      console.log(`   Room-related messages: ${roomMessages.length}`);
      
      if (roomMessages.length === 0) {
        console.log(`\n⚠️  No room messages received`);
        console.log(`   Possible reasons:`);
        console.log(`   1. Room expired (15 min inactivity)`);
        console.log(`   2. Room ID format is incorrect`);
        console.log(`   3. Room doesn't exist on server`);
        console.log(`\n💡 Try:`);
        console.log(`   - Check the URL in your browser`);
        console.log(`   - Make sure battle is actively happening`);
        console.log(`   - Try creating a fresh battle room`);
      }
      
      resolve();
    });

    // Timeout after 20 seconds
    setTimeout(() => {
      ws.close();
      resolve();
    }, 20000);
  });
}

debugActiveRoom().catch(console.error);
