# MinIO Bucket Configuration Summary

**Date:** January 13, 2026  
**Status:** ✅ Bucket Policies Configured | ⚠️ CORS Needs Manual Setup

---

## Configuration Results

### ✅ Successfully Configured

**Bucket Policies:**
- ✅ `pokedex-sprites` - Public read access configured
- ✅ `poke-mnky` - Public read access configured

Both buckets now have policies allowing public `GetObject` access:
\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::BUCKET_NAME/*"]
    }
  ]
}
\`\`\`

### ⚠️ Requires Manual Configuration

**CORS Configuration:**
- ⚠️ Bucket-level CORS not supported in open-source MinIO
- ⚠️ Requires global CORS configuration or reverse proxy setup

**Reason:** The AWS SDK `PutBucketCorsCommand` failed with "NotImplemented" error because bucket-level CORS is only available in MinIO Enterprise (AIStor). The open-source version requires global CORS configuration.

---

## CORS Configuration Options

### Option 1: Global CORS via MinIO Console (Recommended)

1. **Access MinIO Console:**
   - Local: `http://10.0.0.5:30212`
   - External: `https://s3-console-data.moodmnky.com`

2. **Navigate to Settings → API → CORS:**
   - Set `CORS Allow Origin` to: `*` (or your specific domain)
   - This applies globally to all buckets

3. **Save Configuration**

### Option 2: Global CORS via Environment Variable

If MinIO is running in TrueNAS Scale, you can set:
\`\`\`bash
MINIO_API_CORS_ALLOW_ORIGIN=*
\`\`\`

Or for specific domains:
\`\`\`bash
MINIO_API_CORS_ALLOW_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
\`\`\`

### Option 3: CORS via Reverse Proxy (Nginx/Cloudflare)

Since you're already using Cloudflare, you can configure CORS headers at the Cloudflare level:

**Cloudflare Workers or Transform Rules:**
\`\`\`javascript
// Add CORS headers for MinIO responses
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newResponse = new Response(response.body, response)
  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD')
  newResponse.headers.set('Access-Control-Allow-Headers', '*')
  return newResponse
}
\`\`\`

---

## Verification Steps

### 1. Test Bucket Policy

Run the test script to verify policies:
\`\`\`bash
pnpm tsx scripts/test-minio-connection.ts
\`\`\`

Expected output:
- ✅ Bucket policy found
- ✅ Public read access configured

### 2. Test CORS (After Configuration)

After configuring CORS, test with a browser:

\`\`\`javascript
// In browser console (on your app domain)
fetch('http://10.0.0.5:30090/pokedex-sprites/test-file.txt')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error)
\`\`\`

If CORS is configured correctly, the request should succeed. If not, you'll see a CORS error.

### 3. Test File Upload

Create a test upload script to verify write permissions:

\`\`\`typescript
// Test upload
const testFile = Buffer.from('test content')
const uploadCmd = new PutObjectCommand({
  Bucket: 'pokedex-sprites',
  Key: 'test/test.txt',
  Body: testFile,
})
await s3Client.send(uploadCmd)
\`\`\`

---

## Current Bucket Status

### `pokedex-sprites`
- ✅ Exists
- ✅ Public read policy configured
- ⚠️ CORS needs configuration
- ℹ️ Empty (ready for migration)

### `poke-mnky`
- ✅ Exists
- ✅ Public read policy configured
- ⚠️ CORS needs configuration
- ℹ️ Empty (ready for use)

---

## Next Steps

1. **Configure Global CORS** (Choose one method above)
2. **Test CORS** with browser fetch request
3. **Test File Upload** to verify write permissions
4. **Proceed with Sprite Migration** once CORS is working

---

## SSH Access to TrueNAS (If Needed)

If you need to configure MinIO via SSH:

\`\`\`bash
# SSH into TrueNAS
ssh root@10.0.0.5
# Password: MOODMNKY88

# Check MinIO configuration
# (Location depends on TrueNAS Scale setup)
# Usually in: /mnt/pool/dataset/minio/config/
\`\`\`

---

## Notes

- **Bucket policies are working** - files can be accessed publicly
- **CORS is the blocker** - needs global configuration
- **Cloudflare can help** - if you configure CORS headers there
- **MinIO Console** - easiest way to configure global CORS

---

**Last Updated:** January 13, 2026  
**Test Script:** `scripts/test-minio-connection.ts`  
**Config Script:** `scripts/configure-minio-buckets.ts`
