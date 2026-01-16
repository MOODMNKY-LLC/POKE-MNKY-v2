/**
 * N8N Code Node: Filter Team Pages
 * 
 * Filters sheets to only Team Pages (Team 1, Team 2, ..., Team 20)
 */

// Get all sheets from previous node
const sheets = $input.all();
const teamSheets = [];

for (const sheet of sheets) {
  const sheetTitle = sheet.json.properties?.title || sheet.json.title || '';
  const normalizedTitle = sheetTitle.toLowerCase().trim();
  
  // Match team pages: "Team 1", "Team 2", etc.
  const teamMatch = normalizedTitle.match(/^team\s*(\d+)$/i);
  
  if (teamMatch) {
    const teamNumber = parseInt(teamMatch[1], 10);
    if (teamNumber >= 1 && teamNumber <= 20) {
      teamSheets.push({
        json: {
          teamNumber: teamNumber,
          sheetName: sheetTitle,
          sheetId: sheet.json.properties?.sheetId || sheet.json.sheetId
        }
      });
    }
  }
}

return teamSheets;
