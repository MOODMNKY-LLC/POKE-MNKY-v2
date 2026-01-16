/**
 * Check existing Showdown teams in Supabase
 * Usage: pnpm exec tsx --env-file=.env.local scripts/check-showdown-teams.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function checkExistingTeams() {
  console.log('🔍 Checking existing Showdown teams in Supabase...\n');

  const supabase = createServiceRoleClient();

  try {
    // Get all teams
    const { data: teams, error } = await supabase
      .from('showdown_teams')
      .select('id, team_name, format, generation, folder_path, is_stock, source, pokemon_count, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying teams:', error);
      process.exit(1);
    }

    if (!teams || teams.length === 0) {
      console.log('📭 No teams found in database');
      console.log('   Ready to import teams from GitHub repo\n');
      return { count: 0, teams: [] };
    }

    console.log(`✅ Found ${teams.length} team(s) in database:\n`);

    // Group by format
    const byFormat: Record<string, typeof teams> = {};
    const stockTeams = teams.filter(t => t.is_stock);
    const userTeams = teams.filter(t => !t.is_stock);

    teams.forEach(team => {
      const format = team.format || 'unknown';
      if (!byFormat[format]) {
        byFormat[format] = [];
      }
      byFormat[format].push(team);
    });

    console.log('📊 Summary:');
    console.log(`   Total teams: ${teams.length}`);
    console.log(`   Stock teams: ${stockTeams.length}`);
    console.log(`   User teams: ${userTeams.length}`);
    console.log('');

    console.log('📁 By Format:');
    Object.entries(byFormat).forEach(([format, formatTeams]) => {
      console.log(`   ${format}: ${formatTeams.length} team(s)`);
    });
    console.log('');

    console.log('📋 Team List:');
    teams.forEach((team, index) => {
      const stock = team.is_stock ? '📦' : '👤';
      const format = team.format || 'unknown';
      const gen = team.generation ? `Gen ${team.generation}` : '';
      const pokemon = team.pokemon_count || 0;
      console.log(`   ${index + 1}. ${stock} ${team.team_name} (${format}${gen ? `, ${gen}` : ''}, ${pokemon} Pokemon)`);
      if (team.folder_path) {
        console.log(`      📂 ${team.folder_path}`);
      }
    });

    return { count: teams.length, teams };
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run check
checkExistingTeams().catch(console.error);
