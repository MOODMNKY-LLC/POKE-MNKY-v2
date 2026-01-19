# Supabase Auth Configuration Restored

**Date**: January 19, 2026  
**Status**: ✅ **RESTORED**

---

## ✅ What Was Restored

### 1. Site URL & Redirect URLs ✅

```toml
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "http://localhost:3000",
  "http://localhost:3000/auth/callback"
]
```

**Status**: ✅ Restored

---

### 2. Discord OAuth Configuration ✅

```toml
[auth.external.discord]
enabled = true
client_id = "env(DISCORD_CLIENT_ID)"
secret = "env(DISCORD_CLIENT_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
skip_nonce_check = false
email_optional = false
```

**Status**: ✅ Restored

**Important**: 
- Redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
- Must match Discord Developer Portal → OAuth2 → Redirects
- Uses environment variables: `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`

---

### 3. Storage Bucket Configuration ✅

```toml
[storage.buckets.pokedex-sprites]
public = true
file_size_limit = "5MiB"
allowed_mime_types = ["image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/webp"]
```

**Status**: ✅ Restored

---

### 4. Auth Settings ✅

All auth settings restored:
- `enable_signup = true`
- `enable_anonymous_sign_ins = false`
- `enable_refresh_token_rotation = true`
- `refresh_token_reuse_interval = 10`
- `minimum_password_length = 6`
- `jwt_expiry = 3600`

**Status**: ✅ All restored

---

### 5. Rate Limits ✅

All rate limits restored:
- `email_sent = 2`
- `sms_sent = 30`
- `anonymous_users = 30`
- `token_refresh = 150`
- `sign_in_sign_ups = 30`
- `token_verifications = 30`
- `web3 = 30`

**Status**: ✅ All restored

---

### 6. Email Settings ✅

All email settings restored:
- `enable_signup = true`
- `double_confirm_changes = true`
- `enable_confirmations = false`
- `secure_password_change = false`
- `max_frequency = "1s"`
- `otp_length = 6`
- `otp_expiry = 3600`

**Status**: ✅ All restored

---

### 7. SMS Settings ✅

All SMS settings restored:
- `enable_signup = false`
- `enable_confirmations = false`
- `template = "Your code is {{ .Code }}"`
- `max_frequency = "5s"`

**Status**: ✅ All restored

---

### 8. MFA Settings ✅

All MFA settings restored:
- `max_enrolled_factors = 10`
- TOTP: `enroll_enabled = false`, `verify_enabled = false`
- Phone: `enroll_enabled = false`, `verify_enabled = false`, `otp_length = 6`

**Status**: ✅ All restored

---

## 📋 Verification Checklist

- [x] Site URL restored
- [x] Additional redirect URLs restored (3 URLs)
- [x] Discord OAuth configuration restored
- [x] Storage bucket configuration restored
- [x] All auth settings restored
- [x] Rate limits restored
- [x] Email settings restored
- [x] SMS settings restored
- [x] MFA settings restored

---

## ⚠️ Important Notes

### Port Check

After `supabase init`, verify the API port is still `54321`:
```bash
supabase status
```

If the port changed, update:
1. `redirect_uri` in `config.toml` → `[auth.external.discord]`
2. Redirect URI in Discord Developer Portal

### Environment Variables

Ensure these are set in your `.env.local`:
```env
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
```

---

**Last Updated**: January 19, 2026  
**Status**: ✅ **AUTH CONFIGURATION RESTORED** - Ready to use
