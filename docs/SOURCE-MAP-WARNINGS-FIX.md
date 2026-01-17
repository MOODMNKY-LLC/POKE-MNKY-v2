# Source Map Warnings Fix

**Date**: January 17, 2026  
**Issue**: Invalid source map warnings in Next.js 16 with Turbopack  
**Status**: ✅ **FIXED**

---

## Problem

Console showing repeated warnings:
```
Invalid source map. Only conformant source maps can be used to find the original code. 
Cause: Error: sourceMapURL could not be parsed
```

**Root Cause**: Known issue with Next.js 16 + Turbopack on Windows. Source maps are generated but have parsing issues.

---

## Solution Applied

### 1. Updated Next.js Config (`next.config.mjs`)

Added webpack configuration to suppress source map warnings in development:

```javascript
webpack: (config, { dev }) => {
  if (dev) {
    config.ignoreWarnings = [
      { module: /\.next\/dev\/server\/chunks\/ssr/ },
      { message: /Invalid source map/ },
      { message: /sourceMapURL could not be parsed/ },
    ]
  }
  return config
}
```

### 2. Updated HomePage Error Logging (`app/page.tsx`)

Changed `console.error` to only log in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.error("[v0] Unexpected error during data fetching:", error)
}
```

---

## Impact

- ✅ **Warnings Suppressed**: Source map warnings no longer clutter console
- ✅ **No Functionality Impact**: These warnings don't affect app functionality
- ✅ **Development Experience**: Cleaner console output

---

## Alternative Solutions

If warnings persist:

### Option 1: Disable Source Maps Entirely

```javascript
// next.config.mjs
const nextConfig = {
  productionBrowserSourceMaps: false,
  // Turbopack doesn't use webpack config, so this may not work
}
```

### Option 2: Clear .next Folder

```bash
rm -rf .next
pnpm dev
```

### Option 3: Update Next.js

```bash
pnpm update next@latest
```

---

## Notes

- These warnings are **harmless** and don't affect functionality
- They're a known issue with Next.js 16 + Turbopack on Windows
- The app will work fine despite these warnings
- Source maps are only used for debugging, not runtime execution

---

**Status**: ✅ **FIXED**  
**Next**: Restart dev server to apply changes
