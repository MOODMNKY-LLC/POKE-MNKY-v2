# Google API Setup Guide

## Required APIs

To use the Google Sheets integration with image extraction, you need to enable the following APIs in Google Cloud Console:

### 1. Google Sheets API ✅
- **Purpose**: Read spreadsheet data, cell values, headers
- **Required**: Yes
- **Scope**: `https://www.googleapis.com/auth/spreadsheets.readonly`

### 2. Google Drive API ✅
- **Purpose**: Access embedded images, file metadata, advanced features
- **Required**: Yes (for image extraction)
- **Scope**: `https://www.googleapis.com/auth/drive.readonly`

---

## Setup Steps

### Step 1: Enable APIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** > **Library**
4. Search for and enable:
   - ✅ **Google Sheets API**
   - ✅ **Google Drive API**

### Step 2: Create Service Account

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in:
   - **Service account name**: `poke-mnky-sheets-reader` (or your preferred name)
   - **Service account ID**: Auto-generated
   - **Description**: "Service account for reading Google Sheets data"
4. Click **Create and Continue**
5. Skip role assignment (click **Continue**)
6. Click **Done**

### Step 3: Create Service Account Key

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create** (JSON file will download)

### Step 4: Grant Access to Spreadsheet

1. Open the downloaded JSON file
2. Copy the `client_email` value (e.g., `poke-mnky-sheets-reader@project-id.iam.gserviceaccount.com`)
3. Open your Google Sheet
4. Click **Share** button
5. Paste the service account email
6. Grant **Viewer** access (read-only)
7. Click **Send**

### Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Google Service Account Credentials
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sheet ID (extracted from URL)
GOOGLE_SHEET_ID=1wwH5XUHxQnivm90wGtNLQI_g7P3nPi5ZRcbZ3JU3-YQ
```

**Important Notes**:
- The `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must include the full key with `\n` characters preserved
- If copying from JSON, ensure the entire key is wrapped in quotes
- The key should start with `-----BEGIN PRIVATE KEY-----` and end with `-----END PRIVATE KEY-----`

---

## Scope Requirements

### Current Implementation Uses:

```typescript
scopes: [
  "https://www.googleapis.com/auth/spreadsheets.readonly",  // Read spreadsheet data
  "https://www.googleapis.com/auth/drive.readonly",          // Access images & metadata
]
```

### Why Both Scopes?

- **`spreadsheets.readonly`**: 
  - Read cell values
  - Read headers
  - Read sheet metadata
  - Access spreadsheet structure

- **`drive.readonly`**: 
  - Access embedded images (`includeGridData: true`)
  - Access file metadata
  - Access image URLs stored in Drive
  - Required for image extraction features

---

## Verification Checklist

- [ ] Google Sheets API enabled in Cloud Console
- [ ] Google Drive API enabled in Cloud Console
- [ ] Service account created
- [ ] Service account JSON key downloaded
- [ ] Service account email shared with Google Sheet (Viewer access)
- [ ] Environment variables configured in `.env.local`
- [ ] Private key properly formatted with `\n` characters
- [ ] Test connection works

---

## Testing the Setup

Run the test script to verify everything is configured correctly:

```bash
npx tsx scripts/test-sheet-analysis.ts
```

This will:
1. Test authentication
2. Load spreadsheet info
3. Analyze sheet structures
4. Report any errors

---

## Troubleshooting

### Error: "Request had insufficient authentication scopes"

**Solution**: Ensure both APIs are enabled in Google Cloud Console

### Error: "The caller does not have permission"

**Solution**: Share the Google Sheet with the service account email (Viewer access)

### Error: "Invalid credentials"

**Solution**: 
- Check that `GOOGLE_SERVICE_ACCOUNT_EMAIL` matches the service account email
- Verify `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` includes full key with `\n` characters
- Ensure the JSON key file was downloaded correctly

### Error: "API not enabled"

**Solution**: Enable Google Sheets API and Google Drive API in Cloud Console

---

## Security Notes

- ✅ Service account uses **read-only** scopes
- ✅ Service account has **Viewer** access to spreadsheet
- ✅ Credentials stored in environment variables (not committed to git)
- ✅ Private key never exposed in client-side code

---

## Additional Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/service-accounts)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
