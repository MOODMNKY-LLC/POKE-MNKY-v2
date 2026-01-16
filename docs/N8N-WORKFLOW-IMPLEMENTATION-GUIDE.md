# N8N Free Agency Workflow - Implementation Guide

> **Workflow ID**: 3xBWFOUOUXFd6jH2UZopz
> **Status**: Implementation in Progress

---

## 🎯 Implementation Strategy

Due to workflow complexity (18+ nodes), we'll implement incrementally:

### Phase 1: Core Monitoring (✅ Ready)
- Schedule Trigger
- Get All Sheets (HTTP Request)
- Filter Team Pages (Code)
- Split In Batches

### Phase 2: Transaction Detection (✅ Ready)
- Read F2:G11
- Read D2:E11
- Detect Transaction Type (Code)
- IF: Has Transactions?

### Phase 3: Master Data Sheet Lookup (✅ Ready)
- Read Master Data Block 1
- Read Master Data Block 2
- Find Pokemon in Blocks (Code)

### Phase 4: Validation & Updates (✅ Ready)
- Validate Transaction (Code)
- IF: Validation Passes?
- Update Master Data Sheet (HTTP Request - Batch)
- Update Team Page Roster
- Clear F2:F11 and G2:G11

---

## 📝 Code Files Created

All code nodes are ready in `scripts/`:

1. **`n8n-filter-team-pages-code.js`** - Filters sheets to Team 1-20
2. **`n8n-transaction-detection-code.js`** - Detects transaction types from F2:G11
3. **`n8n-master-data-update-code.js`** - Finds Pokemon in Master Data Sheet blocks
4. **`n8n-validation-code.js`** - Validates budget, roster size, limits

---

## 🔧 Implementation Steps

### Step 1: Replace Manual Trigger with Schedule Trigger

**Operation**: `removeNode` (manual trigger) + `addNode` (schedule trigger)

**Schedule Trigger Config**:
- Trigger every 5 minutes (for testing)
- OR Monday 12AM EST cron: `0 0 * * 1`

---

### Step 2: Add Get All Sheets Node

**Type**: HTTP Request
**Method**: GET
**URL**: `https://sheets.googleapis.com/v4/spreadsheets/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0?fields=sheets.properties`
**Auth**: OAuth2 (Google Sheets)

**Response**: Returns `{sheets: [{properties: {title, sheetId}}]}`

---

### Step 3: Add Filter Team Pages Code Node

**Code**: Copy from `scripts/n8n-filter-team-pages-code.js`

**Output**: Array of Team Pages (Team 1-20) with teamNumber and sheetName

---

### Step 4: Add Split In Batches Node

**Batch Size**: 1
**Purpose**: Process each team individually

---

### Step 5: Add Read Operations

**Read F2:G11**:
- Sheet: `={{ $json.sheetName }}`
- Range: `F2:G11`
- Operation: `read`

**Read D2:E11**:
- Sheet: `={{ $json.sheetName }}`
- Range: `D2:E11`
- Operation: `read`

---

### Step 6: Add Transaction Detection Code Node

**Code**: Copy from `scripts/n8n-transaction-detection-code.js`

**Output**: Transactions with type, addPokemon, dropPokemon

---

### Step 7: Add IF Node - Has Transactions?

**Condition**: `{{ $json.hasTransactions === true }}`

---

### Step 8: Add Master Data Sheet Reads

**Read Block 1**:
- Sheet: `Master Data Sheet`
- Range: `B94:K103`
- Operation: `read`

**Read Block 2**:
- Sheet: `Master Data Sheet`
- Range: `B109:K119`
- Operation: `read`

---

### Step 9: Add Find Pokemon Code Node

**Code**: Copy from `scripts/n8n-master-data-update-code.js`

**Output**: Update operations with cell references (range, action, pokemon)

---

### Step 10: Add Validation Code Node

**Code**: Copy from `scripts/n8n-validation-code.js`

**Output**: Transaction with validation results

---

### Step 11: Add IF Node - Validation Passes?

**Condition**: `{{ $json.validation.isValid === true }}`

---

### Step 12: Add Update Operations

**HTTP Request - Update Master Data Sheet**:
- Method: POST
- URL: `https://sheets.googleapis.com/v4/spreadsheets/1sVQD6_CsoYtGmguRhc07IDlnz2V4Q2uWTt8Owpl5JE0/values:batchUpdate`
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

**Google Sheets - Update Team Page Roster**:
- Operation: `update`
- Range: `D2:E11`
- Values: Updated roster array

**Google Sheets - Clear F2:F11**:
- Operation: `clear`
- Range: `F2:F11`

**Google Sheets - Clear G2:G11**:
- Operation: `clear`
- Range: `G2:G11`

---

## ⚠️ Important Notes

### Google Sheets Cell Updates

The Google Sheets node's "Update Row" operation requires full row data. For individual cell updates, we use:

1. **HTTP Request with batchUpdate API** (recommended for Master Data Sheet)
2. **Clear + Update** (alternative approach)

### OAuth2 Authentication

All Google Sheets operations require OAuth2 credentials:
- Credential ID: `ThlsJKIzA2WT9lAM`
- Credential Name: `POKE MNKY`

### Point Value Lookup

**TODO**: Add Draft Board read to get Pokemon point values for validation.

Current validation uses placeholder (15pts). Need to:
1. Read Draft Board sheet
2. Search for Pokemon name
3. Extract point value
4. Use in validation

---

## 🚀 Next Steps

1. **Continue incremental implementation** via N8N MCP tools
2. **Test each phase** before moving to next
3. **Add Draft Board point lookup** for accurate validation
4. **Add transaction tracking** (count F/A moves)
5. **Add error handling** and logging
6. **Test end-to-end** with sample transactions

---

**Status**: Ready to continue implementation. All code and configurations prepared.
