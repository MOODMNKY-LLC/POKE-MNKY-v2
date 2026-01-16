# Priority 1.3: Discord OAuth End-to-End Testing Plan

**Date**: January 2026  
**Status**: Implementation Ready  
**Priority**: Critical Production Blocker  
**Estimated Effort**: 3-5 days

---

## Executive Summary

Discord OAuth is configured but has never been tested in a live environment. This represents a critical blocker - without working OAuth, users cannot log in, and role sync cannot function. The authentication flow, role synchronization, and Showdown account linking all depend on Discord OAuth working correctly.

This document provides a comprehensive testing plan, troubleshooting guide, and implementation steps to validate and fix Discord OAuth authentication and role synchronization.

---

## Current State Analysis

### What Exists

1. **OAuth Configuration**: ✅ Configured in Supabase Dashboard
   - Discord provider enabled
   - Client ID and Secret configured
   - Redirect URIs set

2. **Frontend Implementation**: ✅ Complete
   - Login page with Discord OAuth button (`app/auth/login/page.tsx`)
   - OAuth callback handler (`app/auth/callback/route.ts`)
   - PKCE flow implemented

3. **Backend Integration**: ✅ Complete
   - Profile creation trigger (`handle_new_user()`)
   - Discord ID extraction from OAuth metadata
   - Showdown account sync endpoint (`/api/showdown/sync-account-discord`)

4. **Role Sync Logic**: ⚠️ Designed but untested
   - Role mapping logic exists in `lib/discord-bot.ts`
   - Admin UI for role sync exists (`app/admin/discord/roles/page.tsx`)
   - Automatic role assignment on login (designed, not tested)

### What's Missing

1. **End-to-End Testing**: ❌ Never tested
   - OAuth flow not validated
   - Role sync not tested
   - Error handling not validated

2. **Production Configuration**: ⚠️ Unknown
   - Redirect URIs may not match production URL
   - Environment variables may be incorrect
   - Supabase Auth settings may need updates

3. **Error Handling**: ⚠️ Basic
   - No comprehensive error messages
   - No retry logic for failed syncs
   - No logging for debugging

---

## Architecture Overview

### OAuth Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Click "Continue with Discord"                 │  │
│  │  2. Redirect to Supabase Auth                    │  │
│  │  3. Supabase redirects to Discord OAuth           │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼────────────────────────────────────┘
                      │
                      │ OAuth Request
                      ▼
┌─────────────────────────────────────────────────────────┐
│              DISCORD OAUTH SERVER                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. User authorizes app                           │  │
│  │  2. Returns authorization code                   │  │
│  │  3. Redirects to Supabase callback                │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼────────────────────────────────────┘
                      │
                      │ Authorization Code
                      ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE AUTH                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Exchange code for Discord user data          │  │
│  │  2. Create/update auth.users record              │  │
│  │  3. Trigger handle_new_user() function           │  │
│  │  4. Create/update profiles record                │  │
│  │  5. Extract Discord ID from metadata             │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼────────────────────────────────────┘
                      │
                      │ Session Token
                      ▼
┌─────────────────────────────────────────────────────────┐
│              NEXT.JS APP                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Receive callback at /auth/callback           │  │
│  │  2. Exchange code for session                    │  │
│  │  3. Set session cookie                           │  │
│  │  4. Redirect to home/admin                       │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼────────────────────────────────────┘
                      │
                      │ User Authenticated
                      ▼
┌─────────────────────────────────────────────────────────┐
│              ROLE SYNC (Optional)                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Check Discord server membership              │  │
│  │  2. Fetch Discord roles                          │  │
│  │  3. Map Discord roles to app roles               │  │
│  │  4. Update profiles.role                         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Configuration Verification (Day 1)

#### Step 1.1: Verify Supabase Auth Configuration

**Checklist**:
- [ ] Discord provider enabled in Supabase Dashboard
- [ ] Client ID matches Discord Developer Portal
- [ ] Client Secret matches Discord Developer Portal
- [ ] Redirect URIs configured correctly:
  - Production: `https://poke-mnky.moodmnky.com/auth/callback`
  - Local: `http://localhost:3000/auth/callback`
  - Supabase local: `http://localhost:54321/auth/v1/callback`

**Action**: Document current configuration in `docs/DISCORD-OAUTH-CONFIG.md`

#### Step 1.2: Verify Discord Developer Portal Configuration

**Checklist**:
- [ ] Application created in Discord Developer Portal
- [ ] OAuth2 redirect URIs match Supabase configuration
- [ ] Required scopes enabled:
  - `identify` - Get user ID, username, avatar
  - `email` - Get user email address
  - `guilds.members.read` - Read server member information (for role sync)
- [ ] Client ID and Secret copied correctly

**Action**: Create configuration document with screenshots

#### Step 1.3: Verify Environment Variables

**Checklist**:
- [ ] `DISCORD_CLIENT_ID` set in Supabase Dashboard (Auth → Providers → Discord)
- [ ] `DISCORD_CLIENT_SECRET` set in Supabase Dashboard
- [ ] `DISCORD_GUILD_ID` set in app environment variables
- [ ] `DISCORD_BOT_TOKEN` set (for role sync)

**Action**: Create environment variable checklist

---

### Phase 2: Local Testing (Day 2)

#### Step 2.1: Test OAuth Flow Locally

Create `scripts/test-discord-oauth.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

/**
 * Test Discord OAuth flow
 * 
 * This script helps verify OAuth configuration by:
 * 1. Checking Supabase Auth configuration
 * 2. Testing OAuth URL generation
 * 3. Validating redirect URIs
 */
async function testDiscordOAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🧪 Testing Discord OAuth Configuration...\n');

  // Test 1: Check if Discord provider is enabled
  console.log('Test 1: Checking Discord provider status...');
  try {
    // Note: Supabase doesn't expose provider status via client SDK
    // This would need to be checked in Supabase Dashboard
    console.log('⚠️  Provider status must be checked in Supabase Dashboard');
    console.log('   Go to: Authentication → Providers → Discord');
    console.log('   Verify: Provider is enabled\n');
  } catch (error) {
    console.error('❌ Error checking provider:', error);
  }

  // Test 2: Generate OAuth URL
  console.log('Test 2: Generating OAuth URL...');
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        scopes: 'identify email guilds.members.read',
      },
    });

    if (error) {
      console.error('❌ Error generating OAuth URL:', error.message);
      console.error('   This usually means Discord provider is not configured correctly');
      return;
    }

    console.log('✅ OAuth URL generated successfully');
    console.log(`   URL: ${data.url}`);
    console.log('   Open this URL in a browser to test OAuth flow\n');
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Test 3: Verify redirect URI format
  console.log('Test 3: Verifying redirect URI...');
  const expectedRedirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`;
  console.log(`   Expected: ${expectedRedirectUri}`);
  console.log('   Verify this matches Discord Developer Portal redirect URIs\n');

  // Test 4: Check environment variables
  console.log('Test 4: Checking environment variables...');
  const requiredVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : undefined,
    'DISCORD_GUILD_ID': process.env.DISCORD_GUILD_ID,
    'DISCORD_BOT_TOKEN': process.env.DISCORD_BOT_TOKEN ? '***' : undefined,
  };

  let allPresent = true;
  for (const [key, value] of Object.entries(requiredVars)) {
    if (value) {
      console.log(`   ✅ ${key}: Set`);
    } else {
      console.log(`   ❌ ${key}: Missing`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    console.log('\n⚠️  Some environment variables are missing');
    console.log('   Add missing variables to .env.local\n');
  }

  console.log('\n✅ Configuration check complete!');
  console.log('\nNext steps:');
  console.log('1. Verify Discord provider is enabled in Supabase Dashboard');
  console.log('2. Verify redirect URIs match in Discord Developer Portal');
  console.log('3. Test OAuth flow by opening the generated URL');
  console.log('4. Check callback handler receives the authorization code');
}

testDiscordOAuth().catch(console.error);
```

#### Step 2.2: Manual Testing Checklist

**Local Testing Steps**:

1. **Start Local Development**:
   ```bash
   pnpm dev
   ```

2. **Navigate to Login Page**:
   - Go to `http://localhost:3000/auth/login`
   - Click "Continue with Discord"

3. **Verify OAuth Redirect**:
   - Should redirect to Discord OAuth consent page
   - Should show app name and requested permissions
   - Should have correct redirect URI

4. **Authorize Application**:
   - Click "Authorize" in Discord
   - Should redirect back to app callback

5. **Verify Callback Handling**:
   - Check browser console for errors
   - Check server logs for callback processing
   - Verify session cookie is set

6. **Verify Profile Creation**:
   - Check Supabase Dashboard → Authentication → Users
   - Verify user was created
   - Check `profiles` table for new profile
   - Verify Discord ID is stored correctly

7. **Verify Role Assignment**:
   - Check `profiles.role` field
   - Should default to 'viewer' for new users
   - Verify role sync works (if implemented)

---

### Phase 3: Role Sync Testing (Day 3)

#### Step 3.1: Test Role Sync Logic

Create `scripts/test-discord-role-sync.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Client, GatewayIntentBits } from 'discord.js';

/**
 * Test Discord role synchronization
 * 
 * This script tests:
 * 1. Discord bot can fetch server members
 * 2. Role mapping logic works correctly
 * 3. Profile updates succeed
 */
async function testRoleSync() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const discordBot = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  await discordBot.login(process.env.DISCORD_BOT_TOKEN);

  const guildId = process.env.DISCORD_GUILD_ID!;
  const guild = await discordBot.guilds.fetch(guildId);

  console.log('🧪 Testing Discord Role Sync...\n');

  // Test 1: Fetch server members
  console.log('Test 1: Fetching server members...');
  const members = await guild.members.fetch();
  console.log(`   Found ${members.size} members\n`);

  // Test 2: Test role mapping
  console.log('Test 2: Testing role mapping...');
  const roleMapping = {
    'Commissioner': 'admin',
    'League Admin': 'admin',
    'Coach': 'coach',
    'Spectator': 'viewer',
  };

  for (const [discordRoleName, appRole] of Object.entries(roleMapping)) {
    const discordRole = guild.roles.cache.find(r => r.name === discordRoleName);
    if (discordRole) {
      console.log(`   ✅ Found Discord role: ${discordRoleName} → App role: ${appRole}`);
    } else {
      console.log(`   ⚠️  Discord role not found: ${discordRoleName}`);
    }
  }
  console.log('');

  // Test 3: Sync roles for test users
  console.log('Test 3: Syncing roles for test users...');
  const testDiscordIds = [
    // Add test Discord user IDs here
  ];

  for (const discordId of testDiscordIds) {
    const member = members.get(discordId);
    if (!member) {
      console.log(`   ⚠️  Member not found: ${discordId}`);
      continue;
    }

    // Determine app role from Discord roles
    let appRole = 'viewer'; // Default
    for (const [discordRoleName, mappedRole] of Object.entries(roleMapping)) {
      if (member.roles.cache.some(r => r.name === discordRoleName)) {
        appRole = mappedRole;
        break;
      }
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({ role: appRole })
      .eq('discord_id', discordId);

    if (error) {
      console.log(`   ❌ Failed to update ${discordId}: ${error.message}`);
    } else {
      console.log(`   ✅ Updated ${member.user.username}: ${appRole}`);
    }
  }

  await discordBot.destroy();
  console.log('\n✅ Role sync test complete!');
}

testRoleSync().catch(console.error);
```

#### Step 3.2: Role Mapping Configuration

Create `lib/discord-role-mapping.ts`:

```typescript
/**
 * Discord role to app role mapping configuration
 */

export interface RoleMapping {
  discordRoleName: string;
  appRole: 'admin' | 'commissioner' | 'coach' | 'viewer';
  priority: number; // Higher priority takes precedence
}

export const DISCORD_ROLE_MAPPINGS: RoleMapping[] = [
  { discordRoleName: 'Commissioner', appRole: 'admin', priority: 100 },
  { discordRoleName: 'League Admin', appRole: 'admin', priority: 90 },
  { discordRoleName: 'Coach', appRole: 'coach', priority: 50 },
  { discordRoleName: 'Spectator', appRole: 'viewer', priority: 10 },
];

/**
 * Determine app role from Discord member roles
 */
export function determineAppRoleFromDiscordRoles(discordRoleNames: string[]): 'admin' | 'commissioner' | 'coach' | 'viewer' {
  // Find highest priority matching role
  let highestPriority = -1;
  let appRole: 'admin' | 'commissioner' | 'coach' | 'viewer' = 'viewer';

  for (const discordRoleName of discordRoleNames) {
    const mapping = DISCORD_ROLE_MAPPINGS.find(m => m.discordRoleName === discordRoleName);
    if (mapping && mapping.priority > highestPriority) {
      highestPriority = mapping.priority;
      appRole = mapping.appRole;
    }
  }

  return appRole;
}

/**
 * Sync Discord roles to app profile
 */
export async function syncDiscordRolesToProfile(
  supabase: ReturnType<typeof createClient>,
  discordId: string,
  discordRoleNames: string[]
): Promise<{ success: boolean; role?: string; error?: string }> {
  const appRole = determineAppRoleFromDiscordRoles(discordRoleNames);

  const { error } = await supabase
    .from('profiles')
    .update({ role: appRole })
    .eq('discord_id', discordId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, role: appRole };
}
```

---

### Phase 4: Production Testing (Day 4)

#### Step 4.1: Deploy to Staging/Production

**Checklist**:
- [ ] Deploy app to Vercel
- [ ] Set production environment variables
- [ ] Verify Discord redirect URIs include production URL
- [ ] Test OAuth flow in production

#### Step 4.2: End-to-End Test Flow

**Test Scenarios**:

1. **New User Registration**:
   - User clicks "Continue with Discord"
   - Authorizes app in Discord
   - Redirects back to app
   - Profile created with default 'viewer' role
   - Discord ID stored correctly

2. **Existing User Login**:
   - User clicks "Continue with Discord"
   - Authorizes app in Discord
   - Redirects back to app
   - Existing profile found and updated
   - Session created successfully

3. **Role Sync on Login**:
   - User logs in via Discord OAuth
   - Check Discord server membership
   - Fetch Discord roles
   - Map to app role
   - Update profile.role
   - Verify role change takes effect

4. **Showdown Account Linking**:
   - User logs in via Discord OAuth
   - Call `/api/showdown/sync-account-discord`
   - Verify Showdown account created
   - Verify credentials stored securely

---

### Phase 5: Error Handling and Logging (Day 5)

#### Step 5.1: Enhanced Error Handling

Update `app/auth/callback/route.ts`:

```typescript
import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const errorParam = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")
  const next = requestUrl.searchParams.get("next") || "/"

  // Handle OAuth errors
  if (errorParam) {
    console.error('[OAuth Callback] Error received:', {
      error: errorParam,
      description: errorDescription,
      url: requestUrl.toString(),
    });

    const errorUrl = new URL("/auth/login", requestUrl.origin)
    errorUrl.searchParams.set("error", "oauth_failed")
    errorUrl.searchParams.set("message", errorDescription || errorParam)
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    console.error('[OAuth Callback] No authorization code received')
    return NextResponse.redirect(new URL("/auth/login?error=no_code", requestUrl.origin))
  }

  try {
    const supabase = await createServerClient()

    // Exchange the authorization code for a session
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[OAuth Callback] Session exchange failed:', {
        error: error.message,
        code: error.code,
        status: error.status,
      })

      const errorUrl = new URL("/auth/login", requestUrl.origin)
      errorUrl.searchParams.set("error", "session_failed")
      errorUrl.searchParams.set("message", error.message)
      return NextResponse.redirect(errorUrl)
    }

    // Log successful authentication
    console.log('[OAuth Callback] Authentication successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      provider: data.user?.app_metadata?.provider,
    })

    // Optional: Trigger role sync
    // This could be done asynchronously to avoid blocking the redirect
    if (data.user?.app_metadata?.provider === 'discord') {
      // Role sync will be handled separately via Discord bot or API call
      // to avoid blocking the auth flow
    }

    // Success - redirect to home or next page
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error)
    const errorUrl = new URL("/auth/login", requestUrl.origin)
    errorUrl.searchParams.set("error", "unexpected_error")
    errorUrl.searchParams.set("message", error instanceof Error ? error.message : "An unexpected error occurred")
    return NextResponse.redirect(errorUrl)
  }
}
```

#### Step 5.2: Add Logging and Monitoring

Create `lib/auth-logger.ts`:

```typescript
import { createServiceRoleClient } from './supabase/service';

interface AuthEvent {
  event_type: 'oauth_initiated' | 'oauth_callback' | 'oauth_success' | 'oauth_error' | 'role_synced';
  user_id?: string;
  discord_id?: string;
  provider: string;
  error?: string;
  metadata?: Record<string, any>;
}

export async function logAuthEvent(event: AuthEvent): Promise<void> {
  const supabase = createServiceRoleClient();

  try {
    await supabase.from('user_activity_log').insert({
      user_id: event.user_id,
      action: event.event_type,
      resource_type: 'auth',
      metadata: {
        provider: event.provider,
        discord_id: event.discord_id,
        error: event.error,
        ...event.metadata,
      },
    });
  } catch (error) {
    // Don't fail auth flow if logging fails
    console.error('[AuthLogger] Failed to log event:', error);
  }
}
```

---

## Testing Checklist

### Pre-Production Testing

- [ ] OAuth URL generation works
- [ ] Redirect to Discord works
- [ ] Discord authorization page displays correctly
- [ ] Redirect back to app works
- [ ] Callback handler processes code correctly
- [ ] Session creation succeeds
- [ ] Profile creation/update works
- [ ] Discord ID stored correctly
- [ ] Default role assignment works
- [ ] Role sync works (if implemented)
- [ ] Error handling works for all failure cases
- [ ] Logging captures all events

### Production Testing

- [ ] Production redirect URIs configured
- [ ] OAuth flow works in production
- [ ] Session cookies work correctly
- [ ] Profile creation works
- [ ] Role sync works
- [ ] Showdown account linking works
- [ ] Error messages are user-friendly
- [ ] Monitoring captures issues

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: "Invalid redirect URI"
**Symptoms**: OAuth fails with redirect URI error  
**Causes**:
- Redirect URI not configured in Discord Developer Portal
- Redirect URI mismatch between Supabase and Discord
- URL encoding issues

**Solutions**:
1. Verify redirect URIs in Discord Developer Portal match exactly
2. Check Supabase Auth settings for redirect URI configuration
3. Ensure URLs are properly encoded

#### Issue 2: "PKCE code verifier not found"
**Symptoms**: Callback fails with PKCE error  
**Causes**:
- Cookie not set during OAuth initiation
- Cookie domain mismatch
- Cookie expiration

**Solutions**:
1. Verify cookie settings in Supabase client configuration
2. Check cookie domain matches app domain
3. Ensure cookies are not blocked by browser

#### Issue 3: "Profile not created"
**Symptoms**: User authenticated but no profile record  
**Causes**:
- `handle_new_user()` trigger not firing
- Trigger error preventing profile creation
- Database permissions issue

**Solutions**:
1. Check Supabase logs for trigger errors
2. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created'`
3. Test trigger manually with test user

#### Issue 4: "Role sync not working"
**Symptoms**: User logged in but role not updated  
**Causes**:
- Discord bot not fetching roles
- Role mapping incorrect
- Profile update failing

**Solutions**:
1. Verify Discord bot has `guilds.members.read` scope
2. Check role mapping configuration
3. Test role sync manually with test script

---

## Success Criteria

### OAuth Flow
- ✅ Users can click "Continue with Discord" and complete OAuth
- ✅ Callback handler processes authorization code correctly
- ✅ Session is created and user is authenticated
- ✅ User is redirected to appropriate page after login

### Profile Management
- ✅ Profile is created automatically on first login
- ✅ Discord ID is stored correctly
- ✅ Default role is assigned (viewer)
- ✅ Profile is updated on subsequent logins

### Role Sync
- ✅ Discord roles are fetched correctly
- ✅ Role mapping works as expected
- ✅ Profile role is updated based on Discord roles
- ✅ Role changes take effect immediately

### Error Handling
- ✅ All error cases are handled gracefully
- ✅ User-friendly error messages displayed
- ✅ Errors are logged for debugging
- ✅ Failed auth attempts don't break the app

---

## Next Steps After Testing

1. **Document Configuration**: Create configuration guide with screenshots
2. **Create User Guide**: Document OAuth login process for users
3. **Set Up Monitoring**: Add alerts for OAuth failures
4. **Implement Retry Logic**: Add retry for failed role syncs
5. **Add Analytics**: Track OAuth success/failure rates

---

**Status**: Ready for Implementation  
**Next Action**: Verify Supabase and Discord configurations, then test OAuth flow
