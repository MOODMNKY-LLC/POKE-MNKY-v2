# Connecting Notion Integration to Draft Board Database

## Why This Is Required

**The integration MUST be connected to the database** for webhooks to work. Even if the webhook subscription is active, Notion won't send events if the integration doesn't have access to the database.

## Step-by-Step Instructions

### Method 1: Via Database Settings (Recommended)

1. **Open Draft Board Database**:
   - Go to your Draft Board database in Notion
   - URL should be something like: `https://www.notion.so/5e58ccd73ceb44ed83de826b51cf5c36`

2. **Open Connections Menu**:
   - Click the **"..."** (three dots) menu in the top right of the database
   - Select **"Connections"** from the dropdown
   - Or look for a **"Connected"** icon/button

3. **Add Integration**:
   - Click **"Add connections"** or **"Connect to"**
   - You should see a list of available integrations
   - Find **"POKE MNKY"** or **"POKE MNKY Draft Board Sync"**
   - Click on it to connect

4. **Verify Connection**:
   - The integration should now appear in the connections list
   - You should see a checkmark or "Connected" status

### Method 2: Via Integration Settings

1. **Go to Integration Settings**:
   - Visit: https://www.notion.so/my-integrations
   - Click on "POKE MNKY" integration

2. **Check Capabilities**:
   - Ensure "Read content" is enabled
   - Ensure "Update content" is enabled (if you want bidirectional sync)

3. **Share Database with Integration**:
   - Go back to your Draft Board database
   - Use Method 1 above to connect it

## Troubleshooting

### "Connections" Option Not Visible

- Make sure you're viewing the **database** (not a page)
- Try refreshing the page
- Check if you have edit permissions on the database
- Some Notion views hide the connections menu - try switching views

### Integration Not in List

- Make sure the integration is **active** (not paused)
- Check that you're in the correct workspace
- Try creating a new connection from the database side

### Still Can't Connect

- Verify the integration has the correct capabilities
- Check workspace permissions
- Try disconnecting and reconnecting

## Verification

After connecting, you should:
- ✅ See the integration listed in database connections
- ✅ Be able to see/edit database properties via the integration
- ✅ Webhooks should start working (after fixing the failures)
