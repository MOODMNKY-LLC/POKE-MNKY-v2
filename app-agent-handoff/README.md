# App Agent Handoff - Draft Pool Generation

**Purpose**: Complete package of files for implementing draft pool generation functionality on the app side.

**Date**: 2026-01-19

---

## 📦 Contents

### Scripts (`/scripts/`)
- **`generate-draft-pool.js`** ⭐ - Main draft pool generator (import this)
- **`extract-draft-pool-logic.js`** - Analysis/debugging tool (optional)

### Data (`/data/`)
- **`draft-pool-generated.json`** ⭐ - Ready-to-use draft pool (778 Pokemon)
- **`draft-pool-logic.json`** - Detailed extraction data (optional, for reference)

### Documentation (`/docs/`)
- **`GOOGLE-SHEETS-DRAFT-POOL-EXTRACTION-COMPLETE.md`** - Complete summary
- **`FILES-FOR-APP-SIDE.md`** - File list and usage guide

### Knowledge Base (`/knowledge-base/aab-battle-league/`)
- **`google-sheets-structure.md`** - Comprehensive Google Sheets documentation

---

## 🚀 Quick Start

### Option 1: Use Pre-Generated JSON (Easiest)

```javascript
import draftPool from './data/draft-pool-generated.json';

// Access available Pokemon
const available = draftPool.pokemon.available;
const highValue = available.filter(p => p.pointValue >= 15);
```

### Option 2: Generate from Google Sheets Data

```javascript
import { generateDraftPool, filterDraftPool } from './scripts/generate-draft-pool.js';

// Generate from Google Sheets export
const draftPool = generateDraftPool(googleSheetsData);

// Filter by criteria
const filtered = filterDraftPool(draftPool, {
  minPointValue: 10,
  maxPointValue: 15,
  excludeTeraBanned: true,
});
```

---

## 📊 Draft Pool Statistics

- **Total Pokemon**: 778
- **Available**: 764
- **Banned**: 69
- **Tera Banned**: 14 (still draftable, can't be Tera Captain)
- **Drafted**: 0 (currently)

**Point Value Range**: 1-20 points

---

## 📚 Documentation

See `/docs/FILES-FOR-APP-SIDE.md` for:
- Detailed file descriptions
- Usage examples
- API endpoint examples
- Copy checklist

See `/knowledge-base/aab-battle-league/google-sheets-structure.md` for:
- Complete Google Sheets structure
- Parsing logic
- Column mappings
- Status determination algorithms

---

## 🔧 Dependencies

**None!** The scripts use only Node.js built-ins:
- `fs` (file system)
- `path` (path utilities)
- `url` (URL utilities)

No npm packages required.

---

## 📝 Notes

- Scripts use ES module syntax (`import`/`export`)
- JSON files are standard format, compatible with any JavaScript environment
- All file paths are relative to this directory
- See individual file headers for more details

---

**Ready to use!** Copy this entire directory to your app side and import as needed.
