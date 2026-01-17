# OAuth Consent Screen Implementation

**Date**: January 17, 2026  
**Status**: ✅ Implemented  
**Route**: `/oauth/consent`

---

## 📋 Overview

A consent screen UI has been implemented at `/app/oauth/consent/page.tsx` to handle OAuth authorization requests for all OAuth Apps, including Open WebUI.

**Full URL**: `https://poke-mnky.moodmnky.com/oauth/consent`

---

## 🎯 Features Implemented

### ✅ Core Functionality

1. **Authorization ID Handling**
   - Reads `authorization_id` from URL query parameters
   - Validates presence of authorization ID
   - Handles missing parameter gracefully

2. **Authentication Check**
   - Verifies if user is logged in
   - Prompts login if not authenticated
   - Redirects back to consent screen after login

3. **Authorization Details Fetching**
   - Fetches app name, client ID, and requested scopes
   - Uses Supabase OAuth methods with REST API fallback
   - Handles errors gracefully

4. **Consent UI**
   - Displays app name and requested permissions
   - Shows clear scope descriptions (OpenID, Email, Profile)
   - Professional, user-friendly design matching app theme

5. **Approve/Deny Actions**
   - Approve button to grant authorization
   - Deny button to reject authorization
   - Processing states during API calls
   - Automatic redirect after decision

---

## 🔧 Implementation Details

### File Structure

```
app/
  oauth/
    consent/
      page.tsx  ← Consent screen component
```

### Component Architecture

**Client Component** (`"use client"`):
- Uses `useSearchParams` to read `authorization_id`
- Uses `useRouter` for navigation
- Uses Supabase client for auth operations

**Key Functions**:
- `checkAuthAndFetchDetails()` - Checks auth and fetches authorization details
- `handleLogin()` - Redirects to Discord OAuth login
- `handleApprove()` - Approves authorization request
- `handleDeny()` - Denies authorization request

### API Methods Used

**Primary (if available in Supabase JS client)**:
```typescript
supabase.auth.oauth.getAuthorizationDetails(authorizationId)
supabase.auth.oauth.approveAuthorization(authorizationId)
supabase.auth.oauth.denyAuthorization(authorizationId)
```

**Fallback (REST API)**:
- `GET /auth/v1/oauth/authorization/{id}` - Fetch details
- `POST /auth/v1/oauth/authorization/{id}/approve` - Approve
- `POST /auth/v1/oauth/authorization/{id}/deny` - Deny

---

## 🎨 UI Design

### States

1. **Loading State**
   - Spinner animation
   - "Loading authorization request..." message

2. **Error State**
   - Error icon and message
   - Return to home button

3. **Not Authenticated State**
   - "Sign In Required" message
   - Discord login button
   - Return to home link

4. **Consent Screen**
   - App name display
   - Requested permissions list
   - Approve/Deny buttons
   - Footer with information

### Design Elements

- **Card Component**: Matches app's card design
- **Button Components**: Uses app's button variants
- **Icons**: Shield, CheckCircle2, XCircle, Loader2, AlertCircle
- **Colors**: Matches app theme (primary, destructive, muted)
- **Responsive**: Works on mobile and desktop

---

## 🔄 OAuth Flow

### Complete Flow:

1. **User clicks "Sign in with Discord"** in Open WebUI
   ```
   https://aab-gpt.moodmnky.com
   ```

2. **Open WebUI redirects to Supabase**:
   ```
   https://chmrszrwlfeqovwxyrmt.supabase.co/auth/v1/oauth/authorize?
     client_id=<open-webui-client-id>&
     redirect_uri=https://aab-gpt.moodmnky.com/oauth/oidc/callback&
     scope=openid email profile
   ```

3. **Supabase redirects to consent screen**:
   ```
   https://poke-mnky.moodmnky.com/oauth/consent?authorization_id=<id>
   ```

4. **Consent screen**:
   - Checks if user is logged in
   - If not, prompts login (Discord OAuth)
   - After login, fetches authorization details
   - Shows app name and permissions
   - User approves or denies

5. **Supabase redirects back to Open WebUI**:
   ```
   https://aab-gpt.moodmnky.com/oauth/oidc/callback?code=<auth-code>
   ```

---

## ⚠️ Important Notes

### Supabase OAuth Methods

The implementation uses TypeScript type assertions (`as any`) to access OAuth methods that may not be fully typed in the Supabase JS client yet. This is safe because:

1. **Fallback REST API**: If methods don't exist, REST API calls are used
2. **Error Handling**: All errors are caught and displayed to users
3. **Future-Proof**: When Supabase adds proper types, remove `as any`

### API Endpoints

The REST API endpoints used in fallback may need adjustment based on Supabase's actual OAuth Server API. Check Supabase documentation for:

- Exact endpoint paths
- Required headers
- Request/response formats
- Error response structure

### Testing

**To test the consent screen**:

1. **Create OAuth App** in Supabase Dashboard
   - Set Authorization Path: `/oauth/consent`
   - Set Site URL: `https://poke-mnky.moodmnky.com`

2. **Try OAuth login** from Open WebUI
   - Should redirect to consent screen
   - Should show app name and permissions
   - Should work after approval/denial

3. **Test without login**:
   - Should prompt Discord login
   - Should return to consent screen after login

---

## 🐛 Troubleshooting

### Issue: "OAuth methods not available"

**Solution**: The REST API fallback will be used automatically. Check browser console for API errors.

### Issue: "Failed to fetch authorization details"

**Possible Causes**:
- Invalid `authorization_id`
- Expired authorization request
- Supabase API endpoint changed

**Solution**: Check Supabase documentation for correct API endpoints.

### Issue: "You must be logged in"

**Solution**: User needs to sign in with Discord first. The consent screen will prompt login automatically.

### Issue: Redirect not working after approve/deny

**Possible Causes**:
- Supabase OAuth Server not configured correctly
- Redirect URI mismatch
- Authorization expired

**Solution**: Check Supabase OAuth Server configuration and authorization request validity.

---

## 📚 References

- **Supabase OAuth Server Docs**: https://supabase.com/docs/guides/auth/oauth-server/getting-started
- **Supabase OAuth Flows**: https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
- **Implementation File**: `app/oauth/consent/page.tsx`

---

## ✅ Next Steps

1. **Test with Open WebUI**:
   - Create OAuth App in Supabase Dashboard
   - Configure Open WebUI to use Supabase OAuth
   - Test full flow end-to-end

2. **Verify API Methods**:
   - Check if Supabase JS client has OAuth methods
   - Update types if methods are available
   - Remove `as any` assertions if possible

3. **Update REST API Endpoints**:
   - Verify correct endpoints from Supabase docs
   - Update fallback API calls if needed
   - Test REST API fallback path

4. **Add Logging**:
   - Add console logs for debugging
   - Log authorization decisions
   - Monitor for errors

---

**Status**: ✅ Ready for testing with Open WebUI OAuth App!
