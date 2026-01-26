# Mintlify Usage Guide

**Date**: 2026-01-26  
**Theme**: Aspen

---

## Directory to Run `mint dev`

**Run from the `docs/` directory:**

```powershell
cd docs
nvm use 20.11.0
mint dev --port 3333
```

**OR use the npm script from project root:**

```powershell
# From project root (POKE-MNKY-v2/)
pnpm docs:dev
```

---

## Why `docs/` Directory?

Mintlify looks for `docs.json` (or `mint.json`) in the current directory. Our configuration file is at:

```
docs/docs.json
```

So you must run `mint dev` from the `docs/` directory, or use the npm script which automatically changes to that directory.

---

## Quick Reference

### Start Dev Server

```powershell
# Option 1: From docs directory
cd docs
nvm use 20.11.0
mint dev --port 3333

# Option 2: From project root (uses helper script)
pnpm docs:dev
```

### Validate Configuration

```powershell
cd docs
nvm use 20.11.0
mint validate
```

### Build Documentation

```powershell
cd docs
nvm use 20.11.0
mint build
```

### Deploy Documentation

```powershell
cd docs
nvm use 20.11.0
mint deploy
```

---

## Theme: Aspen ✅

The documentation is now configured to use the **Aspen theme**, which provides:
- Modern, clean design
- Better code block styling
- Enhanced navigation
- Improved readability

---

## File Structure

```
POKE-MNKY-v2/
├── docs/                    ← Run `mint dev` from HERE
│   ├── docs.json           ← Mintlify config (Aspen theme)
│   ├── mintlify-docs/      ← Documentation pages
│   └── run-mintlify.ps1    ← Helper script
└── package.json            ← Has `docs:dev` script
```

---

**Remember**: Always run `mint` commands from the `docs/` directory, or use `pnpm docs:dev` from the project root.
