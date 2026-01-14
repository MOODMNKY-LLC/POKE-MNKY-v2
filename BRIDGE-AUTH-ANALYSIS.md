# Bridge Authentication Implementation Analysis

**Date**: January 16, 2026  
**Status**: Implementation Complete - Analysis for Server Integration

---

## ✅ What's Already Implemented

### 1. API Endpoint ✅
- **File**: `app/api/showdown/sync-account/route.ts`
- **Status**: Complete
- **Functionality**: 
  - Authenticates user via Supabase
  - Calls `syncShowdownAccount()` utility
  - Returns success/error response

### 2. Database Migration ✅
- **File**: `supabase/migrations/20260116000001_add_showdown_sync_fields.sql`
- **Status**: Ready to run
- **Fields Added**:
  - `showdown_username TEXT`
  - `showdown_account_synced BOOLEAN DEFAULT FALSE`
  - `showdown_account_synced_at TIMESTAMPTZ`

### 3. Auth Callback Integration ✅
- **File**: `app/auth/callback/route.ts`
- **Status**: Complete
- **Functionality**: 
  - Triggers sync after successful login (non-blocking)
  - Fire-and-forget pattern (doesn't block redirect)

### 4. Sync Utility Functions ✅
- **File**: `lib/showdown/sync.ts`
- **Status**: Complete
- **Functions**:
  - `generateShowdownPassword()` - Deterministic password generation
  - `getShowdownUsername()` - Username resolution with fallbacks
  - `syncShowdownAccount()` - Main sync logic

---

## 🔍 Critical Analysis: What We Need to Know

### 1. Network Connectivity & Service Discovery

**Current Implementation Assumes**:
- Loginserver accessible at `LOGINSERVER_URL` environment variable
- Direct HTTP/HTTPS connection from Next.js app to loginserver

**Questions for Compose Stack**:
- [ ] **Service Name**: What is the loginserver service name in docker-compose?
- [ ] **Network Configuration**: Is loginserver on same Docker network as app (if app runs in Docker)?
- [ ] **Internal vs External URL**: 
  - Internal (container-to-container): `http://loginserver-service:8001`
  - External (via Cloudflare Tunnel): `https://aab-login.moodmnky.com`
- [ ] **Which URL should app use?**
  - If app runs on Vercel → Must use external URL (Cloudflare Tunnel)
  - If app runs in Docker → Could use internal service name

**Current Code**:
```typescript
const loginserverUrl = process.env.LOGINSERVER_URL || 'https://aab-login.moodmnky.com'
```

**Recommendation**: 
- Production (Vercel): Use external URL (`https://aab-login.moodmnky.com`)
- Local Docker: Could use internal service name if on same network
- Need to verify: Does your compose stack expose loginserver internally?

---

### 2. API Authentication & Authorization

**Current Implementation**:
- ❌ **No API authentication** - App calls loginserver without auth headers
- Assumes loginserver accepts unauthenticated requests from app

**Questions for Compose Stack**:
- [ ] **Does loginserver require API key/authentication?**
- [ ] **Is there a shared secret** (`LOGINSERVER_KEY` or similar)?
- [ ] **IP whitelist** - Does loginserver restrict by source IP?
- [ ] **Rate limiting** - Any rate limits we should be aware of?

**Potential Issues**:
- If loginserver requires auth, current implementation will fail
- Need to add Authorization header if required

**Recommended Enhancement**:
```typescript
// If loginserver requires API key
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
}

if (process.env.LOGINSERVER_API_KEY) {
  headers['Authorization'] = `Bearer ${process.env.LOGINSERVER_API_KEY}`
  // OR
  headers['X-API-Key'] = process.env.LOGINSERVER_API_KEY
}
```

---

### 3. Loginserver API Endpoint Format

**Current Implementation Assumes**:
- `POST /api/register` - Register new user
- `POST /api/updateuser` - Update existing user

**Questions for Compose Stack**:
- [ ] **Are these endpoints correct?** (Verify from loginserver docs/config)
- [ ] **Request format**: Does loginserver expect different field names?
  - Current: `{ username, password, email }`
  - Alternative: `{ userid, password, email }`?
- [ ] **Response format**: What does loginserver actually return?
  - Current expects: `{ success: true, userid: "..." }`
  - Need to verify actual response structure

**Testing Needed**:
```bash
# Test register endpoint
curl -X POST http://10.3.0.119:8001/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","email":"test@example.com"}'

# Test update endpoint  
curl -X POST http://10.3.0.119:8001/api/updateuser \
  -H "Content-Type: application/json" \
  -d '{"userid":"testuser","password":"newpass","email":"new@example.com"}'
```

---

### 4. Error Handling & Retry Logic

**Current Implementation**:
- ✅ Basic error handling (try/catch)
- ✅ Fallback to update if register fails
- ❌ **No retry logic** for network failures
- ❌ **No exponential backoff**

**Questions for Compose Stack**:
- [ ] **Network reliability**: Is loginserver always available?
- [ ] **Timeout configuration**: What timeout should we use?
- [ ] **Retry strategy**: Should we retry on network failures?

**Recommended Enhancements**:
```typescript
// Add timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

try {
  const response = await fetch(`${loginserverUrl}/api/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
  clearTimeout(timeoutId)
  // ... rest of logic
} catch (error) {
  if (error.name === 'AbortError') {
    return { success: false, error: 'Request timeout' }
  }
  // Retry logic here if needed
}
```

---

### 5. Username Validation & Conflicts

**Current Implementation**:
- ✅ Username sanitization (alphanumeric + underscore, max 18 chars)
- ✅ Fallback chain (showdown_username → discord_username → email → user ID)
- ✅ Handles existing user (tries update if register fails)

**Questions for Compose Stack**:
- [ ] **Username rules**: Any additional restrictions from loginserver?
- [ ] **Conflict handling**: What happens if username already taken by another user?
- [ ] **Case sensitivity**: Are usernames case-sensitive?

**Potential Issues**:
- If username conflict occurs, current code tries update (might update wrong user)
- Need better conflict detection

---

### 6. Password Requirements

**Current Implementation**:
- ✅ Generates deterministic password (HMAC-SHA256)
- ✅ Takes first 20 characters
- ✅ Uses `SHOWDOWN_PASSWORD_SECRET` from environment

**Questions for Compose Stack**:
- [ ] **Password length**: Is 20 chars sufficient? (Showdown typically allows 6-20)
- [ ] **Password complexity**: Any special requirements?
- [ ] **Character set**: Any restrictions on password characters?

**Current Code**:
```typescript
const hash = hmac.digest('base64') // Base64 may include +, /, = characters
return hash.slice(0, 20)
```

**Potential Issue**: Base64 includes `+`, `/`, `=` which might not be allowed in passwords
**Recommendation**: Use base64url encoding or filter characters

---

### 7. Email Handling

**Current Implementation**:
- ✅ Uses user email from Supabase auth
- ✅ Falls back to profile email
- ✅ Empty string if no email

**Questions for Compose Stack**:
- [ ] **Email required?** Does loginserver require email?
- [ ] **Email validation**: Any format requirements?
- [ ] **Email uniqueness**: Can multiple accounts share email?

---

### 8. Testing & Verification

**What We Need to Test**:

1. **Network Connectivity**:
   ```bash
   # From app server/Vercel
   curl https://aab-login.moodmnky.com/api/register
   
   # From local development
   curl http://10.3.0.119:8001/api/register
   ```

2. **API Endpoint Verification**:
   ```bash
   # Test register
   curl -X POST http://10.3.0.119:8001/api/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","password":"testpass123","email":"test@example.com"}'
   
   # Test update
   curl -X POST http://10.3.0.119:8001/api/updateuser \
     -H "Content-Type: application/json" \
     -d '{"userid":"testuser","password":"newpass123","email":"new@example.com"}'
   ```

3. **End-to-End Flow**:
   - Log into app → Check if sync triggers
   - Verify Supabase profile updated
   - Verify loginserver account created
   - Test logging into Showdown with synced credentials

---

### 9. Environment Variables Needed

**Current Variables**:
- ✅ `LOGINSERVER_URL` - Loginserver API URL
- ✅ `SHOWDOWN_PASSWORD_SECRET` - Password generation secret

**Potential Additional Variables** (depending on compose stack):
- [ ] `LOGINSERVER_API_KEY` - If loginserver requires API authentication
- [ ] `LOGINSERVER_TIMEOUT` - Request timeout (default: 5000ms)
- [ ] `LOGINSERVER_RETRY_ATTEMPTS` - Number of retries (default: 0)
- [ ] `LOGINSERVER_RETRY_DELAY` - Delay between retries (default: 1000ms)

---

### 10. Integration Points with Compose Stack

**What We Need to Know**:

1. **Service Dependencies**:
   - Does loginserver depend on database?
   - Does loginserver need Showdown server running?
   - Any startup order requirements?

2. **Health Checks**:
   - How do we verify loginserver is ready?
   - Is there a health endpoint (`/health`, `/status`)?

3. **Logging**:
   - Where do loginserver logs go?
   - How to debug sync failures?

4. **Monitoring**:
   - How to monitor sync success/failure rates?
   - Any metrics we should track?

---

## 🎯 Action Items Based on Compose Stack

Once you share your compose stack, I'll need to:

1. **Verify Service Names & Networks**
   - Confirm loginserver service name
   - Check if app can reach loginserver internally
   - Determine correct URL to use

2. **Check API Authentication**
   - Verify if loginserver requires API key
   - Add authentication headers if needed

3. **Validate API Endpoints**
   - Test actual endpoint URLs
   - Verify request/response formats
   - Update code to match actual API

4. **Enhance Error Handling**
   - Add retry logic if needed
   - Improve timeout handling
   - Better conflict resolution

5. **Add Testing Scripts**
   - Create test script for loginserver API
   - Add integration tests
   - Verify end-to-end flow

---

## 📋 Checklist Before Production

- [ ] Run database migration
- [ ] Verify `LOGINSERVER_URL` environment variable
- [ ] Verify `SHOWDOWN_PASSWORD_SECRET` is set (generate secure random string)
- [ ] Test loginserver API endpoints directly
- [ ] Test sync flow end-to-end
- [ ] Verify username conflicts handled correctly
- [ ] Test password generation (verify it works for Showdown login)
- [ ] Add monitoring/logging for sync failures
- [ ] Document any API authentication requirements
- [ ] Update error messages based on actual loginserver responses

---

**Ready for Compose Stack Review!** 🚀

Please share your docker-compose.yml (or relevant parts) so I can:
1. Identify exact service names and network configuration
2. Determine correct URLs for app → loginserver communication
3. Identify any authentication requirements
4. Verify API endpoint paths match our implementation
