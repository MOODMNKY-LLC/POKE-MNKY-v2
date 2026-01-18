# MCP Server Integration Guide - Knowledge Base as Resources

**Purpose**: Guide for exposing the AAB Battle League knowledge base as MCP (Model Context Protocol) resources for AI assistants.

**Last Updated**: January 18, 2026  
**Server Version**: 1.0.1  
**Status**: ✅ Production Ready with External Use Optimization

---

## Overview

The knowledge base can be exposed as MCP resources, allowing AI assistants to query and retrieve specific league information programmatically. This enables:

- **Context-Aware Responses**: AI can access league-specific information
- **Structured Queries**: Search and retrieve specific documentation sections
- **Real-Time Updates**: Access current league data and standings
- **Comprehensive Coverage**: All knowledge base content available via MCP
- **External Integration**: Open WebUI, OpenAI SDK, and app integration via REST API

### Server Capabilities (v1.0.1)

The MCP server now provides **multiple access methods**:

- ✅ **MCP Protocol** - Native MCP support (Cursor IDE, etc.)
- ✅ **REST API** - Standard HTTP endpoints (`POST /api/{tool_name}`)
- ✅ **OpenAPI Specification** - Auto-generated API docs (`GET /openapi.json`)
- ✅ **OpenAI Function Calling** - SDK-friendly format (`GET /functions`)

**Total Capabilities**: 25
- **9 Tools** - Execute actions and queries
- **3 Prompts** - Reusable workflow templates
- **13 Resources** - Structured data access (6 draft pool + 7 knowledge base)

**Phase 3 Production Features** (v1.0.1):
- ✅ Response caching (in-memory, configurable TTLs)
- ✅ Rate limiting (per-client, configurable limits)
- ✅ Structured logging (JSON/text format)
- ✅ Standardized error handling (consistent error responses)
- ✅ Enhanced health checks (detailed metrics)

---

## MCP Resource Patterns

### Pattern 1: File-Based Resources (Static)

Expose individual knowledge base files as resources:

```typescript
// Register knowledge base file as resource
server.registerResource(
  'knowledge-base://league-overview/structure',
  {
    name: 'League Structure Overview',
    description: 'Complete league structure and organization documentation',
    mimeType: 'text/markdown',
  },
  async () => {
    const content = fs.readFileSync(
      'knowledge-base/aab-battle-league/league-overview/01-league-structure.md',
      'utf8'
    );
    return {
      contents: [{ type: 'text', text: content }],
    };
  }
);
```

### Pattern 2: Dynamic Template Resources

Create parameterized resources for flexible access:

```typescript
// Register dynamic template for any knowledge base file
server.registerResource(
  new ResourceTemplate('knowledge-base://{category}/{file}', {
    name: 'Knowledge Base Document',
    description: 'Access any knowledge base document by category and filename',
  }),
  async (uri, variables) => {
    const { category, file } = variables;
    const path = `knowledge-base/aab-battle-league/${category}/${file}.md`;
    
    if (!fs.existsSync(path)) {
      throw new Error(`Knowledge base file not found: ${path}`);
    }
    
    const content = fs.readFileSync(path, 'utf8');
    return {
      contents: [{ type: 'text', text: content }],
    };
  }
);
```

### Pattern 3: Searchable Resources

Create resources that support semantic search:

```typescript
// Register searchable knowledge base resource
server.registerResource(
  'knowledge-base://search',
  {
    name: 'Knowledge Base Search',
    description: 'Search across all knowledge base content',
    mimeType: 'application/json',
  },
  async (uri, params) => {
    const query = params.query || '';
    
    // Search across all knowledge base files
    const results = await searchKnowledgeBase(query);
    
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);
```

---

## Implementation Approaches

### Approach 1: Extend Existing MCP Server

Add knowledge base resources to the existing `draft-pool-server`:

**File**: `tools/mcp-servers/draft-pool-server/src/knowledge-base-resources.ts`

```typescript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const KB_BASE_PATH = path.resolve(__dirname, '../../../knowledge-base/aab-battle-league');

/**
 * Register all knowledge base resources
 */
export function registerKnowledgeBaseResources(server: McpServer) {
  // Resource 1: List all knowledge base files
  server.registerResource(
    'knowledge-base://index',
    {
      name: 'Knowledge Base Index',
      description: 'List all available knowledge base documents',
      mimeType: 'application/json',
    },
    async () => {
      const files = await glob('**/*.md', { cwd: KB_BASE_PATH });
      const index = files.map(file => ({
        uri: `knowledge-base://file/${file.replace(/\.md$/, '')}`,
        title: path.basename(file, '.md'),
        category: path.dirname(file),
        path: file,
      }));
      
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify({ files: index }, null, 2),
        }],
      };
    }
  );

  // Resource 2: Access any knowledge base file
  server.registerResource(
    new ResourceTemplate('knowledge-base://file/{path}', {
      name: 'Knowledge Base File',
      description: 'Access any knowledge base markdown file',
    }),
    async (uri, variables) => {
      const { path: filePath } = variables;
      const fullPath = path.join(KB_BASE_PATH, `${filePath}.md`);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Knowledge base file not found: ${filePath}`);
      }
      
      const content = fs.readFileSync(fullPath, 'utf8');
      return {
        contents: [{ type: 'text', text: content }],
      };
    }
  );

  // Resource 3: Category-based access
  server.registerResource(
    new ResourceTemplate('knowledge-base://category/{category}', {
      name: 'Knowledge Base Category',
      description: 'List all files in a knowledge base category',
    }),
    async (uri, variables) => {
      const { category } = variables;
      const categoryPath = path.join(KB_BASE_PATH, category);
      
      if (!fs.existsSync(categoryPath)) {
        throw new Error(`Category not found: ${category}`);
      }
      
      const files = await glob('*.md', { cwd: categoryPath });
      const fileList = files.map(file => ({
        uri: `knowledge-base://file/${category}/${file.replace(/\.md$/, '')}`,
        title: path.basename(file, '.md'),
        path: `${category}/${file}`,
      }));
      
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify({ category, files: fileList }, null, 2),
        }],
      };
    }
  );

  // Resource 4: Extracted data access
  server.registerResource(
    'knowledge-base://data/extraction-summary',
    {
      name: 'Extraction Summary',
      description: 'Summary of Google Sheets data extraction',
      mimeType: 'application/json',
    },
    async () => {
      const summaryPath = path.join(KB_BASE_PATH, 'extracted-data/extraction-summary.json');
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      
      return {
        contents: [{
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );
}
```

### Approach 2: Standalone Knowledge Base MCP Server

Create a dedicated MCP server for knowledge base access:

**File**: `tools/mcp-servers/knowledge-base-server/src/index.ts`

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const KB_BASE_PATH = path.resolve(__dirname, '../../../knowledge-base/aab-battle-league');

const server = new McpServer({
  name: 'poke-mnky-knowledge-base',
  version: '1.0.0',
});

// Register all knowledge base resources
// ... (use patterns from Approach 1)

// Express setup for HTTP transport
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    enableJsonResponse: true,
  });
  
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'knowledge-base-mcp' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Knowledge Base MCP Server running on port ${PORT}`);
});
```

---

## Resource URI Patterns

### Recommended URI Structure

```
knowledge-base://{type}/{path}
```

**Types**:
- `file` - Individual markdown files
- `category` - Category listings
- `data` - Extracted data (JSON)
- `search` - Search results

**Examples**:
- `knowledge-base://file/league-overview/01-league-structure`
- `knowledge-base://category/draft-system`
- `knowledge-base://data/extraction-summary`
- `knowledge-base://search?query=draft+board+structure`

---

## Usage Examples

### Example 1: List All Knowledge Base Files

```typescript
// AI Assistant can call:
const resources = await mcpClient.listResources();
const kbIndex = resources.find(r => r.uri === 'knowledge-base://index');
const index = await mcpClient.readResource(kbIndex.uri);
// Returns: List of all knowledge base files
```

### Example 2: Access Specific Document

```typescript
// AI Assistant can call:
const doc = await mcpClient.readResource(
  'knowledge-base://file/draft-system/01-draft-board-structure'
);
// Returns: Complete markdown content of draft board structure doc
```

### Example 3: Search Knowledge Base

```typescript
// AI Assistant can call:
const results = await mcpClient.readResource(
  'knowledge-base://search?query=point+values'
);
// Returns: Search results matching "point values"
```

---

## Integration with Existing MCP Server

### Adding to Draft Pool Server

**File**: `tools/mcp-servers/draft-pool-server/src/shared-registrations.ts`

```typescript
import { registerKnowledgeBaseResources } from './knowledge-base-resources.js';

export function registerAllResources(server: McpServer, supabase: SupabaseClient) {
  // Existing resources...
  registerDraftPoolResources(server, supabase);
  
  // Add knowledge base resources
  registerKnowledgeBaseResources(server);
}
```

---

## Advanced Features

### Feature 1: Semantic Search

Use vector embeddings for semantic search:

```typescript
server.registerResource(
  'knowledge-base://search',
  {
    name: 'Semantic Knowledge Base Search',
    description: 'Search knowledge base using semantic similarity',
  },
  async (uri, params) => {
    const query = params.query;
    const results = await semanticSearch(query, KB_BASE_PATH);
    return {
      contents: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);
```

### Feature 2: Cached Resources

Cache frequently accessed resources:

```typescript
const cache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

server.registerResource(
  new ResourceTemplate('knowledge-base://file/{path}', {
    name: 'Knowledge Base File (Cached)',
  }),
  async (uri, variables) => {
    const { path: filePath } = variables;
    const cacheKey = filePath;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        contents: [{ type: 'text', text: cached.content }],
      };
    }
    
    // Load and cache
    const content = fs.readFileSync(
      path.join(KB_BASE_PATH, `${filePath}.md`),
      'utf8'
    );
    
    cache.set(cacheKey, {
      content,
      timestamp: Date.now(),
    });
    
    return {
      contents: [{ type: 'text', text: content }],
    };
  }
);
```

### Feature 3: Resource Metadata

Include metadata with resources:

```typescript
server.registerResource(
  new ResourceTemplate('knowledge-base://file/{path}', {
    name: 'Knowledge Base File',
  }),
  async (uri, variables) => {
    const { path: filePath } = variables;
    const fullPath = path.join(KB_BASE_PATH, `${filePath}.md`);
    const stats = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    return {
      contents: [{
        type: 'text',
        text: content,
      }],
      metadata: {
        lastModified: stats.mtime.toISOString(),
        size: stats.size,
        category: path.dirname(filePath),
        title: path.basename(filePath, '.md'),
      },
    };
  }
);
```

---

## Configuration

### MCP Configuration File

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "poke-mnky-knowledge-base": {
      "command": "node",
      "args": [
        "tools/mcp-servers/knowledge-base-server/dist/index.js"
      ],
      "env": {
        "PORT": "3002"
      }
    }
  }
}
```

### Docker Compose

Add to `docker-compose.yml`:

```yaml
knowledge-base-mcp-server:
  build:
    context: ./tools/mcp-servers/knowledge-base-server
    dockerfile: Dockerfile
  container_name: poke-mnky-knowledge-base-mcp-server
  restart: unless-stopped
  networks:
    - poke-mnky-network
  ports:
    - "3002:3000"
  volumes:
    - ./knowledge-base:/app/knowledge-base:ro
  environment:
    - PORT=3000
```

---

## Benefits

### For AI Assistants

- **Structured Access**: Query specific league information
- **Context-Aware**: Access relevant documentation during conversations
- **Up-to-Date**: Real-time access to current league data
- **Comprehensive**: All knowledge base content available

### For Development

- **Reusable**: Knowledge base accessible across all MCP clients
- **Maintainable**: Single source of truth for league documentation
- **Extensible**: Easy to add new resources and features
- **Testable**: Resources can be tested independently

---

## Next Steps

1. **Choose Approach**: Extend existing server or create standalone
2. **Implement Resources**: Use patterns above to create resources
3. **Test Integration**: Verify resources work with MCP clients
4. **Document Usage**: Create examples for AI assistants
5. **Deploy**: Add to Docker Compose and deploy

---

**Status**: Ready for Implementation  
**Complexity**: Low-Medium  
**Dependencies**: Existing MCP server infrastructure
