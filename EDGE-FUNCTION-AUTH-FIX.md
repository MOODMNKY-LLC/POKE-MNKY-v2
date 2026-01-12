# Edge Function Auth Header Detection Fix

## Issue Found

The terminal logs revealed an important detail:

```
headerKeys: [
  "accept", "accept-encoding", "accept-language", "authorization", ...
]
hasAuth: false
authPrefix: "..."
```

**The header IS present** (`"authorization"` in headerKeys), but `req.headers.get("Authorization")` returns `null`.

## Root Cause

The Supabase Edge Function gateway **normalizes HTTP headers to lowercase** before passing them to your function. HTTP headers are case-insensitive per spec, but the Deno `Headers` API's `.get()` method is case-sensitive.

### The Problem

```typescript
// ❌ This returns null if header is lowercase "authorization"
const authHeader = req.headers.get("Authorization")

// ✅ This works - check lowercase first
const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
```

## Fix Applied

Updated the Edge Function to check for both cases:

```typescript
// Headers are normalized to lowercase by Edge Function gateway
const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
const allHeaders = Object.fromEntries(req.headers.entries())
const authValue = authHeader || allHeaders["authorization"] || allHeaders["Authorization"]
```

## Why This Matters

1. **Accurate Logging**: Now `hasAuth` will correctly show `true` when the header is present
2. **Better Debugging**: Can see the actual auth key prefix in logs
3. **Consistency**: Matches what the API route is actually sending

## Expected Behavior After Fix

### Before Fix:
```
hasAuth: false
authPrefix: "..."
```

### After Fix:
```
hasAuth: true
authPrefix: "sb_secret_N7UND0UgjK..."
authHeaderPresent: true
```

## Verification

After deploying the fix, check Edge Function logs:
- `hasAuth` should be `true` when Authorization header is sent
- `authPrefix` should show the actual key prefix
- `authHeaderPresent` confirms header exists in the request

## Note

Even with `--no-verify-jwt`, the header is still present in the request (just not verified by the gateway). The fix ensures we can detect and log it correctly.
