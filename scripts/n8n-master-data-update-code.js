/**
 * N8N Code Node: Find Pokemon in Master Data Sheet Blocks
 * 
 * This code finds Pokemon in draft result blocks and prepares update operations
 */

// Get transaction data
const transaction = $input.first().json;

// Get Master Data Sheet blocks
const block1Data = $('Read Master Data Block 1').first().json.values || [];
const block2Data = $('Read Master Data Block 2').first().json.values || [];

const teamNumber = transaction.teamNumber;
const teamBlock = teamNumber <= 11 ? 1 : 2;
const blockData = teamNumber <= 11 ? block1Data : block2Data;

// Team column mapping
// Block 1: Teams 1-11 = Columns B-K (index 0-9)
// Block 2: Teams 12-20 = Columns B-K (index 0-9)
const teamColumnIndex = teamNumber <= 11 
  ? teamNumber - 1  // Team 1 = Column B (index 0)
  : teamNumber - 12; // Team 12 = Column B (index 0)

const teamColumnLetter = String.fromCharCode(66 + teamColumnIndex); // B=66, C=67, etc.
const blockStartRow = teamNumber <= 11 ? 95 : 110; // Block 1 starts at 95, Block 2 at 110

const updates = [];

// For dropped Pokemon: Find and prepare for clearing
if (transaction.dropPokemon) {
  let found = false;
  for (let rowIdx = 1; rowIdx < blockData.length; rowIdx++) { // Skip header row (index 0)
    const row = blockData[rowIdx] || [];
    const cellValue = String(row[teamColumnIndex] || '').trim();
    
    if (cellValue.toLowerCase() === transaction.dropPokemon.toLowerCase()) {
      const actualRow = blockStartRow + rowIdx - 1; // Adjust for header
      updates.push({
        action: 'clear',
        pokemon: transaction.dropPokemon,
        range: `Master Data Sheet!${teamColumnLetter}${actualRow}`,
        cell: `${teamColumnLetter}${actualRow}`,
        block: teamBlock,
        teamColumn: teamColumnLetter,
        teamColumnIndex: teamColumnIndex,
        row: actualRow
      });
      found = true;
      break;
    }
  }
  
  if (!found) {
    // Pokemon not found - log warning
    updates.push({
      action: 'clear',
      pokemon: transaction.dropPokemon,
      range: null,
      cell: null,
      error: `Pokemon "${transaction.dropPokemon}" not found in Master Data Sheet`,
      block: teamBlock
    });
  }
}

// For added Pokemon: Find empty cell in team's column
if (transaction.addPokemon) {
  let emptyCellFound = false;
  
  // Search for first empty cell in team's column
  for (let rowIdx = 1; rowIdx < blockData.length; rowIdx++) {
    const row = blockData[rowIdx] || [];
    const cellValue = String(row[teamColumnIndex] || '').trim();
    
    if (!cellValue || cellValue === '') {
      const actualRow = blockStartRow + rowIdx - 1;
      updates.push({
        action: 'add',
        pokemon: transaction.addPokemon,
        range: `Master Data Sheet!${teamColumnLetter}${actualRow}`,
        cell: `${teamColumnLetter}${actualRow}`,
        block: teamBlock,
        teamColumn: teamColumnLetter,
        teamColumnIndex: teamColumnIndex,
        row: actualRow
      });
      emptyCellFound = true;
      break;
    }
  }
  
  // If no empty cell found, add to end
  if (!emptyCellFound) {
    const nextRow = blockStartRow + blockData.length - 1;
    updates.push({
      action: 'add',
      pokemon: transaction.addPokemon,
      range: `Master Data Sheet!${teamColumnLetter}${nextRow}`,
      cell: `${teamColumnLetter}${nextRow}`,
      block: teamBlock,
      teamColumn: teamColumnLetter,
      teamColumnIndex: teamColumnIndex,
      row: nextRow,
      note: 'Added to end of roster'
    });
  }
}

// Return updates with transaction context
return updates.map(update => ({
  json: {
    ...transaction,
    ...update
  }
}));
