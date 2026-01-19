# Verifying File Search Usage - How to Know It's Using Vector Store

**Date**: January 18, 2026  
**Purpose**: How to verify that file_search is actually being called from the vector store, not just using system prompt

---

## 🔍 How to Verify File Search is Being Used

### Method 1: Check Console Logs (Server-Side)

**Location**: Server console (Vercel logs or local terminal)

**Look for these log messages**:

#### ✅ File Search WAS Called:
```
[General Assistant] ✅ FILE_SEARCH TOOL WAS CALLED: {
  count: 1,
  calls: [{
    type: 'function_call',
    name: 'file_search',
    input: {...},
    outputPreview: '...'
  }]
}
```

#### ⚠️ File Search Was NOT Called:
```
[General Assistant] ⚠️ FILE_SEARCH TOOL WAS NOT CALLED - Response may be from system prompt only
```

#### Additional Logs:
```
[General Assistant] Using Responses API: {
  ...
  hasFileSearch: true,
  vectorStoreId: 'configured'
}

[convertResponsesAPIToUIMessage] ✅ FILE_SEARCH was used - response includes vector store data
```

---

### Method 2: Check Browser Console (Client-Side)

**Open Browser DevTools** → Console tab

**Look for**:
- Tool call events in the response stream
- Messages showing tool usage

---

### Method 3: Check UI for Tool Call Display

**Visual Indicator**: Tool calls should appear in the chat UI

**What to Look For**:
- Tool component showing "file_search" or "Tool Call"
- Expandable tool input/output sections
- Tool results displayed below the message

**If you see**:
- ✅ Tool component with "file_search" → File search WAS used
- ❌ No tool component → File search was NOT used (response from system prompt)

---

### Method 4: Check Response Content

**Look for indicator text**:
- Response ends with: `*[Information retrieved from documentation via file_search]*`
- This indicates file_search was used

**If you see**:
- ✅ Indicator text → File search WAS used
- ❌ No indicator text → File search was NOT used

---

## 🧪 Test Prompts to Verify

### Test 1: Explicit Documentation Question

**Prompt**: "What is the MCP server URL?"

**Expected Behavior**:
- ✅ Console shows: `FILE_SEARCH TOOL WAS CALLED`
- ✅ UI shows tool component with "file_search"
- ✅ Response includes indicator: `*[Information retrieved from documentation via file_search]*`
- ✅ Response includes correct URL: `https://mcp-draft-pool.moodmnky.com/mcp`

**If NOT Working**:
- ❌ Console shows: `FILE_SEARCH TOOL WAS NOT CALLED`
- ❌ No tool component in UI
- ❌ Generic response or incorrect URL

### Test 2: Specific Documentation Query

**Prompt**: "Search the documentation for MCP server configuration details"

**Expected Behavior**:
- ✅ File search is called
- ✅ Tool results show document excerpts
- ✅ Response includes specific configuration details

---

## 📊 Comparison: System Prompt vs File Search

### System Prompt Response (No File Search)

**Characteristics**:
- ❌ No tool call in console logs
- ❌ No tool component in UI
- ❌ Generic information
- ❌ May say "I can't provide" or "check the website"
- ❌ No indicator text

**Example**:
```
I'm sorry, but I can't provide the MCP server URL directly...
```

### File Search Response (Using Vector Store)

**Characteristics**:
- ✅ Tool call logged: `FILE_SEARCH TOOL WAS CALLED`
- ✅ Tool component visible in UI
- ✅ Specific information from documentation
- ✅ Includes indicator: `*[Information retrieved from documentation via file_search]*`
- ✅ Accurate details

**Example**:
```
The MCP server URL is https://mcp-draft-pool.moodmnky.com/mcp

*[Information retrieved from documentation via file_search]*
```

---

## 🔧 Debugging Steps

### Step 1: Check Environment Variables

```bash
# Verify vector store is configured
echo $OPENAI_VECTOR_STORE_ID
# Should show: vs_696dca10ada081919c5fe9b2d0a1047e

# Verify Responses API is enabled (if needed)
echo $ENABLE_RESPONSES_API
# Should show: true (if enabled)
```

### Step 2: Check Console Logs

**Look for**:
1. `[General Assistant] Using Responses API:` - Should show `hasFileSearch: true`
2. `[General Assistant] ✅ FILE_SEARCH TOOL WAS CALLED:` - Confirms tool was used
3. `[convertResponsesAPIToUIMessage] ✅ FILE_SEARCH was used` - Confirms in response

### Step 3: Check UI

**Look for**:
- Tool component with "file_search" name
- Expandable tool input/output
- Tool results showing document excerpts

### Step 4: Check Response Content

**Look for**:
- Indicator text at end: `*[Information retrieved from documentation via file_search]*`
- Specific information matching your documentation
- Correct URLs and details

---

## ⚠️ Common Issues

### Issue 1: File Search Not Being Called

**Symptoms**:
- No tool call logs
- No tool component in UI
- Generic responses

**Possible Causes**:
1. Responses API not enabled
2. Vector store not configured
3. System prompt not instructing to use file_search
4. Question not triggering file_search

**Solutions**:
1. Check `ENABLE_RESPONSES_API` or `ENABLE_RESPONSES_API_PUBLIC` env vars
2. Verify `OPENAI_VECTOR_STORE_ID` is set
3. Check system prompt includes file_search instructions
4. Try more explicit prompts ("Search documentation for...")

### Issue 2: File Search Called But Wrong Results

**Symptoms**:
- Tool call logged
- Tool component shows
- But incorrect information returned

**Possible Causes**:
1. Wrong documentation in vector store
2. Outdated files
3. Vector store not indexed correctly

**Solutions**:
1. Check files in vector store (OpenAI Dashboard)
2. Update files with correct information
3. Re-index vector store

---

## 📝 Quick Verification Checklist

- [ ] Console shows `hasFileSearch: true`
- [ ] Console shows `FILE_SEARCH TOOL WAS CALLED`
- [ ] UI shows tool component with "file_search"
- [ ] Response includes indicator text
- [ ] Response includes correct, specific information
- [ ] Response matches documentation content

---

## 🎯 Best Test Prompt

**Recommended prompt**:
```
"Search the documentation for the MCP server URL and configuration details"
```

**Why**:
- Explicitly asks to search documentation
- Should trigger file_search tool
- Easy to verify results

**Expected Result**:
- ✅ Tool call logged
- ✅ Tool component visible
- ✅ Correct URL returned
- ✅ Configuration details included

---

**Last Updated**: January 18, 2026  
**Status**: ✅ **VERIFICATION GUIDE COMPLETE**
