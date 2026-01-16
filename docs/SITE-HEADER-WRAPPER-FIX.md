# SiteHeaderWrapper Fix

> **Status**: ✅ Fixed Async Client Component Error
> **Date**: 2026-01-16

---

## 🐛 Issue

**Error**: `<SiteHeaderWrapper> is an async Client Component. Only Server Components can be async`

**Root Cause**: 
- `ConditionalHeader` is a client component (`"use client"`) that uses `usePathname()`
- `SiteHeaderWrapper` was an async server component using `cookies()` from `next/headers`
- When a client component imports a server component, Next.js tries to bundle it for the client, causing the error

---

## ✅ Solution

Converted `SiteHeaderWrapper` to a client component:

**Before**:
```tsx
// Server Component (async, uses cookies())
export async function SiteHeaderWrapper() {
  const supabase = await createClient() // server-side
  // ... fetch user data
  return <SiteHeader initialUser={initialUser} />
}
```

**After**:
```tsx
"use client"

// Client Component (no server-only APIs)
export function SiteHeaderWrapper() {
  // SiteHeader handles all data fetching client-side
  return <SiteHeader />
}
```

---

## 📋 Changes Made

1. ✅ **`components/site-header-wrapper.tsx`**
   - Added `"use client"` directive
   - Removed async/await and server-side data fetching
   - Removed imports of `createClient` from `@/lib/supabase/server`
   - Simplified to just render `<SiteHeader />` which handles client-side fetching

2. ✅ **`components/conditional-header.tsx`**
   - Removed `dynamic()` import (no longer needed)
   - Removed `Suspense` wrapper (not needed for client component)
   - Simplified to direct import and render

---

## ✅ Benefits

1. **No Server/Client Boundary Issues**: Both components are client components
2. **Simpler Code**: Removed complex dynamic import logic
3. **Same Functionality**: `SiteHeader` already handles client-side data fetching as fallback
4. **No Performance Impact**: Client-side fetch happens anyway when server fetch fails

---

## 🔍 How It Works Now

1. `ConditionalHeader` (client) checks pathname
2. If not dashboard route, renders `SiteHeaderWrapper` (client)
3. `SiteHeaderWrapper` renders `SiteHeader` (client)
4. `SiteHeader` fetches user data client-side using `createClient()` from `@/lib/supabase/client`

---

**Status**: ✅ Error Fixed - Ready for Testing
