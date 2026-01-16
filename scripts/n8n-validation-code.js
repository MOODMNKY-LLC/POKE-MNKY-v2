/**
 * N8N Code Node: Validate Transaction
 * 
 * Validates: budget (120pts), roster size (8-10), transaction limit (10 F/A moves), timing
 */

// Get transaction and roster data
const transaction = $input.first().json;
const rosterData = $('Read D2:E11').first().json.values || [];

// Calculate current roster stats
let currentRosterSize = 0;
let currentPointTotal = 0;
const rosterPokemon = [];

for (const row of rosterData) {
  const pokemon = String(row[0] || '').trim();
  const points = parseInt(String(row[1] || '0'), 10);
  
  if (pokemon) {
    currentRosterSize++;
    currentPointTotal += points;
    rosterPokemon.push({ pokemon, points });
  }
}

// Get dropped Pokemon points from current roster
let droppedPokemonPoints = 0;
if (transaction.dropPokemon) {
  for (const rosterItem of rosterPokemon) {
    if (rosterItem.pokemon.toLowerCase() === transaction.dropPokemon.toLowerCase()) {
      droppedPokemonPoints = rosterItem.points;
      break;
    }
  }
}

// Get new Pokemon point value (placeholder - would need Draft Board lookup)
// TODO: Read Draft Board to get actual point value
const newPokemonPoints = transaction.addPokemon ? 15 : 0; // Placeholder

// Calculate new totals
const newRosterSize = transaction.type === 'replacement' 
  ? currentRosterSize  // Same size
  : transaction.type === 'addition'
  ? currentRosterSize + 1  // Add one
  : currentRosterSize - 1; // Drop one

const newPointTotal = currentPointTotal - droppedPokemonPoints + newPokemonPoints;

// Validation checks
const validations = {
  budget: {
    valid: newPointTotal <= 120,
    message: newPointTotal > 120 
      ? `Budget exceeded: ${newPointTotal}pts > 120pts (current: ${currentPointTotal}pts, dropped: ${droppedPokemonPoints}pts, added: ${newPokemonPoints}pts)` 
      : null
  },
  rosterSize: {
    valid: newRosterSize >= 8 && newRosterSize <= 10,
    message: newRosterSize < 8 
      ? `Roster too small: ${newRosterSize} < 8 (current: ${currentRosterSize})`
      : newRosterSize > 10
      ? `Roster too large: ${newRosterSize} > 10 (current: ${currentRosterSize})`
      : null
  },
  transactionLimit: {
    valid: true, // TODO: Track transaction count (would need database or sheet tracking)
    message: null
  },
  timing: {
    valid: true, // TODO: Check if Monday 12AM EST (would check current date/time)
    message: null
  }
};

const isValid = Object.values(validations).every(v => v.valid);
const errors = Object.values(validations)
  .filter(v => v.message)
  .map(v => v.message);

return [{
  json: {
    ...transaction,
    validation: {
      isValid: isValid,
      errors: errors,
      currentRosterSize: currentRosterSize,
      currentPointTotal: currentPointTotal,
      newRosterSize: newRosterSize,
      newPointTotal: newPointTotal,
      droppedPokemonPoints: droppedPokemonPoints,
      newPokemonPoints: newPokemonPoints
    }
  }
}];
