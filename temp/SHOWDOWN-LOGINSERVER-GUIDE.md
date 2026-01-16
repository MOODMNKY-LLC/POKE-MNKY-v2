# Showdown Loginserver Setup Guide

**Date**: January 2026  
**Status**: Optional - Only needed if you want unified authentication

---

## What is the Loginserver?

The Pokémon Showdown loginserver (`smogon/pokemon-showdown-loginserver`) is a **separate service** that handles authentication for Showdown users. It runs **on your server** (not in your Next.js app) and provides:

- User account management for Showdown
- Authentication endpoints (`/action.php` or `/api/[action]`)
- SSO capabilities (if you want unified identity)

---

## Do You Need It?

### ❌ **You DON'T need it if:**
- Users can log into Showdown separately (local accounts)
- Guest access is acceptable for battles
- Your app remains the source of truth for league data
- You're fine with separate identities (Supabase user ≠ Showdown user)

**Current Status**: Your setup works fine without it! ✅

### ✅ **You DO need it if:**
- You want unified identity (Supabase user = Showdown user)
- You need Showdown moderation/permissions tied to app users
- You want SSO so users don't log in separately
- You want to enforce league membership via Showdown accounts

---

## Where to Set It Up

### **On Your Server** (Homelab/VPS) ✅

The loginserver runs as a **separate service** alongside your Showdown server:

```
Your Infrastructure:
├── Showdown Server (pokemon-showdown)
├── Showdown Client (pokemon-showdown-client)  
├── Loginserver (pokemon-showdown-loginserver) ← Optional
└── Next.js App (separate repo/deployment)
```

### **NOT in Your Next.js App** ❌

The loginserver is a standalone Node.js service that runs independently.

---

## Setup Instructions (If Needed)

### 1. Clone and Build on Server

```bash
cd /home/moodmnky/POKE-MNKY
git clone https://github.com/smogon/pokemon-showdown-loginserver.git
cd pokemon-showdown-loginserver
npm install
npm run build
```

### 2. Configure Showdown Server

Edit your Showdown server config to point to the loginserver:

```javascript
// config/config.js
exports.LoginServer = 'http://localhost:8001'; // or your loginserver URL
exports.LoginServerKey = 'your-shared-secret-key';
```

### 3. Configure Loginserver

Edit loginserver config to connect to your database:

```javascript
// config/config.js
exports.Database = {
  // Your database connection (PostgreSQL, MySQL, etc.)
  // Can connect to Supabase if you want unified auth
};
```

### 4. Add to Docker Compose

```yaml
services:
  pokemon-showdown-loginserver:
    build: ./pokemon-showdown-loginserver
    container_name: poke-mnky-loginserver
    restart: unless-stopped
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - LOGIN_SERVER_KEY=${LOGIN_SERVER_KEY}
    networks:
      - poke-mnky-network
```

### 5. Expose via Cloudflare Tunnel

Add to your tunnel config:

```yaml
ingress:
  - hostname: aab-login.moodmnky.com
    service: http://pokemon-showdown-loginserver:8001
```

---

## Integration with Your App (If You Want SSO)

If you want to integrate loginserver with your Supabase auth:

### Option A: Use Loginserver as Auth Provider
- Configure loginserver to use Supabase as database
- Users authenticate through Showdown → loginserver → Supabase
- More complex, but unified identity

### Option B: Bridge Authentication
- Create API endpoint in your app that bridges Supabase → Showdown
- When user logs into your app, create/update Showdown account via loginserver API
- Simpler, but maintains some separation

---

## Recommendation

**Start WITHOUT loginserver** ✅

Your current setup works fine:
- Users authenticate via Supabase (Discord OAuth)
- Showdown can use local accounts or guest access
- Your app handles all league logic
- Showdown just handles battles

**Add loginserver later IF:**
- Users complain about separate logins
- You need Showdown moderation tied to app users
- You want to enforce league membership in Showdown

---

## Current Architecture (Without Loginserver)

```
┌─────────────────┐
│  Next.js App    │
│  (Supabase Auth)│
└────────┬────────┘
         │
         │ Creates room URLs
         │ Validates teams
         │
         ▼
┌─────────────────┐
│ Showdown Server │
│ (Local/Guest)   │
└─────────────────┘
```

**This works perfectly fine!** Users can:
- Log into your app (Supabase)
- Use Showdown with guest/local accounts
- Battle without friction

---

## Summary

- **Location**: Server-side (homelab/VPS), NOT in Next.js app
- **Required**: No - your current setup works without it
- **When to add**: Only if you need unified authentication/SSO
- **Complexity**: Medium - adds another service to manage
- **Recommendation**: Defer until you have a clear need
