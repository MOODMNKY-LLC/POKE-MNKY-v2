# Testing Vector Store File Search

**Date**: January 18, 2026  
**Purpose**: Test prompts to verify file_search tool is correctly using the vector store

---

## 🎯 Test Prompts for MCP Server Documentation

Since there's a file in the vector store with MCP server details, use these prompts to test:

### Basic MCP Server Questions

**Prompt 1**: "What is the MCP server URL?"
- **Expected**: Should return the MCP server URL from the documentation
- **Verification**: Check if response includes `https://mcp-draft-pool.moodmnky.com/mcp`

**Prompt 2**: "How do I configure the MCP server?"
- **Expected**: Should return configuration details from the documentation
- **Verification**: Check if response includes environment variables, setup steps

**Prompt 3**: "What tools are available in the MCP server?"
- **Expected**: Should list the 9 MCP tools (get_available_pokemon, get_draft_status, etc.)
- **Verification**: Check if response includes tool names and descriptions

**Prompt 4**: "Tell me about the draft pool MCP server"
- **Expected**: Should return comprehensive information about the MCP server
- **Verification**: Check if response includes server details, endpoints, authentication

**Prompt 5**: "What are the MCP server endpoints?"
- **Expected**: Should return API endpoints (REST API, MCP endpoint, OpenAPI spec)
- **Verification**: Check if response includes endpoint URLs

### Advanced Questions

**Prompt 6**: "How do I authenticate with the MCP server?"
- **Expected**: Should return authentication methods (API key, OAuth)
- **Verification**: Check if response includes `X-API-Key` or `Authorization: Bearer`

**Prompt 7**: "What is the MCP server's OpenAPI specification?"
- **Expected**: Should return information about the OpenAPI spec endpoint
- **Verification**: Check if response includes `/openapi.json` endpoint

**Prompt 8**: "How do I use the get_available_pokemon tool?"
- **Expected**: Should return usage instructions for that specific tool
- **Verification**: Check if response includes tool parameters, examples

---

## 🔍 How to Verify It's Working

### 1. Check Console Logs

**Look for**:
```
[General Assistant] Using Responses API: {
  ...
  hasFileSearch: true,
  vectorStoreId: 'configured'
}
```

### 2. Check Tool Calls

**In the response, you should see**:
- Tool call to `file_search`
- Tool result with document excerpts
- References to the MCP server documentation

### 3. Check Response Content

**The response should**:
- Include specific details from the documentation
- Reference the MCP server correctly
- Provide accurate information (not generic responses)

---

## 🧪 Step-by-Step Test

### Test 1: Basic File Search

1. **Open chat** (public or authenticated)
2. **Ask**: "What is the MCP server URL?"
3. **Check**:
   - Console logs show `hasFileSearch: true`
   - Response includes MCP server URL
   - Response cites the documentation

### Test 2: Specific Tool Information

1. **Ask**: "What tools are available in the MCP server?"
2. **Check**:
   - Response lists all 9 tools
   - Tool names match actual tools
   - Descriptions are accurate

### Test 3: Configuration Details

1. **Ask**: "How do I configure the MCP server?"
2. **Check**:
   - Response includes environment variables
   - Response includes setup steps
   - Response is specific to your MCP server

---

## 📊 Expected Behavior

### ✅ Working Correctly

**Response includes**:
- Specific information from the documentation
- Accurate details about the MCP server
- References to actual endpoints and tools
- Citations or mentions of the documentation

**Example**:
```
The MCP server is available at https://mcp-draft-pool.moodmnky.com/mcp.

The server provides 9 tools including:
- get_available_pokemon
- get_draft_status
- get_team_budget
...

To authenticate, use the X-API-Key header with your MCP_API_KEY.
```

### ❌ Not Working Correctly

**Response includes**:
- Generic information
- No specific details
- Incorrect or outdated information
- No mention of file_search tool being used

**Example**:
```
MCP servers are tools that can be used with OpenAI...
```

---

## 🔧 Troubleshooting

### Issue: Response doesn't include file_search tool call

**Check**:
1. Is `OPENAI_VECTOR_STORE_ID` set in environment variables?
2. Is Responses API enabled (`useResponsesAPI: true` or `ENABLE_RESPONSES_API_PUBLIC=true`)?
3. Check console logs for `hasFileSearch: true`

### Issue: Response is generic, not from documentation

**Check**:
1. Are files actually in the vector store?
2. Are files processed (`status: "completed"`)?
3. Try more specific prompts
4. Check if file_search tool is being called (check tool calls in response)

### Issue: No response or error

**Check**:
1. Vector store ID is correct
2. Files are uploaded and attached to vector store
3. Files have `status: "completed"`
4. OpenAI API key is valid

---

## 📝 Recommended Test Prompts

### Quick Test (1 prompt)
```
"What is the MCP server URL and what tools does it provide?"
```

### Comprehensive Test (3 prompts)
1. "What is the MCP server URL?"
2. "What tools are available in the MCP server?"
3. "How do I authenticate with the MCP server?"

### Detailed Test (5 prompts)
1. "Tell me about the draft pool MCP server"
2. "What are the MCP server endpoints?"
3. "How do I use the get_available_pokemon tool?"
4. "What is the MCP server's authentication method?"
5. "What is the OpenAPI specification endpoint?"

---

## 🎯 Best Test Prompt

**Recommended prompt for testing**:
```
"Search the documentation for information about the MCP server. What is the server URL, what tools are available, and how do I authenticate?"
```

**Why this works**:
- Explicitly asks to search documentation
- Asks for multiple specific details
- Easy to verify accuracy
- Tests file_search comprehensively

---

## ✅ Success Criteria

The file_search is working correctly if:

1. ✅ Console logs show `hasFileSearch: true`
2. ✅ Response includes specific MCP server details
3. ✅ Response matches information in the documentation
4. ✅ Response cites or references the documentation
5. ✅ Tool calls show `file_search` was used

---

**Last Updated**: January 18, 2026  
**Status**: 📋 **TESTING GUIDE READY**
