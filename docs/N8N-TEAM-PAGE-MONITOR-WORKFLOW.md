# N8N Workflow: Team Page Transaction Monitor

> **Purpose**: Monitor team pages and copy non-blank values from F2:F11 to G2:G11 when G2:G11 is updated

---

## 📋 Overview

This N8N workflow:
1. **Monitors** all team pages in Google Sheets
2. **Detects changes** in cells G2:G11 (transaction column)
3. **Reads** corresponding cells F2:F11 (free agency additions)
4. **Filters** to only non-blank values in F2:F11
5. **Updates** G2:G11 with filtered values from F2:F11

---

## 🔧 N8N Workflow JSON

```json
{
  "name": "Team Page Transaction Monitor",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 5
            }
          ]
        }
      },
      "id": "cron-trigger",
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "operation": "getAll",
        "documentId": {
          "__rl": true,
          "value": "={{ $env.GOOGLE_SHEET_ID }}",
          "mode": "id"
        },
        "options": {
          "valueFormat": "UNFORMATTED_VALUE"
        }
      },
      "id": "get-all-sheets",
      "name": "Get All Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [450, 300],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets OAuth2"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// Filter to only team pages\nconst sheets = $input.all();\nconst teamSheets = [];\n\nfor (const sheet of sheets) {\n  const sheetTitle = sheet.json.properties?.title || '';\n  const normalizedTitle = sheetTitle.toLowerCase();\n  \n  // Match team pages (Team 1, Team 2, Team 3, etc.)\n  if (normalizedTitle.includes('team') && /team\\s*\\d+/i.test(sheetTitle)) {\n    teamSheets.push({\n      sheetId: sheet.json.properties?.sheetId,\n      title: sheetTitle,\n      index: sheet.json.properties?.index\n    });\n  }\n}\n\nreturn teamSheets.map(sheet => ({ json: sheet }));"
      },
      "id": "filter-team-sheets",
      "name": "Filter Team Sheets",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [650, 300]
    },
    {
      "parameters": {
        "batchSize": 1,
        "options": {}
      },
      "id": "split-team-sheets",
      "name": "Split Team Sheets",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 3,
      "position": [850, 300]
    },
    {
      "parameters": {
        "operation": "read",
        "documentId": {
          "__rl": true,
          "value": "={{ $env.GOOGLE_SHEET_ID }}",
          "mode": "id"
        },
        "sheetName": {
          "__rl": true,
          "value": "={{ $json.title }}",
          "mode": "name"
        },
        "range": "F2:G11",
        "options": {
          "valueFormat": "UNFORMATTED_VALUE"
        }
      },
      "id": "read-cells-f-g",
      "name": "Read F2:G11 Cells",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [1050, 300],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets OAuth2"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// Process F2:F11 and G2:G11\n// Only copy non-blank values from F to G\nconst inputData = $input.first();\nconst values = inputData.json.values || [];\n\nconst sheetName = $('Split Team Sheets').item.json.title;\nconst updates = [];\n\n// Process rows 2-11 (index 0-9 in array)\nfor (let i = 0; i < Math.min(10, values.length); i++) {\n  const row = values[i] || [];\n  const fValue = row[0] || ''; // Column F (index 0)\n  const gValue = row[1] || ''; // Column G (index 1)\n  \n  // Only update if F has text and G is different\n  if (fValue.trim() !== '' && fValue.trim() !== gValue.trim()) {\n    updates.push({\n      row: i + 2, // Actual row number (2-11)\n      column: 'G',\n      value: fValue.trim(),\n      sheetName: sheetName\n    });\n  }\n}\n\nreturn updates.map(update => ({ json: update }));"
      },
      "id": "process-cells",
      "name": "Process F to G",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "has-updates",
              "leftValue": "={{ $json.value }}",
              "rightValue": "",
              "operator": {
                "type": "string",
                "operation": "notEmpty"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "filter-updates",
      "name": "Filter Updates",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1450, 300]
    },
    {
      "parameters": {
        "operation": "update",
        "documentId": {
          "__rl": true,
          "value": "={{ $env.GOOGLE_SHEET_ID }}",
          "mode": "id"
        },
        "sheetName": {
          "__rl": true,
          "value": "={{ $('Split Team Sheets').item.json.title }}",
          "mode": "name"
        },
        "columnToMatchOn": "G",
        "valueToMatchOn": "={{ $json.row }}",
        "fieldsToSend": "values",
        "options": {
          "valueInputOption": "USER_ENTERED"
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "G": "={{ $json.value }}"
          }
        }
      },
      "id": "update-g-column",
      "name": "Update G Column",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [1650, 200],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets OAuth2"
        }
      }
    },
    {
      "parameters": {
        "operation": "appendOrUpdate",
        "documentId": {
          "__rl": true,
          "value": "={{ $env.GOOGLE_SHEET_ID }}",
          "mode": "id"
        },
        "sheetName": {
          "__rl": true,
          "value": "={{ $('Split Team Sheets').item.json.title }}",
          "mode": "name"
        },
        "columnToMatchOn": "G",
        "valueToMatchOn": "={{ $json.row }}",
        "fieldsToSend": "values",
        "options": {
          "valueInputOption": "USER_ENTERED"
        },
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "G": "={{ $json.value }}"
          }
        }
      },
      "id": "update-g-alternative",
      "name": "Update G (Alternative)",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [1650, 400],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "google-sheets-credentials",
          "name": "Google Sheets OAuth2"
        }
      }
    }
  ],
  "connections": {
    "Cron Trigger": {
      "main": [
        [
          {
            "node": "Get All Sheets",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get All Sheets": {
      "main": [
        [
          {
            "node": "Filter Team Sheets",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filter Team Sheets": {
      "main": [
        [
          {
            "node": "Split Team Sheets",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Split Team Sheets": {
      "main": [
        [
          {
            "node": "Read F2:G11 Cells",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read F2:G11 Cells": {
      "main": [
        [
          {
            "node": "Process F to G",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process F to G": {
      "main": [
        [
          {
            "node": "Filter Updates",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Filter Updates": {
      "main": [
        [
          {
            "node": "Update G Column",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Update G (Alternative)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "tags": [],
  "triggerCount": 1,
  "updatedAt": "2026-01-12T00:00:00.000Z",
  "versionId": "1"
}
```

---

## 🚀 Simplified N8N Workflow (Recommended)

For a simpler approach, here's a more straightforward workflow:

### Workflow Steps:

1. **Cron Trigger** (Every 5 minutes)
2. **Google Sheets: Get All Sheets**
3. **Code: Filter Team Sheets**
4. **Loop Over Items** (for each team sheet)
5. **Google Sheets: Read Range** (F2:G11)
6. **Code: Process and Update**
7. **Google Sheets: Update Range** (G2:G11)

### Simplified Code Node (Process F to G):

```javascript
// Read F2:G11 and copy non-blank F values to G
const inputData = $input.first();
const values = inputData.json.values || [];

const sheetName = $('Loop Over Items').item.json.title;
const updates = [];

// Process rows 2-11
for (let i = 0; i < Math.min(10, values.length); i++) {
  const row = values[i] || [];
  const fValue = String(row[0] || '').trim(); // Column F
  const gValue = String(row[1] || '').trim(); // Column G
  
  // Only update if F has text
  if (fValue !== '') {
    updates.push(fValue);
  } else {
    updates.push(gValue); // Keep existing G value if F is blank
  }
}

// Return in format for Google Sheets update
return [{
  json: {
    range: `${sheetName}!G2:G11`,
    values: updates.map(val => [val])
  }
}];
```

---

## 📝 Step-by-Step Setup Instructions

### 1. Create New N8N Workflow

1. Open N8N
2. Click **"New Workflow"**
3. Name it: **"Team Page Transaction Monitor"**

### 2. Add Cron Trigger

1. Add **"Cron"** node
2. Set interval: **Every 5 minutes** (or your preferred interval)
3. This triggers the workflow periodically

### 3. Add Google Sheets: Get All Sheets

1. Add **"Google Sheets"** node
2. Set operation: **"Get All Sheets"**
3. Configure credentials:
   - Use OAuth2 or Service Account
   - Spreadsheet ID: `{{ $env.GOOGLE_SHEET_ID }}` or hardcode your sheet ID
4. This gets all sheets in the spreadsheet

### 4. Add Code: Filter Team Sheets

1. Add **"Code"** node
2. Set mode: **"Run Once for All Items"**
3. Paste this code:

```javascript
// Filter to only team pages
const sheets = $input.all();
const teamSheets = [];

for (const sheet of sheets) {
  const sheetTitle = sheet.json.properties?.title || sheet.json.title || '';
  const normalizedTitle = sheetTitle.toLowerCase();
  
  // Match team pages (Team 1, Team 2, Team 3, etc.)
  if (normalizedTitle.includes('team') && /team\s*\d+/i.test(sheetTitle)) {
    teamSheets.push({
      title: sheetTitle,
      sheetId: sheet.json.properties?.sheetId || sheet.json.sheetId
    });
  }
}

return teamSheets.map(sheet => ({ json: sheet }));
```

### 5. Add Loop Over Items

1. Add **"Loop Over Items"** node (or use "Split In Batches")
2. This processes each team sheet one at a time

### 6. Add Google Sheets: Read Range

1. Add **"Google Sheets"** node
2. Set operation: **"Read"**
3. Configure:
   - Spreadsheet ID: `{{ $env.GOOGLE_SHEET_ID }}`
   - Sheet Name: `{{ $json.title }}`
   - Range: `F2:G11`
   - Value Format: `UNFORMATTED_VALUE`

### 7. Add Code: Process F to G

1. Add **"Code"** node
2. Set mode: **"Run Once for Each Item"**
3. Paste this code:

```javascript
// Process F2:F11 and copy non-blank values to G2:G11
const inputData = $input.first();
const values = inputData.json.values || [];

const sheetName = $('Loop Over Items').item.json.title;
const gUpdates = [];

// Process rows 2-11 (index 0-9)
for (let i = 0; i < Math.min(10, values.length); i++) {
  const row = values[i] || [];
  const fValue = String(row[0] || '').trim(); // Column F
  const gValue = String(row[1] || '').trim(); // Column G (current value)
  
  // Only copy F to G if F has text
  if (fValue !== '') {
    gUpdates.push(fValue);
  } else {
    // Keep existing G value if F is blank
    gUpdates.push(gValue);
  }
}

// Return updates in format: [["value1"], ["value2"], ...]
return [{
  json: {
    sheetName: sheetName,
    range: `${sheetName}!G2:G11`,
    values: gUpdates.map(val => [val])
  }
}];
```

### 8. Add Google Sheets: Update Range

1. Add **"Google Sheets"** node
2. Set operation: **"Update"** or **"Append or Update"**
3. Configure:
   - Spreadsheet ID: `{{ $env.GOOGLE_SHEET_ID }}`
   - Sheet Name: `{{ $json.sheetName }}`
   - Range: `{{ $json.range }}`
   - Values: `{{ $json.values }}`
   - Value Input Option: `USER_ENTERED`

### 9. Test and Activate

1. Click **"Execute Workflow"** to test
2. Check the output at each step
3. Once working, click **"Save"** and **"Activate"**

---

## 🔄 Alternative: Webhook-Based Approach

If you want real-time updates instead of polling:

### Use Google Apps Script Webhook

1. **Create Google Apps Script** that triggers on edit
2. **Send webhook** to N8N when G2:G11 changes
3. **N8N receives webhook** and processes the update

### Google Apps Script Code:

```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  
  // Check if edit is in G2:G11
  if (range.getColumn() === 7 && range.getRow() >= 2 && range.getRow() <= 11) {
    const sheetName = sheet.getName();
    
    // Check if it's a team page
    if (sheetName.toLowerCase().includes('team')) {
      // Read F2:F11
      const fRange = sheet.getRange('F2:F11');
      const fValues = fRange.getValues();
      
      // Read G2:G11
      const gRange = sheet.getRange('G2:G11');
      const gValues = gRange.getValues();
      
      // Update G2:G11 with non-blank F values
      const updates = [];
      for (let i = 0; i < fValues.length; i++) {
        const fValue = String(fValues[i][0] || '').trim();
        if (fValue !== '') {
          updates.push([fValue]);
        } else {
          updates.push([gValues[i][0] || '']); // Keep existing G value
        }
      }
      
      // Update G2:G11
      gRange.setValues(updates);
      
      // Optional: Send webhook to N8N
      const webhookUrl = 'YOUR_N8N_WEBHOOK_URL';
      UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          sheetName: sheetName,
          updated: true
        })
      });
    }
  }
}
```

---

## 🎯 Key Features

✅ **Monitors all team pages** automatically  
✅ **Only copies non-blank values** from F2:F11  
✅ **Preserves existing G values** when F is blank  
✅ **Runs on schedule** (every 5 minutes)  
✅ **Handles multiple team sheets** in one workflow  

---

## 🔧 Customization Options

### Change Monitoring Interval

Edit the **Cron Trigger** node:
- Every 1 minute: `*/1 * * * *`
- Every 5 minutes: `*/5 * * * *`
- Every hour: `0 * * * *`

### Change Cell Ranges

Edit the **Read Range** node:
- Different rows: Change `F2:G11` to `F5:G15`
- Different columns: Change `F2:G11` to `H2:I11`

### Add Filtering Logic

Modify the **Process F to G** code node to add conditions:
- Only copy if F contains specific text
- Skip certain rows
- Transform values before copying

---

## 📊 Testing

1. **Test with one team sheet first**
2. **Add test data** to F2:F11
3. **Run workflow manually**
4. **Verify G2:G11** is updated correctly
5. **Test with blank F cells** to ensure G values are preserved

---

## 🐛 Troubleshooting

### Issue: Workflow not detecting team sheets

**Solution**: Check the filter regex in "Filter Team Sheets" code node. Adjust pattern if team naming differs.

### Issue: Values not updating

**Solution**: 
- Check Google Sheets credentials
- Verify range format: `SheetName!G2:G11`
- Check value format: Use `USER_ENTERED` for text

### Issue: Blank F cells overwriting G

**Solution**: Update the code logic to preserve G values when F is blank (already included in code above).

---

**Note**: Make sure your N8N instance has proper Google Sheets API credentials configured with read/write access to your spreadsheet.
