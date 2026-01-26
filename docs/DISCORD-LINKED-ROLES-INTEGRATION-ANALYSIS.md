# Discord Linked Roles Integration Analysis

## Executive Summary

Discord's **Linked Roles** feature provides a native way to automatically assign roles based on external platform connections (Twitter, Reddit, YouTube, etc.). While our current bot-based role sync works well, integrating Linked Roles could provide additional benefits including automatic role assignment, better user experience, and reduced manual sync operations.

---

## Current Implementation

### Bot-Based Role Sync
- **How it works**: Discord bot listens for role changes and syncs to app, or admin manually triggers sync
- **Direction**: Bidirectional (Discord ↔ App)
- **Trigger**: Manual sync button or bot events
- **Limitations**: Requires manual intervention or bot monitoring

### Current Flow
1. Admin assigns role in Discord OR app
2. Manual sync button clicked OR bot detects change
3. Role syncs to other platform
4. User profile updated

---

## Discord Linked Roles Overview

### What Are Linked Roles?
Linked Roles allow Discord server admins to create roles that require members to verify their accounts on external platforms (Twitter, Reddit, YouTube, Steam, etc.) before receiving the role.

### Key Features
- **Automatic Assignment**: Roles assigned automatically when requirements are met
- **Connection Verification**: Verifies user owns the external account
- **Custom Requirements**: Set conditions (e.g., "Twitter account older than 30 days")
- **Native Integration**: Built into Discord's UI, no bot required
- **User Opt-In**: Members must actively connect their accounts

### How It Works
1. Admin creates a Linked Role with requirements (e.g., "Connect Twitter account")
2. Member goes to Server Settings → Linked Roles
3. Member connects their external account
4. Discord verifies the connection
5. Role is automatically assigned if requirements are met

---

## Potential Integration Approaches

### Option 1: Custom App Connection (Recommended)

**Create a custom Discord app connection** that verifies POKE MNKY app membership.

#### Implementation Steps

1. **Register Application Role Connection Metadata**
   ```typescript
   // Register metadata for our app
   PUT /applications/{application.id}/role-connections/metadata
   
   Metadata fields:
   - app_member: boolean (is user a member of POKE MNKY app?)
   - app_role: string (user's role: admin, commissioner, coach, spectator)
   - team_assigned: boolean (does user have a team assigned?)
   - account_age_days: number (how long has user been in app?)
   ```

2. **OAuth2 Flow**
   - User connects Discord account to POKE MNKY app
   - App verifies user's Discord ID matches their app profile
   - App returns metadata to Discord

3. **Linked Role Setup**
   - Create Discord roles: "POKE MNKY Admin", "POKE MNKY Coach", etc.
   - Set requirements: `app_role == "admin"` for Admin role
   - Members connect and roles auto-assign

#### Benefits
- ✅ Automatic role assignment (no manual sync)
- ✅ Native Discord UI (better UX)
- ✅ Real-time updates (when app role changes, Discord updates)
- ✅ Verification built-in (Discord verifies connection)
- ✅ Reduces bot dependency

#### Challenges
- ⚠️ Requires OAuth2 setup with Discord
- ⚠️ Need to implement metadata endpoint
- ⚠️ Users must opt-in (connect account)
- ⚠️ More complex than current bot sync

### Option 2: Hybrid Approach

**Keep bot sync for existing users, add Linked Roles for new users.**

#### Implementation
- Existing users: Continue using bot sync
- New users: Use Linked Roles for automatic assignment
- Admin can choose sync method per user

#### Benefits
- ✅ Backward compatible
- ✅ Gradual migration
- ✅ Best of both worlds

### Option 3: Enhanced Bot Sync

**Improve current bot sync with automatic triggers.**

#### Implementation
- Bot listens for app role changes (via webhooks)
- Automatically syncs to Discord when app role changes
- No manual sync button needed

#### Benefits
- ✅ Minimal changes to current system
- ✅ Still uses bot (familiar)
- ✅ Automatic sync

---

## Recommended Implementation: Custom App Connection

### Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  POKE MNKY App  │◄───────►│  Discord API     │◄───────►│ Discord User │
│                 │ OAuth2  │  Role Connection  │         │              │
│  - User Profile │         │  Metadata         │         │  - Roles     │
│  - Role         │         │                  │         │              │
│  - Team         │         │                  │         │              │
└─────────────────┘         └──────────────────┘         └──────────────┘
```

### Implementation Plan

#### Phase 1: Setup Discord Application Connection

1. **Register Metadata**
   ```typescript
   // lib/discord/linked-roles.ts
   export async function registerRoleConnectionMetadata() {
     const metadata = [
       {
         key: "app_role",
         name: "App Role",
         description: "User's role in POKE MNKY app",
         type: 4, // STRING
       },
       {
         key: "team_assigned",
         name: "Team Assigned",
         description: "Whether user has a team assigned",
         type: 7, // BOOLEAN
       },
       {
         key: "account_age_days",
         name: "Account Age",
         description: "Days since account creation",
         type: 2, // INTEGER
       },
     ]
     
     // PUT to Discord API
     await fetch(`https://discord.com/api/v10/applications/${APP_ID}/role-connections/metadata`, {
       method: "PUT",
       headers: {
         Authorization: `Bot ${BOT_TOKEN}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify(metadata),
     })
   }
   ```

2. **OAuth2 Endpoint**
   ```typescript
   // app/api/discord/oauth/callback/route.ts
   export async function GET(request: NextRequest) {
     // Handle Discord OAuth callback
     // Verify user, store connection
     // Return success
   }
   ```

3. **Metadata Endpoint**
   ```typescript
   // app/api/discord/role-connection/route.ts
   export async function GET(request: NextRequest) {
     // Get user's Discord ID from OAuth token
     // Fetch user's app profile
     // Return metadata:
     return {
       app_role: profile.role,
       team_assigned: !!profile.team_id,
       account_age_days: daysSince(profile.created_at),
     }
   }
   ```

#### Phase 2: Create Linked Roles in Discord

1. **Server Setup**
   - Go to Server Settings → Roles
   - Create roles: "POKE MNKY Admin", "POKE MNKY Commissioner", "POKE MNKY Coach", "POKE MNKY Spectator"
   - For each role, go to "Links" tab
   - Add requirement: `app_role == "admin"` (for Admin role)
   - Save

2. **User Experience**
   - User goes to Server Settings → Linked Roles
   - Clicks "Connect" for POKE MNKY
   - Authorizes OAuth connection
   - Role automatically assigned if requirements met

#### Phase 3: Integration with Current System

1. **Hybrid Sync**
   - Keep bot sync for manual/admin operations
   - Use Linked Roles for automatic assignment
   - Both systems can coexist

2. **Fallback**
   - If Linked Roles fails, fall back to bot sync
   - Admin can manually sync if needed

---

## Comparison: Current vs Linked Roles

| Feature | Current (Bot Sync) | Linked Roles |
|---------|-------------------|--------------|
| **Automatic** | ❌ Manual trigger | ✅ Automatic |
| **User Experience** | ⚠️ Admin-driven | ✅ User-driven |
| **Real-time** | ⚠️ On sync only | ✅ Real-time |
| **Verification** | ⚠️ Manual | ✅ Built-in |
| **Setup Complexity** | ✅ Simple | ⚠️ Moderate |
| **Maintenance** | ⚠️ Bot monitoring | ✅ Discord handles |
| **Flexibility** | ✅ Full control | ⚠️ Limited to metadata |

---

## Recommendations

### Short Term (Keep Current System)
- ✅ Current bot sync works well
- ✅ No changes needed immediately
- ✅ Focus on RBAC implementation

### Medium Term (Consider Linked Roles)
- 🔄 Evaluate user adoption of Linked Roles
- 🔄 Monitor Discord's Linked Roles API maturity
- 🔄 Consider for new features (team verification, etc.)

### Long Term (Hybrid Approach)
- 🎯 Implement custom app connection
- 🎯 Use Linked Roles for automatic assignment
- 🎯 Keep bot sync as fallback/admin tool
- 🎯 Best of both worlds

---

## Implementation Checklist

If implementing Linked Roles:

- [ ] Register Discord application (if not already)
- [ ] Set up OAuth2 redirect URLs
- [ ] Register role connection metadata
- [ ] Create metadata endpoint (`/api/discord/role-connection`)
- [ ] Create OAuth callback endpoint
- [ ] Test connection flow
- [ ] Create Linked Roles in Discord server
- [ ] Test automatic role assignment
- [ ] Document for users
- [ ] Keep bot sync as fallback

---

## API Reference

### Discord Role Connection Metadata API

**Register Metadata:**
```
PUT /applications/{application.id}/role-connections/metadata
Authorization: Bot {token}
Content-Type: application/json

[
  {
    "key": "app_role",
    "name": "App Role",
    "description": "User's role in POKE MNKY",
    "type": 4
  }
]
```

**Get User Metadata:**
```
GET /users/@me/applications/{application.id}/role-connection
Authorization: Bearer {user_token}
```

**Update User Metadata:**
```
PUT /users/@me/applications/{application.id}/role-connection
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "platform_name": "POKE MNKY",
  "platform_username": "username",
  "metadata": {
    "app_role": "coach",
    "team_assigned": true
  }
}
```

---

## Conclusion

Discord Linked Roles offer a compelling alternative to bot-based role sync, providing automatic assignment and better user experience. However, our current bot sync system works well and doesn't require immediate changes.

**Recommendation**: Monitor Linked Roles adoption and consider implementing a custom app connection in the future as an enhancement, not a replacement, for our current system.

---

**Document Status**: Analysis Complete  
**Created**: 2026-01-25  
**Next Review**: After RBAC implementation stabilization
