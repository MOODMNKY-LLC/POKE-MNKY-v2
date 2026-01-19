# Supabase Auth Configuration Backup

**Date**: January 19, 2026  
**Purpose**: Backup of authentication settings before `supabase init`  
**Backup File**: `supabase/config.toml.auth-backup`

---

## 📋 Critical Authentication Settings

### Site URL & Redirect URLs

```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "http://localhost:3000",
  "http://localhost:3000/auth/callback"
]
```

**Important**: These URLs must match your Next.js app URLs exactly.

---

### Discord OAuth Configuration

```toml
[auth.external.discord]
enabled = true
client_id = "env(DISCORD_CLIENT_ID)"
secret = "env(DISCORD_CLIENT_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
skip_nonce_check = false
email_optional = false
```

**Critical Details**:
- **Redirect URI**: `http://127.0.0.1:54321/auth/v1/callback`
- **Must match** Discord Developer Portal → OAuth2 → Redirects
- Uses environment variables: `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`

---

### Auth Settings

```toml
[auth]
enable_signup = true
enable_anonymous_sign_ins = false
enable_manual_linking = false
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
minimum_password_length = 6
password_requirements = ""
jwt_expiry = 3600
```

---

### Email Settings

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
secure_password_change = false
max_frequency = "1s"
otp_length = 6
otp_expiry = 3600
```

---

### Rate Limits

```toml
[auth.rate_limit]
email_sent = 2
sms_sent = 30
anonymous_users = 30
token_refresh = 150
sign_in_sign_ups = 30
token_verifications = 30
web3 = 30
```

---

### SMS Settings

```toml
[auth.sms]
enable_signup = false
enable_confirmations = false
template = "Your code is {{ .Code }}"
max_frequency = "5s"
```

---

### MFA Settings

```toml
[auth.mfa]
max_enrolled_factors = 10

[auth.mfa.totp]
enroll_enabled = false
verify_enabled = false

[auth.mfa.phone]
enroll_enabled = false
verify_enabled = false
otp_length = 6
template = "Your code is {{ .Code }}"
max_frequency = "5s"
```

---

## 🔄 How to Restore After `supabase init`

### Step 1: Run `supabase init`

```bash
cd c:\DEV-MNKY\MOOD_MNKY\POKE-MNKY-v2
supabase init
```

This will create a new `config.toml` with default settings.

### Step 2: Restore Auth Configuration

**Option A: Manual Copy**
1. Open `supabase/config.toml.auth-backup`
2. Copy the `[auth]` sections
3. Paste into the new `supabase/config.toml`

**Option B: Automated (if you have a script)**
```bash
# Copy auth sections from backup
# (You'll need to manually merge or use a script)
```

### Step 3: Verify Environment Variables

Make sure these are set in your `.env.local`:
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

### Step 4: Verify Discord Redirect URI

In Discord Developer Portal → OAuth2 → Redirects, ensure:
```
http://127.0.0.1:54321/auth/v1/callback
```

**Note**: Port `54321` is the default Supabase API port. If your new config uses a different port, update both:
1. `redirect_uri` in `config.toml`
2. Redirect URI in Discord Developer Portal

---

## 📝 Quick Reference

### Key Values to Restore

| Setting | Value |
|---------|-------|
| `site_url` | `http://127.0.0.1:3000` |
| `additional_redirect_urls` | `["https://127.0.0.1:3000", "http://localhost:3000", "http://localhost:3000/auth/callback"]` |
| `[auth.external.discord].enabled` | `true` |
| `[auth.external.discord].redirect_uri` | `http://127.0.0.1:54321/auth/v1/callback` |
| `[auth.external.discord].client_id` | `env(DISCORD_CLIENT_ID)` |
| `[auth.external.discord].secret` | `env(DISCORD_CLIENT_SECRET)` |

---

## ⚠️ Important Notes

1. **Port Numbers**: After `supabase init`, check if the API port changed. Update `redirect_uri` accordingly.

2. **Environment Variables**: The config uses `env(DISCORD_CLIENT_ID)` - make sure these are set in your environment.

3. **Discord Redirect URI**: Must match exactly between:
   - `config.toml` → `redirect_uri`
   - Discord Developer Portal → OAuth2 → Redirects

4. **Site URL**: Must match your Next.js app URL (`http://127.0.0.1:3000` or `http://localhost:3000`)

---

**Backup Created**: January 19, 2026  
**File**: `supabase/config.toml.auth-backup`  
**Status**: ✅ **READY FOR RESTORATION**
