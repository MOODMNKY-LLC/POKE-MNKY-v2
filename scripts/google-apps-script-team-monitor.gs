/**
 * Google Apps Script: Team Page Transaction Monitor
 * 
 * This script monitors team pages and automatically copies non-blank values
 * from F2:F11 to G2:G11 when G2:G11 is updated.
 * 
 * Setup:
 * 1. Open Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this code
 * 4. Save and authorize
 * 5. The script will run automatically on edits
 */

/**
 * Triggered when any cell is edited
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const sheetName = sheet.getName();
  
  // Check if edit is in G2:G11 (Column G = 7)
  const isGColumn = range.getColumn() === 7;
  const isRow2to11 = range.getRow() >= 2 && range.getRow() <= 11;
  
  // Check if it's a team page
  const isTeamPage = /team\s*\d+/i.test(sheetName);
  
  if (isGColumn && isRow2to11 && isTeamPage) {
    // Read F2:F11
    const fRange = sheet.getRange('F2:F11');
    const fValues = fRange.getValues();
    
    // Read current G2:G11
    const gRange = sheet.getRange('G2:G11');
    const gValues = gRange.getValues();
    
    // Process: Copy non-blank F values to G
    const updates = [];
    for (let i = 0; i < fValues.length; i++) {
      const fValue = String(fValues[i][0] || '').trim();
      const currentGValue = String(gValues[i][0] || '').trim();
      
      // Only copy F to G if F has text
      if (fValue !== '') {
        updates.push([fValue]);
      } else {
        // Keep existing G value if F is blank
        updates.push([currentGValue]);
      }
    }
    
    // Update G2:G11
    gRange.setValues(updates);
    
    // Optional: Log the update
    Logger.log(`Updated G2:G11 in ${sheetName} with ${updates.filter(u => u[0] !== '').length} non-blank values from F2:F11`);
  }
}

/**
 * Manual function to process all team pages
 * Run this from Apps Script editor to process all teams at once
 */
function processAllTeamPages() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = spreadsheet.getSheets();
  
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    
    // Check if it's a team page
    if (/team\s*\d+/i.test(sheetName)) {
      try {
        // Read F2:F11
        const fRange = sheet.getRange('F2:F11');
        const fValues = fRange.getValues();
        
        // Read current G2:G11
        const gRange = sheet.getRange('G2:G11');
        const gValues = gRange.getValues();
        
        // Process: Copy non-blank F values to G
        const updates = [];
        for (let i = 0; i < fValues.length; i++) {
          const fValue = String(fValues[i][0] || '').trim();
          const currentGValue = String(gValues[i][0] || '').trim();
          
          // Only copy F to G if F has text
          if (fValue !== '') {
            updates.push([fValue]);
          } else {
            // Keep existing G value if F is blank
            updates.push([currentGValue]);
          }
        }
        
        // Update G2:G11
        gRange.setValues(updates);
        
        Logger.log(`Processed ${sheetName}: Updated ${updates.filter(u => u[0] !== '').length} cells`);
      } catch (error) {
        Logger.log(`Error processing ${sheetName}: ${error.message}`);
      }
    }
  });
  
  Logger.log('Finished processing all team pages');
}

/**
 * Optional: Send webhook to N8N when update occurs
 * Configure your N8N webhook URL in the constant below
 */
function sendWebhookToN8N(sheetName, updateCount) {
  const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL_HERE'; // Replace with your N8N webhook URL
  
  if (N8N_WEBHOOK_URL === 'YOUR_N8N_WEBHOOK_URL_HERE') {
    return; // Skip if not configured
  }
  
  try {
    const payload = {
      sheetName: sheetName,
      updateCount: updateCount,
      timestamp: new Date().toISOString()
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(N8N_WEBHOOK_URL, options);
    Logger.log(`Webhook sent: ${response.getResponseCode()}`);
  } catch (error) {
    Logger.log(`Webhook error: ${error.message}`);
  }
}
