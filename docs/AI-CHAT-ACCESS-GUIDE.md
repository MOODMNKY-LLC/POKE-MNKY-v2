# AI Chat Interface Access Guide

**Date**: 2026-01-18  
**Status**: Current Implementation Status

---

## 📍 Current Chat Interface Locations

The AI chat interfaces are **embedded directly into specific pages**, not as floating popups. Here's where you can access each one:

### 1. **Draft Assistant Chat** 🎯
**Route**: `/draft`  
**Location**: Right sidebar (above legacy DraftChat component)  
**Access**: Navigate to the Draft page during an active draft session  
**Context**: Automatically receives `teamId` and `seasonId` from draft session

**How to Access**:
1. Navigate to `/draft`
2. Chat appears in the right sidebar
3. Fixed height: 600px

---

### 2. **Battle Strategy Chat** ⚔️
**Route**: `/showdown/match-lobby`  
**Location**: "Battle Strategy" tab (alongside "Match Lobby" tab)  
**Access**: Navigate to Match Lobby, then click "Battle Strategy" tab  
**Context**: General battle strategy assistant (can be enhanced with match context)

**How to Access**:
1. Navigate to `/showdown/match-lobby`
2. Click the "Battle Strategy" tab
3. Chat appears in a fixed-height container (700px)

---

### 3. **Free Agency Chat** 💼
**Route**: `/dashboard/free-agency`  
**Location**: "AI Assistant" tab (alongside other tabs)  
**Access**: Navigate to Free Agency page, then click "AI Assistant" tab  
**Context**: Automatically receives `teamId` and `seasonId` from user profile

**How to Access**:
1. Navigate to `/dashboard/free-agency`
2. Click the "AI Assistant" tab
3. Chat appears in a fixed-height container (700px)

**Note**: Currently missing from TabsList - needs to be added! ⚠️

---

### 4. **Pokédex Chat** 📚
**Route**: `/pokedex`  
**Location**: "AI" tab (within Pokémon details view)  
**Access**: Select a Pokémon, then click "AI" tab  
**Context**: Automatically receives `selectedPokemon` name

**How to Access**:
1. Navigate to `/pokedex`
2. Select a Pokémon from the list
3. Click the "AI" tab
4. Chat appears in a fixed-height container (600px)

---

## ❌ Popup/Overlay Chat Component

**Status**: **NOT IMPLEMENTED**

We did **not** install a popup/overlay chat component from AI Elements. The components we installed are:

### Installed AI Elements Components (12 total):
1. ✅ `conversation` - Chat container
2. ✅ `message` - Message display
3. ✅ `tool` - Tool call visualization
4. ✅ `code-block` - Code display
5. ✅ `reasoning` - AI reasoning display
6. ✅ `sources` - Source citations
7. ✅ `loader` - Loading indicators
8. ✅ `chain-of-thought` - Step-by-step reasoning
9. ✅ `context` - Context consumption display
10. ✅ `image` - Image display
11. ✅ `plan` - Plan visualization
12. ✅ `shimmer` - Shimmer loading effect

**None of these are popup/overlay components** - they're all embedded components.

---

## 🚀 Creating a Popup Chat Component

If you want a **floating popup chat window** that can be accessed from anywhere in the app, we can create one using:

1. **shadcn/ui Dialog component** (already installed)
2. **Floating button** (trigger button)
3. **BaseChatInterface** (reuse existing chat interface)

### Implementation Options:

#### Option 1: Global Floating Chat Button
- Floating action button (FAB) in bottom-right corner
- Opens chat in a Dialog overlay
- Can be configured for any agent type
- Accessible from any page

#### Option 2: Agent-Specific Popups
- Separate popup for each agent type
- Context-aware (passes current page context)
- Can be triggered from anywhere

#### Option 3: Unified Assistant Popup
- Single popup that routes to appropriate agent
- Auto-detects context (draft page → Draft Assistant, etc.)
- Fallback to general assistant

---

## 🔧 Current Implementation Details

### Component Structure:
```
BaseChatInterface (foundation)
├── Conversation (container)
├── Message (display)
├── Tool (tool calls)
├── Reasoning (AI thinking)
├── Sources (citations)
├── CodeBlock (code display)
├── Loader (loading states)
├── QuickActions (quick prompts)
└── PromptInputWrapper (input)

Agent Wrappers (extend BaseChatInterface)
├── DraftAssistantChat → /api/ai/draft-assistant
├── BattleStrategyChat → /api/ai/battle-strategy
├── FreeAgencyChat → /api/ai/free-agency
└── PokedexChat → /api/ai/pokedex
```

### Integration Pattern:
All chat components are embedded using this pattern:
```tsx
<div className="h-[600px] border rounded-lg overflow-hidden">
  <AgentChat
    teamId={teamId}
    seasonId={seasonId}
    className="h-full"
  />
</div>
```

---

## ⚠️ Known Issues

### 1. Free Agency Tab Missing ⚠️
**Issue**: The "AI Assistant" tab trigger is missing from the TabsList  
**Location**: `app/dashboard/free-agency/page.tsx`  
**Fix Needed**: Add `<TabsTrigger value="assistant">AI Assistant</TabsTrigger>` to TabsList

**Current Code**:
```tsx
<TabsList>
  <TabsTrigger value="submit">Submit Transaction</TabsTrigger>
  <TabsTrigger value="browse">Browse Available</TabsTrigger>
  <TabsTrigger value="history">Transaction History</TabsTrigger>
  {/* Missing: <TabsTrigger value="assistant">AI Assistant</TabsTrigger> */}
</TabsList>
```

---

## 💡 Recommendations

### Immediate Fix:
1. **Add missing Free Agency tab trigger** (see issue above)

### Future Enhancements:

1. **Create Popup Chat Component**
   - Floating action button (FAB)
   - Dialog overlay
   - Context-aware routing
   - Accessible from any page

2. **Add Navigation Links**
   - Quick access buttons in header/navbar
   - "Chat with Assistant" links on relevant pages

3. **Persistent Chat State**
   - Save chat history
   - Restore on page reload
   - Cross-page conversation continuity

4. **Mobile Optimization**
   - Full-screen chat on mobile
   - Bottom sheet on mobile
   - Swipe gestures

---

## 📋 Quick Reference

| Agent | Route | Tab/Location | Height |
|-------|-------|--------------|--------|
| Draft Assistant | `/draft` | Right sidebar | 600px |
| Battle Strategy | `/showdown/match-lobby` | "Battle Strategy" tab | 700px |
| Free Agency | `/dashboard/free-agency` | "AI Assistant" tab ⚠️ | 700px |
| Pokédex | `/pokedex` | "AI" tab | 600px |

---

## 🎯 Next Steps

1. **Fix Free Agency tab** (add missing TabsTrigger)
2. **Decide on popup chat** (if desired)
3. **Add navigation links** (for easier access)
4. **Test all integrations** (using testing guide)

---

**Last Updated**: 2026-01-18  
**Status**: Embedded Implementation Complete (Popup Not Implemented)
