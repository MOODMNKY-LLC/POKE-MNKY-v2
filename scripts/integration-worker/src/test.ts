/**
 * Test script for Integration Worker components.
 *
 * Default: runs a deterministic local parser test so `pnpm test` is stable.
 * Optional: set TEST_ROOM_ID to also exercise live replay fetching.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ReplayParser } from './parsers/replay-parser.js';

async function testLocalParser(): Promise<void> {
  console.log('🧪 Testing Replay Parser with local fixture...\n');

  const parser = new ReplayParser(process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com');
  const fixturePath = join(process.cwd(), 'src/test-fixtures/sample-replay.txt');
  const logText = await readFile(fixturePath, 'utf8');

  const result = parser.parseReplayLog(logText, 'battle-gen9avgatbest-test123');

  assert.equal(result.winner, 'p1');
  assert.equal(result.team1Score, 2);
  assert.equal(result.team2Score, 0);
  assert.equal(result.differential, 2);
  assert.equal(result.faints.length, 2);

  console.log('✅ Local parser test passed');
  console.log(JSON.stringify(result, null, 2));
}

async function testLiveReplayIfRequested(): Promise<void> {
  const testRoomId = process.env.TEST_ROOM_ID;
  if (!testRoomId) return;

  console.log('\n🧪 Testing live replay fetch...\n');
  const parser = new ReplayParser(process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com');
  const result = await parser.parseReplay(testRoomId);
  console.log('✅ Live replay parsed successfully');
  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  await testLocalParser();
  await testLiveReplayIfRequested();
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
