/**
 * Check Match Status After Battle Completion
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/check-match-status.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function checkMatchStatus() {
  console.log('🔍 Checking Match Status...\n');

  const supabase = createServiceRoleClient();

  try {
    const { data: match, error } = await supabase
      .from('matches')
      .select('id, status, winner_id, team1_score, team2_score, differential, replay_url, showdown_room_id, showdown_room_url')
      .eq('showdown_room_id', 'battle-gen9randombattle-1')
      .single();

    if (error) {
      console.error('❌ Error fetching match:', error);
      return;
    }

    if (!match) {
      console.log('❌ No match found with room ID: battle-gen9randombattle-1');
      return;
    }

    console.log('✅ Match Found:\n');
    console.log(`   Match ID: ${match.id}`);
    console.log(`   Status: ${match.status}`);
    console.log(`   Room ID: ${match.showdown_room_id}`);
    console.log(`   Room URL: ${match.showdown_room_url || 'N/A'}`);
    console.log(`   Winner ID: ${match.winner_id || 'N/A'}`);
    console.log(`   Team 1 Score: ${match.team1_score ?? 'N/A'}`);
    console.log(`   Team 2 Score: ${match.team2_score ?? 'N/A'}`);
    console.log(`   Differential: ${match.differential ?? 'N/A'}`);
    console.log(`   Replay URL: ${match.replay_url || 'N/A'}`);

    if (match.status === 'completed') {
      console.log('\n✅ Match was successfully updated!');
    } else {
      console.log('\n⚠️  Match status is still:', match.status);
      console.log('   The worker detected completion but may have failed to update the database.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkMatchStatus().catch(console.error);
