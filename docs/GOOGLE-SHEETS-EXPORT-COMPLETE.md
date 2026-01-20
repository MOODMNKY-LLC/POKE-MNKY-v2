# Google Sheets Export Integration - Complete

**Date:** 2026-01-20  
**Status:** ✅ Complete

---

## Overview

Successfully integrated Google Sheets export functionality into the Admin Pokémon Draft Pool Management page. The Commissioner can now export the draft pool directly to Google Sheets in the fully configured Draft Board format.

---

## Features Implemented

### ✅ Google Sheets Export API Route
**Location:** `app/api/admin/pokemon/export-sheets/route.ts`

**Features:**
- Exports draft pool data to Google Sheets
- Formats data to match Draft Board structure:
  - Point value columns (20 pts → 1 pt) in correct column positions
  - Banned Pokémon column (Column 3)
  - Tera Banned Pokémon column (Column 6)
  - Proper headers (Row 2-3)
  - Pokémon names starting at Row 4
- Supports creating new sheets or updating existing ones
- Uses service account authentication (write access)
- Batch updates for performance

**API Endpoint:**
```
POST /api/admin/pokemon/export-sheets
```

**Request Body:**
```json
{
  "spreadsheet_id": "1abc123...",
  "sheet_name": "Draft Board",
  "action": "create" | "add"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully exported 749 Pokémon to sheet \"Draft Board\"",
  "sheet_url": "https://docs.google.com/spreadsheets/d/...",
  "stats": {
    "total": 749,
    "available": 764,
    "banned": 69,
    "tera_banned": 14
  }
}
```

---

### ✅ Google Sheets Export Dialog Component
**Location:** `components/admin/google-sheets-export-dialog.tsx`

**Features:**
- Dialog modal with form for export configuration
- Spreadsheet ID/URL input (auto-extracts ID from URL)
- Sheet name input (defaults to "Draft Board")
- Action selector (Create new sheet / Add to existing sheet)
- Loading states and error handling
- Success toast notification
- Auto-opens exported sheet in new tab

**UI Components Used:**
- `Dialog` (shadcn) - Modal container
- `Form` (shadcn) - Form handling with react-hook-form
- `Input` (shadcn) - Text inputs
- `Select` (shadcn) - Action selector
- `Button` (shadcn) - Export button
- `useToast` - Toast notifications

---

### ✅ Admin Page Integration
**Location:** `app/admin/pokemon/page.tsx`

**Changes:**
- Added "Export to Google Sheets" button next to "Save Changes"
- Button opens export dialog
- Integrated `GoogleSheetsExportDialog` component

---

## Sheet Structure Format

The export formats data to match the exact Draft Board structure:

### Column Mapping

| Point Value | Header Column | Pokémon Column |
|-------------|---------------|----------------|
| 20 Points   | 8 (I)         | 9 (J)          |
| 19 Points   | 11 (L)        | 12 (M)         |
| 18 Points   | 14 (O)        | 15 (P)         |
| ...         | ...           | ...            |
| 1 Point     | 65 (BM)       | 66 (BN)        |

**Formula:** `headerCol = 8 + (20 - pointValue) * 3`  
**Pokémon Column:** `pokemonCol = headerCol + 1`

### Row Structure

- **Row 2:** Headers ("Banned", "Tera Banned", "Drafted", "Pts Left")
- **Row 3:** Point value headers ("20 Points", "19 Points", ...)
- **Row 4+:** Pokémon names organized by point value

### Status Columns

- **Column 3 (C):** Banned Pokémon list
- **Column 6 (F):** Tera Banned Pokémon list
- **Column 70 (BN):** Drafted status (X markers)

---

## Authentication

Uses existing Google Service Account authentication:
- **Environment Variables:**
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- **Scopes Required:**
  - `https://www.googleapis.com/auth/spreadsheets` (write access)
  - `https://www.googleapis.com/auth/drive.readonly`

**Note:** The service account must have **Editor** access to the spreadsheet (not just Viewer) to write data.

---

## Usage

1. **Open Admin Pokémon Page:** `/admin/pokemon`
2. **Click "Export to Google Sheets"** button (next to Save Changes)
3. **Enter Spreadsheet ID or URL:**
   - Can paste full Google Sheets URL
   - Or just the spreadsheet ID
   - Auto-extracts ID from URL if needed
4. **Enter Sheet Name:** (defaults to "Draft Board")
5. **Select Action:**
   - **Create new sheet:** Creates sheet if it doesn't exist
   - **Add to existing sheet:** Updates existing sheet (fails if doesn't exist)
6. **Click Export**
7. **Sheet opens automatically** in new tab after successful export

---

## Data Mapping

### Status Handling

| Database Status | Sheet Location |
|----------------|----------------|
| `status = 'banned'` | Column 3 (Banned list) |
| `status = 'available'` + `is_tera_banned = true` | Column 6 (Tera Banned) + Point value column |
| `status = 'available'` + `tera_captain_eligible = false` | Column 6 (Tera Banned) + Point value column |
| `status = 'available'` | Point value column only |

**Note:** Tera Banned Pokémon appear in BOTH:
- Column 6 (Tera Banned list)
- Their respective point value column (still draftable)

---

## Error Handling

- **Missing Credentials:** Returns 500 error with message
- **Invalid Spreadsheet ID:** Returns 400 error
- **Sheet Not Found (add mode):** Returns 404 error
- **Permission Denied:** Returns 500 error (check service account access)
- **Network Errors:** Caught and displayed in toast

---

## Performance

- **Batch Updates:** Processes data in batches of 1000 rows
- **Single API Call:** All data written in one batch update request
- **Efficient Grid Building:** Pre-allocates grid array
- **Column Letter Conversion:** Helper function for A1 notation

---

## Future Enhancements

### Potential Improvements:
1. **List Existing Sheets:** Dropdown to select from existing sheets in spreadsheet
2. **Preview Before Export:** Show what will be exported
3. **Incremental Updates:** Only update changed rows (not full clear)
4. **Formatting:** Apply colors, borders, formatting to match original
5. **Validation:** Check if sheet structure matches before export
6. **Backup:** Create backup sheet before overwriting

---

## Testing Checklist

- [x] Export to new sheet (create mode)
- [x] Export to existing sheet (add mode)
- [x] Spreadsheet ID extraction from URL
- [x] Error handling (missing credentials, invalid ID)
- [x] Tera banned Pokémon appear in correct columns
- [x] Banned Pokémon appear in Column 3
- [x] Point value columns correctly formatted
- [x] Sheet opens in new tab after export
- [x] Toast notifications work correctly

---

## Access

**URL:** `/admin/pokemon`  
**Button:** "Export to Google Sheets" (in controls section, next to Save Changes)  
**Permissions:** Admin users only (authentication required)

---

## Summary

The Google Sheets export feature is fully functional and ready for use. The Commissioner can now:

1. ✅ Export draft pool directly from the admin interface
2. ✅ Choose to create new sheet or update existing
3. ✅ Export in the exact Draft Board format
4. ✅ Open exported sheet automatically
5. ✅ See export statistics (total, available, banned, tera_banned)

This eliminates the need for manual data entry and ensures consistency between the database and Google Sheets.

---

**Status:** ✅ Ready for Production Use
