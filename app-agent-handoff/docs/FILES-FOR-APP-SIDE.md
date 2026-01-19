# Files for App Side - Google Sheets Draft Pool Extraction

**Purpose**: List of all relevant files to copy to the app side for draft pool generation functionality.

---

## 📦 Essential Files (Must Copy)

### 1. Scripts (Core Functionality)

#### `/scripts/generate-draft-pool.js` ⭐ **PRIMARY**
- **Purpose**: Main draft pool generator script
- **Exports**: `generateDraftPool()`, `filterDraftPool()`, `extractPokemon()`
- **Usage**: Can be imported as ES module or run standalone
- **Dependencies**: None (pure Node.js, uses `fs`)

#### `/scripts/extract-draft-pool-logic.js`
- **Purpose**: Logic extraction and analysis script
- **Usage**: Run to extract detailed logic from Google Sheets
- **Output**: Generates `/data/draft-pool-logic.json`
- **Note**: Useful for debugging/analysis, but not required for production

### 2. Data Files (Generated Outputs)

#### `/data/draft-pool-generated.json` ⭐ **PRIMARY OUTPUT**
- **Purpose**: Ready-to-use structured draft pool
- **Format**: JSON with available Pokemon, banned lists, point value distribution
- **Size**: ~6,548 lines
- **Usage**: Import directly into app, use for API responses, seed database

#### `/data/draft-pool-logic.json`
- **Purpose**: Extracted logic and metadata
- **Format**: JSON with complete Pokemon data, status, row/column positions
- **Usage**: Reference for understanding structure, debugging

---

## 📚 Documentation (Reference)

### `/knowledge-base/aab-battle-league/google-sheets-structure.md`
- **Purpose**: Comprehensive documentation of all 6 Google Sheets
- **Content**: 
  - Draft Board structure and parsing logic
  - Column mappings and point value assignments
  - Status determination algorithms
  - Rules, Pokédex, Data, Standings sheet structures
- **Usage**: Reference for understanding the data structure

### `/docs/GOOGLE-SHEETS-DRAFT-POOL-EXTRACTION-COMPLETE.md`
- **Purpose**: Summary document of the extraction work
- **Content**: Approach, results, integration points
- **Usage**: Overview and context

---

## 🔧 Configuration Constants

If you want to extract just the constants (instead of copying the full scripts), here are the key values:

```javascript
// Point value column mapping (header column → point value)
const POINT_COLUMNS = {
  8: 20, 11: 19, 14: 18, 17: 17, 20: 16,
  23: 15, 26: 14, 29: 13, 32: 12, 35: 11,
  38: 10, 41: 9, 44: 8, 47: 7, 50: 6,
  53: 5, 56: 4, 59: 3, 62: 2, 65: 1,
};

// Column indices
const COLUMNS = {
  BANNED_HEADER: 2,
  BANNED_POKEMON: 3,
  TERA_BANNED_HEADER: 5,
  TERA_BANNED_POKEMON: 6,
  DRAFTED: 70,
  POINTS_LEFT: 72,
};

// Draft configuration
const CONFIG = {
  draftBudget: 120,
  teraBudget: 15,
  minTeamSize: 8,
  maxTeamSize: 10,
  teams: 20,
  pointRange: { min: 1, max: 20 },
};
```

---

## 📋 Copy Checklist

### Minimum Required (Core Functionality)
- [ ] `/scripts/generate-draft-pool.js`
- [ ] `/data/draft-pool-generated.json`

### Recommended (Full Functionality)
- [ ] `/scripts/generate-draft-pool.js`
- [ ] `/scripts/extract-draft-pool-logic.js`
- [ ] `/data/draft-pool-generated.json`
- [ ] `/data/draft-pool-logic.json`

### Optional (Documentation/Reference)
- [ ] `/knowledge-base/aab-battle-league/google-sheets-structure.md`
- [ ] `/docs/GOOGLE-SHEETS-DRAFT-POOL-EXTRACTION-COMPLETE.md`

---

## 🚀 Usage Examples

### Import as ES Module (App Side)

```javascript
// In your app code
import { generateDraftPool, filterDraftPool } from './scripts/generate-draft-pool.js';

// Generate draft pool from Google Sheets data
const draftPool = generateDraftPool(googleSheetsData);

// Filter available Pokemon
const filtered = filterDraftPool(draftPool, {
  minPointValue: 10,
  maxPointValue: 15,
  excludeTeraBanned: true,
});
```

### Use Generated JSON Directly

```javascript
// Import the pre-generated draft pool
import draftPool from './data/draft-pool-generated.json';

// Access available Pokemon
const availablePokemon = draftPool.pokemon.available;

// Get Pokemon by point value
const highValuePokemon = availablePokemon.filter(p => p.pointValue >= 15);

// Check if Pokemon is banned
const isBanned = draftPool.bannedList.includes('Arceus');
```

### API Endpoint Example

```javascript
// API route handler
export async function GET(request) {
  const draftPool = await import('./data/draft-pool-generated.json');
  
  return Response.json({
    available: draftPool.pokemon.available,
    pointValueDistribution: draftPool.pointValueDistribution,
    metadata: draftPool.metadata,
  });
}
```

---

## 📁 File Sizes (for reference)

- `generate-draft-pool.js`: ~8 KB
- `extract-draft-pool-logic.js`: ~6 KB
- `draft-pool-generated.json`: ~200 KB
- `draft-pool-logic.json`: ~500 KB
- `google-sheets-structure.md`: ~25 KB

---

## ⚠️ Notes

1. **Google Sheets Export**: The `/data/google-sheets-export.json` file is very large (~69K lines) and probably not needed on the app side unless you're doing real-time syncing.

2. **Dependencies**: The scripts use only Node.js built-ins (`fs`, `path`, `url`), so no npm packages needed.

3. **ES Modules**: Scripts use ES module syntax (`import`/`export`). If your app uses CommonJS, you'll need to convert or use dynamic imports.

4. **Data Format**: The generated JSON uses standard JSON format and can be imported directly in Next.js, React, or any JavaScript environment.

---

## 🔄 Regenerating Draft Pool

If you need to regenerate the draft pool from updated Google Sheets:

1. Export Google Sheets to JSON (using existing script: `/scripts/read-google-sheet-comprehensive.js`)
2. Run: `node scripts/generate-draft-pool.js`
3. Copy the new `/data/draft-pool-generated.json` to app side

---

**Last Updated**: 2026-01-19
