# MCP Knowledge Base Usage Examples

**Purpose**: Practical examples of how AI assistants can use the knowledge base via MCP resources.

---

## Example 1: List All Available Documents

**Use Case**: AI assistant wants to see what documentation is available.

**MCP Call**:
```typescript
const resources = await mcpClient.listResources();
const kbIndex = resources.find(r => r.uri === 'knowledge-base://index');
const index = await mcpClient.readResource(kbIndex.uri);
```

**Response**:
```json
{
  "totalFiles": 18,
  "categories": [
    "league-overview",
    "rules-governance",
    "draft-system",
    "teams",
    "battle-system",
    "seasons",
    "data-structures",
    "app-integration"
  ],
  "files": [
    {
      "uri": "knowledge-base://file/league-overview/01-league-structure",
      "title": "01-league-structure",
      "category": "league-overview",
      "path": "league-overview/01-league-structure.md"
    },
    // ... more files
  ]
}
```

---

## Example 2: Access Draft Board Documentation

**Use Case**: AI assistant needs information about draft board structure.

**MCP Call**:
```typescript
const doc = await mcpClient.readResource(
  'knowledge-base://file/draft-system/01-draft-board-structure'
);
```

**Response**: Complete markdown content of the draft board structure documentation.

---

## Example 3: Get Team Data

**Use Case**: AI assistant needs current team information.

**MCP Call**:
```typescript
const teamsData = await mcpClient.readResource(
  'knowledge-base://data/google-sheets/teamsPages'
);
```

**Response**: JSON data with all 20 teams, including names, coaches, and rosters.

---

## Example 4: Access League Rules

**Use Case**: AI assistant needs to reference league rules.

**MCP Call**:
```typescript
const rules = await mcpClient.readResource(
  'knowledge-base://file/rules-governance/01-complete-rules'
);
```

**Response**: Complete league rules documentation.

---

## Example 5: Get Current Standings

**Use Case**: AI assistant needs current season standings.

**MCP Call**:
```typescript
const standings = await mcpClient.readResource(
  'knowledge-base://data/google-sheets/standings'
);
```

**Response**: Current standings data from Google Sheets extraction.

---

## Example 6: Browse Category

**Use Case**: AI assistant wants to see all draft system documentation.

**MCP Call**:
```typescript
const category = await mcpClient.readResource(
  'knowledge-base://category/draft-system'
);
```

**Response**:
```json
{
  "category": "draft-system",
  "fileCount": 2,
  "files": [
    {
      "uri": "knowledge-base://file/draft-system/01-draft-board-structure",
      "title": "01-draft-board-structure",
      "path": "draft-system/01-draft-board-structure.md"
    },
    {
      "uri": "knowledge-base://file/draft-system/02-draft-board-data",
      "title": "02-draft-board-data",
      "path": "draft-system/02-draft-board-data.md"
    }
  ]
}
```

---

## Example 7: Get Extraction Summary

**Use Case**: AI assistant wants to know what data was extracted.

**MCP Call**:
```typescript
const summary = await mcpClient.readResource(
  'knowledge-base://data/extraction-summary'
);
```

**Response**: Summary of Google Sheets extraction including statistics.

---

## Example 8: Access Knowledge Base Overview

**Use Case**: AI assistant wants to understand the knowledge base structure.

**MCP Call**:
```typescript
const readme = await mcpClient.readResource(
  'knowledge-base://readme'
);
```

**Response**: Complete README with knowledge base overview and structure.

---

## Integration Pattern

### Pattern: Context-Aware Responses

```typescript
// AI Assistant workflow
async function answerLeagueQuestion(question: string) {
  // 1. Search knowledge base index
  const index = await mcpClient.readResource('knowledge-base://index');
  
  // 2. Identify relevant documents
  const relevantDocs = identifyRelevantDocs(question, index);
  
  // 3. Load relevant documentation
  const docs = await Promise.all(
    relevantDocs.map(uri => mcpClient.readResource(uri))
  );
  
  // 4. Use documentation as context
  const answer = await generateAnswer(question, docs);
  
  return answer;
}
```

---

## Benefits

### For AI Assistants

- **Structured Access**: Query specific league information
- **Context-Aware**: Access relevant documentation during conversations
- **Up-to-Date**: Real-time access to current league data
- **Comprehensive**: All knowledge base content available

### For Users

- **Accurate Answers**: AI has access to complete league information
- **Consistent**: Same information source for all queries
- **Current**: Always uses latest extracted data
- **Detailed**: Can access comprehensive documentation

---

## External Use Examples

### REST API Usage

**Example**: Get available Pokémon via REST API

```bash
curl -X POST https://mcp-draft-pool.moodmnky.com/api/get_available_pokemon \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"limit": 10}'
```

**Response**:
```json
{
  "pokemon": [
    {
      "pokemon_name": "Pikachu",
      "point_value": 15,
      "generation": 1,
      "available": true
    }
  ],
  "count": 1
}
```

### OpenAPI Integration

**Example**: Discover available endpoints

```bash
curl https://mcp-draft-pool.moodmnky.com/openapi.json | jq '.paths | keys'
```

**Result**: List of all 9 available REST API endpoints

### OpenAI SDK Integration

**Example**: Get functions for OpenAI agent

```python
import requests

response = requests.get(
    "https://mcp-draft-pool.moodmnky.com/functions",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
functions = response.json()["tools"]
# Use functions with OpenAI SDK
```

---

**Status**: ✅ **IMPLEMENTED AND PRODUCTION READY WITH PHASE 3 OPTIMIZATIONS**  
**Server Version**: 1.0.1  
**Phase 3 Features**: Caching, Rate Limiting, Logging, Error Handling, Enhanced Health Checks  
**See**: 
- `MCP-SERVER-COMPLETE-GUIDE.md` - Comprehensive documentation
- `MCP-SERVER-PRODUCTION-GUIDE.md` - Production features guide
- `tools/mcp-servers/draft-pool-server/PHASE-3-COMPLETE.md` - Phase 3 implementation details
