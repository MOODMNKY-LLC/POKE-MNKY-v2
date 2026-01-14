/**
 * Import Pokemon Showdown teams from the cloned repository
 * Scans the Teams directory and imports all team files into Supabase
 * 
 * Usage: pnpm exec tsx --env-file=.env.local scripts/import-showdown-teams.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname, basename, relative } from 'path';
import { parseShowdownTeam } from '../lib/team-parser';
import { createServiceRoleClient } from '../lib/supabase/service';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  errorsList: string[];
}

async function getAllTeamFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = await getAllTeamFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && (entry.name.endsWith('.txt') || entry.name.endsWith('.team'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractFolderPath(filePath: string, baseDir: string): string {
  const relativePath = relative(baseDir, dirname(filePath));
  return relativePath || null;
}

function extractFormatFromPath(folderPath: string): string | null {
  // Extract format from folder structure (OU, UU, VGC, etc.)
  const parts = folderPath.split(/[/\\]/);
  const formatMap: Record<string, string> = {
    'OU': 'ou',
    'UU': 'uu',
    'LC': 'lc',
    'Monotype': 'monotype',
    '1v1': '1v1',
    'VGC': 'vgc'
  };

  for (const part of parts) {
    const normalized = part.replace(/[^a-zA-Z0-9]/g, '');
    if (formatMap[normalized]) {
      return formatMap[normalized];
    }
  }

  return null;
}

async function importTeamFile(
  filePath: string,
  supabase: any,
  baseDir: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fileContent = await readFile(filePath, 'utf-8');
    const stats = await stat(filePath);
    const fileName = basename(filePath);
    const folderPath = extractFolderPath(filePath, baseDir);

    // Parse the team
    const parsed = await parseShowdownTeam(fileContent);

    if (parsed.errors.length > 0) {
      return {
        success: false,
        error: `Parse errors: ${parsed.errors.join(', ')}`
      };
    }

    if (parsed.pokemon.length === 0) {
      return {
        success: false,
        error: 'No Pokemon found in team'
      };
    }

    // Extract metadata
    const teamName = parsed.metadata?.teamName || fileName.replace(/\.(txt|team)$/, '');
    const generation = parsed.metadata?.generation;
    const format = parsed.metadata?.format || extractFormatFromPath(folderPath);
    
    // Convert Pokemon to JSONB format
    const pokemonData = parsed.pokemon.map(p => ({
      name: p.name,
      species: p.species,
      item: p.item,
      ability: p.ability,
      moves: p.moves,
      nature: p.nature,
      evs: p.evs,
      ivs: p.ivs,
      teraType: p.teraType,
      level: p.level,
      gender: p.gender,
      shiny: p.shiny,
      happiness: p.happiness
    }));

    // Insert into database as stock team (available to all users)
    const { error } = await supabase
      .from('showdown_teams')
      .insert({
        team_name: teamName,
        generation: generation,
        format: format,
        folder_path: folderPath,
        team_text: fileContent,
        canonical_text: parsed.canonicalText,
        pokemon_data: pokemonData,
        pokemon_count: parsed.pokemon.length,
        source: 'import',
        original_filename: fileName,
        file_size: stats.size,
        tags: format ? [format] : [],
        is_stock: true, // Mark as stock team (available to all users)
        coach_id: null // Stock teams don't belong to any coach
      });

    if (error) {
      // Check if it's a duplicate (unique constraint violation)
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Team already exists'
        };
      }
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function importTeamsFromRepository() {
  console.log('🚀 Starting Showdown Teams Import\n');

  const supabase = createServiceRoleClient();
  const teamsDir = join(process.cwd(), 'temp', 'Pokemon-Showdown-Teams', 'Teams');

  try {
    // Get all team files
    console.log('📂 Scanning for team files...');
    const teamFiles = await getAllTeamFiles(teamsDir);
    console.log(`   Found ${teamFiles.length} team files\n`);

    const stats: ImportStats = {
      total: teamFiles.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      errorsList: []
    };

    // Process each file
    for (let i = 0; i < teamFiles.length; i++) {
      const filePath = teamFiles[i];
      const fileName = basename(filePath);
      const progress = `[${i + 1}/${teamFiles.length}]`;

      console.log(`${progress} Processing: ${fileName}`);

      const result = await importTeamFile(filePath, supabase, teamsDir);

      if (result.success) {
        stats.imported++;
        console.log(`   ✅ Imported successfully`);
      } else {
        if (result.error?.includes('already exists')) {
          stats.skipped++;
          console.log(`   ⏭️  Skipped: ${result.error}`);
        } else {
          stats.errors++;
          stats.errorsList.push(`${fileName}: ${result.error}`);
          console.log(`   ❌ Error: ${result.error}`);
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import Summary');
    console.log('='.repeat(60));
    console.log(`Total files:     ${stats.total}`);
    console.log(`✅ Imported:     ${stats.imported}`);
    console.log(`⏭️  Skipped:      ${stats.skipped}`);
    console.log(`❌ Errors:        ${stats.errors}`);

    if (stats.errorsList.length > 0) {
      console.log('\n❌ Errors:');
      stats.errorsList.forEach(error => console.log(`   - ${error}`));
    }

    console.log('\n✅ Import complete!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run import
importTeamsFromRepository().catch(console.error);
