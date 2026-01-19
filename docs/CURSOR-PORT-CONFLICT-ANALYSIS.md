# Cursor Port Conflict Analysis

**Date**: January 19, 2026  
**Issue**: Cursor IDE (Process 52484) is listening on Supabase ports

---

## 🔍 Discovery

**Process**: `Cursor.exe` (PID: 52484)  
**Path**: `C:\Users\Simeon\AppData\Local\Programs\cursor\Cursor.exe`  
**Type**: Cursor IDE utility process (`--utility-sub-type=node.mojom.NodeService`)

---

## 📊 Ports Being Used by Cursor

### Supabase Ports (Blocking Supabase)
- **54320** - Supabase shadow database port
- **54321** - Supabase API port
- **54322** - Supabase database port ⚠️ **BLOCKING**
- **54323** - Supabase Studio port
- **54324** - Supabase Mailpit port
- **54327** - Supabase Analytics port

### Other Ports (Likely Port Forwarding)
- **3001, 3007** - Development servers
- **5000** - Development server
- **5678** - n8n-dev (already running)
- **8000, 8001, 8002** - Various services
- **8080, 8090** - Web servers
- **8443** - HTTPS service
- **9005, 9099** - Other services
- **62269, 62270, 62274, 62276, 63594** - Cursor internal ports

---

## 🎯 Root Cause

Cursor IDE has a **port forwarding/proxy feature** that's reserving ports, including Supabase's default ports. This is likely:
1. **Port forwarding** for remote development
2. **Port proxy** for accessing Docker containers
3. **Port reservation** for future use

---

## ✅ Solutions

### Solution 1: Disable Cursor Port Forwarding (Recommended)

1. **Open Cursor Settings**:
   - `Ctrl+,` or `File → Preferences → Settings`

2. **Search for "port forwarding"** or **"ports"**

3. **Disable port forwarding** or **exclude Supabase ports**:
   - Look for: `Remote: Port Forwarding`
   - Or: `Port Forwarding: Auto Forward Ports`
   - Set to `false` or exclude ports `54320-54327`

4. **Restart Cursor**

### Solution 2: Change Supabase Ports

Modify `supabase/config.toml` to use different ports:

```toml
[db]
port = 54330  # Change from 54322
shadow_port = 54331  # Change from 54320

[api]
port = 54332  # Change from 54321

[studio]
port = 54333  # Change from 54323

[inbucket]
port = 54334  # Change from 54324

[analytics]
port = 54335  # Change from 54327
```

### Solution 3: Kill Cursor Port Forwarding Process

⚠️ **Warning**: This might affect Cursor's functionality

```powershell
# Kill only the utility process (not main Cursor)
# Note: Cursor will likely restart it, so this is temporary
Stop-Process -Id 52484 -Force
```

### Solution 4: Configure Cursor to Exclude Supabase Ports

If Cursor has port exclusion settings:
- Add ports `54320-54327` to exclusion list
- Or configure Cursor to only forward specific ports

---

## 🔍 Why This Happens

Cursor IDE (based on VS Code) has port forwarding capabilities for:
- **Remote development** (SSH, containers, WSL)
- **Port proxying** for accessing services
- **Auto-discovery** of services

When Cursor detects or expects services on certain ports, it may reserve them proactively.

---

## 📋 Recommended Action Plan

1. **First**: Check Cursor Settings → Port Forwarding
2. **Disable auto port forwarding** or **exclude Supabase ports**
3. **Restart Cursor**
4. **Try starting Supabase**: `supabase start`

If that doesn't work:
- **Change Supabase ports** in `config.toml` to unused ports
- **Or** kill the Cursor utility process (temporary fix)

---

## 🔗 Cursor Settings Location

Cursor settings are typically stored in:
- **Windows**: `%APPDATA%\Cursor\User\settings.json`
- **Or**: `C:\Users\Simeon\AppData\Roaming\Cursor\User\settings.json`

Look for settings like:
```json
{
  "remote.portsAttributes": {},
  "remote.autoForwardPorts": false,
  "remote.portsAutoForward": false
}
```

---

**Last Updated**: January 19, 2026  
**Status**: 🔍 **CURSOR PORT CONFLICT IDENTIFIED** - Disable port forwarding recommended
