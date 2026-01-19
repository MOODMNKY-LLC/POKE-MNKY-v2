#!/usr/bin/env node
/**
 * Automated Draft Pool Generator
 * 
 * Generates a structured draft pool from Google Sheets Draft Board data.
 * Can be used to:
 * - Generate initial draft pool
 * - Update draft pool after draft picks
 * - Filter available Pokemon by criteria
 * - Export to JSON/database
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuration from Rules sheet
 */
const CONFIG = {
  draftBudget: 120,
  teraBudget: 15,
  minTeamSize: 8,
  maxTeamSize: 10,
  teams: 20,
  pointRange: { min: 1, max: 20 },
  freeAgencyTransactions: 10,
  freeAgencyDeadline: 'Week 8',
  rosterLockAfter: 'Week 8',
};

/**
 * Point value column mapping (header column → point value)
 */
const POINT_COLUMNS = {
  8: 20, 11: 19, 14: 18, 17: 17, 20: 16,
  23: 15, 26: 14, 29: 13, 32: 12, 35: 11,
  38: 10, 41: 9, 44: 8, 47: 7, 50: 6,
  53: 5, 56: 4, 59: 3, 62: 2, 65: 1,
};

/**
 * Column indices
 */
const COLUMNS = {
  BANNED_HEADER: 2,
  BANNED_POKEMON: 3,
  TERA_BANNED_HEADER: 5,
  TERA_BANNED_POKEMON: 6,
  DRAFTED: 70,
  POINTS_LEFT: 72,
};

/**
 * Check if a string is a valid Pokemon name
 */
function isValidPokemonName(value) {
  if (!value || typeof value !== 'string') return false;
  const name = value.trim();
  
  // Skip if too short
  if (name.length < 2) return false;
  
  // Skip status markers
  if (['X', 'x', 'Banned', 'Tera Banned', 'Drafted', 'Pts Left'].includes(name)) {
    return false;
  }
  
  // Skip if it's a number
  if (/^\d+$/.test(name)) {
    return false;
  }
  
  return true;
}

/**
 * Determine Pokemon status
 */
function determineStatus(pokemonName, row, bannedList, teraBannedList) {
  // Check if drafted
  const isDrafted = row[COLUMNS.DRAFTED] && 
    String(row[COLUMNS.DRAFTED]).toUpperCase().trim() === 'X';
  
  if (isDrafted) {
    return 'drafted';
  }
  
  // Check if banned
  const isBannedMarker = row[COLUMNS.BANNED_HEADER] && 
    String(row[COLUMNS.BANNED_HEADER]).toUpperCase().trim() === 'X';
  const isBannedName = bannedList.includes(pokemonName);
  
  if (isBannedMarker || isBannedName) {
    return 'banned';
  }
  
  // Check if Tera Banned
  const isTeraBannedMarker = row[COLUMNS.TERA_BANNED_HEADER] && 
    String(row[COLUMNS.TERA_BANNED_HEADER]).toUpperCase().trim() === 'X';
  const isTeraBannedName = teraBannedList.includes(pokemonName);
  
  if (isTeraBannedMarker || isTeraBannedName) {
    return 'tera_banned'; // Still draftable, but can't be Tera Captain
  }
  
  return 'available';
}

/**
 * Extract Pokemon from Draft Board
 */
function extractPokemon(draftBoard) {
  const allPokemon = [];
  const bannedPokemon = [];
  const teraBannedPokemon = [];
  
  // First pass: Extract banned and Tera banned lists
  for (let rowIdx = 4; rowIdx < draftBoard.length; rowIdx++) {
    const row = draftBoard[rowIdx];
    
    // Extract banned Pokemon (col 3)
    if (row[COLUMNS.BANNED_POKEMON] && isValidPokemonName(row[COLUMNS.BANNED_POKEMON])) {
      bannedPokemon.push(row[COLUMNS.BANNED_POKEMON].trim());
    }
    
    // Extract Tera Banned Pokemon (col 6)
    if (row[COLUMNS.TERA_BANNED_POKEMON] && isValidPokemonName(row[COLUMNS.TERA_BANNED_POKEMON])) {
      teraBannedPokemon.push(row[COLUMNS.TERA_BANNED_POKEMON].trim());
    }
  }
  
  // Second pass: Extract Pokemon from point value columns
  for (let rowIdx = 4; rowIdx < draftBoard.length; rowIdx++) {
    const row = draftBoard[rowIdx];
    
    // Extract Pokemon from point value columns
    for (const [headerColStr, pointValue] of Object.entries(POINT_COLUMNS)) {
      const headerCol = parseInt(headerColStr);
      const pokemonCol = headerCol + 1; // Pokemon is in next column after header
      
      // Check if column exists and has a value
      if (pokemonCol < row.length && row[pokemonCol] != null && row[pokemonCol] !== '') {
        const cellValue = row[pokemonCol];
        const name = typeof cellValue === 'string' ? cellValue.trim() : String(cellValue).trim();
        
        if (isValidPokemonName(name)) {
          const status = determineStatus(name, row, bannedPokemon, teraBannedPokemon);
          
          allPokemon.push({
            name,
            pointValue,
            row: rowIdx,
            headerCol,
            pokemonCol,
            status,
            isBanned: status === 'banned',
            isTeraBanned: status === 'tera_banned',
            isDrafted: status === 'drafted',
          });
        }
      }
    }
  }
  
  return {
    allPokemon,
    bannedPokemon: [...new Set(bannedPokemon)], // Remove duplicates
    teraBannedPokemon: [...new Set(teraBannedPokemon)], // Remove duplicates
  };
}

/**
 * Generate draft pool structure
 */
function generateDraftPool(draftBoardData) {
  const draftBoard = draftBoardData.sheets['Draft Board'].data;
  
  const { allPokemon, bannedPokemon, teraBannedPokemon } = extractPokemon(draftBoard);
  
  // Categorize Pokemon
  const categorized = {
    available: [],
    banned: [],
    teraBanned: [],
    drafted: [],
  };
  
  for (const pokemon of allPokemon) {
    if (pokemon.status === 'drafted') {
      categorized.drafted.push(pokemon);
    } else if (pokemon.status === 'banned') {
      categorized.banned.push(pokemon);
    } else if (pokemon.status === 'tera_banned') {
      categorized.teraBanned.push(pokemon);
    } else {
      categorized.available.push(pokemon);
    }
  }
  
  // Group by point value
  const byPointValue = {};
  for (const pokemon of allPokemon) {
    if (!byPointValue[pokemon.pointValue]) {
      byPointValue[pokemon.pointValue] = {
        total: 0,
        available: 0,
        drafted: 0,
        banned: 0,
        teraBanned: 0,
        pokemon: [],
      };
    }
    
    byPointValue[pokemon.pointValue].total++;
    byPointValue[pokemon.pointValue][pokemon.status === 'drafted' ? 'drafted' : 
      pokemon.status === 'banned' ? 'banned' :
      pokemon.status === 'tera_banned' ? 'teraBanned' : 'available']++;
    byPointValue[pokemon.pointValue].pokemon.push({
      name: pokemon.name,
      status: pokemon.status,
    });
  }
  
  return {
    config: CONFIG,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalPokemon: allPokemon.length,
      availableCount: categorized.available.length,
      bannedCount: categorized.banned.length,
      teraBannedCount: categorized.teraBanned.length,
      draftedCount: categorized.drafted.length,
    },
    pokemon: {
      available: categorized.available.map(p => ({
        name: p.name,
        pointValue: p.pointValue,
      })),
      banned: categorized.banned.map(p => ({
        name: p.name,
        pointValue: p.pointValue,
      })),
      teraBanned: categorized.teraBanned.map(p => ({
        name: p.name,
        pointValue: p.pointValue,
      })),
      drafted: categorized.drafted.map(p => ({
        name: p.name,
        pointValue: p.pointValue,
      })),
    },
    bannedList: bannedPokemon,
    teraBannedList: teraBannedPokemon,
    byPointValue,
    pointValueDistribution: Object.fromEntries(
      Object.entries(byPointValue).map(([pv, data]) => [pv, data.available])
    ),
  };
}

/**
 * Filter draft pool by criteria
 */
function filterDraftPool(draftPool, filters = {}) {
  let filtered = [...draftPool.pokemon.available];
  
  // Filter by point value range
  if (filters.minPointValue !== undefined) {
    filtered = filtered.filter(p => p.pointValue >= filters.minPointValue);
  }
  if (filters.maxPointValue !== undefined) {
    filtered = filtered.filter(p => p.pointValue <= filters.maxPointValue);
  }
  
  // Filter by exact point value
  if (filters.pointValue !== undefined) {
    filtered = filtered.filter(p => p.pointValue === filters.pointValue);
  }
  
  // Filter by name pattern
  if (filters.namePattern) {
    const pattern = new RegExp(filters.namePattern, 'i');
    filtered = filtered.filter(p => pattern.test(p.name));
  }
  
  // Filter out Tera Banned (if needed)
  if (filters.excludeTeraBanned) {
    const teraBannedNames = new Set(draftPool.teraBannedList);
    filtered = filtered.filter(p => !teraBannedNames.has(p.name));
  }
  
  return filtered;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const dataPath = join(__dirname, '..', 'data', 'google-sheets-export.json');
  const draftBoardData = JSON.parse(readFileSync(dataPath, 'utf8'));
  
  console.log('🔧 Generating Draft Pool...\n');
  
  const draftPool = generateDraftPool(draftBoardData);
  
  // Save to file
  const outputPath = join(__dirname, '..', 'data', 'draft-pool-generated.json');
  writeFileSync(outputPath, JSON.stringify(draftPool, null, 2));
  
  console.log('✅ Draft Pool Generated!\n');
  console.log('📊 Summary:');
  console.log(`  Total Pokemon: ${draftPool.metadata.totalPokemon}`);
  console.log(`  Available: ${draftPool.metadata.availableCount}`);
  console.log(`  Banned: ${draftPool.metadata.bannedCount}`);
  console.log(`  Tera Banned: ${draftPool.metadata.teraBannedCount}`);
  console.log(`  Drafted: ${draftPool.metadata.draftedCount}`);
  console.log(`\n💾 Saved to: ${outputPath}`);
  
  // Show point value distribution
  console.log('\n📊 Point Value Distribution (Available):');
  for (const [pv, count] of Object.entries(draftPool.pointValueDistribution).sort((a, b) => b[0] - a[0])) {
    console.log(`  ${pv} Points: ${count} Pokemon`);
  }
}

export { generateDraftPool, filterDraftPool, extractPokemon };
