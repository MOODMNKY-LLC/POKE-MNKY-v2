# Bridge Authentication: Supabase → Showdown Loginserver

**Date**: January 2026  
**Status**: Planning Phase  
**Approach**: Bridge Authentication (Option B)

---

## Overview

**Bridge Authentication** creates an API endpoint in your Next.js app that bridges Supabase authentication to Showdown loginserver. When a user logs into your app, the app automatically creates/updates their Showdown account via the loginserver API.

**Benefits**:
- ✅ Simpler than full SSO integration
- ✅ Maintains separation between systems
- ✅ Unified identity (Supabase user = Showdown user)
- ✅ No need to modify loginserver code

---

## Architecture

```
┌─────────────────┐
│  User logs in   │
│  (Supabase)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Next.js App    │
│  Auth Callback  │
└────────┬────────┘
         │
         │ POST /api/showdown/sync-account
         │ { userId, username, email }
         │
         ▼
┌─────────────────┐
│  Loginserver    │
│  API Endpoint   │
│  /api/register  │
└────────┬────────┘
         │
         │ Creates/updates Showdown account
         │
         ▼
┌─────────────────┐
│  Showdown       │
│  Server         │
└─────────────────┘
```

---

## Implementation Plan

### Step 1: Create API Endpoint in Next.js App

**File**: `app/api/showdown/sync-account/route.ts`

**Purpose**: Bridge Supabase user to Showdown account

**Flow**:
1. User logs into app (Supabase/Discord OAuth)
2. Auth callback triggers account sync
3. API endpoint calls loginserver to create/update Showdown account
4. User can now log into Showdown with same username

**Implementation**:

```typescript
// app/api/showdown/sync-account/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile from Supabase
    const { data: profile } = await supabase
      .from('profiles')
      .select('showdown_username, discord_username')
      .eq('id', user.id)
      .single()

    // Determine Showdown username (prefer showdown_username, fallback to discord_username)
    const showdownUsername = profile?.showdown_username || 
                            profile?.discord_username || 
                            user.email?.split('@')[0] || 
                            user.id.slice(0, 18) // Fallback to user ID (max 18 chars)

    // Call loginserver API to register/update account
    const loginserverUrl = process.env.LOGINSERVER_URL || 'http://showdown-loginserver:8001'
    const response = await fetch(`${loginserverUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: showdownUsername,
        password: generateSecurePassword(user.id), // Generate deterministic password
        email: user.email,
        // Add any other required fields
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ error: error.message || 'Failed to sync account' }, { status: 500 })
    }

    // Update Supabase profile with Showdown username
    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        showdown_username: showdownUsername,
        showdown_account_synced: true,
        showdown_account_synced_at: new Date().toISOString(),
      })

    return NextResponse.json({ 
      success: true, 
      showdown_username: showdownUsername 
    })

  } catch (error) {
    console.error('Error syncing Showdown account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate deterministic password from user ID
function generateSecurePassword(userId: string): string {
  // Use a secret key from environment variables
  const secret = process.env.SHOWDOWN_PASSWORD_SECRET || 'change-me-in-production'
  // Generate deterministic password (user can't change it, but it's secure)
  // In production, use proper crypto
  return Buffer.from(`${userId}:${secret}`).toString('base64').slice(0, 20)
}
```

---

### Step 2: Trigger Account Sync on Login

**Option A: Auth Callback Hook**

**File**: `app/auth/callback/route.ts` (or wherever your auth callback is)

```typescript
// After successful Supabase auth
import { syncShowdownAccount } from '@/lib/showdown/sync'

// In your callback handler
const { data: { user } } = await supabase.auth.getUser()

if (user) {
  // Sync Showdown account (fire and forget)
  syncShowdownAccount(user.id).catch(console.error)
}
```

**Option B: Middleware/Server Action**

Create a server action that runs after login:

```typescript
// app/actions/auth.ts
'use server'

export async function syncShowdownAccountAction() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Not authenticated' }

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/showdown/sync-account`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getSessionToken()}`,
    },
  })

  return response.json()
}
```

---

### Step 3: Update Database Schema

**Migration**: Add fields to track Showdown account sync

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_showdown_sync_fields.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS showdown_username TEXT,
ADD COLUMN IF NOT EXISTS showdown_account_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS showdown_account_synced_at TIMESTAMPTZ;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_showdown_username 
ON profiles(showdown_username);

-- Constraint: showdown_username must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_showdown_username_unique 
ON profiles(showdown_username) 
WHERE showdown_username IS NOT NULL;
```

---

### Step 4: Add Environment Variables

**`.env`** (Production):
```bash
# Showdown Loginserver (for bridge authentication - AAB subdomain)
LOGINSERVER_URL=https://aab-login.moodmnky.com
SHOWDOWN_PASSWORD_SECRET=your-secret-key-here  # For deterministic passwords
```

**`.env.local`** (Local Development):
```bash
# Showdown Loginserver (local - AAB IP address)
LOGINSERVER_URL=http://10.3.0.119:8001
SHOWDOWN_PASSWORD_SECRET=local-dev-secret
```

---

### Step 5: Create Utility Functions

**File**: `lib/showdown/sync.ts`

```typescript
// lib/showdown/sync.ts
import { createClient } from '@/lib/supabase/server'

export async function syncShowdownAccount(userId: string) {
  const supabase = createClient()
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('showdown_username, discord_username')
    .eq('id', userId)
    .single()

  if (!profile) {
    throw new Error('Profile not found')
  }

  // Call sync API
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/showdown/sync-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    throw new Error('Failed to sync Showdown account')
  }

  return response.json()
}

export async function getShowdownUsername(userId: string): Promise<string | null> {
  const supabase = createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('showdown_username')
    .eq('id', userId)
    .single()

  return profile?.showdown_username || null
}
```

---

## Loginserver API Endpoints

The loginserver exposes these endpoints (from `smogon/pokemon-showdown-loginserver`):

### Register User

**POST** `/api/register`

```json
{
  "username": "username",
  "password": "password",
  "email": "email@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "userid": "username"
}
```

### Update User

**POST** `/api/updateuser`

```json
{
  "userid": "username",
  "password": "newpassword",
  "email": "newemail@example.com"
}
```

---

## User Flow

1. **User logs into app** (Discord OAuth → Supabase)
2. **Auth callback triggers** account sync
3. **API endpoint calls loginserver** to create Showdown account
4. **Showdown username stored** in Supabase profile
5. **User can log into Showdown** with same username
6. **Password is deterministic** (generated from user ID + secret)

---

## Security Considerations

1. **Password Generation**:
   - Use deterministic password generation (user ID + secret)
   - User doesn't know password (they use app auth)
   - Password can't be changed by user (maintains sync)

2. **API Authentication**:
   - Sync endpoint requires Supabase auth
   - Only authenticated users can sync accounts
   - Rate limit sync requests

3. **Username Validation**:
   - Validate Showdown username format (max 18 chars, alphanumeric)
   - Handle conflicts (username already taken)
   - Fallback to user ID if needed

---

## Next Steps

1. ✅ Plan documented
2. ⬜ Create API endpoint (`/api/showdown/sync-account`)
3. ⬜ Add database migration (showdown sync fields)
4. ⬜ Create utility functions (`lib/showdown/sync.ts`)
5. ⬜ Add auth callback hook to trigger sync
6. ⬜ Add environment variables
7. ⬜ Test end-to-end flow
8. ⬜ Add error handling and retry logic
9. ⬜ Add UI to show sync status

---

## Testing

### Manual Test Flow

1. **Log into app** (Discord OAuth)
2. **Check Supabase** - profile should have `showdown_username`
3. **Check loginserver** - account should exist
4. **Log into Showdown** - should work with synced username
5. **Verify password** - deterministic password should work

### Test Commands

```bash
# Test loginserver API directly
curl -X POST http://localhost:8001/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","email":"test@example.com"}'

# Check Supabase profile
# Query profiles table for showdown_username
```

---

## References

- **Loginserver Docs**: `showdown-login-server-help.md`
- **Loginserver Repo**: https://github.com/smogon/pokemon-showdown-loginserver
- **Loginserver Actions**: See `src/actions.ts` in loginserver repo

---

**Ready to implement!** This approach maintains separation while providing unified identity. 🎉
