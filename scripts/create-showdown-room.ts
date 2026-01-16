/**
 * Create Showdown Room for Testing
 * Creates a room on Showdown server by visiting the URL
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/create-showdown-room.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function createShowdownRoom() {
  console.log('🚀 Creating Showdown Room for Testing...\n');

  const supabase = createServiceRoleClient();
  const showdownClientUrl = process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'https://aab-play.moodmnky.com';
  const roomId = 'battle-gen9avgatbest-test123';
  const roomUrl = `${showdownClientUrl}/${roomId}`;

  try {
    // Get the test match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, showdown_room_id, showdown_room_url, status')
      .eq('showdown_room_id', roomId)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found:', matchError);
      console.log('\n💡 Creating a new test match first...');
      
      // Get test teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('name', ['Test Team Alpha', 'Test Team Beta'])
        .limit(2);

      if (!teams || teams.length !== 2) {
        console.error('❌ Test teams not found. Run setup-test-environment.ts first.');
        process.exit(1);
      }

      // Get season
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_current', true)
        .limit(1)
        .single();

      if (!season) {
        console.error('❌ No current season found. Run setup-test-environment.ts first.');
        process.exit(1);
      }

      // Create match
      const { data: newMatch, error: createError } = await supabase
        .from('matches')
        .insert({
          team1_id: teams[0].id,
          team2_id: teams[1].id,
          week: 1,
          status: 'in_progress',
          showdown_room_id: roomId,
          showdown_room_url: roomUrl
        })
        .select('id, showdown_room_id, status')
        .single();

      if (createError || !newMatch) {
        console.error('❌ Failed to create match:', createError);
        process.exit(1);
      }

      console.log(`✅ Created match: ${newMatch.id}`);
    } else {
      console.log(`✅ Found existing match: ${match.id}`);
      console.log(`   Room ID: ${match.showdown_room_id}`);
      console.log(`   Status: ${match.status}`);
    }

    console.log('\n📋 Room Creation Instructions:');
    console.log('='.repeat(60));
    console.log('Showdown rooms are created automatically when someone visits the URL.');
    console.log('To create the room, you need to:');
    console.log('');
    console.log('Option 1: Visit the URL directly');
    console.log(`   ${roomUrl}`);
    console.log('');
    console.log('Option 2: Use the create-room API endpoint');
    console.log('   This requires authentication, so you would need to:');
    console.log('   1. Log in to the app');
    console.log('   2. Call POST /api/showdown/create-room with match_id');
    console.log('');
    console.log('Option 3: Create room manually on Showdown');
    console.log('   1. Go to https://aab-play.moodmnky.com');
    console.log('   2. Create a new battle room');
    console.log('   3. Update the match record with the actual room ID');
    console.log('='.repeat(60));

    console.log('\n💡 For testing purposes:');
    console.log('   The Integration Worker will monitor the room once it exists.');
    console.log('   You can create the room by visiting the URL above.');
    console.log('   Once created, the worker will detect battle completion events.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
createShowdownRoom().catch(console.error);
