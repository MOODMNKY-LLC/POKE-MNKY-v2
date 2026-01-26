# Discord Role Sync - "Skipped" Status Explanation

## What "Skipped" Means

When you see `skipped: 25` in the sync results, it means one of two things:

### 1. ✅ **Role Already in Sync** (Good!)
- The Discord member has a matching profile in the database
- Their app role already matches their Discord role
- No update needed

### 2. ⚠️ **No Matching Profile** (Expected for Unlinked Accounts)
- The Discord member exists in your Discord server
- But they don't have a profile in the app database with a matching `discord_id`
- This is **normal** for users who haven't signed up/linked their Discord account yet

## Your Current Status

Based on the diagnostic:
- **1 profile** in database with Discord ID linked
- **25 Discord members** found in server
- **All 25 skipped** = 1 already synced + 24 don't have profiles yet

## What This Means

The sync is **working correctly**! It's just that:
- Most Discord members (24/25) haven't linked their accounts yet
- Once they sign up and link their Discord, they'll be synced automatically
- The 1 user who has linked their account is already synced

## Enhanced Logging

I've added more detailed logging that will show:
- `✅ Updated` - When a user's role was changed
- `⏭️ Skipped` - When a user was skipped (with reason)
- `Error` - When something went wrong

The first 5 skipped users and every 10th user will be logged so you can see examples.

## Next Steps

1. **For existing users**: They need to link their Discord account in the app
2. **For new users**: When they sign up and link Discord, roles will sync automatically
3. **Manual sync**: You can run the sync again anytime - it will only update users who need changes

## Summary

**"Skipped" is not an error** - it means:
- ✅ Already synced (good!)
- ⚠️ No profile yet (normal for unlinked accounts)

The sync is working as designed! 🎉
