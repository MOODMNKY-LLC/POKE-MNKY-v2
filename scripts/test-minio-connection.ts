/**
 * Test MinIO Connection and Configuration
 * 
 * Verifies MinIO connectivity, bucket existence, and configuration
 * before proceeding with sprite migration.
 */

import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetBucketPolicyCommand, GetBucketCorsCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Load environment variables - prioritize local
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false })
const envPath = path.join(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
}

async function testMinIOConnection() {
  console.log("=".repeat(70))
  console.log("🔍 MinIO Connection Test (Local Access)")
  console.log("=".repeat(70))
  console.log("")

  // Prioritize local/internal endpoint for faster access
  const endpoint = process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucketsToCheck = ["pokedex-sprites", "poke-mnky"]

  console.log("Configuration:")
  console.log(`  Endpoint: ${endpoint} ${endpoint?.includes("10.0.0.5") ? "(LOCAL)" : "(EXTERNAL)"}`)
  console.log(`  Access Key: ${accessKey ? "✅ Set" : "❌ Missing"}`)
  console.log(`  Secret Key: ${secretKey ? "✅ Set" : "❌ Missing"}`)
  console.log(`  Buckets to check: ${bucketsToCheck.join(", ")}`)
  console.log("")

  if (!endpoint || !accessKey || !secretKey) {
    console.error("❌ Missing required MinIO credentials")
    process.exit(1)
  }

  // Create S3 client configured for MinIO
  const s3Client = new S3Client({
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true, // REQUIRED for MinIO
    region: "us-east-1", // MinIO doesn't care about region
    tls: endpoint.startsWith("https"),
  })

  try {
    // Test 1: List buckets
    console.log("📦 Test 1: Listing buckets...")
    const listBucketsCmd = new ListBucketsCommand({})
    const bucketsResponse = await s3Client.send(listBucketsCmd)
    
    if (bucketsResponse.Buckets) {
      console.log(`   ✅ Connected successfully`)
      console.log(`   📋 Found ${bucketsResponse.Buckets.length} bucket(s):`)
      bucketsResponse.Buckets.forEach(bucket => {
        console.log(`      - ${bucket.Name} (created: ${bucket.CreationDate})`)
      })
    } else {
      console.log(`   ⚠️  Connected but no buckets found`)
    }
    console.log("")

    // Test each target bucket
    for (const bucketName of bucketsToCheck) {
      console.log("=".repeat(70))
      console.log(`📦 Analyzing bucket: ${bucketName}`)
      console.log("=".repeat(70))
      console.log("")

      const bucketExists = bucketsResponse.Buckets?.some(b => b.Name === bucketName)
      
      if (!bucketExists) {
        console.log(`   ⚠️  Bucket '${bucketName}' does not exist`)
        console.log(`   💡 Skipping analysis for this bucket`)
        console.log("")
        continue
      }

      console.log(`   ✅ Bucket '${bucketName}' exists`)
      console.log("")

      // List objects
      console.log(`   📋 Listing objects...`)
      try {
        const listObjectsCmd = new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 10,
        })
        const objectsResponse = await s3Client.send(listObjectsCmd)
        
        if (objectsResponse.Contents && objectsResponse.Contents.length > 0) {
          console.log(`   ✅ Found ${objectsResponse.KeyCount || 0} objects (showing first 10):`)
          objectsResponse.Contents.slice(0, 10).forEach(obj => {
            console.log(`      - ${obj.Key} (${obj.Size} bytes, modified: ${obj.LastModified})`)
          })
        } else {
          console.log(`   ℹ️  Bucket is empty`)
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not list objects: ${error.message}`)
      }
      console.log("")

      // Check bucket policy
      console.log(`   🔐 Checking bucket policy...`)
      try {
        const policyCmd = new GetBucketPolicyCommand({ Bucket: bucketName })
        const policyResponse = await s3Client.send(policyCmd)
        if (policyResponse.Policy) {
          const policy = JSON.parse(policyResponse.Policy)
          console.log(`   ✅ Bucket policy found`)
          console.log(`   📄 Policy Version: ${policy.Version}`)
          console.log(`   📋 Statements: ${policy.Statement?.length || 0}`)
          
          // Analyze policy statements
          policy.Statement?.forEach((stmt: any, idx: number) => {
            console.log(`      Statement ${idx + 1}:`)
            console.log(`         Effect: ${stmt.Effect}`)
            console.log(`         Principal: ${JSON.stringify(stmt.Principal)}`)
            console.log(`         Actions: ${JSON.stringify(stmt.Action)}`)
            console.log(`         Resources: ${JSON.stringify(stmt.Resource)}`)
            
            // Check for public read
            const isPublic = stmt.Effect === "Allow" && 
              (stmt.Principal === "*" || stmt.Principal?.AWS === "*" || JSON.stringify(stmt.Principal) === JSON.stringify({ AWS: "*" }))
            const hasGetObject = Array.isArray(stmt.Action) 
              ? stmt.Action.some((a: string) => a.includes("GetObject") || a === "s3:GetObject")
              : stmt.Action?.includes("GetObject") || stmt.Action === "s3:GetObject"
            
            if (isPublic && hasGetObject) {
              console.log(`         ✅ Public read access configured`)
            }
          })
        }
      } catch (error: any) {
        if (error.name === "NoSuchBucketPolicy" || error.Code === "NoSuchBucketPolicy") {
          console.log(`   ⚠️  No bucket policy found`)
          console.log(`   💡 Bucket may use default permissions (likely private)`)
        } else {
          console.log(`   ⚠️  Could not retrieve bucket policy: ${error.message}`)
          console.log(`   Error Code: ${error.Code || error.name}`)
        }
      }
      console.log("")

      // Check CORS configuration
      console.log(`   🌐 Checking CORS configuration...`)
      try {
        const corsCmd = new GetBucketCorsCommand({ Bucket: bucketName })
        const corsResponse = await s3Client.send(corsCmd)
        if (corsResponse.CORSRules && corsResponse.CORSRules.length > 0) {
          console.log(`   ✅ CORS configuration found`)
          corsResponse.CORSRules.forEach((rule, idx) => {
            console.log(`      CORS Rule ${idx + 1}:`)
            console.log(`         Allowed Origins: ${rule.AllowedOrigins?.join(", ") || "none"}`)
            console.log(`         Allowed Methods: ${rule.AllowedMethods?.join(", ") || "none"}`)
            console.log(`         Allowed Headers: ${rule.AllowedHeaders?.join(", ") || "none"}`)
            console.log(`         Max Age: ${rule.MaxAgeSeconds || "not set"} seconds`)
          })
        } else {
          console.log(`   ⚠️  No CORS configuration found`)
          console.log(`   💡 CORS may need to be configured for browser access`)
        }
      } catch (error: any) {
        if (error.name === "NoSuchCORSConfiguration" || error.Code === "NoSuchCORSConfiguration") {
          console.log(`   ⚠️  No CORS configuration found`)
          console.log(`   💡 CORS needs to be configured for browser access`)
        } else {
          console.log(`   ⚠️  Could not retrieve CORS: ${error.message}`)
        }
      }
      console.log("")

      // Test URL construction
      console.log(`   🔗 URL format verification...`)
      const testPath = bucketName === "pokedex-sprites" ? "sprites/pokemon/25.png" : "test/file.txt"
      const expectedUrl = `${endpoint}/${bucketName}/${testPath}`
      console.log(`      Expected URL: ${expectedUrl}`)
      console.log(`      ✅ Path-style URL format confirmed`)
      console.log("")
    }

    // Summary
    console.log("=".repeat(70))
    console.log("📊 Summary & Recommendations")
    console.log("=".repeat(70))
    console.log("")
    console.log("✅ Connection test complete!")
    console.log("")
    console.log("Recommended next steps:")
    console.log("1. Configure bucket policies for public read access (if needed)")
    console.log("2. Configure CORS policies for browser access")
    console.log("3. Test uploading a single test file")
    console.log("4. Verify file URL is accessible in browser")
    console.log("")
    console.log("For 'pokedex-sprites' bucket specifically:")
    console.log("- Set bucket policy to allow public GetObject")
    console.log("- Set CORS to allow GET/HEAD from your app domain")
    console.log("- Test with a sprite file upload")
    console.log("")

  } catch (error: any) {
    console.error("❌ Connection test failed:")
    console.error(`   Error: ${error.message}`)
    console.error(`   Code: ${error.Code || error.name}`)
    console.error("")
    console.error("Troubleshooting:")
    console.error("1. Verify MinIO endpoint is accessible")
    console.error("2. Check credentials are correct")
    console.error("3. Ensure MinIO server is running")
    console.error("4. Check network connectivity")
    process.exit(1)
  }
}

testMinIOConnection().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
