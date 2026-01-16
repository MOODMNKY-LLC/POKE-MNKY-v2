/**
 * Update Match with Real Showdown Room ID
 * After creating a real battle room, update the match record
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>
 * Example: pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts gen9avgatbest-1234567890
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function updateMatchWithRealRoom(roomId: string) {
  console.log('🔄 Updating Match with Real Room ID...\n');
  console.log(`Room ID: ${roomId}\n`);

  const supabase = createServiceRoleClient();
  const showdownClientUrl = process.env.NEXT_PUBLIC_SHOWDOWN_CLIENT_URL || 'https://aab-play.moodmnky.com';
  
  // Showdown room URLs are typically: /{roomId} (not /battle-{roomId})
  const roomUrl = `${showdownClientUrl}/${roomId}`;

  try {
    // Find the test match
    const { data: match, error: findError } = await supabase
      .from('matches')
      .select('id, showdown_room_id, status')
      .eq('showdown_room_id', 'battle-gen9avgatbest-test123')
      .single();

    if (findError || !match) {
      console.error('❌ Test match not found:', findError);
      console.log('\n💡 Looking for any in_progress match...');
      
      const { data: anyMatch } = await supabase
        .from('matches')
        .select('id, showdown_room_id, status')
        .eq('status', 'in_progress')
        .limit(1)
        .single();

      if (!anyMatch) {
        console.error('❌ No in_progress matches found');
        process.exit(1);
      }

      console.log(`✅ Found match: ${anyMatch.id}`);
      console.log(`   Current room ID: ${anyMatch.showdown_room_id || 'none'}`);
      
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          showdown_room_id: roomId,
          showdown_room_url: roomUrl,
          status: 'in_progress'
        })
        .eq('id', anyMatch.id);

      if (updateError) {
        console.error('❌ Failed to update match:', updateError);
        process.exit(1);
      }

      console.log(`\n✅ Updated match ${anyMatch.id} with room ID: ${roomId}`);
      console.log(`   Room URL: ${roomUrl}`);
      console.log(`\n📋 Next Steps:`);
      console.log(`   1. Wait 30-35 seconds for Integration Worker to poll`);
      console.log(`   2. Check logs for subscription: ssh moodmnky@10.3.0.119 'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"'`);
      console.log(`   3. Complete the battle in room: ${roomId}`);
      console.log(`   4. Verify worker detects completion`);
    } else {
      console.log(`✅ Found test match: ${match.id}`);
      console.log(`   Current room ID: ${match.showdown_room_id}`);
      
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          showdown_room_id: roomId,
          showdown_room_url: roomUrl,
          status: 'in_progress'
        })
        .eq('id', match.id);

      if (updateError) {
        console.error('❌ Failed to update match:', updateError);
        process.exit(1);
      }

      console.log(`\n✅ Updated match ${match.id} with room ID: ${roomId}`);
      console.log(`   Room URL: ${roomUrl}`);
      console.log(`\n📋 Next Steps:`);
      console.log(`   1. Wait 30-35 seconds for Integration Worker to poll`);
      console.log(`   2. Check logs for subscription`);
      console.log(`   3. Complete the battle in room: ${roomId}`);
      console.log(`   4. Verify worker detects completion`);
    }

    // Verify update
    const { data: updated } = await supabase
      .from('matches')
      .select('id, showdown_room_id, showdown_room_url, status')
      .eq('showdown_room_id', roomId)
      .single();

    if (updated) {
      console.log('\n✅ Verification:');
      console.log(`   Match ID: ${updated.id}`);
      console.log(`   Room ID: ${updated.showdown_room_id}`);
      console.log(`   Room URL: ${updated.showdown_room_url}`);
      console.log(`   Status: ${updated.status}`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Get room ID from command line
const roomId = process.argv[2];

if (!roomId) {
  console.error('❌ Room ID required');
  console.log('\nUsage:');
  console.log('  pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts <room-id>');
  console.log('\nExample:');
  console.log('  pnpm exec tsx --env-file=.env.local scripts/update-match-with-real-room.ts gen9avgatbest-1234567890');
  console.log('\n💡 To get a room ID:');
  console.log('   1. Go to https://aab-play.moodmnky.com');
  console.log('   2. Challenge another player or accept a challenge');
  console.log('   3. Start the battle');
  console.log('   4. Copy the room ID from the URL (format: gen9avgatbest-1234567890)');
  process.exit(1);
}

updateMatchWithRealRoom(roomId).catch(console.error);
