# Visual Testing Ready ✅

**Date**: January 17, 2026  
**Status**: ✅ **UI Enhanced - Ready for Visual Testing**

---

## ✅ Changes Made

### Enhanced Pokédex Page (`app/pokedex/page.tsx`)

1. **Added Responses API Toggle**
   - Toggle switch to enable/disable Responses API
   - Visual indicator showing current mode

2. **Added Response Source Display**
   - Shows which API was used:
     - `Responses API + MCP` - MCP tools were used
     - `Chat Completions` - Fallback to regular API
   - Green checkmark indicator

3. **Added Pokemon Referenced Badges**
   - Shows which Pokemon were mentioned/referenced
   - Visual badges for easy identification

4. **Enhanced Placeholder Text**
   - Suggests draft pool queries
   - Guides users to test MCP tools

---

## 🚀 How to Test

### Step 1: Start Dev Server

```bash
cd c:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
pnpm dev
```

Wait for: `Ready on http://localhost:3000`

### Step 2: Open Pokédex Page

Navigate to:
```
http://localhost:3000/pokedex
```

### Step 3: Test MCP Integration

1. **Select any Pokemon** from the list
2. **Click the "AI" tab** at the bottom
3. **Toggle "Responses API" ON** (blue switch)
4. **Ask a draft pool question**:
   - "What Pokemon are available in the draft pool with 20 points?"
   - "Check the current draft status"
   - "What's my team budget?"
5. **Click "Ask AI"**

### Step 4: Verify Results

**Look for**:
- ✅ **Source**: Should show "Responses API + MCP"
- ✅ **Answer**: Should include draft pool data
- ✅ **Referenced Pokemon**: Badges showing Pokemon mentioned
- ✅ **Response Quality**: Accurate and helpful answer

---

## 🧪 Test Scenarios

### Scenario 1: Draft Pool Query (MCP Tool)
**Toggle**: Responses API ON  
**Query**: "What Pokemon are available in the draft pool with 20 points?"  
**Expected**:
- Source: `Responses API + MCP`
- Answer includes Pokemon names and point values
- Uses `get_available_pokemon` MCP tool

### Scenario 2: Draft Status Query (MCP Tool)
**Toggle**: Responses API ON  
**Query**: "What's the current draft status?"  
**Expected**:
- Source: `Responses API + MCP`
- Answer includes draft session info
- Uses `get_draft_status` MCP tool

### Scenario 3: Regular Pokemon Query
**Toggle**: Responses API OFF  
**Query**: "What are Pikachu's stats?"  
**Expected**:
- Source: `Chat Completions`
- Answer includes Pokemon stats
- Uses regular function calling

### Scenario 4: Fallback Test
**Toggle**: Responses API ON  
**Query**: "What are Pikachu's stats?"  
**Expected**:
- May use Responses API or fallback
- Answer still accurate
- Shows which source was used

---

## 📊 What You'll See

### UI Elements

1. **Toggle Switch** (top of AI card)
   - Blue when ON (Responses API enabled)
   - Gray when OFF (Chat Completions)

2. **Source Indicator** (below button)
   - Green checkmark + text
   - Shows which API was used

3. **Pokemon Badges** (if referenced)
   - Small badges showing Pokemon names
   - Appears when Pokemon are mentioned

4. **Response Card** (bottom)
   - AI's answer
   - Formatted text

---

## 🔍 Debugging

### Check Browser Console

Open DevTools (F12) → Console tab:
- Look for any errors
- Check network requests
- Verify API calls

### Check Network Tab

DevTools → Network tab:
1. Filter by "pokedex"
2. Click on request
3. Check:
   - Request payload (includes `useResponsesAPI`)
   - Response (includes `source` field)
   - Status code (200 = success)

### Check Server Logs

MCP Server:
```bash
wsl sshpass -p 'MOODMNKY88' ssh moodmnky@10.3.0.119 "docker logs poke-mnky-draft-pool-mcp-server --tail 50"
```

Look for:
- `MCP session initialized`
- Tool execution logs
- Any errors

---

## ✅ Success Criteria

- [ ] Toggle works (can enable/disable Responses API)
- [ ] Source indicator shows correct API
- [ ] MCP tools are called when Responses API is ON
- [ ] Answers are accurate
- [ ] Pokemon badges appear when referenced
- [ ] No errors in console
- [ ] Response time is reasonable

---

## 🎯 Next Steps

After visual testing confirms everything works:
1. ✅ Document any issues found
2. ✅ Test with different queries
3. ✅ Verify MCP tools are called correctly
4. ✅ Proceed with Phase 2B (Coach endpoint)

---

**Status**: ✅ **READY FOR VISUAL TESTING**  
**URL**: `http://localhost:3000/pokedex`  
**Toggle**: Enable "Responses API" switch to test MCP integration
