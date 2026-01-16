/**
 * WebSocket Connection Test
 * Tests connection to Showdown server WebSocket
 * Run with: pnpm tsx src/test-websocket.ts
 */

import { ShowdownMonitor } from './monitors/showdown-monitor';

async function testWebSocketConnection() {
  console.log('🧪 Testing WebSocket Connection to Showdown Server\n');

  // Get server URL from environment or use default
  const serverUrl = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
  
  console.log(`📡 Server URL: ${serverUrl}`);
  console.log(`🔌 Attempting WebSocket connection...\n`);

  const monitor = new ShowdownMonitor(serverUrl, 5000);

  try {
    // Set up event handlers
    monitor.onBattleComplete((event) => {
      console.log('\n✅ Battle completion event received:');
      console.log(JSON.stringify(event, null, 2));
    });

    // Attempt connection
    await monitor.connect();
    console.log('✅ WebSocket connection established!\n');

    // Test room subscription (use a test room ID if available)
    const testRoomId = process.env.TEST_ROOM_ID || 'battle-gen9avgatbest-test123';
    console.log(`📥 Testing room subscription: ${testRoomId}`);
    
    try {
      monitor.subscribeToRoom(testRoomId);
      console.log(`✅ Successfully subscribed to room: ${testRoomId}\n`);
    } catch (error) {
      console.warn(`⚠️  Room subscription test failed (this is OK if room doesn't exist):`, error);
    }

    // Keep connection alive for 10 seconds to test stability
    console.log('⏳ Keeping connection alive for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Test unsubscription
    if (monitor.roomSubscriptions.has(testRoomId)) {
      monitor.unsubscribeFromRoom(testRoomId);
      console.log(`✅ Successfully unsubscribed from room: ${testRoomId}\n`);
    }

    // Disconnect
    monitor.disconnect();
    console.log('✅ Test completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ WebSocket connection test failed:');
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    } else {
      console.error(`   Error:`, error);
    }
    
    monitor.disconnect();
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Test terminated');
  process.exit(0);
});

// Run test
testWebSocketConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
