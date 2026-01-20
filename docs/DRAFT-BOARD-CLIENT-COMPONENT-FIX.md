# Draft Board Client Component Fix ✅

**Date:** 2026-01-20  
**Status:** ✅ **FIXED**

---

## 🐛 Issue

**Error:** `Supabase client can only be created on the client side. Use createServerClient for server-side operations.`

**Root Cause:**
- `TeamRosterPanel` and `PickHistory` were calling `createClient()` at component initialization
- Even though they have `"use client"` directive, Next.js still attempts initial server-side rendering
- `createClient()` throws an error when `window` is undefined (server-side)

---

## ✅ Solution

### Pattern Applied: Lazy Client Initialization

Changed both components to initialize Supabase client in `useEffect` hook instead of at component level:

**Before:**
```typescript
export function TeamRosterPanel({ teamId, seasonId }: TeamRosterPanelProps) {
  const supabase = createClient() // ❌ Called during SSR
  // ...
}
```

**After:**
```typescript
export function TeamRosterPanel({ teamId, seasonId }: TeamRosterPanelProps) {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  // Initialize Supabase client on mount (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const client = createClient()
        setSupabase(client)
      } catch (error) {
        console.error("Failed to create Supabase client:", error)
        setLoading(false)
      }
    }
  }, [])

  // Wait for client before using it
  useEffect(() => {
    if (!supabase) return
    // ... use supabase
  }, [supabase, ...])
}
```

---

## 📝 Files Fixed

### 1. `components/draft/team-roster-panel.tsx`
- ✅ Changed to lazy initialization pattern
- ✅ Added loading state while client initializes
- ✅ Added null checks before using Supabase client

### 2. `components/draft/pick-history.tsx`
- ✅ Changed to lazy initialization pattern
- ✅ Added null checks before using Supabase client
- ✅ Updated loading state check

---

## 🔄 Component Lifecycle

### Before (Broken):
```
Server Render → createClient() called → Error (window undefined)
```

### After (Fixed):
```
Server Render → supabase = null → No error
Client Hydration → useEffect runs → createClient() → supabase set → Component works
```

---

## ✅ Benefits

1. **No SSR Errors**: Client is only created on client-side
2. **Graceful Loading**: Shows loading state while client initializes
3. **Error Handling**: Catches and logs errors during initialization
4. **Type Safety**: Proper TypeScript types for nullable client

---

## 🚀 Verification

1. **No Console Errors**: Page should load without Supabase client errors
2. **Components Render**: TeamRosterPanel and PickHistory should display correctly
3. **Real-time Updates**: Subscriptions should work once client is initialized

---

**Fixed:** 2026-01-20  
**Status:** ✅ Ready for testing
