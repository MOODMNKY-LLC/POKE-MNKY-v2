# Discord Notification Embed Testing Guide

This guide covers comprehensive testing for the Discord notification embed system.

## Overview

The notification system has been upgraded from plain text messages to rich Discord embeds. This provides:
- Better visual formatting
- Structured data display
- Color-coded notification types
- Clickable links and replay URLs

## Test Files

### 1. `test-notifications.ts` - Unit Tests
Tests embed structure validation and format consistency.

**Run:**
```bash
cd tools/discord-bot
pnpm test:notifications
```

**What it tests:**
- ✅ Embed structure validation (required fields, Discord limits)
- ✅ Match result embed format
- ✅ Weekly recap embed format
- ✅ Trade proposal embed format
- ✅ Format consistency between EmbedBuilder and manual JSON

### 2. `test-webhook-integration.ts` - Integration Tests
Tests actual webhook posting to Discord.

**Run:**
```bash
cd tools/discord-bot
TEST_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL pnpm test:webhooks
```

**What it tests:**
- ✅ Actual webhook posting to Discord
- ✅ Visual verification of embeds in Discord channel
- ✅ All notification types (match results, recaps, trades)
- ✅ Edge cases (no replay URL, etc.)

**Setup:**
1. Create a test Discord webhook:
   - Go to your Discord server settings
   - Integrations → Webhooks → New Webhook
   - Copy the webhook URL
2. Set environment variable:
   ```bash
   export TEST_WEBHOOK_URL="https://discord.com/api/webhooks/..."
   ```

### 3. Integration Worker Tests
Tests the integration worker's embed JSON format.

**Run:**
```bash
cd scripts/integration-worker
pnpm test:discord-embed
```

**What it tests:**
- ✅ Embed JSON structure validation
- ✅ Format matching with notifications.ts
- ✅ Edge cases (null values, long descriptions)

## Test Coverage

### Match Result Notifications
- ✅ With replay URL
- ✅ Without replay URL
- ✅ Null team names (fallback handling)
- ✅ All required fields present
- ✅ Field formatting (inline vs block)
- ✅ Color coding (blue: 0x0099ff)

### Weekly Recap Notifications
- ✅ Long description handling
- ✅ Description length limits (4096 chars)
- ✅ Color coding (orange: 0xff9900)
- ✅ Timestamp formatting

### Trade Proposal Notifications
- ✅ Team name display
- ✅ Trade ID inclusion
- ✅ Color coding (green: 0x00ff00)
- ✅ Action description

## Discord Embed Limits

The tests validate against Discord's embed limits:
- **Title**: Max 256 characters
- **Description**: Max 4096 characters
- **Fields**: Max 25 fields
- **Field Name**: Max 256 characters per field
- **Field Value**: Max 1024 characters per field
- **Total Embed**: Max 6000 characters total

## Running All Tests

### Quick Test (Structure Only)
```bash
cd tools/discord-bot
pnpm test:notifications
```

### Full Integration Test (Requires Webhook URL)
```bash
cd tools/discord-bot
TEST_WEBHOOK_URL="your-webhook-url" pnpm test:webhooks
```

### Integration Worker Test
```bash
cd scripts/integration-worker
pnpm test:discord-embed
```

## Expected Results

### ✅ All Tests Pass
- Embed structures are valid
- Format consistency maintained
- Discord limits respected
- Visual appearance verified in Discord

### ❌ Common Issues

**Issue**: "Missing title" error
- **Fix**: Ensure embed has `.setTitle()` called

**Issue**: "Field value exceeds 1024 characters"
- **Fix**: Truncate or split long field values

**Issue**: "Too many fields (max 25)"
- **Fix**: Combine related fields or use description instead

**Issue**: Webhook returns 400 Bad Request
- **Fix**: Check embed JSON structure, ensure all required fields are present

## Manual Verification Checklist

After running tests, manually verify in Discord:

- [ ] Match result embeds display correctly
- [ ] Colors are appropriate (blue for matches, orange for recaps, green for trades)
- [ ] Fields are properly aligned (inline vs block)
- [ ] Replay links are clickable
- [ ] Timestamps display correctly
- [ ] Footer shows "POKE MNKY League"
- [ ] Long descriptions wrap properly
- [ ] No text is cut off or truncated

## Continuous Testing

Add to CI/CD pipeline:
```yaml
- name: Test Discord Notifications
  run: |
    cd tools/discord-bot
    pnpm test:notifications
    
- name: Test Integration Worker Embeds
  run: |
    cd scripts/integration-worker
    pnpm test:discord-embed
```

## Troubleshooting

### Test fails with "Missing required fields"
Check that all embeds include:
- `title`
- `color`
- `fields` (at least one)
- `timestamp`
- `footer`

### Webhook test fails with 401/403
- Verify webhook URL is correct
- Check webhook hasn't been deleted
- Ensure webhook has permission to post in channel

### Format mismatch between EmbedBuilder and manual JSON
- Ensure both use same field structure
- Check timestamp format (ISO string)
- Verify color is number (0x0099ff) not string

## Next Steps

After passing all tests:
1. Deploy updated `notifications.ts` to production
2. Deploy updated integration worker
3. Monitor Discord channels for embed appearance
4. Collect feedback on visual design
5. Iterate on embed formatting based on feedback
