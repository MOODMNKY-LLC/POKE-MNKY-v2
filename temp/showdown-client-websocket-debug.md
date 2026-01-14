# Showdown Client WebSocket Connection Debug

**Date**: January 15, 2026  
**Issue**: Client stuck at "Loading client..." - WebSocket connection failing

---

## 🔍 Problem Identified

The Pokémon Showdown client at `https://play.moodmnky.com/` is stuck at the "Loading client..." stage. This indicates:

1. ✅ **HTML loads successfully** (page renders)
2. ✅ **Libraries load** ("Loading libraries... DONE")
3. ✅ **Data loads** ("Loading data... DONE")
4. ❌ **WebSocket connection fails** ("Loading client..." - stuck here)

---

## 🎯 Root Cause

The Pokémon Showdown client JavaScript needs to know **which server to connect to** via WebSocket. By default, it tries to connect to:
- Official server: `wss://sim3.psim.us/showdown/websocket`
- Or: `wss://play.pokemonshowdown.com/showdown/websocket`

Your client needs to be configured to connect to:
- **Your server**: `wss://showdown.moodmnky.com/showdown/websocket`

---

## 🔧 Solution

### Option 1: Configure Client Build (Recommended)

The Pokémon Showdown client needs to be built with the correct server configuration.

**Steps:**

1. **Clone/Checkout the client repository**:
   ```bash
   git clone https://github.com/smogon/pokemon-showdown-client.git
   cd pokemon-showdown-client
   ```

2. **Configure the server URL**:
   
   The client uses a config file to determine the server. Look for:
   - `config/config.js` or
   - `config/config.ts` or
   - Environment variable: `PS_SERVER`

   **Set the server URL**:
   ```javascript
   // config/config.js
   exports.Config = {
     server: {
       host: 'showdown.moodmnky.com',
       port: 443,
       protocol: 'https'
     },
     // Or use WebSocket URL directly:
     websocket: 'wss://showdown.moodmnky.com/showdown/websocket'
   };
   ```

3. **Rebuild the client**:
   ```bash
   npm install
   npm run build
   ```

4. **Deploy the built files** to your nginx container serving `play.moodmnky.com`

---

### Option 2: Runtime Configuration via URL Parameter

Some Showdown client builds support server configuration via URL parameter:

```
https://play.moodmnky.com/?server=showdown.moodmnky.com
```

Or via query string:
```
https://play.moodmnky.com/?server=wss://showdown.moodmnky.com/showdown/websocket
```

**Check if your client build supports this** by inspecting the client JavaScript.

---

### Option 3: Environment Variable (If Using Docker)

If you're building the client in Docker, set environment variables:

```dockerfile
# Dockerfile
ENV PS_SERVER=showdown.moodmnky.com
ENV PS_PORT=443
ENV PS_PROTOCOL=https
```

Or in `docker-compose.yml`:
```yaml
pokemon-showdown-client:
  build:
    context: ./showdown-client
  environment:
    - PS_SERVER=showdown.moodmnky.com
    - PS_PORT=443
    - PS_PROTOCOL=https
```

---

## 🔍 Debugging Steps

### 1. Check Browser Console

Open browser DevTools (F12) and check:

**Console Tab:**
- Look for WebSocket connection errors
- Check for CORS errors
- Look for "Failed to connect" messages

**Network Tab:**
- Filter by "WS" (WebSocket)
- Check if WebSocket connection attempts are being made
- See what URL it's trying to connect to
- Check response codes (should be 101 Switching Protocols)

### 2. Verify Server WebSocket Endpoint

Test if your server's WebSocket endpoint is accessible:

```bash
# Test WebSocket connection
wscat -c wss://showdown.moodmnky.com/showdown/websocket

# Or use curl (if supported)
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://showdown.moodmnky.com/showdown/websocket
```

### 3. Check Cloudflare Tunnel Configuration

Ensure your Cloudflare Tunnel is configured to handle WebSocket upgrades:

**`cloudflare-tunnel-config.yml`:**
```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: showdown.moodmnky.com
    service: http://pokemon-showdown:8000
    originRequest:
      # Enable WebSocket support
      noHappyEyeballs: false
      keepAliveConnections: 10
      keepAliveTimeout: 90s
  - hostname: play.moodmnky.com
    service: http://pokemon-showdown-client:80
  - service: http_status:404
```

**Important**: Cloudflare Tunnel should automatically handle WebSocket upgrades, but verify the configuration.

### 4. Check Server Logs

Check your Showdown server logs for connection attempts:

```bash
# If using Docker
docker logs pokemon-showdown

# Look for:
# - WebSocket connection attempts
# - Connection errors
# - Authentication failures
```

---

## 🎯 Expected WebSocket URL Format

Pokémon Showdown uses this WebSocket URL pattern:

```
wss://showdown.moodmnky.com/showdown/websocket
```

Where:
- `wss://` = Secure WebSocket (use `ws://` for non-HTTPS)
- `showdown.moodmnky.com` = Your server hostname
- `/showdown/websocket` = Standard Showdown WebSocket path

---

## 📋 Checklist

- [ ] Client configured with correct server URL
- [ ] Client rebuilt with new configuration
- [ ] WebSocket endpoint accessible (`wss://showdown.moodmnky.com/showdown/websocket`)
- [ ] Cloudflare Tunnel configured for WebSocket
- [ ] Server running and accepting WebSocket connections
- [ ] Browser console checked for errors
- [ ] Network tab shows WebSocket connection attempts

---

## 🐛 Common Issues

### Issue 1: Client Still Connecting to Official Server

**Symptom**: Browser console shows connection attempts to `play.pokemonshowdown.com`

**Solution**: Client wasn't rebuilt with new config, or config file not found during build

### Issue 2: WebSocket Connection Refused

**Symptom**: Browser console shows "WebSocket connection failed" or "Connection refused"

**Solution**: 
- Verify server is running
- Check Cloudflare Tunnel is routing WebSocket correctly
- Verify firewall/security group allows WebSocket connections

### Issue 3: CORS Errors

**Symptom**: Browser console shows CORS errors

**Solution**: WebSocket connections don't use CORS, but check server CORS config for HTTP requests

### Issue 4: Mixed Content (HTTP/HTTPS)

**Symptom**: Browser blocks WebSocket connection due to mixed content

**Solution**: Ensure both client (`play.moodmnky.com`) and server (`showdown.moodmnky.com`) use HTTPS

---

## 🔗 References

- [Pokémon Showdown Client Repository](https://github.com/smogon/pokemon-showdown-client)
- [Pokémon Showdown Server Repository](https://github.com/smogon/pokemon-showdown)
- [Cloudflare Tunnel WebSocket Support](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configuration/configuration-file/ingress/#websocket)

---

**Next Steps**: Configure the client build with the correct server URL and redeploy.
