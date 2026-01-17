# Draft Pool MCP - Docker Local Setup

**Date**: January 17, 2026  
**Status**: ✅ **CONFIGURED**

---

## Configuration Complete

The Draft Pool MCP server has been configured to run locally using Docker with your local Supabase credentials.

### Current Configuration

```json
{
  "poke-mnky-draft-pool": {
    "command": "docker",
    "args": [
      "run",
      "-i",
      "--rm",
      "--network",
      "host",
      "-e",
      "SUPABASE_URL=http://127.0.0.1:54321",
      "-e",
      "SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
      "poke-mnky-draft-pool-mcp-server:latest"
    ]
  }
}
```

### Supabase Credentials Used

- **URL**: `http://127.0.0.1:54321` (Local Supabase)
- **Service Role Key**: `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz` (From `supabase status`)

---

## Next Steps: Get Docker Image

The Docker image `poke-mnky-draft-pool-mcp-server:latest` needs to be available locally. You have two options:

### Option 1: Export from Remote Server (Recommended)

**On Remote Server:**
```bash
ssh moodmnky@10.3.0.119
docker save poke-mnky-draft-pool-mcp-server:latest | gzip > /tmp/draft-pool-mcp.tar.gz
```

**On Local Machine:**
```bash
# Copy image from server
scp moodmnky@10.3.0.119:/tmp/draft-pool-mcp.tar.gz .

# Import image
docker load < draft-pool-mcp.tar.gz

# Verify
docker images | grep draft-pool-mcp
```

### Option 2: Build Locally

If you have the source code locally:

```bash
cd tools/mcp-servers/draft-pool-server
docker build -t poke-mnky-draft-pool-mcp-server:latest .
```

---

## Verify Setup

After getting the Docker image:

1. **Restart Cursor** to load the new MCP configuration
2. **Verify MCP Server**: Check if Draft Pool MCP tools are available
3. **Test Connection**: Try using the MCP tools

---

## Configuration Details

### Why `--network host`?

The `--network host` flag allows the Docker container to access `127.0.0.1:54321` (your local Supabase) directly. Without it, the container would need to use `host.docker.internal` or the host's IP address.

### Environment Variables

- `SUPABASE_URL`: Points to your local Supabase instance
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

---

## Troubleshooting

### Issue: Docker image not found

**Solution**: Export from server or build locally (see options above)

### Issue: Cannot connect to Supabase

**Solution**: 
- Ensure Supabase is running: `supabase status`
- Verify URL is correct: `http://127.0.0.1:54321`
- Check Docker network: Try `--network host` or use `host.docker.internal`

### Issue: MCP tools not appearing

**Solution**:
- Restart Cursor completely
- Check Docker is running
- Verify image exists: `docker images | grep draft-pool-mcp`

---

**Status**: ✅ Configuration complete, awaiting Docker image
