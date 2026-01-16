# N8N Free Agency Workflow - Node Configurations

> **Workflow**: Average At Best Google Sheet (ID: 3xBWFOUOUXFd6jH2UZopz)
> **Purpose**: Complete node-by-node configuration guide

---

## 📋 Workflow Nodes Overview

Total Nodes: ~18-20 nodes

1. Schedule Trigger
2. Google Sheets: Get All Sheets
3. Code: Filter Team Pages
4. Split In Batches: Process Each Team
5. Google Sheets: Read F2:G11
6. Google Sheets: Read D2:E11
7. Code: Detect Transaction Type
8. IF: Has Transactions?
9. Google Sheets: Read Master Data Block 1
10. Google Sheets: Read Master Data Block 2
11. Code: Find Pokemon in Blocks
12. Code: Validate Transaction
13. IF: Validation Passes?
14. HTTP Request: Update Master Data Sheet (Batch)
15. Google Sheets: Update Team Page Roster
16. Google Sheets: Clear F2:F11
17. Google Sheets: Clear G2:G11
18. Code: Log Errors (if validation fails)

---

## 🔧 Detailed Node Configurations

### Node 1: Schedule Trigger

**Type**: `n8n-nodes-base.scheduleTrigger`
**Version**: 1.2

**Configuration**:
```json
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
  }
}
```

**Alternative (Monday 12AM EST)**:
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {
          "field": "cronExpression",
          "expression": "0 0 * * 1"
        }
      ]
    }
  }
}
```

---

### Node 2: Google Sheets - Get All Sheets

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: List sheets (or use Document operation)

**Configuration**:
```json
{
  "parameters": {
    "documentId": {
      "__rl": true,
      "value": "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0",
      "mode": "id"
    },
    "operation": "list" // Or use appropriate operation to get all sheets
  },
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "ThlsJKIzA2WT9lAM",
      "name": "POKE MNKY"
    }
  }
}
```

**Note**: May need to use HTTP Request to list sheets if Google Sheets node doesn't support listing.

---

### Node 3: Code - Filter Team Pages

**Type**: `n8n-nodes-base.code`
**Version**: 2
**Mode**: Run Once for All Items
**Language**: JavaScript

**Code**: See `scripts/n8n-filter-team-pages-code.js` (to be created)

**Configuration**:
```json
{
  "parameters": {
    "mode": "runOnceForAllItems",
    "language": "javaScript",
    "jsCode": "// Code from script file"
  }
}
```

---

### Node 4: Split In Batches

**Type**: `n8n-nodes-base.splitInBatches`
**Version**: 3

**Configuration**:
```json
{
  "parameters": {
    "batchSize": 1,
    "options": {
      "reset": false
    }
  }
}
```

---

### Node 5: Google Sheets - Read F2:G11

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Get Row(s) (read)

**Configuration**:
```json
{
  "parameters": {
    "documentId": {
      "__rl": true,
      "value": "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "={{ $json.sheetName }}",
      "mode": "name"
    },
    "range": "F2:G11",
    "operation": "read"
  },
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "ThlsJKIzA2WT9lAM",
      "name": "POKE MNKY"
    }
  }
}
```

---

### Node 6: Google Sheets - Read D2:E11

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Get Row(s) (read)

**Configuration**:
```json
{
  "parameters": {
    "documentId": {
      "__rl": true,
      "value": "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "={{ $json.sheetName }}",
      "mode": "name"
    },
    "range": "D2:E11",
    "operation": "read"
  },
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "ThlsJKIzA2WT9lAM",
      "name": "POKE MNKY"
    }
  }
}
```

---

### Node 7: Code - Detect Transaction Type

**Type**: `n8n-nodes-base.code`
**Version**: 2
**Mode**: Run Once for All Items

**Code**: See `scripts/n8n-transaction-detection-code.js`

---

### Node 8: IF - Check for Transactions

**Type**: `n8n-nodes-base.if`
**Version**: 2.2

**Configuration**:
```json
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
          "id": "hasTransactions",
          "leftValue": "={{ $json.hasTransactions }}",
          "rightValue": true,
          "operator": {
            "type": "boolean",
            "operation": "equals",
            "singleValue": true
          }
        }
      ],
      "combinator": "and"
    }
  }
}
```

---

### Node 9: Google Sheets - Read Master Data Block 1

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Get Row(s) (read)

**Configuration**:
```json
{
  "parameters": {
    "documentId": {
      "__rl": true,
      "value": "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "Master Data Sheet",
      "mode": "name"
    },
    "range": "B94:K103",
    "operation": "read"
  },
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "ThlsJKIzA2WT9lAM",
      "name": "POKE MNKY"
    }
  }
}
```

---

### Node 10: Google Sheets - Read Master Data Block 2

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Get Row(s) (read)

**Configuration**:
```json
{
  "parameters": {
    "documentId": {
      "__rl": true,
      "value": "1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0",
      "mode": "id"
    },
    "sheetName": {
      "__rl": true,
      "value": "Master Data Sheet",
      "mode": "name"
    },
    "range": "B109:K119",
    "operation": "read"
  },
  "credentials": {
    "googleSheetsOAuth2Api": {
      "id": "ThlsJKIzA2WT9lAM",
      "name": "POKE MNKY"
    }
  }
}
```

---

### Node 11: Code - Find Pokemon in Master Data Sheet

**Type**: `n8n-nodes-base.code`
**Version**: 2
**Mode**: Run Once for Each Item

**Code**: See `scripts/n8n-master-data-update-code.js`

---

### Node 12: Code - Validate Transaction

**Type**: `n8n-nodes-base.code`
**Version**: 2
**Mode**: Run Once for Each Item

**Code**: See `scripts/n8n-validation-code.js` (to be created)

---

### Node 13: IF - Validation Passes

**Type**: `n8n-nodes-base.if`
**Version**: 2.2

**Configuration**:
```json
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
          "id": "isValid",
          "leftValue": "={{ $json.validation.isValid }}",
          "rightValue": true,
          "operator": {
            "type": "boolean",
            "operation": "equals",
            "singleValue": true
          }
        }
      ],
      "combinator": "and"
    }
  }
}
```

---

### Node 14: HTTP Request - Update Master Data Sheet (Batch)

**Type**: `n8n-nodes-base.httpRequest`
**Method**: POST
**URL**: `https://sheets.googleapis.com/v4/spreadsheets/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/values:batchUpdate`

**Authentication**: OAuth2 (Google Sheets)

**Body**:
```json
{
  "valueInputOption": "RAW",
  "data": [
    {
      "range": "={{ $json.range }}",
      "values": [["={{ $json.action === 'clear' ? '' : $json.pokemon }}"]]
    }
  ]
}
```

**Note**: This node handles both clearing (empty string) and adding (Pokemon name) cells.

---

### Node 15: Google Sheets - Update Team Page Roster

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Update Row

**Configuration**:
- Range: `D2:E11`
- Values: Updated roster array (calculated in Code node)

---

### Node 16: Google Sheets - Clear F2:F11

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Clear

**Configuration**:
- Range: `F2:F11`

---

### Node 17: Google Sheets - Clear G2:G11

**Type**: `n8n-nodes-base.googleSheets`
**Version**: 4.7
**Operation**: Clear

**Configuration**:
- Range: `G2:G11`

---

## 🔗 Node Connections

```
Schedule Trigger → Get All Sheets → Filter Team Pages → Split In Batches
  ↓
Split In Batches (loop) → Read F2:G11 → Read D2:E11 → Detect Transaction
  ↓
Detect Transaction → IF (Has Transactions?)
  ├─→ TRUE: Read Master Data Block 1 → Read Master Data Block 2 → Find Pokemon → Validate → IF (Valid?)
  │   ├─→ TRUE: Update Master Data Sheet → Update Team Page → Clear F2:F11 → Clear G2:G11
  │   └─→ FALSE: Log Error
  └─→ FALSE: (No transactions, skip)
```

---

## 📝 Implementation Steps

1. **Add Schedule Trigger** to existing workflow
2. **Add Get All Sheets** node
3. **Add Filter Team Pages** Code node
4. **Add Split In Batches** node
5. **Add Read operations** (F2:G11, D2:E11)
6. **Add Transaction Detection** Code node
7. **Add IF node** for transaction check
8. **Add Master Data Sheet reads** (Block 1, Block 2)
9. **Add Find Pokemon** Code node
10. **Add Validation** Code node
11. **Add IF node** for validation
12. **Add Update operations** (HTTP Request for Master Data Sheet, Google Sheets for Team Page)
13. **Add Clear operations** (F2:F11, G2:G11)
14. **Test workflow** with one team

---

**Status**: Ready for incremental implementation via N8N MCP tools.
