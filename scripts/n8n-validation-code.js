/**
 * N8N Code Node: Validate Transaction
 * 
 * Validates league rules using season_rules when available; falls back to legacy defaults.
 */

// Get transaction and roster data
const transaction = $input.first().json;
const rosterData = $('Read D2:E11').first().json.values || [];
const rulesRow = $('Season Rules').first()?.json || {};

const budgetLimit = Number(rulesRow.draft_budget || rulesRow.draftBudget || 120);
const minRoster = Number(rulesRow.roster_size_min || rulesRow.rosterSizeMin || 8);
const maxRoster = Number(rulesRow.roster_size_max || rulesRow.rosterSizeMax || 10);
const transactionCap = Number(rulesRow.transaction_cap || rulesRow.transactionCap || 10);

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
    valid: newPointTotal <= budgetLimit,
    message: newPointTotal > budgetLimit 
      ? `Budget exceeded: ${newPointTotal}pts > ${budgetLimit}pts (current: ${currentPointTotal}pts, dropped: ${droppedPokemonPoints}pts, added: ${newPokemonPoints}pts)` 
      : null
  },
  rosterSize: {
    valid: newRosterSize >= minRoster && newRosterSize <= maxRoster,
    message: newRosterSize < 8 
      ? `Roster too small: ${newRosterSize} < 8 (current: ${currentRosterSize})`
      : newRosterSize > 10
      ? `Roster too large: ${newRosterSize} > 10 (current: ${currentRosterSize})`
      : null
  },
  transactionLimit: {
    valid: true, // TODO: Track transaction count (would need database tracking)
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
