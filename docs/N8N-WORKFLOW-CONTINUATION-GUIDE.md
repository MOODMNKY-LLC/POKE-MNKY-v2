# N8N Workflow Continuation Guide

> **Workflow**: Average At Best Google Sheet (ID: 3xBWFOUOUXFd6jH2UZopz)
> **Status**: Implementation in Progress - Manual UI Recommended

---

## ⚠️ N8N MCP Limitations

The N8N MCP tools have validation constraints that make programmatic workflow building challenging. The workflow structure is complex (18+ nodes) and requires careful connection management.

**Recommendation**: Build the workflow manually in N8N UI using the provided documentation and code files.

---

## 📋 Manual Implementation Steps

### Step 1: Open Workflow in N8N
1. Navigate to N8N UI
2. Open workflow: "Average At Best Google Sheet"
3. Current state: Manual trigger + Google Sheets read node

### Step 2: Replace Manual Trigger with Schedule Trigger
1. Delete "When clicking 'Execute workflow'" node
2. Add "Schedule Trigger" node
3. Configure: Every 5 minutes (or Monday 12AM EST cron: `0 0 * * 1`)

### Step 3: Add Get All Sheets Node
**Type**: HTTP Request
**Method**: GET
**URL**: `https://sheets.googleapis.com/v4/spreadsheets/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0?fields=sheets.properties`
**Authentication**: OAuth2 (Google Sheets - POKE MNKY)

### Step 4: Add Filter Team Pages Code Node
**Type**: Code
**Mode**: Run Once for All Items
**Code**: Copy from `scripts/n8n-filter-team-pages-code.js`

### Step 5: Add Split In Batches Node
**Type**: Split In Batches
**Batch Size**: 1

### Step 6: Add Read Operations
**Read F2:G11**:
- Type: Google Sheets
- Operation: Get Row(s)
- Sheet: `={{ $json.sheetName }}`
- Range: `F2:G11`

**Read D2:E11**:
- Type: Google Sheets
- Operation: Get Row(s)
- Sheet: `={{ $json.sheetName }}`
- Range: `D2:E11`

### Step 7: Add Transaction Detection Code Node
**Type**: Code
**Mode**: Run Once for All Items
**Code**: Copy from `scripts/n8n-transaction-detection-code.js`

### Step 8: Add IF Node - Has Transactions?
**Type**: If
**Condition**: `{{ $json.hasTransactions === true }}`

### Step 9: Add Master Data Sheet Reads
**Read Block 1**:
- Type: Google Sheets
- Operation: Get Row(s)
- Sheet: `Master Data Sheet`
- Range: `B94:K103`

**Read Block 2**:
- Type: Google Sheets
- Operation: Get Row(s)
- Sheet: `Master Data Sheet`
- Range: `B109:K119`

### Step 10: Add Find Pokemon Code Node
**Type**: Code
**Mode**: Run Once for Each Item
**Code**: Copy from `scripts/n8n-master-data-update-code.js`

### Step 11: Add Validation Code Node
**Type**: Code
**Mode**: Run Once for Each Item
**Code**: Copy from `scripts/n8n-validation-code.js`

### Step 12: Add IF Node - Validation Passes?
**Type**: If
**Condition**: `{{ $json.validation.isValid === true }}`

### Step 13: Add Update Operations
**HTTP Request - Update Master Data Sheet**:
- Type: HTTP Request
- Method: POST
- URL: `https://sheets.googleapis.com/v4/spreadsheets/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/values:batchUpdate`
- Authentication: OAuth2 (Google Sheets)
- Body:
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

**Google Sheets - Update Team Page**:
- Type: Google Sheets
- Operation: Update Row
- Sheet: `={{ $json.sheetName }}`
- Range: `D2:E11`
- Values: Updated roster array

**Google Sheets - Clear F2:F11**:
- Type: Google Sheets
- Operation: Clear
- Sheet: `={{ $json.sheetName }}`
- Range: `F2:F11`

**Google Sheets - Clear G2:G11**:
- Type: Google Sheets
- Operation: Clear
- Sheet: `={{ $json.sheetName }}`
- Range: `G2:G11`

---

## 📝 Code Files Reference

All code ready in `scripts/`:
- `n8n-filter-team-pages-code.js` - Filter Team 1-20
- `n8n-transaction-detection-code.js` - Detect transactions
- `n8n-master-data-update-code.js` - Find Pokemon in Master Data Sheet
- `n8n-validation-code.js` - Validate transactions

---

## 🔗 Node Connections

```
Schedule Trigger
  → Get All Sheets (HTTP Request)
  → Filter Team Pages (Code)
  → Split In Batches
    → Read F2:G11
    → Read D2:E11
    → Detect Transaction (Code)
    → IF (Has Transactions?)
      → Read Master Data Block 1
      → Read Master Data Block 2
      → Find Pokemon (Code)
      → Validate (Code)
      → IF (Valid?)
        → Update Master Data Sheet (HTTP Request)
        → Update Team Page
        → Clear F2:F11
        → Clear G2:G11
```

---

## ⚠️ Important Notes

### Google Sheets Cell Updates
- Use HTTP Request with `batchUpdate` API for individual cells
- Google Sheets node "Update Row" requires full rows

### OAuth2 Authentication
- All Google Sheets operations need OAuth2 credentials
- Credential: "POKE MNKY" (ID: ThlsJKIzA2WT9lAM)

### Point Value Lookup
- TODO: Add Draft Board read for Pokemon point values
- Currently uses placeholder in validation

---

**Status**: Ready for manual implementation in N8N UI
