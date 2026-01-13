# MinIO Client (mc) Setup Complete ✅

**Date:** January 13, 2026  
**Status:** ✅ Fully Configured

---

## Installation Summary

### ✅ Installed Components

1. **MinIO Client (`mc.exe`)**
   - Location: `C:\Users\Simeon\.mc\mc.exe`
   - Version: `RELEASE.2025-08-13T08-35-41Z`
   - Status: ✅ Installed and working

2. **Configuration File**
   - Location: `C:\Users\Simeon\mc\config.json`
   - Alias: `local`
   - Endpoint: `http://10.0.0.5:30090`
   - Status: ✅ Configured

3. **Global CORS Configuration**
   - Setting: `api cors_allow_origin=*`
   - Status: ✅ Configured
   - Applies to: All buckets globally

---

## Configuration Details

### Alias Configuration

\`\`\`json
{
  "local": {
    "url": "http://10.0.0.5:30090",
    "accessKey": "jp3O2FaYMWDsK03OeMPQ",
    "secretKey": "n9MtRoKbBtPqUFdGRxD8FbsICQdOQabzq1RemJgf",
    "api": "s3v4",
    "path": "auto"
  }
}
\`\`\`

### Environment Variables Added

**`.env.local`:**
\`\`\`env
MINIO_REGION=us-east-1
MINIO_SERVER_LOCATION=us-east-1
\`\`\`

**`.env`:**
\`\`\`env
MINIO_REGION=us-east-1
MINIO_SERVER_LOCATION=us-east-1
\`\`\`

---

## Common Commands

### Basic Operations

\`\`\`powershell
# List buckets
mc ls local

# List objects in a bucket
mc ls -r local/pokedex-sprites

# Upload a file
mc cp local-file.txt local/pokedex-sprites/path/to/file.txt

# Download a file
mc cp local/pokedex-sprites/path/to/file.txt local-file.txt

# Get bucket policy
mc anonymous get-json local/pokedex-sprites

# Set bucket to public read
mc anonymous set download local/pokedex-sprites
\`\`\`

### Admin Operations

\`\`\`powershell
# Get global CORS configuration
mc admin config get local api | Select-String "cors_allow_origin"

# Set global CORS (already done)
mc admin config set local api cors_allow_origin="*"

# Get all API settings
mc admin config get local api

# List configuration history
mc admin config history local
\`\`\`

### Bucket Management

\`\`\`powershell
# Create a bucket
mc mb local/new-bucket-name

# Remove a bucket (empty first)
mc rb local/bucket-name

# Set bucket policy via JSON file
mc anonymous set-json local/bucket-name policy.json
\`\`\`

---

## Helper Scripts

### PowerShell Module

**Location:** `scripts/minio-cli-helpers.ps1`

**Usage:**
\`\`\`powershell
# Import the module
. .\scripts\minio-cli-helpers.ps1

# Use helper functions
Test-MinIOConnection
Get-MinIOBuckets
Set-MinIOBucketPublic -Bucket "pokedex-sprites"
Get-MinIOCORS
Upload-ToMinIO -Bucket "pokedex-sprites" -LocalPath "file.txt" -RemotePath "test/file.txt"
\`\`\`

### Setup Script

**Location:** `scripts/setup-minio-client.ps1`

**Usage:**
\`\`\`powershell
# Configure alias (if needed)
.\scripts\setup-minio-client.ps1 -Alias "local" -Endpoint "http://10.0.0.5:30090" -AccessKey "..." -SecretKey "..."
\`\`\`

---

## Verification

### ✅ Connection Test

\`\`\`powershell
mc ls local
\`\`\`

**Result:** Successfully lists all 5 buckets:
- flowise
- flowise-dev
- mnky
- poke-mnky
- pokedex-sprites

### ✅ CORS Configuration

\`\`\`powershell
mc admin config get local api | Select-String "cors_allow_origin"
\`\`\`

**Result:** `cors_allow_origin=*` ✅

---

## Current Status

### Buckets

| Bucket | Status | Policy | CORS |
|--------|--------|--------|------|
| `pokedex-sprites` | ✅ Exists | ✅ Public Read | ✅ Global CORS |
| `poke-mnky` | ✅ Exists | ✅ Public Read | ✅ Global CORS |

### Configuration

- ✅ MinIO client installed
- ✅ Alias configured (`local`)
- ✅ Global CORS enabled (`*`)
- ✅ Bucket policies set (public read)
- ✅ Environment variables added

---

## Next Steps

1. **Test CORS in Browser**
   \`\`\`javascript
   // In browser console
   fetch('http://10.0.0.5:30090/pokedex-sprites/test-file.txt')
     .then(r => r.text())
     .then(console.log)
   \`\`\`

2. **Upload Test File**
   \`\`\`powershell
   # Create test file
   "test content" | Out-File test.txt
   
   # Upload via mc
   mc cp test.txt local/pokedex-sprites/test/test.txt
   
   # Or use helper
   Upload-ToMinIO -Bucket "pokedex-sprites" -LocalPath "test.txt" -RemotePath "test/test.txt"
   \`\`\`

3. **Verify Public Access**
   - Open URL: `http://10.0.0.5:30090/pokedex-sprites/test/test.txt`
   - Should display "test content"

4. **Proceed with Sprite Migration**
   - Once CORS is verified working
   - Use `mc` or AWS SDK for bulk uploads

---

## Troubleshooting

### mc command not found

If `mc` is not in PATH, use full path:
\`\`\`powershell
& "$env:USERPROFILE\.mc\mc.exe" ls local
\`\`\`

Or add to PATH:
\`\`\`powershell
$env:Path += ";$env:USERPROFILE\.mc"
\`\`\`

### Connection Errors

1. Verify MinIO server is running
2. Check endpoint URL is correct
3. Verify credentials in `config.json`
4. Test network connectivity: `Test-NetConnection -ComputerName 10.0.0.5 -Port 30090`

### CORS Still Not Working

1. Verify global CORS is set:
   \`\`\`powershell
   mc admin config get local api | Select-String "cors"
   \`\`\`

2. Check if using external endpoint (may need Cloudflare CORS config)

3. Verify bucket policy allows public read:
   \`\`\`powershell
   mc anonymous get-json local/pokedex-sprites
   \`\`\`

---

## References

- [MinIO Client Documentation](https://docs.min.io/docs/minio-client-complete-guide.html)
- [mc admin config](https://docs.min.io/enterprise/aistor-object-store/reference/cli/admin/mc-admin-config/)
- [mc cors commands](https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-cors/)

---

**Last Updated:** January 13, 2026  
**Client Version:** RELEASE.2025-08-13T08-35-41Z  
**Config Location:** `C:\Users\Simeon\mc\config.json`
