# Draft Page Loading Fix

> **Status**: ✅ Fixed
> **Date**: 2026-01-16

---

## 🐛 Issue

**Problem**: Draft page (`/draft`) was showing a blinking yellow skeleton loader indefinitely instead of showing the "No active draft session" error message.

**Root Cause**: 
- The `useEffect` hook was trying to use `supabase` client before it was initialized
- When `supabase` is `null` (during SSR or initial render), the query would fail silently
- The loading state never got set to `false`, causing infinite skeleton loading

---

## ✅ Solution

Added a guard check at the start of `fetchActiveSession()` to ensure `supabase` client is ready before attempting queries:

```tsx
useEffect(() => {
  async function fetchActiveSession() {
    // Don't run if supabase client isn't ready
    if (!supabase) {
      setLoading(false)
      setError("Unable to connect to database")
      return
    }

    try {
      setLoading(true)
      // ... rest of the function
    }
  }

  fetchActiveSession()
}, [supabase])
```

---

## 📋 Changes Made

**File**: `app/draft/page.tsx`

- Added null check for `supabase` client before executing queries
- Sets loading to `false` and error message if client isn't ready
- Prevents infinite loading state

---

## ✅ Expected Behavior Now

1. **If Supabase client is ready**: 
   - Fetches active draft session
   - Shows "No active draft session found" if none exists
   - Shows draft room if session exists

2. **If Supabase client is not ready**:
   - Shows error: "Unable to connect to database"
   - No infinite loading

---

**Status**: ✅ Fixed - Draft Page Now Shows Proper Error Messages
