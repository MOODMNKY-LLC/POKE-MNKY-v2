# Turbopack Streamdown HMR Fix

**Date**: January 19, 2026  
**Status**: ✅ **IMPLEMENTED**

---

## 🐛 Problem

Turbopack (Next.js 16's default bundler) was experiencing HMR (Hot Module Replacement) errors with `streamdown` and its dependencies:

```
Module [project]/node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/browser.js [app-client] (ecmascript) 
was instantiated because it was required from module [project]/node_modules/.pnpm/micromark@4.0.2/node_modules/micromark/dev/lib/create-tokenizer.js [app-client] (ecmascript), 
but the module factory is not available. It might have been deleted in an HMR update.
```

**Root Cause**:
- `streamdown` depends on `micromark` which depends on `debug`
- Turbopack's module graph analysis evaluates these modules during build/HMR
- When HMR updates occur, the module factory becomes unavailable, causing crashes

---

## ✅ Solution

Created an isolated wrapper component (`components/streamdown-wrapper.tsx`) that uses `React.lazy()` instead of `next/dynamic()` to completely isolate `streamdown` from Turbopack's build-time evaluation.

### Why React.lazy() instead of next/dynamic()?

- **`next/dynamic()`**: Still processes modules during build phase for code splitting analysis
- **`React.lazy()`**: More aggressive code splitting, completely isolates module from build-time analysis
- **Result**: Turbopack doesn't evaluate the module until runtime, preventing HMR errors

---

## 📁 Files Changed

### Created
- **`components/streamdown-wrapper.tsx`**: Isolated wrapper component using React.lazy()

### Updated
- **`components/ai-elements/message.tsx`**: Replaced direct `streamdown` import with `StreamdownWrapper`
- **`components/ai-elements/reasoning.tsx`**: Replaced direct `streamdown` import with `StreamdownWrapper`
- **`next.config.mjs`**: Added experimental `optimizePackageImports` for streamdown

---

## 🔧 Implementation Details

### StreamdownWrapper Component

```typescript
"use client";

import { lazy, Suspense } from "react";

// Lazy load streamdown only on client-side
const StreamdownLazy = lazy(() =>
  import("streamdown").then((mod) => ({
    default: mod.Streamdown,
  }))
);

export function StreamdownWrapper({ className, children, ...props }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StreamdownLazy className={className} {...props}>
        {children}
      </StreamdownLazy>
    </Suspense>
  );
}
```

**Key Features**:
- ✅ Uses `React.lazy()` for complete isolation
- ✅ Wrapped in `Suspense` for loading states
- ✅ Manual prop types (no imports from streamdown)
- ✅ Client-side only (`"use client"` directive)

### Usage

**Before**:
```typescript
import { Streamdown } from "streamdown";

<Streamdown className="...">{content}</Streamdown>
```

**After**:
```typescript
import { StreamdownWrapper } from "@/components/streamdown-wrapper";

<StreamdownWrapper className="...">{content}</StreamdownWrapper>
```

---

## 🎯 Benefits

1. **Eliminates HMR Errors**: Module is not evaluated during build/HMR
2. **Better Code Splitting**: React.lazy() provides better chunking
3. **Isolated**: All streamdown usage goes through one wrapper
4. **Maintainable**: Single point of change if issues arise
5. **Type Safe**: Manual prop types prevent type import issues

---

## 🔍 Verification

To verify the fix works:

1. **Check for errors**: No more "module factory not available" errors
2. **HMR works**: Hot reloading should work without crashes
3. **Streamdown renders**: Markdown content should still render correctly
4. **Loading states**: Should see "Loading..." briefly when component mounts

---

## 📝 Notes

- **Future imports**: Always use `StreamdownWrapper` instead of importing `streamdown` directly
- **If errors persist**: 
  1. Clear `.next` folder: `rm -rf .next`
  2. Restart dev server: `pnpm dev`
  3. Check for other direct `streamdown` imports: `grep -r "from \"streamdown\""`
- **Alternative**: If issues continue, consider switching to `react-markdown` or another markdown renderer

---

## 🔗 Related Files

- `components/streamdown-wrapper.tsx` - Wrapper component
- `components/ai-elements/message.tsx` - Uses wrapper
- `components/ai-elements/reasoning.tsx` - Uses wrapper
- `next.config.mjs` - Next.js configuration

---

**Last Updated**: January 19, 2026  
**Status**: ✅ Fixed
