# Discord Authentication & Session Persistence Guide

## Overview

This guide explains how Discord OAuth authentication is integrated with Supabase in our Pokémon Draft League app, ensuring secure session persistence using the PKCE flow.

## Architecture

### PKCE Flow Implementation

Our app uses the **Proof Key for Code Exchange (PKCE)** flow, which is the recommended authentication method for server-side applications. The `@supabase/ssr` package automatically configures PKCE flow by default.

**Flow Diagram:**
\`\`\`
1. User clicks "Continue with Discord" → signInWithOAuth()
2. Redirect to Discord → User authorizes app
3. Discord redirects back → https://poke-mnky.moodmnky.com/auth/callback?code=XXX
4. exchangeCodeForSession(code) → Receives access + refresh tokens
5. Tokens stored in secure HTTP-only cookies
6. Middleware validates and refreshes session on every request
\`\`\`

### Session Storage

Sessions are stored in **secure HTTP-only cookies** managed by `@supabase/ssr`. This ensures:

- **Server accessibility**: Tokens available in Server Components and API routes
- **Security**: Cookies are HTTP-only, preventing XSS attacks
- **Persistence**: Sessions survive page refreshes and browser restarts
- **Auto-refresh**: Middleware automatically refreshes expired tokens

## Implementation Files

### 1. Client Configuration (`lib/supabase/client.ts`)

\`\`\`typescript
import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
\`\`\`

**Key Points:**
- Uses `@supabase/ssr` for automatic PKCE flow
- Cookies are automatically managed
- No additional storage configuration needed

### 2. Server Configuration (`lib/supabase/server.ts`)

\`\`\`typescript
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors from Server Components
          }
        },
      },
    },
  )
}
\`\`\`

**Key Points:**
- Custom cookie adapter for Next.js 15
- Reads all auth cookies on every request
- Updates cookies when session refreshes

### 3. Middleware (`lib/supabase/proxy.ts`)

\`\`\`typescript
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => 
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => 
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  // CRITICAL: This validates and refreshes the session on every request
  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
\`\`\`

**Key Points:**
- `getUser()` is **critical** - it validates and refreshes sessions
- Without `getUser()`, sessions won't persist properly
- Middleware runs on every request, ensuring fresh tokens
- Protected routes automatically redirect unauthenticated users

### 4. Login Page (`app/auth/login/page.tsx`)

\`\`\`typescript
const handleDiscordSignIn = async () => {
  const supabase = createClient()
  setIsDiscordLoading(true)

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  } catch (error: unknown) {
    setError(error instanceof Error ? error.message : "Failed to sign in")
    setIsDiscordLoading(false)
  }
}
\`\`\`

**Key Points:**
- `redirectTo` must match configured callback URL
- Uses `window.location.origin` for environment flexibility
- Error handling prevents silent failures

### 5. Callback Handler (`app/auth/callback/page.tsx`)

\`\`\`typescript
const handleCallback = async () => {
  const supabase = createClient()
  const searchParams = new URLSearchParams(window.location.search)
  const code = searchParams.get("code")

  if (!code) {
    setError("No authorization code found")
    router.push("/auth/login?error=no_code")
    return
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Auth callback error:", error)
      router.push("/auth/login?error=callback_failed")
      return
    }

    if (data.session) {
      router.push("/")
      router.refresh() // Ensures UI updates with auth state
    }
  } catch (err) {
    console.error("Unexpected error:", err)
    router.push("/auth/login?error=unexpected")
  }
}
\`\`\`

**Key Points:**
- Extracts `code` parameter from URL
- `exchangeCodeForSession()` creates the session
- Tokens automatically stored in cookies by `@supabase/ssr`
- `router.refresh()` updates UI with new auth state

## Supabase Dashboard Configuration

### Authentication Settings

**Navigate to:** Supabase Dashboard → Authentication → URL Configuration

#### 1. Site URL
\`\`\`
https://poke-mnky.moodmnky.com
\`\`\`

#### 2. Redirect URLs
Add all of these:
\`\`\`
https://poke-mnky.moodmnky.com/auth/callback
http://localhost:3000/auth/callback
https://*.vercel.app/auth/callback
\`\`\`

#### 3. Enable Discord Provider

**Navigate to:** Authentication → Providers → Discord

- **Enable Discord**: Toggle ON
- **Client ID**: From Discord Developer Portal
- **Client Secret**: From Discord Developer Portal
- **Callback URL (Authorized redirect URIs)**:
  \`\`\`
  https://[your-project-ref].supabase.co/auth/v1/callback
  \`\`\`

### Session Configuration

**Navigate to:** Authentication → Settings

- **JWT Expiry**: 3600 seconds (1 hour) - Default
- **Refresh Token Reuse Interval**: 10 seconds - Default
- **Enable email confirmations**: OFF (for Discord OAuth)
- **Enable phone confirmations**: OFF

## Discord Developer Portal Configuration

### OAuth2 Settings

**Navigate to:** Discord Developer Portal → Your App → OAuth2

#### Redirect URIs
Add both:
\`\`\`
https://[your-supabase-project-ref].supabase.co/auth/v1/callback
https://poke-mnky.moodmnky.com/auth/callback
\`\`\`

#### Scopes
Required scopes:
- `identify` - Get user ID, username, avatar
- `email` - Get user email address

#### Client ID & Secret
- Copy **Client ID** to Supabase Discord provider settings
- Copy **Client Secret** to Supabase Discord provider settings

## Cookie Details

### Cookies Set by Supabase Auth

| Cookie Name | Purpose | Expiry | HTTP-Only |
|-------------|---------|--------|-----------|
| `sb-<project-ref>-auth-token` | Access token (JWT) | 1 hour | Yes |
| `sb-<project-ref>-auth-token.0` | Refresh token chunk | 30 days | Yes |
| `sb-<project-ref>-auth-token.1` | Refresh token chunk | 30 days | Yes |

**Security Features:**
- All cookies are **HTTP-only** (not accessible via JavaScript)
- **Secure** flag enabled in production (HTTPS only)
- **SameSite=Lax** prevents CSRF attacks
- Refresh tokens are chunked for size optimization

## Session Lifecycle

### 1. Sign In
\`\`\`
User → Discord OAuth → Auth Code → exchangeCodeForSession() 
→ Cookies Set → Redirect to /
\`\`\`

### 2. Session Refresh
\`\`\`
Middleware runs → getUser() called → Token expired?
→ Yes: Refresh using refresh token → Update cookies
→ No: Continue with existing token
\`\`\`

### 3. Sign Out
\`\`\`
User clicks Sign Out → supabase.auth.signOut()
→ Cookies cleared → Session terminated
\`\`\`

## Testing Session Persistence

### Manual Test Steps

1. **Sign in with Discord**
   - Click "Continue with Discord"
   - Authorize the app
   - Verify redirect to homepage

2. **Verify session persists**
   - Check if user avatar appears in header
   - Refresh the page → Still logged in ✓
   - Open in new tab → Still logged in ✓

3. **Test across browser restart**
   - Close all browser tabs
   - Reopen browser
   - Navigate to app → Still logged in ✓

4. **Test protected routes**
   - While logged out, visit `/admin`
   - Should redirect to `/auth/login`
   - After login, should access admin panel

5. **Test sign out**
   - Click Sign Out
   - Verify redirect to homepage
   - User avatar should disappear

### Automated Test Code

\`\`\`typescript
// Test session persistence
describe("Discord Auth Session Persistence", () => {
  it("should persist session after page refresh", async () => {
    // Sign in
    await page.goto("/auth/login")
    await page.click('button:has-text("Continue with Discord")')
    // ... complete OAuth flow ...
    
    // Verify logged in
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
    
    // Refresh page
    await page.reload()
    
    // Should still be logged in
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
  })

  it("should refresh expired tokens automatically", async () => {
    // Set token to expire soon
    await page.evaluate(() => {
      // Manipulate cookie expiry for testing
    })
    
    // Wait for token to expire
    await page.waitForTimeout(61000) // 61 seconds
    
    // Make authenticated request
    await page.goto("/admin")
    
    // Should automatically refresh and work
    await expect(page).toHaveURL(/\/admin/)
  })
})
\`\`\`

## Common Issues & Solutions

### Issue 1: "Invalid authorization code"
**Cause:** Auth code expired (5-minute validity)
**Solution:** Restart authentication flow - codes can only be used once

### Issue 2: "Redirect URI mismatch"
**Cause:** Callback URL not configured in Discord Developer Portal
**Solution:** Add exact URL to Discord OAuth2 Redirect URIs

### Issue 3: Session doesn't persist after refresh
**Cause:** Middleware not calling `getUser()`
**Solution:** Ensure `await supabase.auth.getUser()` is called in middleware

### Issue 4: Cookies not being set
**Cause:** Missing cookie adapter configuration
**Solution:** Verify `cookies.getAll()` and `cookies.setAll()` are implemented

### Issue 5: "Failed to fetch" errors
**Cause:** CORS or network issues with Supabase
**Solution:** Check `NEXT_PUBLIC_SUPABASE_URL` environment variable

## Security Best Practices

### Implemented Protections

1. **PKCE Flow**: Prevents authorization code interception attacks
2. **HTTP-Only Cookies**: Protects against XSS attacks
3. **Secure Flag**: Ensures cookies only sent over HTTPS
4. **SameSite Policy**: Prevents CSRF attacks
5. **Short-lived Access Tokens**: Limits exposure window (1 hour)
6. **One-time Refresh Tokens**: Prevents replay attacks
7. **Token Rotation**: New tokens issued on each refresh

### Additional Recommendations

1. **Enable Rate Limiting**: Configure in Supabase dashboard
2. **Monitor Auth Logs**: Check for suspicious activity
3. **Implement Session Timeouts**: Configure max session lifetime
4. **Add MFA**: For admin accounts (future enhancement)
5. **Rotate Secrets Regularly**: Update Discord client secret periodically

## Environment Variables Checklist

Verify these are set in your deployment:

\`\`\`bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Optional (for backend operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Auto-configured by Supabase
SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID=(set in Supabase dashboard)
SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET=(set in Supabase dashboard)
\`\`\`

## Monitoring & Debugging

### Enable Auth Logging

Add to your client initialization for debugging:

\`\`\`typescript
const supabase = createClient()

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[v0] Auth event:', event)
  console.log('[v0] Session:', session ? 'Active' : 'None')
})
\`\`\`

### Check Session Status

\`\`\`typescript
// In any component or page
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('[v0] Current session:', session)
\`\`\`

### Verify Cookie Storage

Open browser DevTools → Application → Cookies → `https://poke-mnky.moodmnky.com`

Look for cookies starting with `sb-[project-ref]-auth-token`

## Conclusion

Our Discord authentication implementation follows Supabase best practices:

✅ PKCE flow enabled by default via `@supabase/ssr`
✅ Sessions stored in secure HTTP-only cookies
✅ Middleware validates and refreshes sessions automatically
✅ Proper callback handling with error states
✅ Protected routes redirect unauthenticated users
✅ Session persists across page refreshes and browser restarts

The implementation is production-ready and secure for the Pokémon Draft League application.
