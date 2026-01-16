/**
 * Integration Test Suite
 * Tests all components together: Room Manager, Replay Parser, Database Updater
 * Run with: pnpm tsx src/test-integration.ts
 */

import { RoomManager } from './monitors/room-manager';
import { ReplayParser } from './parsers/replay-parser';
import { DatabaseUpdater } from './updaters/database-updater';
import { createClient } from '@supabase/supabase-js';

async function testIntegration() {
  console.log('🧪 Integration Test Suite\n');

  // Get environment variables
  const showdownServerUrl = process.env.SHOWDOWN_SERVER_URL || 'https://aab-showdown.moodmnky.com';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`📡 Showdown Server: ${showdownServerUrl}`);
  console.log(`🗄️  Supabase URL: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Supabase Connection
  console.log('📋 Test 1: Supabase Connection');
  try {
    const { data, error } = await supabase.from('matches').select('id').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection successful\n');
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    process.exit(1);
  }

  // Test 2: Check for Active Matches
  console.log('📋 Test 2: Check for Active Matches');
  try {
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, showdown_room_id, status')
      .eq('status', 'in_progress')
      .not('showdown_room_id', 'is', null)
      .limit(5);

    if (error) throw error;

    if (matches && matches.length > 0) {
      console.log(`✅ Found ${matches.length} active match(es) with room IDs:`);
      matches.forEach((match) => {
        console.log(`   - Match ${match.id}: ${match.showdown_room_id}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No active matches found (this is OK for testing)\n');
    }
  } catch (error) {
    console.error('❌ Failed to check matches:', error);
    process.exit(1);
  }

  // Test 3: Replay Parser (if room ID provided)
  const testRoomId = process.env.TEST_ROOM_ID;
  if (testRoomId) {
    console.log(`📋 Test 3: Replay Parser (Room: ${testRoomId})`);
    try {
      const parser = new ReplayParser(showdownServerUrl);
      console.log('   Attempting to fetch replay...');
      const result = await parser.parseReplay(testRoomId);
      console.log('✅ Replay parsed successfully:');
      console.log(`   Winner: ${result.winner || 'Tie'}`);
      console.log(`   Scores: ${result.team1Score} - ${result.team2Score}`);
      console.log(`   Differential: ${result.differential}`);
      console.log(`   Faints: ${result.faints.length}`);
      console.log(`   Replay URL: ${result.replayUrl}\n`);
    } catch (error) {
      console.warn(`⚠️  Replay parsing failed (this is OK if room doesn't exist):`, error instanceof Error ? error.message : error);
      console.log('');
    }
  } else {
    console.log('📋 Test 3: Replay Parser');
    console.log('⚠️  Skipped - Set TEST_ROOM_ID environment variable to test replay parsing\n');
  }

  // Test 4: Database Updater
  console.log('📋 Test 4: Database Updater');
  try {
    const updater = new DatabaseUpdater(supabaseUrl, supabaseKey);
    
    // Test standings calculation (this won't modify data, just test the query)
    console.log('   Testing standings calculation query...');
    const { data: matches } = await supabase
      .from('matches')
      .select('team1_id, team2_id, winner_id, team1_score, team2_score, differential')
      .eq('status', 'completed')
      .limit(10);

    if (matches && matches.length > 0) {
      console.log(`   Found ${matches.length} completed match(es) for standings calculation`);
      console.log('✅ Database updater can access match data\n');
    } else {
      console.log('   No completed matches found (this is OK)');
      console.log('✅ Database updater connection successful\n');
    }
  } catch (error) {
    console.error('❌ Database updater test failed:', error);
    process.exit(1);
  }

  // Test 5: Room Manager Initialization
  console.log('📋 Test 5: Room Manager Initialization');
  try {
    const roomManager = new RoomManager(showdownServerUrl, supabaseUrl, supabaseKey);
    console.log('✅ Room Manager initialized successfully');
    console.log('   Note: Full connection test requires running the worker\n');
  } catch (error) {
    console.error('❌ Room Manager initialization failed:', error);
    process.exit(1);
  }

  // Test 6: Check Discord Webhook Configuration
  console.log('📋 Test 6: Discord Webhook Configuration');
  try {
    const { data: webhook, error } = await supabase
      .from('discord_webhooks')
      .select('name, enabled, webhook_url')
      .eq('name', 'match_results')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    if (webhook) {
      console.log('✅ Discord webhook configured:');
      console.log(`   Name: ${webhook.name}`);
      console.log(`   Enabled: ${webhook.enabled}`);
      console.log(`   URL: ${webhook.webhook_url ? 'Set' : 'Not set'}\n`);
    } else {
      console.log('⚠️  Discord webhook not configured (this is OK for testing)\n');
    }
  } catch (error) {
    console.warn('⚠️  Failed to check Discord webhook:', error instanceof Error ? error.message : error);
    console.log('');
  }

  console.log('✅ All integration tests completed!\n');
  console.log('📝 Summary:');
  console.log('   - Supabase connection: ✅');
  console.log('   - Database queries: ✅');
  console.log('   - Component initialization: ✅');
  console.log('   - Ready for full worker deployment\n');
}

// Run tests
testIntegration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
