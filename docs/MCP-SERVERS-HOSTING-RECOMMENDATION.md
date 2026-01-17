# MCP Servers Hosting Recommendation

**Date**: January 17, 2026  
**Status**: ✅ **RECOMMENDED APPROACH**

---

## 🎯 Recommendation: Host as HTTP Endpoints

**Yes, you should host these MCP servers on your server as HTTP endpoints**, similar to your draft pool MCP server.

---

## ✅ Benefits of HTTP-Based Hosting

### 1. **Serverless Compatibility**
- ✅ Works with Vercel/serverless environments
- ✅ No Docker container startup overhead
- ✅ Better performance (no subprocess spawning)
- ✅ Connection pooling and reuse

### 2. **Public Accessibility**
- ✅ Accessible via Cloudflare Tunnel (like draft pool MCP)
- ✅ Can be used by multiple clients simultaneously
- ✅ Better for production deployments

### 3. **Consistency**
- ✅ Same architecture as draft pool MCP
- ✅ Unified deployment and monitoring
- ✅ Easier to manage and scale

### 4. **Performance**
- ✅ No Docker command execution overhead
- ✅ Persistent connections
- ✅ Better error handling and retries

---

## 📋 Current Setup (Draft Pool MCP)

**Server**: `moodmnky@10.3.0.119`  
**Location**: `/home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server/`  
**Port**: `3001:3000` (external:internal)  
**Cloudflare Tunnel**: `https://mcp-draft-pool.moodmnky.com/mcp`  
**Transport**: Streamable HTTP  
**Docker Service**: `draft-pool-mcp-server` in `docker-compose.yml`

---

## 🏗️ Proposed Architecture

### Option 1: Individual HTTP MCP Servers (Recommended)

Create separate HTTP MCP servers for each service:

1. **Sequential Thinking MCP** → `https://mcp-sequential.moodmnky.com/mcp` (Port 3002)
2. **Brave Search MCP** → `https://mcp-brave.moodmnky.com/mcp` (Port 3003)
3. **Tavily MCP** → `https://mcp-tavily.moodmnky.com/mcp` (Port 3004)
4. **Firecrawl MCP** → `https://mcp-firecrawl.moodmnky.com/mcp` (Port 3005)
5. **Fetch MCP** → `https://mcp-fetch.moodmnky.com/mcp` (Port 3006)

**Pros**:
- ✅ Independent scaling
- ✅ Individual health checks
- ✅ Easier debugging
- ✅ Can update one without affecting others

**Cons**:
- ⚠️ More services to manage
- ⚠️ More Cloudflare Tunnel routes

---

### Option 2: Unified Research MCP Server (Alternative)

Create a single HTTP MCP server that combines all research tools:

**Research Tools MCP** → `https://mcp-research.moodmnky.com/mcp` (Port 3002)

**Pros**:
- ✅ Single service to manage
- ✅ Unified API
- ✅ Easier deployment
- ✅ Can use existing solutions like `mcp-omnisearch`

**Cons**:
- ⚠️ All tools tied together
- ⚠️ Harder to scale individually

---

## 🚀 Implementation Plan

### Phase 1: Use Existing Solutions (Fastest)

**For Firecrawl**: Use Firecrawl's native HTTP MCP server

```bash
# Firecrawl has built-in HTTP MCP support
# Can be self-hosted or use their cloud endpoint
```

**For Search Tools**: Use `mcp-omnisearch` (combines Brave, Tavily, etc.)

```bash
# GitHub: spences10/mcp-omnisearch
# Supports HTTP transport
# Combines multiple search providers
```

**For Sequential Thinking**: Create simple HTTP wrapper

```bash
# Wrap the Docker stdio server in HTTP
# Or use existing HTTP-based reasoning server
```

---

### Phase 2: Custom HTTP MCP Servers (If Needed)

If existing solutions don't meet requirements, create custom HTTP MCP servers following the draft pool MCP pattern:

**Structure**:
```
/home/moodmnky/POKE-MNKY/tools/mcp-servers/
├── draft-pool-server/          # ✅ Existing
├── sequential-thinking-server/ # 🆕 New
├── brave-search-server/        # 🆕 New
├── tavily-server/             # 🆕 New
├── firecrawl-server/          # 🆕 New (or use Firecrawl's native)
└── fetch-server/              # 🆕 New
```

**Each server**:
- Express.js HTTP server
- Streamable HTTP transport
- MCP SDK integration
- Docker containerization
- Cloudflare Tunnel exposure

---

## 📝 Docker Compose Configuration

### Example: Sequential Thinking MCP Server

```yaml
# docker-compose.yml
services:
  sequential-thinking-mcp-server:
    build: ./tools/mcp-servers/sequential-thinking-server
    container_name: poke-mnky-sequential-thinking-mcp-server
    ports:
      - "3002:3000"
    environment:
      - PORT=3000
    networks:
      - poke-mnky-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

### Cloudflare Tunnel Routes

Add to Cloudflare Tunnel configuration:

```
mcp-sequential.moodmnky.com → 10.3.0.119:3002
mcp-brave.moodmnky.com → 10.3.0.119:3003
mcp-tavily.moodmnky.com → 10.3.0.119:3004
mcp-firecrawl.moodmnky.com → 10.3.0.119:3005
mcp-fetch.moodmnky.com → 10.3.0.119:3006
```

---

## 🔄 Updated Agent Configuration

Once HTTP endpoints are available, update `lib/agents/mcp-servers.ts`:

```typescript
// HTTP-based MCP Servers (Streamable HTTP)
export const sequentialThinkingMCP = new MCPServerStreamableHttp({
  url: process.env.MCP_SEQUENTIAL_THINKING_URL || 'https://mcp-sequential.moodmnky.com/mcp',
  name: 'sequential-thinking',
  cacheToolsList: true,
})

export const braveSearchMCP = new MCPServerStreamableHttp({
  url: process.env.MCP_BRAVE_SEARCH_URL || 'https://mcp-brave.moodmnky.com/mcp',
  name: 'brave-search',
  cacheToolsList: true,
})

// ... etc
```

---

## 📊 Comparison: Stdio vs HTTP

| Aspect | Stdio (Current) | HTTP (Recommended) |
|--------|----------------|-------------------|
| **Serverless** | ❌ Doesn't work | ✅ Works perfectly |
| **Performance** | ⚠️ Container startup overhead | ✅ Persistent connections |
| **Scalability** | ⚠️ Limited | ✅ Excellent |
| **Public Access** | ❌ Local only | ✅ Cloudflare Tunnel |
| **Error Handling** | ⚠️ Basic | ✅ Advanced retries |
| **Monitoring** | ⚠️ Difficult | ✅ Health checks, logs |

---

## 🎯 Recommended Approach

### Step 1: Use Existing Solutions (Week 1)

1. **Firecrawl**: Use their native HTTP MCP endpoint
   - Self-hosted or cloud
   - Already supports HTTP/Streamable HTTP

2. **Search Tools**: Deploy `mcp-omnisearch`
   - Combines Brave, Tavily, and more
   - HTTP transport support
   - Single service for all search tools

3. **Sequential Thinking**: Create simple HTTP wrapper
   - Wrap existing Docker stdio server
   - Or use HTTP-based reasoning service

### Step 2: Custom Servers (If Needed) (Week 2-3)

If existing solutions don't meet requirements:
- Follow draft pool MCP pattern
- Create HTTP MCP servers for each tool
- Deploy via Docker Compose
- Expose via Cloudflare Tunnel

---

## 🔧 Environment Variables

Add to `.env` and `.env.local`:

```bash
# MCP Server URLs (HTTP-based)
MCP_SEQUENTIAL_THINKING_URL=https://mcp-sequential.moodmnky.com/mcp
MCP_BRAVE_SEARCH_URL=https://mcp-brave.moodmnky.com/mcp
MCP_TAVILY_URL=https://mcp-tavily.moodmnky.com/mcp
MCP_FIRECRAWL_URL=https://mcp-firecrawl.moodmnky.com/mcp
MCP_FETCH_URL=https://mcp-fetch.moodmnky.com/mcp

# Or unified research server:
MCP_RESEARCH_TOOLS_URL=https://mcp-research.moodmnky.com/mcp
```

---

## ✅ Next Steps

1. **Decide on approach**: Individual servers vs unified research server
2. **Research existing solutions**: Check `mcp-omnisearch`, Firecrawl HTTP MCP
3. **Create implementation plan**: Based on chosen approach
4. **Deploy to server**: Follow draft pool MCP pattern
5. **Update agent configuration**: Switch from stdio to HTTP
6. **Test and verify**: Ensure all tools work via HTTP

---

## 📚 Resources

- **Draft Pool MCP**: `/home/moodmnky/POKE-MNKY/tools/mcp-servers/draft-pool-server/`
- **Firecrawl MCP Docs**: https://docs.firecrawl.dev/mcp-server
- **MCP Omnisearch**: https://github.com/spences10/mcp-omnisearch
- **Cloudflare Tunnel**: Already configured for draft pool MCP

---

**Recommendation**: Start with existing solutions (`mcp-omnisearch` for search, Firecrawl's native HTTP for scraping), then create custom servers only if needed. This will be faster and more maintainable.
