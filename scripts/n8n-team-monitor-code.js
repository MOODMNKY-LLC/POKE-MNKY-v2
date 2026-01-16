/**
 * N8N Code Node: Process F2:F11 to G2:G11
 * 
 * This code processes team page cells and copies non-blank values
 * from F2:F11 to G2:G11, preserving existing G values when F is blank.
 * 
 * Usage: Add as "Code" node in N8N workflow after reading F2:G11 range
 */

// Get input data from previous node (Google Sheets Read)
const inputData = $input.first();
const values = inputData.json.values || [];

// Get sheet name from loop context
const sheetName = $('Loop Over Items').item.json.title || 
                  $('Split Team Sheets').item.json.title ||
                  'Unknown Sheet';

// Array to store updates for G2:G11
const gUpdates = [];

// Process rows 2-11 (index 0-9 in the values array)
for (let i = 0; i < Math.min(10, values.length); i++) {
  const row = values[i] || [];
  
  // Column F is index 0, Column G is index 1
  const fValue = String(row[0] || '').trim(); // Column F (Free Agency additions)
  const gValue = String(row[1] || '').trim(); // Column G (Transaction column)
  
  // Only copy F to G if F has text (non-blank)
  if (fValue !== '') {
    gUpdates.push(fValue);
  } else {
    // Keep existing G value if F is blank
    gUpdates.push(gValue);
  }
}

// Return updates in format for Google Sheets Update node
// Format: [["value1"], ["value2"], ...]
return [{
  json: {
    sheetName: sheetName,
    range: `${sheetName}!G2:G11`,
    values: gUpdates.map(val => [val]), // Each value needs to be in an array
    rowCount: gUpdates.length,
    hasUpdates: gUpdates.some((val, idx) => {
      const originalG = String((values[idx] || [])[1] || '').trim();
      return val !== originalG;
    })
  }
}];
