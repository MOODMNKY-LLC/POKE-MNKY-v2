# Discord Role Setup Guide - Quick Reference

> **Last Updated**: 2026-01-16

---

## 🎯 Quick Answer: What Role Name Do I Need?

**The Discord role must be named exactly: `"Coach"`** (capital C, lowercase oach)

**Why?** The code looks for this exact name in `lib/discord-role-sync.ts`:

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Coach"],  // ← Must match exactly
}
```

---

## 📋 Complete Role Mapping

### **Current Configuration** (`lib/discord-role-sync.ts`)

```typescript
// Discord → App (when Discord role is assigned)
DISCORD_TO_APP_ROLE_MAP = {
  "Commissioner": "admin",
  "League Admin": "admin",
  "Coach": "coach",        // ← This triggers coach assignment
  "Spectator": "viewer",
}

// App → Discord (when app role changes)
APP_TO_DISCORD_ROLE_MAP = {
  admin: ["Commissioner", "League Admin"],
  commissioner: ["Commissioner"],
  coach: ["Coach"],         // ← Maps app role to Discord role
  viewer: ["Spectator"],
}
```

---

## 🔧 How to Change Role Names

If your Discord server uses different role names:

1. **Edit** `lib/discord-role-sync.ts`
2. **Update** the role mappings to match your Discord server
3. **Restart** the Discord bot (or reinitialize via `/admin/discord/bot`)

**Example:** If your Discord role is "Coaches" (plural):

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Coaches"],  // ← Changed from "Coach" to "Coaches"
  // ...
}

export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  "Coaches": "coach",  // ← Changed from "Coach" to "Coaches"
  // ...
}
```

**Important:** Role names are **case-sensitive** and must match exactly!

---

## 🚀 How the Flow Works

### **Step-by-Step:**

1. **Admin assigns "Coach" role in Discord**
   - Go to Discord Server Settings → Members
   - Find user → Assign "Coach" role

2. **Discord bot detects change**
   - Bot listens for `guildMemberUpdate` events
   - Compares old roles vs new roles
   - If "Coach" role added → triggers sync

3. **Bot syncs role to app**
   - Updates `profiles.role` = "coach"
   - Creates `coaches` entry (if needed)
   - Assigns coach to team (if not already assigned)

4. **User sees changes**
   - Navigates to `/dashboard/profile`
   - Sees coach card with team info
   - Can upload team avatar, edit team name

---

## 🎮 Initialize the Bot

### **Via Admin UI** (Recommended)

1. Navigate to: `/admin/discord/bot`
2. Click **"Initialize Bot"** button
3. Bot status should show "Connected"
4. Bot is now listening for role changes

### **What Happens When Bot Initializes:**

- Bot logs into Discord
- Starts listening for `guildMemberUpdate` events
- Starts listening for `guildMemberAdd` events
- Automatically processes role changes

---

## ✅ Verification Checklist

- [ ] Discord role named exactly "Coach" (or updated mapping)
- [ ] Bot token set in environment variables (`DISCORD_BOT_TOKEN`)
- [ ] Guild ID set in environment variables (`DISCORD_GUILD_ID`)
- [ ] Bot initialized via `/admin/discord/bot`
- [ ] Bot status shows "Connected"
- [ ] Bot has "Manage Roles" permission in Discord
- [ ] Bot has `GUILD_MEMBERS` intent enabled

---

## 🐛 Troubleshooting

### **Bot not detecting role changes?**

1. Check bot is initialized: `/admin/discord/bot`
2. Verify role name matches exactly (case-sensitive)
3. Check bot permissions in Discord
4. Check bot intents are enabled

### **Role syncs but coach not assigned?**

1. Check teams exist: `SELECT COUNT(*) FROM teams WHERE coach_id IS NULL`
2. Check current season exists: `SELECT * FROM seasons WHERE is_current = true`
3. Check database function works: Test `assign_coach_to_team()` manually

### **User doesn't see coach card?**

1. Verify `profiles.role = 'coach'`
2. Verify `profiles.team_id` is set
3. Check user is logged in
4. Navigate to `/dashboard/profile` (not `/profile`)

---

## 📚 Related Files

- `lib/discord-role-sync.ts` - Role mapping configuration
- `lib/discord-bot-service.ts` - Bot event handlers
- `app/admin/discord/bot/page.tsx` - Bot management UI
- `docs/DISCORD-ROLE-CHANGE-FLOW.md` - Detailed flow documentation

---

**Quick Start:** Initialize bot → Assign "Coach" role in Discord → Watch it work! ✨
