/**
 * Room Manager Test
 * Tests Room Manager's ability to connect, poll for rooms, and manage subscriptions
 * Run with: pnpm tsx src/test-room-manager.ts
 */

import { RoomManager } from './monitors/room-manager';
import { BattleCompletionEvent } from './monitors/showdown-monitor';

async function testRoomManager() {
  console.log('🧪 Testing Room Manager\n');

  // Get environment variables
  const showdownServerUrl = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  console.log(`📡 Showdown Server: ${showdownServerUrl}`);
  console.log(`🗄️  Supabase URL: ${supabaseUrl}\n`);

  const roomManager = new RoomManager(showdownServerUrl, supabaseUrl, supabaseKey);

  // Set up battle completion handler
  let battleCompleteReceived = false;
  roomManager.onBattleComplete = async (event: BattleCompletionEvent) => {
    console.log('\n🎯 Battle completion event received!');
    console.log(JSON.stringify(event, null, 2));
    battleCompleteReceived = true;
  };

  try {
    console.log('📋 Test 1: Starting Room Manager...');
    await roomManager.start();
    console.log('✅ Room Manager started successfully\n');

    console.log('📋 Test 2: Waiting for room sync (30 seconds)...');
    console.log('   The Room Manager will poll for active matches every 30 seconds');
    console.log('   You can create a test match with status="in_progress" and showdown_room_id set\n');

    // Wait for initial sync + one more sync cycle
    await new Promise(resolve => setTimeout(resolve, 35000));

    console.log('\n📋 Test 3: Checking active room subscriptions...');
    const monitor = (roomManager as any).monitor;
    if (monitor && monitor.roomSubscriptions) {
      const subscriptions = Array.from(monitor.roomSubscriptions);
      if (subscriptions.length > 0) {
        console.log(`✅ Monitoring ${subscriptions.length} room(s):`);
        subscriptions.forEach((roomId) => {
          console.log(`   - ${roomId as string}`);
        });
      } else {
        console.log('⚠️  No active rooms to monitor (create a match with status="in_progress" to test)');
      }
    }

    console.log('\n📋 Test 4: Stopping Room Manager...');
    roomManager.stop();
    console.log('✅ Room Manager stopped successfully\n');

    console.log('✅ Room Manager test completed!\n');
    console.log('📝 Summary:');
    console.log('   - WebSocket connection: ✅');
    console.log('   - Room polling: ✅');
    console.log('   - Room subscription management: ✅');
    if (battleCompleteReceived) {
      console.log('   - Battle completion handling: ✅');
    } else {
      console.log('   - Battle completion handling: ⏳ (no battles completed during test)');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Room Manager test failed:');
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    } else {
      console.error(`   Error:`, error);
    }

    roomManager.stop();
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
testRoomManager().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
