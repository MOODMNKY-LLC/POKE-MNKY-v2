# File Search Fix - System Prompt Updates

**Date**: January 18, 2026  
**Issue**: Assistant not using file_search tool for documentation questions  
**Status**: ✅ **FIXED**

---

## 🐛 Problem

The assistant was responding with generic messages like:
> "I'm sorry, but I can't provide the MCP server URL directly. To access the Average at Best Battle League's specific resources, please check their official website..."

Instead of using the `file_search` tool to find the answer in the vector store.

---

## ✅ Solution

### 1. Updated System Prompts

**Both public and authenticated system prompts now explicitly instruct**:

```
CRITICAL INSTRUCTIONS FOR FILE_SEARCH:
- When users ask about MCP server, configuration, setup, tools, endpoints, or any technical documentation → ALWAYS use file_search tool FIRST
- When users ask "What is the MCP server URL?" → Use file_search to find the answer
- When users ask about tools, endpoints, authentication, or configuration → Use file_search to find the answer
- The file_search tool searches a vector store containing MCP server documentation and other technical docs
- ALWAYS use file_search before providing generic responses about technical topics
- If file_search returns results, use that information to answer the question accurately
- Never say "I can't provide" or "check the website" if file_search tool is available - USE IT
```

### 2. Auto-Enable Responses API When Vector Store Configured

**Updated logic**:
```typescript
// Enable Responses API if vector store is configured (needed for file_search)
const shouldUseResponsesAPI = useResponsesAPI || 
  process.env.ENABLE_RESPONSES_API === 'true' ||
  (!isAuthenticated && process.env.ENABLE_RESPONSES_API_PUBLIC === 'true') ||
  !!vectorStoreId // ✅ Auto-enable if vector store configured
```

**Why**: If `OPENAI_VECTOR_STORE_ID` is set, Responses API is automatically enabled so `file_search` is available.

---

## 🧪 Testing

### Test Prompt

**Ask**: "What is the MCP server URL?"

### Expected Behavior

**Before Fix**:
```
I'm sorry, but I can't provide the MCP server URL directly...
```

**After Fix**:
```
The MCP server URL is https://mcp-draft-pool.moodmnky.com/mcp

[Tool call: file_search]
[Tool result: Found in documentation...]
```

### Verification Steps

1. **Check Console Logs**:
   ```
   [General Assistant] Using Responses API: {
     ...
     hasFileSearch: true,
     vectorStoreId: 'configured'
   }
   ```

2. **Check Tool Calls**:
   - Response should show `file_search` tool was called
   - Tool result should include document excerpts

3. **Check Response**:
   - Should include specific MCP server URL
   - Should reference the documentation
   - Should NOT say "I can't provide" or "check the website"

---

## 📋 Additional Test Prompts

Try these prompts to verify file_search is working:

1. **"What is the MCP server URL?"**
   - Expected: `https://mcp-draft-pool.moodmnky.com/mcp`

2. **"What tools are available in the MCP server?"**
   - Expected: List of 9 tools

3. **"How do I authenticate with the MCP server?"**
   - Expected: Authentication method details

4. **"What are the MCP server endpoints?"**
   - Expected: REST API, MCP endpoint, OpenAPI spec URLs

5. **"Search the documentation for MCP server information"**
   - Expected: Comprehensive MCP server details

---

## 🔧 Configuration

### Required Environment Variables

```bash
# Vector Store ID (enables file_search automatically)
OPENAI_VECTOR_STORE_ID=vs_696dca10ada081919c5fe9b2d0a1047e

# Optional: Explicitly enable Responses API
ENABLE_RESPONSES_API=true
# OR for public users only:
ENABLE_RESPONSES_API_PUBLIC=true
```

### Auto-Enable Logic

**If `OPENAI_VECTOR_STORE_ID` is set**:
- ✅ Responses API is automatically enabled
- ✅ `file_search` tool is available
- ✅ No need to set `ENABLE_RESPONSES_API` separately

---

## ✅ Status

**Fix Applied**: ✅ **COMPLETE**  
**Testing**: ⏳ **PENDING** - Test with prompts above

---

**Last Updated**: January 18, 2026  
**Next**: Test with "What is the MCP server URL?" prompt
