# Pokemon Draft League - Architecture Breakdown

## Table of Contents
1. [Authentication Flow](#authentication-flow)
2. [Role-Based Access Control (RBAC)](#role-based-access-control)
3. [Google Sheets Integration](#google-sheets-integration)
4. [V0 Preview Compatibility](#v0-preview-compatibility)

---

## Authentication Flow

### Overview
The app uses **Supabase Auth** with a cookie-based session management system powered by `@supabase/ssr` for Next.js 16 App Router compatibility.

### Architecture Diagram

\`\`\`
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Navigate to /admin
       ▼
┌─────────────────┐
│ Middleware      │ (/proxy.ts)
│ updateSession() │
└──────┬──────────┘
       │ 2. Check auth
       ▼
┌──────────────────┐
│ Supabase SSR     │
│ getUser()        │
└──────┬───────────┘
       │
       ├─── User Found ──────► Allow Access + Refresh Cookie
       │
       └─── No User ────────► Redirect to /auth/login
\`\`\`

### Key Components

#### 1. Root Middleware (`/proxy.ts`)
\`\`\`typescript
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
\`\`\`
- **Purpose**: Intercepts ALL requests except static assets
- **Scope**: Every page/API route in the app
- **Action**: Routes through `updateSession()` middleware

#### 2. Session Update Middleware (`/lib/supabase/proxy.ts`)
\`\`\`typescript
export async function updateSession(request: NextRequest) {
  // Create Supabase server client with cookie handling
  const supabase = createServerClient(...)
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect("/auth/login")
  }
  
  return supabaseResponse // with updated cookies
}
\`\`\`

**Key Features:**
- ✅ Automatic session refresh on every request
- ✅ Cookie-based session storage (HTTP-only, secure)
- ✅ Route-level protection for `/admin/*`
- ✅ Seamless server/client auth synchronization

#### 3. Supabase Client Setup

**Server-Side** (`/lib/supabase/server.ts`)
\`\`\`typescript
export async function createClient() {
  const cookieStore = await cookies()
  
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { /* handle cookies */ }
      }
    }
  )
}

export { createClient as createServerClient }
\`\`\`

**Client-Side** (`/lib/supabase/client.ts`)
\`\`\`typescript
export function createClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const createBrowserClient = createClient
\`\`\`

### Login Flow (`/app/auth/login/page.tsx`)

\`\`\`typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  const supabase = createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  
  router.push("/admin")
  router.refresh() // Trigger middleware to update session
}
\`\`\`

**User Journey:**
1. User enters email/password
2. `signInWithPassword()` creates session in Supabase
3. Redirect to `/admin`
4. Middleware detects session, allows access
5. Cookies automatically refreshed

### Logout Flow (`/app/api/auth/signout/route.ts`)

\`\`\`typescript
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  return NextResponse.redirect("/")
}
\`\`\`

### API Endpoint Protection Pattern

All protected API routes follow this pattern:

\`\`\`typescript
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Protected logic here
}
\`\`\`

**Protected Endpoints:**
- `/api/supabase-proxy/[...path]` - Supabase Management API proxy
- `/api/ai/sql` - AI SQL generation
- `/api/ai/parse-result` - Match result parsing
- `/api/ai/weekly-recap` - Weekly recap generation
- `/api/battle/create` - Battle creation
- `/api/battle/[id]/step` - Battle step execution
- `/api/sync/google-sheets` - Google Sheets sync

---

## Role-Based Access Control (RBAC)

### Current Implementation Status

#### ✅ What's Implemented

**1. Authentication Check**
- All protected routes verify `user !== null`
- Middleware blocks unauthenticated users from `/admin/*`

**2. Route-Level Protection**
- Admin dashboard requires authentication
- Public pages accessible to everyone

**3. API-Level Protection**
- All sensitive API endpoints check for user session
- Management API proxy validates authentication

#### ⚠️ What's Missing (Ready for Implementation)

**1. Role-Based Checks**
\`\`\`typescript
// TODO: Add in /app/api/sync/google-sheets/route.ts (line 18)
// TODO: Add admin role check here
\`\`\`

**2. Permission Granularity**
- No distinction between "coach" and "admin" roles
- No permission-based feature flags

**3. Database-Level Access Control**
- Row Level Security (RLS) policies not fully implemented
- User metadata doesn't store role information

### Recommended RBAC Expansion

#### Option 1: User Metadata (Simplest)

Store role in Supabase Auth user metadata:

\`\`\`typescript
// During user creation/update
await supabase.auth.admin.updateUserById(userId, {
  user_metadata: { role: 'admin' }
})

// In protected routes
const { data: { user } } = await supabase.auth.getUser()
const role = user?.user_metadata?.role

if (role !== 'admin') {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
\`\`\`

**Pros:**
- No database schema changes needed
- Fast to implement
- Works with existing auth flow

**Cons:**
- Limited to flat role structure
- Can't query users by role easily

#### Option 2: Profiles Table (Recommended)

Create a `profiles` table with role/permission tracking:

\`\`\`sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'commissioner', 'coach', 'viewer')),
  permissions JSONB DEFAULT '[]'::jsonb,
  team_id UUID REFERENCES teams(id),
  discord_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
\`\`\`

**Helper Function:**
\`\`\`typescript
export async function getUserRole(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  
  return data?.role || null
}

export async function requireRole(supabase: any, userId: string, allowedRoles: string[]) {
  const role = await getUserRole(supabase, userId)
  
  if (!role || !allowedRoles.includes(role)) {
    throw new Error('Insufficient permissions')
  }
  
  return role
}
\`\`\`

**Usage in API Routes:**
\`\`\`typescript
export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  // Require admin or commissioner role
  try {
    await requireRole(supabase, user.id, ['admin', 'commissioner'])
  } catch (error) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  
  // Protected admin logic here
}
\`\`\`

#### Option 3: Row Level Security (Database-Level)

Implement RLS policies to control data access:

\`\`\`sql
-- Example: Coaches can only view their own team's data
CREATE POLICY "Coaches view own team roster"
  ON team_rosters FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- Example: Admins can modify everything
CREATE POLICY "Admins full access to teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
\`\`\`

### Proposed Role Structure

\`\`\`typescript
enum UserRole {
  ADMIN = 'admin',           // Full system access
  COMMISSIONER = 'commissioner', // League management, no system config
  COACH = 'coach',           // Team management only
  VIEWER = 'viewer'          // Read-only access
}

interface RolePermissions {
  admin: [
    'sync:google-sheets',
    'manage:all-teams',
    'manage:matches',
    'manage:playoffs',
    'manage:users',
    'manage:settings',
    'view:analytics',
    'use:platform-manager'
  ],
  commissioner: [
    'manage:matches',
    'manage:playoffs',
    'view:all-teams',
    'view:analytics'
  ],
  coach: [
    'manage:own-team',
    'submit:results',
    'view:standings',
    'view:schedule'
  ],
  viewer: [
    'view:standings',
    'view:schedule',
    'view:teams'
  ]
}
\`\`\`

### Implementation Checklist

- [ ] Create `profiles` table with role column
- [ ] Add trigger to auto-create profile on user signup
- [ ] Implement `getUserRole()` and `requireRole()` helpers
- [ ] Update API routes with role checks:
  - [ ] `/api/sync/google-sheets` → admin only
  - [ ] `/api/supabase-proxy/[...path]` → admin only
  - [ ] `/api/ai/*` → authenticated users
  - [ ] `/api/battle/create` → coaches and admins
- [ ] Add RLS policies to sensitive tables
- [ ] Update admin UI to show role-based features
- [ ] Add user management page for admins

---

## Google Sheets Integration

### Architecture Overview

The app uses **two Google Sheets packages** with a fallback strategy:

1. **`node-google-spreadsheet`** (Primary, Active)
   - Simpler API wrapper around Google Sheets API v4
   - Used in production for actual data sync
   - Location: `/lib/google-sheets-sync.ts`

2. **`googleapis`** (Official, Disabled for v0)
   - Official Google API client library
   - More comprehensive but complex
   - Location: `/lib/google-sheets.ts` (commented out)

### Why Two Packages?

**Original Intent:**
- Start with `googleapis` for full API control
- Discovered it doesn't work in v0 preview (authentication issues)

**Current Solution:**
- Use `node-google-spreadsheet` for simpler authentication
- Comment out `googleapis` implementation for v0 compatibility
- Both work when deployed to Vercel with proper credentials

### Package Comparison

| Feature | `googleapis` | `node-google-spreadsheet` |
|---------|--------------|---------------------------|
| API Coverage | Full Google API suite | Sheets-specific only |
| Setup Complexity | High (requires detailed auth config) | Low (simplified auth) |
| V0 Preview | ❌ Breaks preview | ✅ Works (when properly configured) |
| Type Safety | ✅ Full TypeScript types | ✅ Good TypeScript support |
| Documentation | Official Google docs | Community-driven |
| Use Case | Multi-service Google integration | Sheets-only projects |

### Current Implementation: `node-google-spreadsheet`

#### File: `/lib/google-sheets-sync.ts`

**Authentication Setup:**
\`\`\`typescript
import { GoogleSpreadsheet } from "node-google-spreadsheet"

const doc = new GoogleSpreadsheet(SHEET_ID)

await doc.useServiceAccountAuth({
  client_email: SERVICE_ACCOUNT_EMAIL,
  private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
})

await doc.loadInfo()
\`\`\`

**Environment Variables Required:**
\`\`\`bash
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
\`\`\`

### Sync Flow Architecture

\`\`\`
┌──────────────────┐
│  Google Sheets   │
│  (Master Data)   │
└────────┬─────────┘
         │
         │ 1. API Request via Service Account
         ▼
┌─────────────────────┐
│ node-google-        │
│ spreadsheet Library │
└────────┬────────────┘
         │
         │ 2. Parse Rows & Map Columns
         ▼
┌─────────────────────┐
│  Sync Functions     │
│  - syncTeams()      │
│  - syncDraft()      │
│  - syncMatches()    │
│  - syncStats()      │
└────────┬────────────┘
         │
         │ 3. Upsert to Database
         ▼
┌─────────────────────┐
│  Supabase Tables    │
│  - teams            │
│  - team_rosters     │
│  - matches          │
│  - pokemon          │
└─────────────────────┘
\`\`\`

### Sheet Mapping Strategy

#### Master Data Sheet → Teams Table

**Expected Columns:**
- `Team` or `Team Name` → `teams.name`
- `Coach` or `Coach Name` → `teams.coach_name`
- `Division` → `teams.division`
- `Conference` → `teams.conference`
- `Wins` or `W` → `teams.wins`
- `Losses` or `L` → `teams.losses`
- `Differential` or `Diff` → `teams.differential`
- `SoS` or `Strength of Schedule` → `teams.strength_of_schedule`

**Code:**
\`\`\`typescript
async function syncTeams(sheet: any, supabase: any) {
  const rows = await sheet.getRows()
  
  for (const row of rows) {
    const teamData = {
      name: row.get("Team") || row.get("Team Name"),
      coach_name: row.get("Coach") || row.get("Coach Name"),
      // ... flexible column mapping
    }
    
    await supabase.from("teams").upsert(teamData, { onConflict: "name" })
  }
}
\`\`\`

**Key Features:**
- ✅ Flexible column name mapping (handles variations)
- ✅ Skips empty rows automatically
- ✅ Upserts (insert or update) based on team name
- ✅ Error handling per row (doesn't stop entire sync)

#### Draft Results → Team Rosters

**Expected Columns:**
- `Round` → draft round number
- `Team` → team name (lookup)
- `Pokemon` or `Pick` → Pokemon name
- `Cost` or `Points` → draft points spent

**Flow:**
1. Parse draft picks from sheet
2. Look up team ID by name
3. Create/get Pokemon entry
4. Link to team roster with draft metadata

#### Week Battles → Matches

**Expected Columns:**
- `Week` → match week number
- `Team 1` or `Home` → first team
- `Team 2` or `Away` → second team
- `Score` or `Result` → format: `"6-4"` (winner-loser)

**Score Parsing:**
\`\`\`typescript
// Parse "6-4" into winner/loser scores
if (score && score.includes("-")) {
  const [s1, s2] = score.split("-").map(s => parseInt(s.trim()))
  team1Score = s1
  team2Score = s2
}

// Determine winner
if (team1Score > team2Score) winnerId = team1.id
else if (team2Score > team1Score) winnerId = team2.id
\`\`\`

### API Endpoints

#### `POST /api/sync/google-sheets`

**Authentication:** Requires logged-in user (TODO: Add admin role check)

**Process:**
1. Authenticate with Supabase
2. Call `syncLeagueData()`
3. Sync all sheets in sequence:
   - Teams
   - Draft Results
   - Matches
   - Stats (TODO)
4. Log results to `sync_log` table
5. Return summary

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Synced 87 records",
  "recordsProcessed": 87,
  "errors": []
}
\`\`\`

#### `GET /api/sync/google-sheets`

Returns sync history:

\`\`\`json
{
  "logs": [
    {
      "id": "uuid",
      "sync_type": "full",
      "status": "success",
      "records_processed": 87,
      "error_message": null,
      "synced_at": "2026-01-12T10:30:00Z"
    }
  ]
}
\`\`\`

### Error Handling Strategy

**Per-Row Error Collection:**
\`\`\`typescript
const errors: string[] = []

for (const row of rows) {
  try {
    // Process row
  } catch (error) {
    errors.push(`Row error: ${error.message}`)
    // Continue processing other rows
  }
}

return {
  success: errors.length === 0,
  errors
}
\`\`\`

**Sync Status Logic:**
- `success` → No errors at all
- `partial` → Some records processed, some errors
- `error` → Complete failure (auth, network, etc.)

### Flexible Column Mapping

The sync handles column name variations:

\`\`\`typescript
// Accepts multiple column name formats
row.get("Team") || row.get("Team Name")
row.get("Wins") || row.get("W")
row.get("Differential") || row.get("Diff")
\`\`\`

This makes the sync resilient to spreadsheet formatting changes.

---

## V0 Preview Compatibility

### The Problem

**Google APIs Break V0 Preview:**
- v0's preview runtime doesn't support external API authentication
- `googleapis` and `node-google-spreadsheet` both require service account credentials
- Service account private key environment variables aren't available in v0 preview
- Preview shows blank screen when these packages are imported

### Current Solution

#### 1. Conditional Implementation

**`/lib/google-sheets.ts`** (googleapis - commented out):
\`\`\`typescript
// This file will work when deployed to Vercel with proper environment variables

/*
import { google } from "googleapis"
// ... actual implementation
*/

// Mock implementation for v0 preview
export async function getGoogleSheetsClient() {
  throw new Error("Google Sheets API not available in v0 preview. Deploy to Vercel to use.")
}
\`\`\`

**`/lib/google-sheets-sync.ts`** (node-google-spreadsheet - active):
\`\`\`typescript
import { GoogleSpreadsheet } from "node-google-spreadsheet"

// Real implementation (works when deployed)
export async function syncLeagueData() {
  const doc = new GoogleSpreadsheet(SHEET_ID)
  await doc.useServiceAccountAuth({ ... })
  // ... full sync logic
}
\`\`\`

**`/app/api/sync/route.ts`** (fallback endpoint):
\`\`\`typescript
export async function POST() {
  return NextResponse.json(
    {
      error: "Google Sheets sync not available in v0 preview",
      message: "Deploy to Vercel to enable this feature. The app currently uses mock data for preview.",
    },
    { status: 503 },
  )
}
\`\`\`

#### 2. Mock Data Fallback

All pages use mock data when Google Sheets isn't available:

\`\`\`typescript
// In all pages
const USE_MOCK_DATA = true // Toggle to false in production

async function getData() {
  if (USE_MOCK_DATA) {
    return mockLeagueData // Static mock data
  }
  
  // Real Supabase query
  const { data } = await supabase.from('teams').select('*')
  return data
}
\`\`\`

### Why `node-google-spreadsheet` is Better for V0

Even though both packages break v0 preview authentication, `node-google-spreadsheet` is the better choice:

**Advantages:**
1. **Simpler API** - Fewer lines of code for same functionality
2. **Better Error Messages** - Clearer stack traces when things fail
3. **Sheets-Specific** - No unnecessary dependencies
4. **Modern TypeScript** - Better type inference
5. **Active Maintenance** - Regular updates and community support

**Example Comparison:**

**With `googleapis`:**
\`\`\`typescript
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
})

const sheets = google.sheets({ version: "v4", auth })

const response = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  range: "Teams!A:H",
})

const rows = response.data.values || []
// Manual parsing required
\`\`\`

**With `node-google-spreadsheet`:**
\`\`\`typescript
const doc = new GoogleSpreadsheet(SHEET_ID)

await doc.useServiceAccountAuth({
  client_email: SERVICE_ACCOUNT_EMAIL,
  private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
})

await doc.loadInfo()
const sheet = doc.sheetsByTitle["Teams"]
const rows = await sheet.getRows()

// Rows already parsed with `.get()` method
const teamName = rows[0].get("Team Name")
\`\`\`

### Workarounds for V0 Preview

#### Option 1: Mock Data (Current)
- ✅ App works in v0 preview
- ✅ All UI components functional
- ✅ Can test auth, routing, UI/UX
- ❌ Can't test real data sync

#### Option 2: CSV Upload (Alternative)
Instead of live Google Sheets sync in preview, allow CSV upload:

\`\`\`typescript
// Alternative implementation
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  
  const text = await file.text()
  const rows = parseCSV(text) // Use a CSV parser
  
  // Sync rows to Supabase
  await syncTeamsFromRows(rows)
  
  return NextResponse.json({ success: true })
}
\`\`\`

**Benefits:**
- Works in v0 preview (no Google API required)
- Still uses real Supabase database
- Export your Google Sheet as CSV → upload → sync

#### Option 3: MCP Server (Advanced)
Use a Model Context Protocol server as a bridge:

\`\`\`
┌─────────┐     ┌─────────────┐     ┌────────────────┐
│  V0 App │────▶│  MCP Server │────▶│ Google Sheets  │
└─────────┘     └─────────────┘     └────────────────┘
\`\`\`

**How it works:**
1. Run MCP server locally or on a separate service
2. MCP handles Google auth and API calls
3. Your v0 app calls MCP via HTTP (no direct Google dependency)
4. MCP returns parsed data to your app

**Trade-offs:**
- ✅ V0 preview works
- ✅ Real Google Sheets integration
- ❌ Requires external service
- ❌ More complex architecture

### Recommended Deployment Flow

**Development (V0 Preview):**
1. Use mock data for UI development
2. Test auth flows with Supabase
3. Test all pages and components
4. Use `USE_MOCK_DATA = true` flag

**Staging (Vercel Deployment):**
1. Deploy to Vercel
2. Set environment variables:
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
3. Set `USE_MOCK_DATA = false`
4. Test sync endpoint: `POST /api/sync/google-sheets`
5. Verify data in Supabase

**Production:**
1. Ensure all environment variables set
2. Set up automated sync (cron job or webhook)
3. Monitor `sync_log` table for errors
4. Set up alerts for sync failures

### Environment Variable Setup Guide

**Google Service Account Setup:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Google Sheets API
4. Go to "IAM & Admin" → "Service Accounts"
5. Create a service account
6. Generate a JSON key
7. Share your Google Sheet with the service account email

**Extract from JSON key:**
\`\`\`json
{
  "type": "service_account",
  "client_email": "your-sa@project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
}
\`\`\`

**Set in Vercel:**
\`\`\`bash
GOOGLE_SHEETS_ID=1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
\`\`\`

**Important:** Private key must include escaped newlines (`\n`) as shown above.

### Testing the Integration

**1. Test in Vercel (after deployment):**
\`\`\`bash
curl -X POST https://your-app.vercel.app/api/sync/google-sheets \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
\`\`\`

**2. Check sync logs:**
\`\`\`bash
curl https://your-app.vercel.app/api/sync/google-sheets \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
\`\`\`

**3. Verify Supabase:**
\`\`\`sql
SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 5;
SELECT COUNT(*) FROM teams;
SELECT COUNT(*) FROM team_rosters;
\`\`\`

---

## Summary

### Authentication Flow
- Cookie-based sessions via Supabase SSR
- Middleware protects `/admin/*` routes automatically
- All API endpoints validate user authentication
- Clean separation between server/client auth

### RBAC Status
- ✅ Basic authentication implemented
- ⚠️ Role-based permissions ready for implementation
- 📋 Recommended: `profiles` table with role column
- 🔧 TODO: Add role checks to admin-only endpoints

### Google Sheets Integration
- **Package:** `node-google-spreadsheet` (active)
- **Sync Strategy:** Tab-based mapping with flexible column names
- **Error Handling:** Per-row error collection, partial success support
- **V0 Compatibility:** Uses mock data in preview, works when deployed

### Next Steps
1. Deploy to Vercel with Google Sheets credentials
2. Implement role-based permissions (profiles table)
3. Add RLS policies for data security
4. Set up automated sync schedule
5. Create user management interface for admins

---

## Quick Reference

### Key Files
- `/proxy.ts` - Root middleware configuration
- `/lib/supabase/proxy.ts` - Session management & route protection
- `/lib/supabase/server.ts` - Server-side Supabase client
- `/lib/supabase/client.ts` - Client-side Supabase client
- `/lib/google-sheets-sync.ts` - Google Sheets sync implementation
- `/app/auth/login/page.tsx` - Login UI
- `/app/admin/page.tsx` - Admin dashboard

### Environment Variables
\`\`\`bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_MANAGEMENT_API_TOKEN=sbp_xxx

# Google Sheets
GOOGLE_SHEETS_ID=1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# OpenAI (optional)
OPENAI_API_KEY=sk-proj-...
\`\`\`

### Useful Commands
\`\`\`bash
# Test sync
curl -X POST https://your-app.vercel.app/api/sync/google-sheets

# Get sync logs
curl https://your-app.vercel.app/api/sync/google-sheets

# Check user session
curl https://your-app.vercel.app/api/auth/user
