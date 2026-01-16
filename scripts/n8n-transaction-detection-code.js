/**
 * N8N Code Node: Detect Transaction Type
 * 
 * Reads F2:G11 and D2:E11 to detect free agency transactions
 */

// Get F2:G11 data (additions and drops)
const fgData = $('Read F2:G11').first().json.values || [];
const deData = $('Read D2:E11').first().json.values || [];

const transactions = [];

// Process each row in F2:G11
for (let i = 0; i < Math.min(10, fgData.length); i++) {
  const row = fgData[i] || [];
  const fValue = String(row[0] || '').trim(); // Column F (Additions)
  const gValue = String(row[1] || '').trim(); // Column G (Drops)
  
  // Skip if both are blank
  if (!fValue && !gValue) continue;
  
  // Extract dropped Pokemon from G ("Dropping: [Name]")
  let droppedPokemon = null;
  if (gValue && gValue.toLowerCase().includes('dropping:')) {
    // Extract Pokemon name after "Dropping:"
    droppedPokemon = gValue.replace(/^.*dropping:\s*/i, '').trim();
  }
  
  // Determine transaction type
  let transactionType = null;
  if (fValue && droppedPokemon) {
    transactionType = 'replacement';
  } else if (fValue && !droppedPokemon) {
    transactionType = 'addition';
  } else if (!fValue && droppedPokemon) {
    transactionType = 'drop_only';
  }
  
  if (transactionType) {
    // Get dropped Pokemon's point value from current roster
    let droppedPoints = 0;
    if (droppedPokemon) {
      for (const rosterRow of deData) {
        const pokemon = String(rosterRow[0] || '').trim();
        if (pokemon.toLowerCase() === droppedPokemon.toLowerCase()) {
          droppedPoints = parseInt(String(rosterRow[1] || '0'), 10);
          break;
        }
      }
    }
    
    transactions.push({
      row: i + 2, // Actual row number (2-11)
      type: transactionType,
      addPokemon: fValue || null,
      dropPokemon: droppedPokemon || null,
      droppedPoints: droppedPoints,
      needsProcessing: true,
      teamNumber: $('Filter Team Pages').first().json.teamNumber,
      sheetName: $('Filter Team Pages').first().json.sheetName
    });
  }
}

// Return transactions if any found
if (transactions.length === 0) {
  return [{ json: { hasTransactions: false } }];
}

return transactions.map(t => ({ 
  json: {
    ...t,
    hasTransactions: true
  }
}));
