# Google Sheets Configuration Enhancements

## Overview

Enhanced the Google Sheets configuration page with comprehensive analysis tools, progress tracking, and image extraction capabilities.

## New Features

### 1. Comprehensive Analysis Button

**Location**: Main configuration card, "Comprehensive Analysis" button

**Purpose**: 
- Deep analysis of all sheets in the spreadsheet
- Identifies sheet types (standings, draft, matches, master data, team pages)
- Analyzes data structures, patterns, and complexity
- Suggests parsing strategies including AI-powered parsing
- Provides data samples and column type analysis

**When to Use**:
- Complex spreadsheets with multiple data types
- Sheets with inconsistent structures
- When you need detailed parsing recommendations
- For spreadsheets with master data or team-specific pages

**How It Works**:
1. Analyzes each sheet's structure (headers, data types, patterns)
2. Samples actual data rows to understand content
3. Detects sheet types based on name and structure
4. Suggests parser types and column mappings
5. Identifies which sheets need AI parsing

### 2. Quick Detect Button

**Location**: Main configuration card, "Quick Detect" button

**Purpose**:
- Fast detection of sheets and basic structure
- Quick suggestions for table mappings
- Best for simple, well-structured spreadsheets

**When to Use**:
- Simple spreadsheets with clear headers
- When you need quick results
- For standard league data formats

**How It Works**:
1. Lists all sheets in the spreadsheet
2. Detects headers and suggests table mappings
3. Counts images and comments
4. Provides basic column mapping suggestions

### 3. Dynamic Progress Bars

**Location**: Appears during sync operations

**Features**:
- Real-time progress tracking
- Shows current sheet being processed
- Percentage completion
- Contextual messages (e.g., "Extracting team data, match results, rosters, and images...")

**Visual Design**:
- Uses shadcn Progress component
- Shows current/total sheets
- Displays current sheet name
- Contextual progress messages

### 4. Image Extraction

**Purpose**: 
- Extracts team logos, banners, and avatars from Google Sheets
- Uploads images to Supabase Storage
- Associates images with team records
- Updates team `logo_url` field

**How It Works**:
1. Scans sheets for embedded images (team logos, banners, avatars)
2. Extracts image URLs from Google Sheets cells
3. Downloads images from Google Drive
4. Uploads to Supabase Storage bucket `team-assets`
5. Updates team records with image URLs

**Supported Image Types**:
- **Logos**: Team logos (stored in `logo_url`)
- **Banners**: Team banners (currently stored in `logo_url`, future: `banner_url`)
- **Avatars**: Team avatars (currently stored in `logo_url`, future: `avatar_url`)

**Image Detection**:
- Embedded objects in cells
- IMAGE() formulas
- Images associated with team name columns

### 5. Enhanced Explanations

**Context-Aware Guidance**:
- Pokemon league-specific explanations
- Step-by-step workflow instructions
- Clear descriptions of each action
- Visual indicators for images and comments

**Information Cards**:
- "How It Works" card with numbered steps
- Analysis summary with statistics
- Sheet-specific warnings and guidance

## UI Components Used

### From shadcn:
- **Progress**: Dynamic progress bars for sync operations
- **Button**: Action buttons with loading states
- **Card**: Information cards and sheet listings
- **Badge**: Status indicators and counts
- **Checkbox**: Enable/disable sheet syncing

### From Magic UI:
- (Future: Can add animated components for better UX)

## Workflow

### Step 1: Connect Spreadsheet
1. Paste Google Sheets URL or ID
2. System validates and extracts spreadsheet ID
3. Shows credentials status

### Step 2: Analyze Structure
**Option A - Quick Detect**:
- Click "Quick Detect" button
- Fast detection of sheets and basic mappings
- Best for simple spreadsheets

**Option B - Comprehensive Analysis**:
- Click "Comprehensive Analysis" button
- Deep analysis of all sheets
- Detailed parsing recommendations
- Identifies AI parsing needs

### Step 3: Configure Mappings
1. Review detected sheets
2. Enable sheets you want to sync
3. Verify suggested table mappings
4. Adjust column mappings if needed
5. Configure sheets without headers manually

### Step 4: Save Configuration
1. Click "Save Configuration"
2. Settings stored in database
3. Ready for syncing

### Step 5: Sync Data
1. Click "Sync Now" button
2. Progress bar shows sync progress
3. System extracts:
   - Team standings
   - Match results
   - Draft picks/rosters
   - Team images (logos, banners, avatars)
4. Results displayed with counts

## Image Extraction Details

### Supported Sources
- Embedded images in cells
- IMAGE() formulas
- Google Drive images

### Storage
- **Bucket**: `team-assets` (must be created in Supabase Storage)
- **Naming**: `{team_name}_{image_type}.{extension}`
- **URLs**: Stored in team `logo_url` field

### Future Enhancements
- Add `banner_url` and `avatar_url` columns to teams table
- Support multiple images per team
- Image preview in admin panel
- Bulk image operations

## Error Handling

### Image Extraction Errors
- Gracefully handles missing buckets
- Logs errors without failing entire sync
- Continues with data sync even if images fail
- Reports image extraction errors separately

### Sync Errors
- Detailed error messages
- Shows which sheets failed
- Limits error display (first 10)
- Partial success reporting

## Pokemon League Context

All explanations and UI elements are tailored for Pokemon league management:

- **Team Data**: Standings, rosters, draft picks
- **Match Data**: Battle results, weekly stats
- **Team Assets**: Logos, banners, avatars
- **League Structure**: Divisions, conferences

## Technical Implementation

### Progress Tracking
- Client-side progress simulation during sync
- Real-time updates every 500ms
- Shows current sheet being processed
- Percentage calculation based on sheets completed

### Image Extraction
- Uses Google Sheets API v4 for embedded objects
- Handles Google Drive URLs
- Downloads and uploads to Supabase Storage
- Associates images with team names

### Analysis Endpoint
- `/api/admin/google-sheets/analyze`
- Comprehensive sheet analysis
- Returns parsing suggestions
- Provides data samples

## Next Steps

1. **Create Storage Bucket**: Create `team-assets` bucket in Supabase Storage
2. **Add Image Columns**: Consider adding `banner_url` and `avatar_url` to teams table
3. **Image Preview**: Add image preview in admin panel
4. **Bulk Operations**: Enable/disable multiple sheets at once
5. **Visual Mapper**: Visual column mapping interface

## Testing Checklist

- [ ] Test Quick Detect with simple spreadsheet
- [ ] Test Comprehensive Analysis with complex spreadsheet
- [ ] Verify progress bars during sync
- [ ] Test image extraction from sheets
- [ ] Verify images uploaded to Supabase Storage
- [ ] Check team records updated with image URLs
- [ ] Test error handling for missing images
- [ ] Verify sync results show image counts
