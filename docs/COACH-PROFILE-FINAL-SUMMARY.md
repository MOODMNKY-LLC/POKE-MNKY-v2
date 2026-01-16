# Coach Profile System - Final Implementation Summary

> **Status**: ✅ Complete  
> **Date**: 2026-01-16

---

## ✅ What's Been Implemented

### **1. Profile Page Moved to Dashboard** ✅

- **Old Location**: `/profile`
- **New Location**: `/dashboard/profile`
- All navigation links updated
- Uses dashboard layout automatically

### **2. Coach Card Component** ✅

- Team avatar upload (drag & drop)
- Team name editing (inline)
- Team statistics display (record, differential, division)
- Link to team detail page
- Only visible when `role === "coach"`

### **3. Showdown Teams Section** ✅

- Lists all Showdown teams for the coach
- Shows team tags and creation date
- Edit and delete functionality
- Links to team builder

### **4. Discord Bot Management UI** ✅

- **Location**: `/admin/discord/bot`
- Initialize bot button
- Bot status display (initialized, ready, username)
- Role mapping display
- Complete flow explanation

### **5. Database Functions** ✅

- `assign_coach_to_team()` function
- Team avatar fields (`avatar_url`, `banner_url`)
- Automatic coach entry creation

---

## 🎯 Discord Role Change Flow - Explained

### **The Complete Flow:**

```
1. Admin assigns "Coach" role in Discord
   ↓
2. Discord bot detects role change (guildMemberUpdate event)
   ↓
3. Bot syncs role: Discord "Coach" → App "coach"
   ↓
4. Bot creates coach entry (if doesn't exist)
   ↓
5. Bot assigns coach to available team
   ↓
6. User refreshes /dashboard/profile
   ↓
7. Sees coach card with team info!
```

---

## 🔑 Key Points About Role Names

### **Discord Role Name Must Be: `"Coach"`**

**Exactly this:** Capital C, lowercase oach

**Why?** The code in `lib/discord-role-sync.ts` looks for this exact name:

```typescript
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Coach"],  // ← Must match exactly
}
```

**If your Discord role has a different name:**

1. **Option A**: Rename your Discord role to "Coach"
2. **Option B**: Update the mapping in `lib/discord-role-sync.ts`:

```typescript
// If your role is "Coaches" (plural)
export const APP_TO_DISCORD_ROLE_MAP: Record<UserRole, string[]> = {
  coach: ["Coaches"],  // ← Change this
}

export const DISCORD_TO_APP_ROLE_MAP: Record<string, UserRole> = {
  "Coaches": "coach",  // ← Change this too
}
```

Then restart the bot via `/admin/discord/bot`.

---

## 🚀 How to Use

### **Step 1: Initialize the Bot**

1. Navigate to `/admin/discord/bot` (admin only)
2. Click **"Initialize Bot"** button
3. Wait for status to show "Connected"
4. Bot is now listening for role changes

### **Step 2: Assign Role in Discord**

1. Go to Discord Server Settings → Members
2. Find the user
3. Assign the **"Coach"** role (exact name!)
4. Bot automatically detects and processes

### **Step 3: User Sees Changes**

1. User navigates to `/dashboard/profile`
2. Sees coach card with team information
3. Can upload team avatar
4. Can edit team name
5. Can manage Showdown teams

---

## 📍 Important URLs

- **Profile Page**: `/dashboard/profile`
- **Bot Management**: `/admin/discord/bot`
- **Role Sync**: `/admin/discord/roles`
- **Bot Config**: `/admin/discord/config`

---

## 🎨 What Users See

### **For Coaches** (`/dashboard/profile`):

```
┌─────────────────────────────────────┐
│  Profile Header                     │
│  [Avatar] [Name] [Role Badge]      │
└─────────────────────────────────────┘
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🎮 Coach Card                │ │
│  │  [Team Avatar] [Upload]       │ │
│  │  Team Name: [Name] [Edit]    │ │
│  │  Record: 5-3 | Diff: +12     │ │
│  │  [View Team Page]             │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📋 Showdown Teams            │ │
│  │  [Team 1] [Edit] [Delete]    │ │
│  │  [Team 2] [Edit] [Delete]    │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Tabs: General, Permissions, Activity]│
└─────────────────────────────────────┘
```

### **For Non-Coaches**:

- No coach card shown
- No Showdown teams section
- Just basic profile info

---

## 🔧 Bot Initialization - Explained

### **Why "Admin Only"?**

The bot initialization endpoint (`/api/discord/bot`) requires admin access because:
- Bot initialization is a system-level operation
- Only admins should control when the bot runs
- Prevents unauthorized bot manipulation

### **How It Works:**

1. **Admin clicks "Initialize Bot"** in `/admin/discord/bot`
2. **Frontend calls** `POST /api/discord/bot`
3. **API verifies** admin role
4. **API initializes** Discord bot client
5. **Bot starts listening** for role changes
6. **Status updates** to show "Connected"

### **What Happens After Initialization:**

- Bot logs into Discord
- Starts listening for `guildMemberUpdate` events
- Starts listening for `guildMemberAdd` events
- Automatically processes role changes
- Runs continuously until server restarts

**Note**: In production, you may want to auto-start the bot on server startup (via Edge Function or background service).

---

## 📚 Documentation Created

1. **`docs/DISCORD-ROLE-CHANGE-FLOW.md`** - Complete flow explanation
2. **`docs/DISCORD-ROLE-SETUP-GUIDE.md`** - Quick reference guide
3. **`docs/COACH-PROFILE-SYSTEM-PLAN.md`** - Original implementation plan
4. **`docs/COACH-PROFILE-IMPLEMENTATION-SUMMARY.md`** - Technical summary

---

## ✅ All Features Implemented

- [x] Profile page at `/dashboard/profile`
- [x] Coach card component
- [x] Team avatar upload
- [x] Team name editing
- [x] Showdown teams management
- [x] Discord bot management UI
- [x] Automatic role sync
- [x] Automatic coach assignment
- [x] Database migrations
- [x] Helper functions
- [x] API routes
- [x] Navigation links updated
- [x] Toast notifications (not alerts)
- [x] Error handling
- [x] Loading states

---

## 🧪 Testing Checklist

### **Profile Page**
- [ ] Navigate to `/dashboard/profile` as a coach
- [ ] Verify coach card appears
- [ ] Test team avatar upload
- [ ] Test team name editing
- [ ] Verify Showdown teams section loads

### **Discord Bot**
- [ ] Navigate to `/admin/discord/bot` as admin
- [ ] Click "Initialize Bot"
- [ ] Verify status shows "Connected"
- [ ] Assign "Coach" role in Discord
- [ ] Check bot logs for role change detection
- [ ] Verify user's profile updates
- [ ] Verify coach assigned to team

---

## 🎯 Quick Start Guide

1. **Initialize Bot**: Go to `/admin/discord/bot` → Click "Initialize Bot"
2. **Assign Role**: In Discord, assign "Coach" role to a user
3. **Check Profile**: User goes to `/dashboard/profile` → Sees coach card!

---

**Everything is ready!** The system is fully implemented and ready for testing! 🚀
