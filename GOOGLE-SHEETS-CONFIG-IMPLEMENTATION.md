# Google Sheets Configuration Implementation

## ✅ Completed

### 1. Database Schema
**File**: `supabase/migrations/20260112105000_create_google_sheets_config.sql`

Created two tables:
- **`google_sheets_config`**: Stores sync configuration
  - Spreadsheet ID
  - Service account credentials (email, private key)
  - Sync schedule (manual, hourly, daily, weekly)
  - Last sync status and timestamp
  - Enabled/disabled flag

- **`sheet_mappings`**: Flexible sheet-to-table mapping
  - Maps Google Sheet tabs to Supabase tables
  - Configurable ranges (e.g., "A:H")
  - Sync order
  - Column mapping (JSONB for future flexibility)

### 2. Admin Configuration Page
**File**: `app/admin/google-sheets/page.tsx`

Features:
- ✅ Connection settings form
  - Spreadsheet ID input
  - Service account email input
  - Private key textarea (with JSON paste option)
  - Sync schedule selector
  - Enable/disable toggle

- ✅ Sheet mappings configuration
  - Add/edit/remove mappings
  - Configure sheet name → table name
  - Set ranges and sync order
  - Enable/disable individual mappings

- ✅ Test connection button
  - Validates credentials
  - Tests spreadsheet access
  - Shows available sheets

- ✅ Status display
  - Last sync timestamp
  - Last sync status badge
  - Enabled/disabled indicator

- ✅ Setup instructions
  - Step-by-step guide
  - Links to Google Cloud Console

### 3. API Endpoints

#### `GET /api/admin/google-sheets/config`
- Returns current configuration and mappings
- Used by config page to load existing settings

#### `POST /api/admin/google-sheets/config`
- Saves or updates configuration
- Handles both new and existing configs
- Saves sheet mappings
- Validates required fields

#### `POST /api/admin/google-sheets/test`
- Tests Google Sheets connection
- Validates credentials
- Returns spreadsheet info and available sheets
- Provides helpful error messages

### 4. Enhanced Sync Route
**File**: `app/api/sync/google-sheets/route.ts`

Updates:
- ✅ Reads configuration from database (not env vars)
- ✅ Uses stored service account credentials
- ✅ Supports configured sheet mappings
- ✅ Updates last sync timestamp and status
- ✅ Better error handling

### 5. Admin Dashboard Integration
**File**: `app/admin/page.tsx`

Added:
- ✅ "Configure" button linking to `/admin/google-sheets`
- ✅ Updated sync button to use correct endpoint

---

## 📋 What's Left

### 1. Sync Function Enhancement
**File**: `lib/google-sheets-sync.ts`

Current status: Mock implementation (returns error)

Needs:
- [ ] Uncomment production implementation
- [ ] Update to use mappings parameter
- [ ] Support dynamic sheet-to-table mapping
- [ ] Use configured ranges instead of hardcoded

### 2. Missing Admin Sub-Pages
- [ ] `/admin/matches` - Match management
- [ ] `/admin/teams` - Team management
- [ ] `/admin/playoffs` - Playoff bracket management
- [ ] `/admin/sync-logs` - Detailed sync logs viewer
- [ ] `/admin/stats` - Statistics management

### 3. Advanced Features
- [ ] Column mapping UI (map sheet columns to table columns)
- [ ] Sync scheduling (cron job integration)
- [ ] Sync history with detailed logs
- [ ] Conflict resolution UI
- [ ] Bidirectional sync (app → sheets)

### 4. Security Enhancements
- [ ] Encrypt service account private key at rest
- [ ] Admin role check for config endpoints
- [ ] Audit logging for config changes

---

## 🚀 Next Steps

### Immediate (To Enable Sync)
1. **Install package**:
   ```bash
   pnpm add node-google-spreadsheet
   ```

2. **Run migration**:
   ```bash
   supabase migration up
   ```

3. **Configure in UI**:
   - Navigate to `/admin/google-sheets`
   - Enter spreadsheet ID
   - Paste service account JSON or credentials
   - Configure sheet mappings
   - Test connection
   - Save configuration

4. **Enable sync function**:
   - Uncomment production code in `lib/google-sheets-sync.ts`
   - Update to use mappings parameter
   - Test sync from `/admin` page

### Future Enhancements
1. Add sync scheduling with Vercel Cron
2. Build missing admin sub-pages
3. Add column mapping UI
4. Implement conflict resolution
5. Add encryption for credentials

---

## 📝 Usage

### Setting Up Google Sheets Sync

1. **Create Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create project → Enable Sheets API
   - Create service account → Download JSON key

2. **Share Sheet**:
   - Open your Google Sheet
   - Click "Share" → Add service account email
   - Grant "Viewer" permissions

3. **Configure in App**:
   - Go to `/admin/google-sheets`
   - Paste spreadsheet ID from URL
   - Paste service account JSON or enter credentials manually
   - Configure sheet mappings
   - Click "Test Connection"
   - Click "Save Configuration"

4. **Run Sync**:
   - Go to `/admin`
   - Click "Sync Now" button
   - Check sync logs for results

---

## 🔒 Security Notes

- Service account private keys are stored in database (should be encrypted)
- Only authenticated users can access config
- Consider adding admin role checks
- Private keys are masked in UI (not displayed after save)

---

## 📊 Admin Panel Status Summary

**Overall Completion**: ~65%

**Completed**:
- ✅ Main dashboard
- ✅ Platform Manager (all tabs)
- ✅ Discord admin pages (3/3)
- ✅ User management
- ✅ Google Sheets configuration UI

**In Progress**:
- ⚠️ Google Sheets sync (UI done, sync function needs activation)

**Missing**:
- ❌ Match management page
- ❌ Team management page
- ❌ Playoff management page
- ❌ Sync logs viewer page
- ❌ Statistics management page
