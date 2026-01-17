# Local Visual Testing Guide - MCP Integration

**Date**: January 17, 2026  
**Purpose**: Test MCP integration visually in the browser

---

## 🎯 Quick Start

### Step 1: Start Next.js Dev Server

```bash
cd c:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
pnpm dev
```

Server will start at: `http://localhost:3000`

### Step 2: Navigate to Pokédex Page

Open in browser:
```
http://localhost:3000/pokedex
```

### Step 3: Test AI Assistant

1. **Select a Pokemon** from the list
2. **Click the "AI" tab** at the bottom
3. **Ask a question** like:
   - "What Pokemon are available in the draft pool with 20 points?"
   - "Check the draft status"
   - "What's my team budget?"
4. **Click "Ask AI"**

---

## 🧪 Testing Responses API with MCP

### Option 1: Enable Globally (Recommended for Testing)

**Edit `.env.local`**:
```bash
ENABLE_RESPONSES_API=true
MCP_DRAFT_POOL_SERVER_URL=https://mcp-draft-pool.moodmnky.com/mcp
```

**Restart dev server** after changing `.env.local`

### Option 2: Test via Browser Console

Open browser console (F12) and run:

```javascript
// Test with Responses API enabled
fetch('/api/ai/pokedex', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What Pokemon are available in the draft pool with 20 points?',
    useResponsesAPI: true
  })
})
.then(r => r.json())
.then(data => {
  console.log('Response:', data);
  console.log('Source:', data.source); // Should be "responses_api_mcp"
  console.log('Answer:', data.answer);
})
```

---

## 📊 What to Look For

### Success Indicators

✅ **Response includes**:
- `source: "responses_api_mcp"` (if Responses API worked)
- `source: "chat_completions"` (if fallback occurred)
- `answer`: The AI's response
- `pokemon_referenced`: Array of Pokemon mentioned

### MCP Tool Usage

Check browser Network tab:
1. Open DevTools → Network tab
2. Filter by "pokedex"
3. Click on the request
4. Check Response tab for:
   - `source: "responses_api_mcp"` = MCP tools were used
   - `source: "chat_completions"` = Fallback to regular API

### Server Logs

Check MCP server logs:
```bash
wsl sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 "docker logs poke-mnky-draft-pool-mcp-server --tail 50"
```

Look for:
- `MCP session initialized: session-...`
- Tool execution logs
- Any errors

---

## 🎨 Enhanced UI Testing

The Pokédex page already has an AI assistant tab. To enhance it for testing:

1. **Add Response API toggle** in the UI
2. **Show source** (Responses API vs Chat Completions)
3. **Display MCP tool calls** if available
4. **Show response time** and metadata

---

## 🔍 Test Scenarios

### Scenario 1: Draft Pool Query
**Query**: "What Pokemon are available in the draft pool with 20 points?"
**Expected**: Uses `get_available_pokemon` MCP tool
**Source**: `responses_api_mcp`

### Scenario 2: Draft Status Query
**Query**: "What's the current draft status?"
**Expected**: Uses `get_draft_status` MCP tool
**Source**: `responses_api_mcp`

### Scenario 3: Team Budget Query
**Query**: "What's my team budget?"
**Expected**: Uses `get_team_budget` MCP tool (may need team ID)
**Source**: `responses_api_mcp`

### Scenario 4: Regular Pokemon Query
**Query**: "What are Pikachu's stats?"
**Expected**: Uses `get_pokemon` function (not MCP)
**Source**: `responses_api_mcp` or `chat_completions`

---

## 🐛 Troubleshooting

### Issue: Responses API Not Working

**Check**:
1. ✅ `.env.local` has `ENABLE_RESPONSES_API=true`
2. ✅ Dev server restarted after env change
3. ✅ MCP server is accessible
4. ✅ Network tab shows request to `/api/ai/pokedex`

**Debug**:
```javascript
// Check environment variable
console.log('ENABLE_RESPONSES_API:', process.env.ENABLE_RESPONSES_API)
```

### Issue: MCP Tools Not Called

**Check**:
1. ✅ MCP server logs show session initialization
2. ✅ Response includes `source: "responses_api_mcp"`
3. ✅ No errors in browser console
4. ✅ No errors in server logs

---

## 📝 Next Steps

After visual testing works:
1. ✅ Verify MCP tools are called correctly
2. ✅ Check response quality
3. ✅ Test with different queries
4. ✅ Monitor API costs
5. ✅ Proceed with Phase 2B (Coach endpoint)

---

**Status**: ✅ **READY FOR VISUAL TESTING**  
**URL**: `http://localhost:3000/pokedex`
