/**
 * Verify Showdown Room Format
 * Tests different room ID formats to find the correct one
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/verify-room-format.ts <room-id-from-url>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import WebSocket from 'ws';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const SHOWDOWN_SERVER_URL = process.env.SHOWDOWN_SERVER_URL || 'http://pokemon-showdown:8000';
const roomIdFromUrl = process.argv[2] || 'gen9randombattle-1';

// Try different formats
const formatsToTry = [
  roomIdFromUrl,                                    // gen9randombattle-1
  `battle-${roomIdFromUrl}`,                       // battle-gen9randombattle-1
  roomIdFromUrl.replace(/^battle-/, ''),          // Remove battle- if present
];

async function testRoomFormats() {
  console.log('🔍 Testing Different Room ID Formats...\n');
  console.log(`Original from URL: ${roomIdFromUrl}`);
  console.log(`Formats to test: ${formatsToTry.join(', ')}\n`);

  const wsUrl = SHOWDOWN_SERVER_URL
    .replace(/^https:/, 'wss:')
    .replace(/^http:/, 'ws:')
    .replace(/\/$/, '') + '/showdown/websocket';

  console.log(`Connecting to: ${wsUrl}\n`);

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(wsUrl);
    const results: Record<string, boolean> = {};
    let currentFormatIndex = 0;

    ws.on('open', () => {
      console.log('✅ Connected to Showdown server\n');
      testNextFormat();
    });

    function testNextFormat() {
      if (currentFormatIndex >= formatsToTry.length) {
        console.log('\n📊 Results Summary:');
        console.log('='.repeat(60));
        Object.entries(results).forEach(([format, success]) => {
          console.log(`   ${format}: ${success ? '✅ EXISTS' : '❌ NOT FOUND'}`);
        });
        console.log('='.repeat(60));
        ws.close();
        return;
      }

      const format = formatsToTry[currentFormatIndex];
      console.log(`Testing format: ${format}`);
      ws.send(`|/join ${format}`);
      currentFormatIndex++;
    }

    ws.on('message', (data: WebSocket.Data) => {
      const message = data.toString();
      const lines = message.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split('|');
        const roomPrefix = parts[0];

        // Check for room init (room exists)
        if (parts[1] === 'init') {
          const detectedRoom = roomPrefix.substring(1); // Remove '>'
          if (formatsToTry.includes(detectedRoom)) {
            results[detectedRoom] = true;
            console.log(`   ✅ Room exists: ${detectedRoom}`);
          }
        }

        // Check for room doesn't exist
        if (parts[1] === 'noinit' && parts[2] === 'nonexistent') {
          const testedRoom = roomPrefix.substring(1);
          if (formatsToTry.includes(testedRoom)) {
            results[testedRoom] = false;
            console.log(`   ❌ Room doesn't exist: ${testedRoom}`);
          }
        }
      }

      // Wait a bit then test next format
      setTimeout(() => {
        testNextFormat();
      }, 2000);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    ws.on('close', () => {
      resolve();
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      ws.close();
      resolve();
    }, 30000);
  });
}

testRoomFormats().catch(console.error);
