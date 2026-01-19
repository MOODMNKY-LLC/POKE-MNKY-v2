#!/usr/bin/env node
/**
 * Extract Draft Pool Generation Logic from Google Sheets
 * 
 * Analyzes the Draft Board structure and extracts the complete logic
 * for generating draft pools programmatically.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const data = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'google-sheets-export.json'), 'utf8'));

console.log('🔍 Extracting Draft Pool Generation Logic\n');

// Analyze Draft Board structure
const draftBoard = data.sheets['Draft Board'].data;
const rules = data.sheets['Rules'].data;
const masterData = data.sheets['Master Data Sheet'].data;

// Extract configuration from Rules
const config = {
  draftBudget: 120,
  teraBudget: 15,
  minTeamSize: 8,
  maxTeamSize: 10,
  teams: 20, // Based on Team 1-20 sheets
  pointRange: { min: 1, max: 20 },
  freeAgencyTransactions: 10,
  freeAgencyDeadline: 'Week 8',
  rosterLockAfter: 'Week 8',
};

// Extract from Rules sheet
for (const row of rules) {
  const rowText = row.join(' ').toLowerCase();
  if (rowText.includes('drafting budget')) {
    const match = rowText.match(/(\d+)\s*pts/);
    if (match) config.draftBudget = parseInt(match[1]);
  }
  if (rowText.includes('tera budget')) {
    const match = rowText.match(/(\d+)\s*pts/);
    if (match) config.teraBudget = parseInt(match[1]);
  }
  if (rowText.includes('at least') && rowText.includes('no more than')) {
    const minMatch = rowText.match(/at least\s*(\d+)/);
    const maxMatch = rowText.match(/no more than\s*(\d+)/);
    if (minMatch) config.minTeamSize = parseInt(minMatch[1]);
    if (maxMatch) config.maxTeamSize = parseInt(maxMatch[1]);
  }
}

console.log('📊 Configuration Extracted:');
console.log(JSON.stringify(config, null, 2));
console.log('');

// Parse Draft Board structure
const headerRow = draftBoard[2];
const pointColumns = {};
for (let i = 0; i < headerRow.length; i++) {
  const val = headerRow[i];
  if (val && val.toString().includes('Point')) {
    const match = val.toString().match(/(\d+)\s*Point/);
    if (match) {
      pointColumns[i] = parseInt(match[1]);
    }
  }
}

console.log('📌 Point Value Column Mapping:');
console.log(JSON.stringify(pointColumns, null, 2));
console.log('');

// Extract all Pokemon from Draft Board
const allPokemon = [];
const bannedPokemon = [];
const teraBannedPokemon = [];
const draftedPokemon = [];

for (let rowIdx = 4; rowIdx < draftBoard.length; rowIdx++) {
  const row = draftBoard[rowIdx];
  
  // Check Banned column (col 3)
  if (row[3] && typeof row[3] === 'string' && row[3].trim().length > 2) {
    bannedPokemon.push({
      name: row[3].trim(),
      row: rowIdx,
      source: 'banned_column',
    });
  }
  
  // Check Tera Banned column (col 6)
  if (row[6] && typeof row[6] === 'string' && row[6].trim().length > 2) {
    teraBannedPokemon.push({
      name: row[6].trim(),
      row: rowIdx,
      source: 'tera_banned_column',
    });
  }
  
  // Check Drafted column (col 70)
  const isDrafted = row[70] && (row[70].toString().toUpperCase() === 'X');
  
  // Extract Pokemon from point value columns
  // Pokemon names are in col+1 from the header (e.g., header in col 8, Pokemon in col 9)
  for (const [colIdx, pointValue] of Object.entries(pointColumns)) {
    const headerCol = parseInt(colIdx);
    const pokemonCol = headerCol + 1; // Pokemon is in the next column after header
    
    // Check if column exists and has a value
    if (pokemonCol < row.length && row[pokemonCol] != null && row[pokemonCol] !== '') {
      const cellValue = row[pokemonCol];
      const name = typeof cellValue === 'string' ? cellValue.trim() : String(cellValue).trim();
      
      // Skip if empty, too short, or a status marker
      if (name.length < 2 || ['X', 'x', 'Banned', 'Tera Banned', 'Drafted', 'Pts Left'].includes(name)) {
        continue;
      }
      
      // Skip if it's a number (like "120" in Pts Left column)
      if (/^\d+$/.test(name)) {
        continue;
      }
      
      // Check status columns
      const isBanned = row[2] && (String(row[2]).toUpperCase().trim() === 'X');
      const isTeraBanned = row[5] && (String(row[5]).toUpperCase().trim() === 'X');
      
      allPokemon.push({
        name,
        pointValue,
        row: rowIdx,
        headerCol: headerCol,
        pokemonCol: pokemonCol,
        isBanned,
        isTeraBanned,
        isDrafted,
        status: isDrafted ? 'drafted' : (isBanned ? 'banned' : (isTeraBanned ? 'tera_banned' : 'available')),
      });
      
      if (isDrafted) {
        draftedPokemon.push(name);
      }
    }
  }
}

console.log(`📊 Pokemon Extracted:`);
console.log(`  Total Pokemon: ${allPokemon.length}`);
console.log(`  Banned (col 3): ${bannedPokemon.length}`);
console.log(`  Tera Banned (col 6): ${teraBannedPokemon.length}`);
console.log(`  Drafted: ${draftedPokemon.length}`);
console.log(`  Available: ${allPokemon.filter(p => p.status === 'available').length}`);
console.log('');

// Group by point value
const byPointValue = {};
for (const pokemon of allPokemon) {
  if (!byPointValue[pokemon.pointValue]) {
    byPointValue[pokemon.pointValue] = [];
  }
  byPointValue[pokemon.pointValue].push(pokemon);
}

console.log('📊 Pokemon by Point Value:');
for (const [point, pokemon] of Object.entries(byPointValue).sort((a, b) => b[0] - a[0])) {
  const available = pokemon.filter(p => p.status === 'available').length;
  const drafted = pokemon.filter(p => p.status === 'drafted').length;
  const banned = pokemon.filter(p => p.status === 'banned').length;
  console.log(`  ${point} Points: ${pokemon.length} total (${available} available, ${drafted} drafted, ${banned} banned)`);
}

// Extract draft pool generation logic
const draftPoolLogic = {
  config,
  structure: {
    headerRow: 2,
    dataStartRow: 4,
    columns: {
      banned: 2,
      bannedPokemon: 3,
      teraBanned: 5,
      teraBannedPokemon: 6,
      pointValueColumns: pointColumns,
      drafted: 70,
      pointsLeft: 72,
    },
  },
  pokemon: allPokemon,
  bannedPokemon: bannedPokemon.map(p => p.name),
  teraBannedPokemon: teraBannedPokemon.map(p => p.name),
  draftedPokemon,
  byPointValue: Object.fromEntries(
    Object.entries(byPointValue).map(([pv, pokemon]) => [
      pv,
      {
        total: pokemon.length,
        available: pokemon.filter(p => p.status === 'available').length,
        drafted: pokemon.filter(p => p.status === 'drafted').length,
        banned: pokemon.filter(p => p.status === 'banned').length,
        pokemon: pokemon.map(p => ({
          name: p.name,
          status: p.status,
        })),
      },
    ])
  ),
  generationRules: {
    availableCriteria: [
      'Pokemon must be in point value columns (cols 9, 12, 15, etc.)',
      'Pokemon must NOT be in Banned column (col 3)',
      'Pokemon must NOT be marked as Drafted (col 70 = "X")',
      'Pokemon can be Tera Banned (col 6) but still draftable (just can\'t be Tera Captain)',
    ],
    pointValueAssignment: 'Point value determined by column position (+1 from header column)',
    statusDetermination: {
      banned: 'Col 2 = "X" OR Pokemon name in col 3',
      teraBanned: 'Col 5 = "X" OR Pokemon name in col 6',
      drafted: 'Col 70 = "X"',
      available: 'Not banned, not drafted',
    },
  },
};

// Save extracted logic
const outputPath = join(__dirname, '..', 'data', 'draft-pool-logic.json');
writeFileSync(outputPath, JSON.stringify(draftPoolLogic, null, 2));
console.log(`\n💾 Draft pool logic saved to: ${outputPath}`);

// Generate summary
const summary = {
  totalPokemon: allPokemon.length,
  availablePokemon: allPokemon.filter(p => p.status === 'available').length,
  pointValueDistribution: Object.fromEntries(
    Object.entries(byPointValue).map(([pv, pokemon]) => [
      pv,
      pokemon.filter(p => p.status === 'available').length,
    ])
  ),
  config,
};

console.log('\n📋 Summary:');
console.log(JSON.stringify(summary, null, 2));
