# Auth Key Decision: Service Role vs Anon Key

## Question

Should we revert to using the anon key for local development since the gateway strips the Authorization header value anyway with `--no-verify-jwt`?

## Answer: **No, keep using the service role key**

## Reasons to Keep Service Role Key

### 1. **Consistency**
- Same authentication method for local and remote
- No conditional logic needed
- Easier to reason about

### 2. **Best Practice**
- Even if stripped locally, sending the correct key is better practice
- Matches production behavior
- Reduces risk of accidentally using wrong key

### 3. **Future-Proofing**
- If gateway behavior changes, we're already using the right key
- No need to update code later
- Works correctly in both environments

### 4. **Function Doesn't Care**
- The Edge Function uses its own `SUPABASE_SERVICE_ROLE_KEY` from environment
- It doesn't use the Authorization header for operations
- So it works fine regardless of what we send

### 5. **Clear Logging**
- With improved logging, it's clear what's happening
- `authHeaderEmpty: true` shows the header was stripped
- No confusion about why it works

## What Changed

### Before (Old Code)
```typescript
// Used anon key for local, service role for remote
const authKey = isLocal ? (anonKey || serviceRoleKey) : serviceRoleKey
```

### After (Current Code)
```typescript
// Always use service role key
const authKey = serviceRoleKey
```

## Benefits of Current Approach

1. ✅ **Simpler**: No conditional logic
2. ✅ **Consistent**: Same key everywhere
3. ✅ **Correct**: Uses the right key for the right purpose
4. ✅ **Clear**: Logging shows what's happening

## Edge Function Behavior

The Edge Function:
- ✅ Receives the request (header stripped or not)
- ✅ Uses its own `SUPABASE_SERVICE_ROLE_KEY` from environment
- ✅ Works perfectly regardless of Authorization header

## Conclusion

**Keep using the service role key** for all environments. The improved logging makes it clear that:
- The header is being sent (`usingServiceRoleKey: true` in API route logs)
- The gateway strips it locally (`authHeaderEmpty: true` in Edge Function logs)
- The function works correctly (uses its own service role key)

This is the correct, consistent, and maintainable approach.
