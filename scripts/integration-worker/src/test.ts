/**
 * Test script for Integration Worker components
 * Run with: pnpm test
 */

import { ReplayParser } from './parsers/replay-parser';

async function testReplayParser() {
  console.log('🧪 Testing Replay Parser...\n');

  const parser = new ReplayParser(process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com');
  
  // Test with a known room ID (replace with actual test room ID)
  const testRoomId = 'battle-gen9avgatbest-test123';
  
  try {
    console.log(`Fetching replay for room: ${testRoomId}`);
    const result = await parser.parseReplay(testRoomId);
    console.log('\n✅ Parsed result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run tests
testReplayParser().catch(console.error);
