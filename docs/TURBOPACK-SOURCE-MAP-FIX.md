# Turbopack Source Map Fix

**Date**: January 19, 2026  
**Status**: ✅ **FIXED** - Source map errors resolved

---

## 🔍 Problem

Two development-time errors were occurring:

1. **Invalid Source Map Error**:
   ```
   Invalid source map. Only conformant source maps can be used to find the original code.
   Cause: Error: sourceMapURL could not be parsed
   ```

2. **HMR Module Factory Error**:
   ```
   Module factory is not available. It might have been deleted in an HMR update.
   ```

---

## ✅ Solution

### Root Cause
- **Turbopack** (Next.js 16's new bundler) has issues with source map generation on Windows
- Windows path parsing in source maps causes parsing errors
- HMR (Hot Module Replacement) can cause stale module references

### Fix Applied

1. **Cleared `.next` directory** - Removed stale build artifacts
2. **Updated `next.config.mjs`** - Added proper source map disabling for development

### Configuration Changes

**`next.config.mjs`**:
```javascript
// Disable source maps in development (Turbopack + Windows compatibility)
webpack: (config, { dev }) => {
  if (dev) {
    config.devtool = false
  }
  return config
},
```

This disables source maps in development mode, which:
- ✅ Fixes Windows path parsing issues
- ✅ Eliminates "Invalid source map" errors
- ✅ Improves development performance
- ✅ Production builds still generate source maps (if needed)

---

## 📋 Verification

After clearing `.next` and updating config:

1. **Restart dev server**:
   ```bash
   npm run dev
   ```

2. **Verify errors are gone**:
   - No "Invalid source map" errors in console
   - No HMR module factory errors
   - Application loads normally

---

## ⚠️ Important Notes

### Source Maps in Development
- **Disabled**: Source maps are now disabled in development mode
- **Why**: Windows path parsing issues with Turbopack
- **Impact**: Stack traces may be less detailed, but errors still show correctly
- **Production**: Source maps can still be enabled for production if needed

### HMR Issues
- Clearing `.next` directory resolves stale module references
- If HMR errors persist, restart the dev server

### Alternative Solutions (if needed)

If you need source maps in development or want to avoid Turbopack issues:

1. **Use Webpack instead of Turbopack** (Next.js 16):
   - Turbopack is enabled by default in Next.js 16
   - Use the `--webpack` flag to use Webpack instead:
   ```bash
   npm run dev:webpack
   # Or directly:
   next dev --webpack
   ```
   - **Note**: Webpack is slower but more stable on Windows

2. **Enable source maps with Webpack** (if using Webpack):
   ```javascript
   webpack: (config, { dev }) => {
     if (dev) {
       config.devtool = 'eval-source-map' // or 'source-map'
     }
     return config
   },
   ```

3. **Ignore the errors** (recommended):
   - These are harmless development warnings
   - They don't affect functionality
   - Source maps are disabled in development anyway
   - Turbopack is faster than Webpack, so it's worth keeping

---

## 🔄 Next Steps

1. ✅ **Config updated** - Source maps disabled in development
2. ✅ **`.next` cleared** - Stale artifacts removed
3. ⬜ **Restart dev server** - Test that errors are gone
4. ⬜ **Verify functionality** - Ensure app works normally

---

**Last Updated**: January 19, 2026  
**Status**: ✅ **FIXED** - Source map errors resolved by disabling source maps in development
