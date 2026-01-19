# Cite Source Feature - Tool Usage Indicators

**Date**: January 18, 2026  
**Status**: ✅ **IMPLEMENTED**  
**Feature**: Visual indicators showing when tools are used and which sources were consulted

---

## 🎯 Overview

Added a "Cite Source" feature that visually flags when tools (file_search, web_search, MCP tools) are used in responses, making it clear when information comes from external sources vs. system prompt knowledge.

---

## ✅ What Was Added

### 1. Tool Usage Badge

**Location**: Above each assistant message that uses tools

**Visual Indicator**:
```
✨ Used 1 tool: file_search
```

**Features**:
- Shows count of tools used
- Lists tool names (file_search, web_search, mcp.get_available_pokemon, etc.)
- Sparkles icon (✨) to indicate tool usage
- Primary color styling to stand out

### 2. Sources Component Enhancement

**Location**: Below tool usage badge, above message content

**Visual Indicator**:
```
📚 Used 1 source
  ↓ (expandable)
  📖 Documentation (Vector Store) [file_search]
```

**Features**:
- Shows count of sources
- Expandable list of sources
- Each source shows:
  - Source title/name
  - Tool badge showing which tool retrieved it
  - Link to source (if applicable)

### 3. Source Types Supported

**file_search**:
- Title: "Documentation (Vector Store)"
- Tool badge: `file_search`
- URL: `#vector-store` (internal anchor)

**web_search**:
- Title: "Web Search Results" or actual URL
- Tool badge: `web_search`
- URL: Actual web URLs (if extracted from results)

**MCP Tools**:
- Title: "MCP Server: [tool_name]"
- Tool badge: Tool name (e.g., `mcp.get_available_pokemon`)
- URL: `https://mcp-draft-pool.moodmnky.com/mcp`

---

## 🎨 Visual Design

### Tool Usage Badge

**Styling**:
- Background: `bg-primary/10` (subtle primary color)
- Text: `text-primary` (primary color)
- Border: `border-primary/20` (subtle border)
- Icon: Sparkles (✨)
- Size: Small (`text-xs`)

**Example**:
```
┌─────────────────────────────────────┐
│ ✨ Used 2 tools: file_search, web_search │
└─────────────────────────────────────┘
```

### Sources Component

**Styling**:
- Collapsible trigger showing count
- Expandable content with source list
- Each source has:
  - Book icon (📖)
  - Source title
  - Tool badge (outline variant)

**Example**:
```
┌─────────────────────────────────────┐
│ 📚 Used 1 source                    │
│   ↓                                 │
│   📖 Documentation (Vector Store)   │
│      [file_search]                  │
└─────────────────────────────────────┘
```

---

## 🔍 How It Works

### 1. Tool Detection

**In `convertResponsesAPIToUIMessage()`**:
- Scans Responses API output for tool calls
- Tracks which tools were used
- Creates source entries for each tool

### 2. Source Creation

**For file_search**:
```typescript
sources.push({
  url: "#vector-store",
  title: "Documentation (Vector Store)",
  tool: "file_search",
})
```

**For web_search**:
```typescript
sources.push({
  url: extractedUrl,
  title: "Web Search Results",
  tool: "web_search",
})
```

**For MCP tools**:
```typescript
sources.push({
  url: "https://mcp-draft-pool.moodmnky.com/mcp",
  title: "MCP Server: " + toolName,
  tool: toolName,
})
```

### 3. UI Display

**In `BaseChatInterface`**:
- Checks for tool calls in message parts
- Shows tool usage badge if tools were used
- Shows sources component if sources exist
- Displays tool components for each tool call

---

## 📊 Example Response Flow

### User Asks: "What is the MCP server URL?"

**Response Structure**:
```
┌─────────────────────────────────────┐
│ ✨ Used 1 tool: file_search         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📚 Used 1 source                    │
│   ↓                                 │
│   📖 Documentation (Vector Store)   │
│      [file_search]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ The MCP server URL is               │
│ https://mcp-draft-pool.moodmnky.com/mcp │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔧 Tool: file_search                │
│   Input: {...}                      │
│   Output: [document excerpts...]     │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### Test 1: File Search

**Prompt**: "What is the MCP server URL?"

**Expected**:
- ✅ Tool usage badge: "✨ Used 1 tool: file_search"
- ✅ Sources: "📚 Used 1 source" → "Documentation (Vector Store) [file_search]"
- ✅ Tool component showing file_search call
- ✅ Response includes correct URL

### Test 2: Multiple Tools

**Prompt**: "Search the web for current Pokémon news and check the documentation for MCP server details"

**Expected**:
- ✅ Tool usage badge: "✨ Used 2 tools: web_search, file_search"
- ✅ Sources: "📚 Used 2 sources" → Both sources listed
- ✅ Tool components for both tools
- ✅ Response includes information from both sources

### Test 3: No Tools Used

**Prompt**: "Hello, how are you?"

**Expected**:
- ❌ No tool usage badge
- ❌ No sources component
- ❌ No tool components
- ✅ Just text response

---

## 📋 Verification Checklist

When testing, check:

- [ ] Tool usage badge appears when tools are used
- [ ] Badge shows correct tool count
- [ ] Badge lists correct tool names
- [ ] Sources component appears when tools are used
- [ ] Sources show correct tool badges
- [ ] Sources are expandable/collapsible
- [ ] Tool components display tool calls
- [ ] No badge/sources when no tools used

---

## 🎨 Customization

### Change Badge Text

**Location**: `components/ai/base-chat-interface.tsx`

```typescript
<Badge>
  <Sparkles className="h-3 w-3" />
  Used {toolCalls.length} tool{toolCalls.length > 1 ? 's' : ''}: {toolCalls.map((tc: any) => tc.toolName).join(', ')}
</Badge>
```

### Change Source Titles

**Location**: `lib/openai-client.ts` → `convertResponsesAPIToUIMessage()`

```typescript
if (toolName === "file_search") {
  sources.push({
    url: "#vector-store",
    title: "Your Custom Title", // Change here
    tool: "file_search",
  })
}
```

### Change Badge Colors

**Location**: `components/ai/base-chat-interface.tsx`

```typescript
<Badge 
  variant="secondary" 
  className="gap-1.5 text-xs bg-primary/10 text-primary border-primary/20"
  // Change colors here
/>
```

---

## 🔧 Technical Details

### Message Parts Structure

**Tool Call Part**:
```typescript
{
  type: "tool-call",
  toolName: "file_search",
  toolCallId: "tool-123",
  input: {...},
  output: {...},
  state: "output-available",
}
```

**Source URL Part**:
```typescript
{
  type: "source-url",
  url: "#vector-store",
  title: "Documentation (Vector Store)",
  tool: "file_search",
}
```

### Response Format

**With Tools**:
```json
{
  "role": "assistant",
  "content": "The MCP server URL is...",
  "parts": [
    { "type": "text", "text": "..." },
    { "type": "tool-call", "toolName": "file_search", ... },
    { "type": "source-url", "url": "#vector-store", "tool": "file_search" }
  ]
}
```

**Without Tools**:
```json
{
  "role": "assistant",
  "content": "Hello! How can I help?",
  "parts": [
    { "type": "text", "text": "Hello! How can I help?" }
  ]
}
```

---

## ✅ Benefits

### For Users
- ✅ **Transparency** - Know when tools are used
- ✅ **Trust** - See sources of information
- ✅ **Verification** - Can check tool results
- ✅ **Understanding** - Know which tools were consulted

### For Developers
- ✅ **Debugging** - Easy to see tool usage
- ✅ **Monitoring** - Track which tools are used most
- ✅ **Quality** - Verify tools are being called correctly
- ✅ **UX** - Better user experience with transparency

---

## 🚀 Future Enhancements

### Potential Additions
1. **Clickable Sources** - Make sources clickable to view full tool results
2. **Source Preview** - Show preview of source content on hover
3. **Tool Usage Stats** - Track tool usage over time
4. **Export Sources** - Export conversation with sources
5. **Source Filtering** - Filter messages by source type

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **IMPLEMENTED** - Ready for Testing
