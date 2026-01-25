# Discord OAuth Local Development Setup Guide

## Overview

This guide explains how to configure Discord OAuth authentication for local development with Supabase.

## Prerequisites

- Supabase CLI installed and configured
- Discord Developer Portal access
- Local development environment running

---

## Step 1: Discord Developer Portal Configuration

### 1.1 Create/Select Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" or select existing application
3. Give it a name (e.g., "POKE-MNKY Local Dev")

### 1.2 Configure OAuth2 Redirect URIs

**Navigate to:** OAuth2 → General → Redirects

**Add these redirect URIs:**
\`\`\`
http://127.0.0.1:65432/auth/v1/callback
http://localhost:3000/auth/callback
\`\`\`

**Important:** The first URI (`http://127.0.0.1:65432/auth/v1/callback`) is Supabase's local auth callback endpoint (matches your local Supabase API port). The second is your Next.js app callback.

### 1.3 Get OAuth2 Credentials

**Navigate to:** OAuth2 → General

**Copy these values:**
- **Client ID** - Copy this value
- **Client Secret** - Click "Reset Secret" if needed, then copy

**⚠️ Security Warning:** Never commit the Client Secret to git!

### 1.4 Configure OAuth2 Scopes

**Navigate to:** OAuth2 → General → Scopes

**Required scopes:**
- ✅ `identify` - Get user ID, username, avatar
- ✅ `email` - Get user email address
- ✅ `guilds` (optional) - Get user's Discord servers (for role sync)

---

## Step 2: Environment Variables Setup

### 2.1 Create/Update `.env.local`

Create or update your `.env.local` file in the project root:

\`\`\`bash
# Discord OAuth Configuration (for Supabase Auth)
DISCORD_CLIENT_ID=your-discord-client-id-here
DISCORD_CLIENT_SECRET=your-discord-client-secret-here

# Discord Bot Configuration (separate from OAuth)
DISCORD_BOT_TOKEN=your-discord-bot-token-here
DISCORD_GUILD_ID=your-discord-server-id-here
DISCORD_PUBLIC_KEY=your-discord-public-key-here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:65432
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
\`\`\`

### 2.2 Get Supabase Local Keys

After running `supabase start`, get your local keys:

\`\`\`bash
supabase status
\`\`\`

Copy the `anon key` and `service_role key` from the output.

---

## Step 3: Supabase Config.toml Configuration

The `supabase/config.toml` file has been configured with Discord OAuth settings:

\`\`\`toml
[auth.external.discord]
enabled = true
client_id = "env(DISCORD_CLIENT_ID)"
secret = "env(DISCORD_CLIENT_SECRET)"
redirect_uri = "http://127.0.0.1:65432/auth/v1/callback"
skip_nonce_check = false
email_optional = false
\`\`\`

**Key Points:**
- ✅ Uses environment variables for credentials (secure)
- ✅ Redirect URI points to Supabase's local auth callback
- ✅ Nonce check enabled (security)
- ✅ Email required (Discord provides email with proper scopes)

---

## Step 4: Start Supabase Local Development

### 4.1 Start Supabase Services

\`\`\`bash
supabase start
\`\`\`

This will:
- Start PostgreSQL database (port 65430)
- Start Supabase API (port 65432)
- Start Supabase Studio (port 65433)
- Start Auth service with Discord OAuth enabled

### 4.2 Verify Configuration

Check that Discord OAuth is enabled:

\`\`\`bash
supabase status
\`\`\`

Look for the Auth service status. You should see Discord listed as an enabled provider.

---

## Step 5: Test Discord OAuth Flow

### 5.1 Start Your Next.js App

\`\`\`bash
pnpm dev
\`\`\`

Visit: `http://localhost:3000`

### 5.2 Test Login Flow

1. Navigate to `/auth/login`
2. Click "Continue with Discord"
3. You should be redirected to Discord authorization page
4. Authorize the application
5. You should be redirected back to `/auth/callback`
6. Session should be created and you'll be logged in

### 5.3 Verify Session

After successful login:
- Check browser cookies (should see Supabase auth cookies)
- Check Supabase Studio → Authentication → Users (should see your Discord user)
- Check your app's user profile (should show Discord username/avatar)

---

## Troubleshooting

### Issue: "Redirect URI mismatch"

**Problem:** Discord returns error about redirect URI not matching.

**Solution:**
1. Verify redirect URI in Discord Developer Portal exactly matches:
   - `http://127.0.0.1:65432/auth/v1/callback`
2. Check `supabase/config.toml` has correct `redirect_uri`
3. Restart Supabase: `supabase stop && supabase start`

### Issue: "Invalid client secret"

**Problem:** Authentication fails with invalid client secret error.

**Solution:**
1. Verify `.env.local` has correct `DISCORD_CLIENT_SECRET`
2. Check for extra spaces or quotes in the value
3. Restart Supabase to reload environment variables

### Issue: "Email not provided"

**Problem:** Discord login succeeds but email is missing.

**Solution:**
1. Verify Discord OAuth scopes include `email`
2. Check Discord Developer Portal → OAuth2 → Scopes
3. Re-authorize the application to grant email permission

### Issue: "Supabase not starting"

**Problem:** `supabase start` fails or Discord OAuth not working.

**Solution:**
1. Check `supabase/config.toml` syntax (valid TOML)
2. Verify environment variables are set correctly
3. Check Supabase logs: `supabase logs`
4. Try resetting: `supabase stop && supabase start`

---

## Production vs Local Development

### Local Development URLs

- **Supabase API:** `http://127.0.0.1:65432`
- **Auth Callback:** `http://127.0.0.1:65432/auth/v1/callback`
- **App URL:** `http://localhost:3000`
- **App Callback:** `http://localhost:3000/auth/callback`

### Production URLs

- **Supabase API:** `https://[project-ref].supabase.co`
- **Auth Callback:** `https://[project-ref].supabase.co/auth/v1/callback`
- **App URL:** `https://your-domain.com`
- **App Callback:** `https://your-domain.com/auth/callback`

**Important:** You need separate Discord OAuth applications for local dev and production, OR use the same app with both redirect URIs configured.

---

## Security Best Practices

1. ✅ **Never commit secrets to git**
   - Use `.env.local` (already in `.gitignore`)
   - Use `env()` function in `config.toml`

2. ✅ **Use separate Discord apps for dev/prod**
   - Prevents accidental production credential exposure
   - Allows different scopes/permissions

3. ✅ **Keep `skip_nonce_check = false`**
   - Prevents CSRF attacks
   - Required for security

4. ✅ **Require email (`email_optional = false`)**
   - Ensures user identification
   - Required for user profiles

---

## Next Steps

After Discord OAuth is working locally:

1. **Test Role Sync** - Verify Discord roles sync to app roles
2. **Test User Profile Creation** - Check that profiles are created correctly
3. **Test Session Persistence** - Verify sessions persist across page refreshes
4. **Configure Production** - Set up Discord OAuth for production environment

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [Supabase Local Development Guide](https://supabase.com/docs/guides/cli/local-development)

---

**Last Updated:** January 2026  
**Config File:** `supabase/config.toml`  
**Environment File:** `.env.local`
