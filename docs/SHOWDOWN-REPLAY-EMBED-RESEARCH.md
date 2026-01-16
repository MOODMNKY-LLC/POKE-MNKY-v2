# Pokémon Showdown Replay Embedding Research

**Date**: January 15, 2026  
**Research Method**: Deep Thinking + Comprehensive Web Search  
**Status**: Complete Research Summary

---

## Executive Summary

Pokémon Showdown **does provide official tools** for embedding replay viewers, though not as a pre-built React component. The primary method is through `replay-embed.js`, an official JavaScript file that can be used to create embeddable replay viewers. Multiple community projects demonstrate how to use this file, and there are Python packages that generate replay HTML using this embed system.

---

## Official Showdown Embedding Solutions

### 1. **replay-embed.js** (Primary Official Solution)

**Location**: `https://play.pokemonshowdown.com/js/replay-embed.js`

**Description**: Official JavaScript file provided by Pokémon Showdown for embedding replays. This is the core file used by multiple community projects and packages.

**Usage Pattern**:
- Load the `replay-embed.js` script
- Provide replay log data (either from a URL or raw log)
- The script renders the replay viewer

**References**:
- Used by `pscapture` (Node.js GIF/video generator)
- Used by `pokemon-showdown-replays` Python package
- Referenced in multiple GitHub projects

**Documentation**: Limited official documentation, but multiple community implementations demonstrate usage.

---

## Community Packages & Solutions

### Python Packages

#### **pokemon-showdown-replays** (PyPI)

**Package**: `pokemon-showdown-replays`  
**GitHub**: `madamadam-c/pokemon-showdown-replays`  
**License**: MIT

**Description**: Python package for generating Pokémon Showdown replay HTML from battle logs.

**Usage**:
```python
from pokemon_showdown_replays import Replay, Download

# Create replay object from log
replay_object = Replay.create_replay_object(
    log, 
    show_full_damage=False, 
    replay_embed_location="https://play.pokemonshowdown.com/js/replay-embed.js"
)

# Generate HTML
html = Download.create_replay(replay_object)
```

**Features**:
- Generates replay HTML from battle logs
- Supports custom `replay_embed_location` (can point to custom Showdown client)
- Supports `show_full_damage` parameter for precise HP display
- Can use custom client locations for Pokemon with custom sprites

**Installation**: `pip install pokemon-showdown-replays`

---

### Node.js Projects

#### **pscapture** (GitHub)

**Repository**: `Zrp200/pscapture`  
**License**: AGPL-3.0

**Description**: Node.js application that uses `replay-embed.js` to convert replays to GIFs or videos using headless browser (Puppeteer).

**Key Insight**: Demonstrates that `replay-embed.js` can be loaded in a headless browser and rendered, then captured as video/GIF.

**Usage Pattern**:
```bash
pscapture <replay-url> [turn-range]
```

**Technical Details**:
- Uses Puppeteer to load replay-embed.js
- Embeds replay protocol data
- Records the rendered output

---

#### **psim-log-to-replay** (GitHub)

**Repository**: `AgustinSRG/psim-log-to-replay`  
**License**: MIT

**Description**: Simple web tool to convert raw Showdown battle logs into replay HTML.

**Features**:
- Drag-and-drop log files
- Generates replay HTML
- No installation required (web-based)

**GitHub**: https://github.com/AgustinSRG/psim-log-to-replay

---

### Showdown Client Repository

#### **pokemon-showdown-client** (Official)

**Repository**: `smogon/pokemon-showdown-client`  
**License**: AGPLv3

**Structure**:
```
pokemon-showdown-client/
├── replay.pokemonshowdown.com/  # Replay viewer source
├── play.pokemonshowdown.com/     # Main client source
└── js/
    └── replay-embed.js           # Embed file location
```

**Key Files**:
- `replay.pokemonshowdown.com/` - Contains replay viewer HTML templates and JavaScript
- `WEB-API.md` - Documents API endpoints (may include replay endpoints)

**Building**: Requires Node.js v20+, run `node build` to build the client.

**Note**: The entire client repository is available, allowing you to:
1. Host your own replay viewer
2. Customize the replay viewer
3. Extract components for embedding

---

## Implementation Options for Next.js App

### Option 1: Use replay-embed.js Directly (Recommended)

**Approach**: Load `replay-embed.js` in your Next.js app and provide replay data.

**Pros**:
- Official Showdown solution
- No additional dependencies
- Can be customized
- Works with your existing Showdown server

**Cons**:
- Requires understanding of replay-embed.js API
- May need to handle replay log fetching
- Limited documentation

**Implementation Steps**:
1. Create a React component that loads `replay-embed.js`
2. Fetch replay log from your Showdown server (`https://aab-showdown.moodmnky.com/replay/{format}-{id}.log`)
3. Initialize replay-embed.js with log data
4. Render in a container div

**Example Structure**:
```tsx
// components/showdown/replay-viewer.tsx
'use client';

import { useEffect, useRef } from 'react';

interface ReplayViewerProps {
  replayUrl: string; // e.g., "gen9randombattle-35"
  serverUrl?: string; // e.g., "https://aab-showdown.moodmnky.com"
}

export function ReplayViewer({ replayUrl, serverUrl = 'https://aab-showdown.moodmnky.com' }: ReplayViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load replay-embed.js
    const script = document.createElement('script');
    script.src = 'https://aab-play.moodmnky.com/js/replay-embed.js';
    script.onload = () => {
      // Initialize replay viewer with log data
      // Implementation depends on replay-embed.js API
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [replayUrl]);

  return <div ref={containerRef} id="replay-container" />;
}
```

---

### Option 2: Use Python Package via API Endpoint

**Approach**: Create a Next.js API route that uses the Python package to generate replay HTML.

**Pros**:
- Well-documented Python package
- Handles HTML generation
- Can be cached server-side

**Cons**:
- Requires Python runtime (or Docker container)
- Additional infrastructure
- Server-side rendering only

**Implementation**:
1. Create Python service/API that uses `pokemon-showdown-replays`
2. Create Next.js API route that calls Python service
3. Return generated HTML to frontend
4. Use `dangerouslySetInnerHTML` to render (or use iframe)

---

### Option 3: Iframe Embedding

**Approach**: Embed your existing replay viewer (`https://aab-replay.moodmnky.com/{replay-id}`) in an iframe.

**Pros**:
- Simplest implementation
- Uses existing replay infrastructure
- No additional code needed

**Cons**:
- Less control over styling
- Full page load (heavier)
- May have layout issues
- Cross-origin considerations

**Implementation**:
```tsx
// components/showdown/replay-iframe.tsx
'use client';

interface ReplayIframeProps {
  replayId: string;
}

export function ReplayIframe({ replayId }: ReplayIframeProps) {
  return (
    <iframe
      src={`https://aab-replay.moodmnky.com/${replayId}`}
      width="100%"
      height="800px"
      frameBorder="0"
      allowFullScreen
      style={{ border: 'none' }}
    />
  );
}
```

---

### Option 4: Extract from Showdown Client Repository

**Approach**: Extract replay viewer components from the official Showdown client repository and adapt for React.

**Pros**:
- Full control over implementation
- Can customize to match app design
- Official Showdown codebase

**Cons**:
- Most complex option
- Requires understanding Showdown client architecture
- May need to adapt from Preact to React
- Maintenance burden

**Implementation Steps**:
1. Clone `smogon/pokemon-showdown-client`
2. Study `replay.pokemonshowdown.com/` directory structure
3. Extract replay viewer components
4. Adapt for React/Next.js
5. Integrate with your app

---

## API Endpoints & Data Formats

### Replay Data Sources

**Replay Log Format**:
- URL: `https://{server}/replay/{format}-{id}.log`
- Example: `https://aab-showdown.moodmnky.com/replay/gen9randombattle-35.log`
- Returns: Raw battle log text

**Replay JSON Format**:
- URL: `https://{server}/replay/{format}-{id}.json`
- Example: `https://aab-showdown.moodmnky.com/replay/gen9randombattle-35.json`
- Returns: JSON with replay metadata and log

**Replay HTML Format**:
- URL: `https://{server}/replay/{format}-{id}`
- Example: `https://aab-replay.moodmnky.com/gen9randombattle-35`
- Returns: Full HTML page with replay viewer

---

## Recommended Approach for POKE MNKY

### Phase 1: Quick Implementation (Iframe)

**Use iframe embedding** for immediate integration:
- Simple, works immediately
- Uses existing replay infrastructure
- Can be improved later

### Phase 2: Custom Component (replay-embed.js)

**Implement custom React component** using `replay-embed.js`:
- Better integration with app
- More control over styling
- Can match app design system
- Requires research into replay-embed.js API

### Phase 3: Full Customization (Extract Components)

**Extract and customize** from Showdown client:
- Full control
- Match app design exactly
- Requires significant development time

---

## Research Findings Summary

### ✅ What Exists

1. **Official `replay-embed.js`** - Available at `play.pokemonshowdown.com/js/replay-embed.js`
2. **Python Package** - `pokemon-showdown-replays` for generating replay HTML
3. **Showdown Client Repository** - Full source code available (AGPLv3)
4. **Community Examples** - Multiple projects demonstrate usage

### ❌ What Doesn't Exist

1. **Official React Component** - No pre-built React component
2. **npm Package** - No dedicated npm package for replay embedding
3. **Official Documentation** - Limited documentation on replay-embed.js API
4. **TypeScript Types** - No TypeScript definitions for replay-embed.js

### 🔍 What Needs Investigation

1. **replay-embed.js API** - How to initialize and use the embed file
2. **Replay Log Format** - Understanding the log structure
3. **Customization Options** - What can be customized in the embed
4. **Styling Integration** - How to match app design system

---

## Next Steps

1. **Examine replay-embed.js**: Download and analyze the file to understand its API
2. **Test iframe Embedding**: Quick test with existing replay URLs
3. **Research API**: Look for examples in community projects (pscapture, psim-log-to-replay)
4. **Prototype Component**: Create a basic React component using replay-embed.js
5. **Test Integration**: Integrate with existing replay library page

---

## References

### Official Resources
- Showdown Client Repository: https://github.com/smogon/pokemon-showdown-client
- Showdown Server Repository: https://github.com/smogon/pokemon-showdown
- replay-embed.js: https://play.pokemonshowdown.com/js/replay-embed.js
- WEB-API.md: https://github.com/smogon/pokemon-showdown-client/blob/master/WEB-API.md

### Community Packages
- pokemon-showdown-replays (Python): https://github.com/madamadam-c/pokemon-showdown-replays
- pscapture (Node.js): https://github.com/Zrp200/pscapture
- psim-log-to-replay (Web): https://github.com/AgustinSRG/psim-log-to-replay

### Related Projects
- Showdown Replay Downloader: https://github.com/Intenzi/ShowdownReplayDownloader
- Replay Saver Extension: https://github.com/Pocolip/ReplaySaver

---

**Last Updated**: January 15, 2026  
**Status**: Research Complete - Ready for Implementation Planning
