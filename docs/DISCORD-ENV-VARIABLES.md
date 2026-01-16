# Discord Integration Environment Variables

## Required for Discord Role Sync & Account Linking

These environment variables are required for the Discord role synchronization and account linking features:

### Core Discord Variables

```bash
# Discord Bot Token (REQUIRED)
# Used for: Role sync, account linking, member fetching
DISCORD_BOT_TOKEN=your-discord-bot-token-here

# Discord Guild/Server ID (REQUIRED)
# Used for: Identifying which Discord server to sync roles from
DISCORD_GUILD_ID=your-discord-server-id-here
```

### Optional Discord Variables

```bash
# Discord Client ID (Optional - for OAuth)
# Used for: Discord OAuth authentication
DISCORD_CLIENT_ID=your-discord-client-id

# Discord Client Secret (Optional - for OAuth)
# Used for: Discord OAuth authentication
DISCORD_CLIENT_SECRET=your-discord-client-secret

# Discord Public Key (Optional - for webhooks)
# Used for: Verifying Discord webhook signatures
DISCORD_PUBLIC_KEY=your-discord-public-key
```

## Features That Use These Variables

### 1. Role Synchronization (`/api/discord/sync-roles`)
- **Uses**: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`
- **Purpose**: Syncs Discord server roles → App roles
- **Location**: `/admin/discord/roles` page

### 2. User Role Sync (`/api/discord/sync-user-role`)
- **Uses**: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`
- **Purpose**: Syncs App role changes → Discord roles
- **Location**: Automatically called when admin changes user role in `/admin/users`

### 3. Account Linking (`/api/discord/link-account`)
- **Uses**: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`
- **Purpose**: Manually links Discord accounts to user profiles
- **Location**: `/admin/users` page (link button)

## Verification

To verify your environment variables are set correctly:

1. **Check via API**:
   ```bash
   # Visit: /api/discord/config
   # Should show masked bot token and guild ID
   ```

2. **Test Role Sync**:
   - Go to `/admin/discord/roles`
   - Click "Sync Now"
   - Should sync without errors

3. **Test Account Linking**:
   - Go to `/admin/users`
   - Click link icon next to "Not connected" user
   - Enter Discord username
   - Should link successfully

## Production Setup

For production (Vercel/Netlify/etc.):

1. **Add Environment Variables**:
   - Go to your hosting platform's environment variables settings
   - Add `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`
   - Ensure they're marked as "Secret" or "Encrypted"

2. **Verify Bot Permissions**:
   - Bot must have "Manage Roles" permission in Discord server
   - Bot must be in the Discord server specified by `DISCORD_GUILD_ID`

3. **Role Names**:
   - Ensure Discord server has roles matching the mappings in `lib/discord-role-sync.ts`:
     - `Commissioner` or `League Admin` → App `admin` role
     - `Coach` → App `coach` role
     - `Spectator` → App `viewer` role

## Troubleshooting

### Error: "DISCORD_BOT_TOKEN is not configured"
- **Solution**: Add `DISCORD_BOT_TOKEN` to your environment variables

### Error: "DISCORD_GUILD_ID is not configured"
- **Solution**: Add `DISCORD_GUILD_ID` to your environment variables

### Error: "User not found in Discord server"
- **Solution**: User must be a member of the Discord server specified by `DISCORD_GUILD_ID`

### Error: "Discord roles not found"
- **Solution**: Ensure Discord server has roles matching the names in `lib/discord-role-sync.ts`
- Role names are case-sensitive!

## Notes

- **Bot Token**: Never commit to git, always use environment variables
- **Guild ID**: Can be found by right-clicking Discord server → "Copy Server ID" (Developer Mode must be enabled)
- **External Bot**: The Discord bot is hosted externally (moodmnky@10.3.0.119), but these API endpoints still need the bot token to create temporary clients for role operations
