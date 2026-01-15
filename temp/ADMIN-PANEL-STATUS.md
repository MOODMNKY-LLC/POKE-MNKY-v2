# Admin Panel Configuration Status

## 📊 Overall Completion: ~60%

### ✅ Completed Features

#### Main Dashboard (`/admin`)
- ✅ Stats overview (teams, matches, pokemon, last sync)
- ✅ Quick action cards with links
- ✅ Platform Manager integration (Supabase Manager)
- ✅ User authentication check
- ✅ Recent sync log display

#### Platform Manager (Supabase Manager Component)
- ✅ Database Tab - AI SQL generator, query runner
- ✅ Auth Tab - Provider status, OAuth redirect URLs, user list
- ✅ Storage Tab - Bucket management (list, create, delete)
- ✅ Users Tab - User list with search, roles, Discord linkage
- ✅ Secrets Tab - Environment variable status checker
- ✅ Logs Tab - Real-time log viewer with filtering

#### Discord Admin Pages (`/admin/discord/*`)
- ✅ `/admin/discord/config` - Bot and OAuth configuration display
- ✅ `/admin/discord/roles` - Role mapping and sync management
- ✅ `/admin/discord/webhooks` - Webhook CRUD operations

#### User Management
- ✅ `/admin/users` - User list with search and role display

---

### ⚠️ Partially Implemented / Needs Work

#### Google Sheets Sync (`/api/sync/google-sheets`)
- ⚠️ **Status**: Mock implementation (disabled in v0 preview)
- ⚠️ **Implementation**: Code exists but commented out
- ⚠️ **Missing**: 
  - Configuration UI
  - Database table for storing sync config
  - Dynamic sheet mapping configuration
  - Test connection functionality
  - Sync schedule configuration

#### Admin Sub-Pages (Referenced but Missing)
- ❌ `/admin/matches` - Match management page
- ❌ `/admin/teams` - Team management page  
- ❌ `/admin/playoffs` - Playoff bracket management
- ❌ `/admin/sync-logs` - Detailed sync logs viewer
- ❌ `/admin/stats` - Statistics management
- ❌ `/admin/google-sheets` - Google Sheets configuration (NEW - needs creation)

---

### ❌ Missing Features

#### Google Sheets Configuration
1. **Database Table**: `google_sheets_config`
   - Store spreadsheet ID
   - Service account credentials (encrypted)
   - Sheet name mappings
   - Sync schedule
   - Last sync timestamp

2. **Configuration UI** (`/admin/google-sheets`)
   - Form for spreadsheet ID
   - Service account JSON upload/paste
   - Sheet name mapping configuration
   - Test connection button
   - Sync schedule settings
   - Manual sync trigger

3. **API Endpoints**
   - `GET /api/admin/google-sheets/config` - Get current config
   - `POST /api/admin/google-sheets/config` - Save config
   - `POST /api/admin/google-sheets/test` - Test connection
   - `POST /api/sync/google-sheets` - Enhanced sync using stored config

4. **Enhanced Sync Route**
   - Read config from database instead of env vars
   - Support multiple sheet mappings
   - Better error handling and logging

---

## 🔧 Google Sheets Sync Current State

### Current Implementation

**File**: `lib/google-sheets-sync.ts`
- ✅ Sync logic implemented (commented out)
- ✅ Supports: Teams, Draft Results, Matches, Stats
- ❌ Uses hardcoded environment variables
- ❌ No configuration UI
- ❌ No database storage for config

**File**: `app/api/sync/google-sheets/route.ts`
- ✅ POST endpoint exists
- ✅ GET endpoint for sync logs
- ✅ Authentication check
- ⚠️ Calls mock sync function (returns error)

**Environment Variables Required**:
\`\`\`bash
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
\`\`\`

### What Needs to Be Built

1. **Database Migration**: Create `google_sheets_config` table
2. **Configuration Page**: `/admin/google-sheets` with form
3. **API Routes**: CRUD for config, test connection
4. **Enhanced Sync**: Use database config instead of env vars
5. **Sheet Mapping UI**: Configure which sheets map to which tables

---

## 📋 Implementation Plan

### Phase 1: Database Schema
- [ ] Create `google_sheets_config` table migration
- [ ] Add encryption for service account credentials
- [ ] Create `sheet_mappings` table for flexible mapping

### Phase 2: Configuration UI
- [ ] Create `/admin/google-sheets` page
- [ ] Build configuration form (Shadcn Form components)
- [ ] Add service account JSON upload/paste
- [ ] Add sheet mapping configuration
- [ ] Add test connection functionality
- [ ] Add sync schedule settings

### Phase 3: API Endpoints
- [ ] `GET /api/admin/google-sheets/config`
- [ ] `POST /api/admin/google-sheets/config`
- [ ] `POST /api/admin/google-sheets/test`
- [ ] Update `POST /api/sync/google-sheets` to use stored config

### Phase 4: Enhanced Sync
- [ ] Update sync logic to read from database
- [ ] Support multiple sheet mappings
- [ ] Better error handling and validation
- [ ] Sync history with detailed logs

---

## 🎯 Priority Order

1. **HIGH**: Google Sheets configuration UI and database storage
2. **MEDIUM**: Missing admin sub-pages (matches, teams, playoffs)
3. **LOW**: Enhanced sync features and scheduling

---

## 📝 Notes

- Google Sheets sync is currently disabled because it requires Google API credentials
- Configuration should be stored in database for easier management
- Service account credentials should be encrypted at rest
- Sheet mappings should be configurable per deployment
- Test connection should validate credentials before saving
