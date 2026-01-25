# Discord OAuth Redirect URI Fix

## Problem

Getting "invalid oauth2 redirect_uri" error when trying to sign in with Discord.

## Root Cause

Discord OAuth requires the redirect URI to **exactly match** what's registered in Discord Developer Portal. The redirect URI must be registered in Discord before it can be used.

## Solution

### Step 1: Identify the Correct Redirect URI

For local Supabase development, the redirect URI is:
\`\`\`
http://127.0.0.1:65432/auth/v1/callback
\`\`\`

**Important:** Use `127.0.0.1` (not `localhost`) to match Supabase's default API URL format.

### Step 2: Register Redirect URI in Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to **OAuth2 → General**
4. Under **Redirects**, click **Add Redirect**
5. Add this **exact** URL:
   \`\`\`
   http://127.0.0.1:65432/auth/v1/callback
   \`\`\`
6. Click **Save Changes**

### Step 3: Verify Config.toml

Verify `supabase/config.toml` is using the same local API port as `supabase status` (in this repo, `65432`).

### Step 4: Restart Supabase

After updating Discord Developer Portal:

\`\`\`bash
supabase stop
supabase start
\`\`\`

### Step 5: Test the Flow

1. Visit `http://localhost:3000/auth/login`
2. Click "Continue with Discord"
3. You should be redirected to Discord authorization page
4. After authorizing, you'll be redirected back to your app

---

## Common Issues

### Issue: Still getting "invalid redirect_uri"

**Possible causes:**
1. **Wrong format** - Using `localhost` instead of `127.0.0.1`
   - ❌ Wrong: `http://localhost:65432/auth/v1/callback`
   - ✅ Correct: `http://127.0.0.1:65432/auth/v1/callback`

2. **Wrong port** - Using wrong Supabase API port
   - Check with: `supabase status`
   - In this repo, local API port is `65432`

3. **HTTPS vs HTTP** - Using `https://` instead of `http://`
   - ❌ Wrong: `https://127.0.0.1:65432/auth/v1/callback`
   - ✅ Correct: `http://127.0.0.1:65432/auth/v1/callback`

4. **Trailing slash** - Extra characters
   - ❌ Wrong: `http://127.0.0.1:65432/auth/v1/callback/`
   - ✅ Correct: `http://127.0.0.1:65432/auth/v1/callback`

5. **Not saved** - Changes in Discord Developer Portal not saved
   - Make sure to click **Save Changes** after adding redirect URI

### Issue: Multiple redirect URIs needed

If you're using the same Discord app for both local dev and production:

**Add both redirect URIs in Discord Developer Portal:**
\`\`\`
http://127.0.0.1:65432/auth/v1/callback          (local dev)
https://[your-project-ref].supabase.co/auth/v1/callback  (production)
\`\`\`

---

## Verification Checklist

- [ ] Redirect URI added in Discord Developer Portal
- [ ] Redirect URI matches exactly: `http://127.0.0.1:65432/auth/v1/callback`
- [ ] Discord Client ID set in `.env.local` as `DISCORD_CLIENT_ID`
- [ ] Discord Client Secret set in `.env.local` as `DISCORD_CLIENT_SECRET`
- [ ] Supabase restarted after config changes
- [ ] Supabase status shows API running on port 65432

---

## Testing

After fixing, test the complete flow:

1. **Start Supabase:**
   \`\`\`bash
   supabase start
   \`\`\`

2. **Start Next.js app:**
   \`\`\`bash
   pnpm dev
   \`\`\`

3. **Test Discord OAuth:**
   - Visit `http://localhost:3000/auth/login`
   - Click "Continue with Discord"
   - Should redirect to Discord (no error)
   - After authorization, should redirect back to app

---

## Additional Notes

- The `redirectTo` option in `signInWithOAuth()` (`http://localhost:3000/auth/callback`) is where Supabase redirects the user **after** processing the Discord callback. This is different from the Discord redirect URI.
- Discord only needs the Supabase callback URL registered.
- The app callback URL (`/auth/callback`) is handled by your Next.js app and doesn't need to be registered in Discord.

---

**Last Updated:** January 2026
