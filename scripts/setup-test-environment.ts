/**
 * Setup Test Environment for Integration Worker Testing
 * Creates test season, teams, and match
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/setup-test-environment.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function setupTestEnvironment() {
  console.log('🚀 Setting up test environment for Integration Worker testing...\n');

  const supabase = createServiceRoleClient();

  try {
    // Step 1: Create or get test season
    console.log('📅 Step 1: Creating/Getting test season...');
    
    let { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('is_current', true)
      .limit(1)
      .single();

    if (seasonError || !season) {
      console.log('   Creating new test season...');
      const { data: newSeason, error: createError } = await supabase
        .from('seasons')
        .insert({
          name: 'Test Season 2026',
          start_date: '2026-01-01',
          is_current: true
        })
        .select('id, name')
        .single();

      if (createError || !newSeason) {
        console.error('❌ Failed to create season:', createError);
        process.exit(1);
      }

      season = newSeason;
      console.log(`   ✅ Created season: ${season.name} (${season.id})`);
    } else {
      console.log(`   ✅ Using existing season: ${season.name} (${season.id})`);
    }

    const seasonId = season.id;
    console.log('');

    // Step 2: Create test teams
    console.log('👥 Step 2: Creating test teams...');

    const teamNames = ['Test Team Alpha', 'Test Team Beta'];
    const teams: Array<{ id: string; name: string }> = [];

    for (const teamName of teamNames) {
      // Check if team already exists
      const { data: existing } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', teamName)
        .limit(1)
        .single();

      if (existing) {
        console.log(`   ⏭️  Team already exists: ${teamName} (${existing.id})`);
        teams.push(existing);
      } else {
        const coachName = teamName === 'Test Team Alpha' ? 'Test Coach 1' : 'Test Coach 2';
        const division = teamName === 'Test Team Alpha' ? 'Kanto' : 'Johto';
        const conference = teamName === 'Test Team Alpha' ? 'Lance Conference' : 'Leon Conference';

        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            name: teamName,
            coach_name: coachName,
            division: division,
            conference: conference,
            season_id: seasonId
          })
          .select('id, name')
          .single();

        if (createError || !newTeam) {
          console.error(`   ❌ Failed to create team ${teamName}:`, createError);
          process.exit(1);
        }

        console.log(`   ✅ Created team: ${newTeam.name} (${newTeam.id})`);
        teams.push(newTeam);
      }
    }

    if (teams.length !== 2) {
      console.error('❌ Expected 2 teams, got', teams.length);
      process.exit(1);
    }

    console.log('');

    // Step 3: Create test match
    console.log('⚔️  Step 3: Creating test match...');

    const roomId = 'battle-gen9avgatbest-test123';
    const roomUrl = 'https://aab-play.moodmnky.com/battle-gen9avgatbest-test123';

    // Check if match already exists
    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id, showdown_room_id, status')
      .eq('showdown_room_id', roomId)
      .limit(1)
      .single();

    if (existingMatch) {
      console.log(`   ⏭️  Match already exists: ${existingMatch.id}`);
      console.log(`      Status: ${existingMatch.status}`);
      console.log(`      Room ID: ${existingMatch.showdown_room_id}`);
      
      // Update to in_progress if needed
      if (existingMatch.status !== 'in_progress') {
        const { error: updateError } = await supabase
          .from('matches')
          .update({ status: 'in_progress' })
          .eq('id', existingMatch.id);

        if (updateError) {
          console.error('   ⚠️  Failed to update match status:', updateError);
        } else {
          console.log('   ✅ Updated match status to in_progress');
        }
      }
    } else {
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
        console.error('   ❌ Failed to create match:', createError);
        process.exit(1);
      }

      console.log(`   ✅ Created match: ${newMatch.id}`);
      console.log(`      Room ID: ${newMatch.showdown_room_id}`);
      console.log(`      Status: ${newMatch.status}`);
    }

    console.log('');

    // Step 4: Verify setup
    console.log('✅ Step 4: Verifying setup...\n');

    const { data: verifyTeams } = await supabase
      .from('teams')
      .select('id, name, coach_name')
      .in('id', [teams[0].id, teams[1].id]);

    const { data: verifyMatch } = await supabase
      .from('matches')
      .select('id, team1_id, team2_id, status, showdown_room_id')
      .eq('showdown_room_id', roomId)
      .single();

    console.log('📊 Setup Summary:');
    console.log('='.repeat(60));
    console.log(`Season: ${season.name} (${season.id})`);
    console.log(`Teams: ${verifyTeams?.length || 0}`);
    verifyTeams?.forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.name} (${team.coach_name}) - ${team.id}`);
    });
    console.log(`Match: ${verifyMatch ? '✅ Created' : '❌ Not found'}`);
    if (verifyMatch) {
      console.log(`   ID: ${verifyMatch.id}`);
      console.log(`   Status: ${verifyMatch.status}`);
      console.log(`   Room ID: ${verifyMatch.showdown_room_id}`);
    }
    console.log('='.repeat(60));

    console.log('\n✅ Test environment setup complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Wait 35 seconds for Integration Worker to poll');
    console.log('   2. Check logs: ssh moodmnky@10.3.0.119 \'cd /home/moodmnky/POKE-MNKY && docker compose logs --tail=50 integration-worker | grep -E "(Synced|Subscribed)"\'');
    console.log('   3. Verify room subscription appears in logs');
    console.log('   4. Proceed with battle completion test');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run setup
setupTestEnvironment().catch(console.error);
