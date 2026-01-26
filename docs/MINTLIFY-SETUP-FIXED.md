# Mintlify Setup - Fixed ✅

**Date**: 2026-01-26  
**Issue**: Mintlify doesn't support Node.js v25+  
**Status**: ✅ **Configuration Fixed** | ⚠️ **Node Version Required**

---

## Problem

Mintlify CLI requires Node.js LTS (v20.x or v22.x), but you're running Node.js v25.3.0.

**Error**: `mint dev is not supported on node versions 25+. Please downgrade to an LTS node version.`

---

## Solution

### Quick Fix (Recommended)

1. **Install NVM for Windows** (if not already installed):
   ```powershell
   winget install CoreyButler.NVMforWindows
   ```

2. **Install and use Node.js LTS**:
   ```powershell
   nvm install 20.11.0
   nvm use 20.11.0
   ```

3. **Run Mintlify**:
   ```powershell
   # From project root:
   pnpm docs:dev
   
   # Or from docs directory:
   cd docs
   mint dev --port 3333
   ```

---

## What Was Fixed

1. ✅ **Created helper script**: `docs/run-mintlify.ps1` - Automatically switches to Node.js LTS
2. ✅ **Updated npm script**: `pnpm docs:dev` now uses the helper script
3. ✅ **Added direct script**: `pnpm docs:dev:direct` for manual use
4. ✅ **Configuration verified**: `docs/docs.json` is correctly configured

---

## File Structure

```
docs/
├── docs.json              # Mintlify configuration (correct location)
├── mintlify-docs/         # Documentation pages (MDX files)
│   ├── introduction.mdx
│   ├── quickstart.mdx
│   ├── installation.mdx
│   └── index.mdx
└── run-mintlify.ps1       # Helper script for Node version switching
```

---

## Usage

### Option 1: Use npm script (Recommended)
```powershell
# From project root
pnpm docs:dev
```

### Option 2: Manual (with NVM)
```powershell
nvm use 20.11.0
cd docs
mint dev --port 3333
```

### Option 3: Docker (No Node version change needed)
```powershell
cd docs
docker run -it --rm -v ${PWD}:/docs -p 3333:3333 -w /docs node:20-alpine sh -c "npm install -g mint && mint dev --port 3333"
```

---

## Verification

After switching to Node.js LTS:

```powershell
node --version  # Should show v20.x.x or v22.x.x
cd docs
mint dev --port 3333
```

Should start successfully and be accessible at: **http://localhost:3333**

---

## Next Steps

Once Mintlify is running:

1. **Verify documentation loads** at http://localhost:3333
2. **Add API documentation** - Create pages in `docs/mintlify-docs/`
3. **Add guides** - Create user guides and tutorials
4. **Deploy** - Use `mint deploy` when ready

---

**Note**: Your Next.js app can continue using Node.js v25. Use NVM to switch between versions:
- `nvm use 20.11.0` - For Mintlify
- `nvm use 25.3.0` - For Next.js development

---

**Generated**: 2026-01-26  
**Status**: ✅ **Configuration Fixed** | ⚠️ **Requires Node.js LTS**
