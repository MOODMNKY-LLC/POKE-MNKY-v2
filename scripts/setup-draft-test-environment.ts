/**
 * Setup Draft Test Environment
 * Creates test season, teams, draft budgets, and draft session for comprehensive testing
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/setup-draft-test-environment.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';
import { DraftSystem } from '../lib/draft-system';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function setupDraftTestEnvironment() {
  console.log('🚀 Setting up Draft Test Environment...\n');

  const supabase = createServiceRoleClient();
  const draftSystem = new DraftSystem();

  try {
    // Step 1: Create or get test season
    console.log('📅 Step 1: Creating/Getting test season...');
    
    let { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('id, name, is_current')
      .eq('is_current', true)
      .limit(1)
      .single();

    if (seasonError || !season) {
      console.log('   Creating new test season...');
      const { data: newSeason, error: createError } = await supabase
        .from('seasons')
        .insert({
          name: 'Test Draft Season 2026',
          start_date: '2026-01-16',
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

    const teamConfigs = [
      { name: 'Test Team Alpha', coach: 'Test Coach 1', division: 'Kanto', conference: 'Lance Conference' },
      { name: 'Test Team Beta', coach: 'Test Coach 2', division: 'Johto', conference: 'Leon Conference' },
      { name: 'Test Team Gamma', coach: 'Test Coach 3', division: 'Hoenn', conference: 'Lance Conference' },
    ];

    const teams: Array<{ id: string; name: string }> = [];

    for (const config of teamConfigs) {
      // Check if team already exists
      const { data: existing } = await supabase
        .from('teams')
        .select('id, name')
        .eq('name', config.name)
        .limit(1)
        .single();

      if (existing) {
        console.log(`   ⏭️  Team already exists: ${config.name} (${existing.id})`);
        teams.push(existing);
      } else {
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            name: config.name,
            coach_name: config.coach,
            division: config.division,
            conference: config.conference,
            season_id: seasonId
          })
          .select('id, name')
          .single();

        if (createError || !newTeam) {
          console.error(`   ❌ Failed to create team ${config.name}:`, createError);
          process.exit(1);
        }

        console.log(`   ✅ Created team: ${newTeam.name} (${newTeam.id})`);
        teams.push(newTeam);
      }
    }

    if (teams.length !== 3) {
      console.error('❌ Expected 3 teams, got', teams.length);
      process.exit(1);
    }

    console.log('');

    // Step 3: Initialize draft budgets (120 points per team)
    console.log('💰 Step 3: Initializing draft budgets...');

    for (const team of teams) {
      // Check if budget exists
      const { data: existing } = await supabase
        .from('draft_budgets')
        .select('id, total_points, spent_points')
        .eq('team_id', team.id)
        .eq('season_id', seasonId)
        .single();

      if (existing) {
        console.log(`   ⏭️  Budget exists for ${team.name}: ${existing.total_points} total, ${existing.spent_points} spent`);
      } else {
        const { data: newBudget, error: createError } = await supabase
          .from('draft_budgets')
          .insert({
            team_id: team.id,
            season_id: seasonId,
            total_points: 120,
            spent_points: 0
          })
          .select('id, total_points')
          .single();

        if (createError || !newBudget) {
          console.error(`   ❌ Failed to create budget for ${team.name}:`, createError);
          process.exit(1);
        }

        console.log(`   ✅ Created budget for ${team.name}: ${newBudget.total_points} points`);
      }
    }

    console.log('');

    // Step 4: Check draft pool
    console.log('🎲 Step 4: Checking draft pool...');

    const { data: draftPool, error: poolError } = await supabase
      .from('draft_pool')
      .select('pokemon_name, point_value, is_available')
      .eq('is_available', true)
      .limit(5);

    if (poolError) {
      console.error('   ❌ Error checking draft pool:', poolError);
    } else if (!draftPool || draftPool.length === 0) {
      console.log('   ⚠️  Draft pool is empty!');
      console.log('   📋 To populate draft pool, run:');
      console.log('      pnpm exec tsx scripts/test-draft-pool-parser.ts');
      console.log('   ⏭️  Continuing without draft pool data...');
    } else {
      console.log(`   ✅ Draft pool has ${draftPool.length}+ available Pokemon`);
      console.log('   Sample Pokemon:');
      draftPool.slice(0, 5).forEach(p => {
        console.log(`      - ${p.pokemon_name} (${p.point_value} pts)`);
      });
    }

    console.log('');

    // Step 5: Check for existing draft session
    console.log('🎯 Step 5: Checking for existing draft session...');

    const existingSession = await draftSystem.getActiveSession(seasonId);
    
    if (existingSession) {
      console.log(`   ⏭️  Active draft session exists: ${existingSession.id}`);
      console.log(`      Status: ${existingSession.status}`);
      console.log(`      Current Round: ${existingSession.current_round}`);
      console.log(`      Current Pick: ${existingSession.current_pick_number}`);
      console.log(`      Current Team: ${existingSession.current_team_id || 'None'}`);
    } else {
      // Step 6: Create draft session
      console.log('   Creating new draft session...');
      
      const teamIds = teams.map(t => t.id);
      const session = await draftSystem.createSession(seasonId, teamIds, {
        draftType: 'snake',
        pickTimeLimit: 45,
        autoDraftEnabled: false
      });

      console.log(`   ✅ Created draft session: ${session.id}`);
      console.log(`      Status: ${session.status}`);
      console.log(`      Total Teams: ${session.total_teams}`);
      console.log(`      Total Rounds: ${session.total_rounds}`);
      console.log(`      Current Round: ${session.current_round}`);
      console.log(`      Current Pick: ${session.current_pick_number}`);
      console.log(`      Current Team: ${session.current_team_id || 'None'}`);
      console.log(`      Turn Order: ${session.turn_order.join(', ')}`);
    }

    console.log('');

    // Step 7: Summary
    console.log('✅ Setup Complete!\n');
    console.log('📊 Test Environment Summary:');
    console.log('='.repeat(60));
    console.log(`Season: ${season.name} (${season.id})`);
    console.log(`Teams: ${teams.length}`);
    teams.forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.name} - ${team.id}`);
    });
    console.log(`Draft Pool: ${draftPool && draftPool.length > 0 ? '✅ Populated' : '⚠️  Empty (run draft pool parser)'}`);
    console.log(`Draft Session: ${existingSession ? '✅ Active' : '✅ Created'}`);
    console.log('='.repeat(60));

    console.log('\n📋 Next Steps:');
    console.log('   1. Navigate to http://localhost:3000/draft');
    console.log('   2. You should see the draft room with the active session');
    console.log('   3. Test making picks via the UI or API');
    console.log('   4. See docs/DRAFT-TESTING-GUIDE.md for comprehensive testing instructions');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run setup
setupDraftTestEnvironment().catch(console.error);
