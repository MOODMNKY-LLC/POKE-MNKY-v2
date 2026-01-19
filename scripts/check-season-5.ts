/**
 * Check Season 5 in Database
 * Verifies Season 5 exists and checks routing
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/check-season-5.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';
import { DraftSystem } from '../lib/draft-system';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function checkSeason5() {
  console.log('🔍 Checking Season 5 in Database...\n');

  const supabase = createServiceRoleClient();
  const draftSystem = new DraftSystem();

  try {
    // 1. Check all seasons
    console.log('📅 Step 1: Checking all seasons...');
    const { data: allSeasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('id, name, start_date, end_date, is_current, created_at')
      .order('created_at', { ascending: false });

    if (seasonsError) {
      console.error('❌ Error fetching seasons:', seasonsError);
      return;
    }

    console.log(`   Found ${allSeasons?.length || 0} seasons:`);
    allSeasons?.forEach((season, i) => {
      const marker = season.is_current ? '⭐' : '  ';
      console.log(`   ${marker} ${i + 1}. ${season.name} (${season.id})`);
      console.log(`      Current: ${season.is_current ? 'YES' : 'NO'}`);
      console.log(`      Created: ${season.created_at}`);
    });
    console.log('');

    // 2. Find Season 5 specifically
    console.log('🔎 Step 2: Finding Season 5...');
    const season5 = allSeasons?.find(s => 
      s.name.toLowerCase().includes('season 5') || 
      s.name.toLowerCase().includes('season5') ||
      s.name.toLowerCase().includes('5')
    );

    if (!season5) {
      console.log('   ⚠️  Season 5 not found by name');
      console.log('   Checking if any season is marked as current...');
      
      const { data: currentSeason } = await supabase
        .from('seasons')
        .select('id, name, is_current')
        .eq('is_current', true)
        .single();

      if (currentSeason) {
        console.log(`   ✅ Found current season: ${currentSeason.name} (${currentSeason.id})`);
        console.log(`   This is what the API will use when looking for "current season"`);
      } else {
        console.log('   ❌ No season marked as current (is_current = true)');
        console.log('   This will cause "No active season found" errors');
      }
    } else {
      console.log(`   ✅ Found Season 5: ${season5.name} (${season5.id})`);
      console.log(`   Is Current: ${season5.is_current ? 'YES ✅' : 'NO ⚠️'}`);
      console.log('');

      // 3. Check if Season 5 is marked as current
      if (!season5.is_current) {
        console.log('   ⚠️  WARNING: Season 5 exists but is NOT marked as current');
        console.log('   The API routes use is_current=true to find the season');
        console.log('   Options:');
        console.log('   1. Set Season 5 as current: UPDATE seasons SET is_current = true WHERE id = \'' + season5.id + '\'');
        console.log('   2. Or pass season_id explicitly in API calls');
      } else {
        console.log('   ✅ Season 5 is marked as current - routing will work correctly');
      }
    }
    console.log('');

    // 4. Check teams for Season 5 (or current season)
    const targetSeason = season5 || allSeasons?.find(s => s.is_current);
    if (targetSeason) {
      console.log(`👥 Step 3: Checking teams for ${targetSeason.name}...`);
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, season_id')
        .eq('season_id', targetSeason.id);

      if (teamsError) {
        console.error('   ❌ Error fetching teams:', teamsError);
      } else {
        console.log(`   Found ${teams?.length || 0} teams:`);
        teams?.slice(0, 10).forEach((team, i) => {
          console.log(`   ${i + 1}. ${team.name} (${team.id})`);
        });
        if (teams && teams.length > 10) {
          console.log(`   ... and ${teams.length - 10} more`);
        }
        console.log('');

        if (!teams || teams.length === 0) {
          console.log('   ⚠️  No teams found for this season');
          console.log('   Cannot create draft session without teams');
        } else if (teams.length < 2) {
          console.log('   ⚠️  Less than 2 teams found');
          console.log('   Need at least 2 teams to create draft session');
        } else {
          console.log(`   ✅ ${teams.length} teams found - enough to create draft session`);
        }
      }
      console.log('');

      // 5. Check draft sessions
      console.log(`🎯 Step 4: Checking draft sessions for ${targetSeason.name}...`);
      const { data: sessions, error: sessionsError } = await supabase
        .from('draft_sessions')
        .select('id, status, season_id, current_round, current_pick_number, total_teams')
        .eq('season_id', targetSeason.id)
        .order('created_at', { ascending: false });

      if (sessionsError) {
        console.error('   ❌ Error fetching sessions:', sessionsError);
      } else {
        console.log(`   Found ${sessions?.length || 0} draft sessions:`);
        sessions?.forEach((session, i) => {
          const statusIcon = session.status === 'active' ? '🟢' : session.status === 'completed' ? '✅' : '⚪';
          console.log(`   ${statusIcon} ${i + 1}. Status: ${session.status}`);
          console.log(`      Round: ${session.current_round}, Pick: ${session.current_pick_number}`);
          console.log(`      Teams: ${session.total_teams}`);
          console.log(`      ID: ${session.id}`);
        });
        console.log('');

        const activeSession = sessions?.find(s => s.status === 'active');
        if (activeSession) {
          console.log('   ✅ Active draft session found - draft board should work');
        } else {
          console.log('   ⚠️  No active draft session found');
          console.log('   Use POST /api/draft/create-session to create one');
        }
      }
    } else {
      console.log('   ⚠️  Cannot check teams - no season found');
    }
    console.log('');

    // 6. Summary
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    const currentSeason = allSeasons?.find(s => s.is_current);
    if (currentSeason) {
      console.log(`✅ Current Season: ${currentSeason.name} (${currentSeason.id})`);
      console.log(`   This is what API routes will use`);
    } else {
      console.log(`❌ No current season found`);
      console.log(`   API routes will fail with "No active season found"`);
    }

    if (season5 && !season5.is_current) {
      console.log(`⚠️  Season 5 exists but is NOT current`);
      console.log(`   To use Season 5, either:`);
      console.log(`   1. Set it as current: UPDATE seasons SET is_current = true WHERE id = '${season5.id}'`);
      console.log(`   2. Or pass season_id=${season5.id} in API calls`);
    }
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSeason5();
