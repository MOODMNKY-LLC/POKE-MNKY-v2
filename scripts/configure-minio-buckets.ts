/**
 * Configure MinIO Buckets for Public Access
 * 
 * Sets up bucket policies and CORS for pokedex-sprites and poke-mnky buckets
 * to enable public read access and browser compatibility.
 */

import { S3Client, PutBucketPolicyCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Load environment variables - prioritize local
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false })
const envPath = path.join(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
}

// Public read bucket policy for sprites/assets
const publicReadPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: ["arn:aws:s3:::BUCKET_NAME/*"],
    },
  ],
}

// CORS configuration for browser access
const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: ["*"], // Allow all origins - adjust if needed for security
      AllowedMethods: ["GET", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
      MaxAgeSeconds: 3600,
    },
  ],
}

async function configureBucket(
  s3Client: S3Client,
  bucketName: string,
  makePublic: boolean = true,
) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`⚙️  Configuring bucket: ${bucketName}`)
  console.log("=".repeat(70))
  console.log("")

  // Set bucket policy for public read
  if (makePublic) {
    console.log(`   🔐 Setting bucket policy for public read access...`)
    try {
      const policy = JSON.stringify(publicReadPolicy).replace(/BUCKET_NAME/g, bucketName)
      const policyCmd = new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: policy,
      })
      await s3Client.send(policyCmd)
      console.log(`   ✅ Bucket policy configured successfully`)
      console.log(`   📄 Policy allows public GetObject access`)
    } catch (error: any) {
      console.error(`   ❌ Failed to set bucket policy: ${error.message}`)
      console.error(`   Error Code: ${error.Code || error.name}`)
      return false
    }
  } else {
    console.log(`   ⏭️  Skipping bucket policy (makePublic=false)`)
  }

  // Set CORS configuration
  console.log(`   🌐 Setting CORS configuration...`)
  try {
    const corsCmd = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfiguration,
    })
    await s3Client.send(corsCmd)
    console.log(`   ✅ CORS configuration set successfully`)
    console.log(`   📋 Allowed: GET, HEAD from any origin`)
    console.log(`   ⏱️  Max Age: 3600 seconds`)
  } catch (error: any) {
    console.error(`   ❌ Failed to set CORS: ${error.message}`)
    console.error(`   Error Code: ${error.Code || error.name}`)
    return false
  }

  console.log(`\n   ✅ Bucket '${bucketName}' configured successfully!`)
  return true
}

async function main() {
  console.log("=".repeat(70))
  console.log("🔧 MinIO Bucket Configuration Script")
  console.log("=".repeat(70))
  console.log("")

  // Get configuration
  const endpoint = process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  const bucketsToConfigure = [
    { name: "pokedex-sprites", public: true },
    { name: "poke-mnky", public: true }, // Set to false if this should be private
  ]

  console.log("Configuration:")
  console.log(`  Endpoint: ${endpoint} ${endpoint?.includes("10.0.0.5") ? "(LOCAL)" : "(EXTERNAL)"}`)
  console.log(`  Access Key: ${accessKey ? "✅ Set" : "❌ Missing"}`)
  console.log(`  Secret Key: ${secretKey ? "✅ Set" : "❌ Missing"}`)
  console.log(`  Buckets to configure: ${bucketsToConfigure.map(b => b.name).join(", ")}`)
  console.log("")

  if (!endpoint || !accessKey || !secretKey) {
    console.error("❌ Missing required MinIO credentials")
    process.exit(1)
  }

  // Create S3 client
  const s3Client = new S3Client({
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
    region: "us-east-1",
    tls: endpoint.startsWith("https"),
  })

  // Configure each bucket
  const results: { bucket: string; success: boolean }[] = []
  for (const bucketConfig of bucketsToConfigure) {
    const success = await configureBucket(s3Client, bucketConfig.name, bucketConfig.public)
    results.push({ bucket: bucketConfig.name, success })
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Configuration Summary")
  console.log("=".repeat(70))
  console.log("")

  results.forEach((result) => {
    console.log(`   ${result.success ? "✅" : "❌"} ${result.bucket}: ${result.success ? "Configured" : "Failed"}`)
  })

  const allSuccess = results.every((r) => r.success)
  if (allSuccess) {
    console.log("\n✅ All buckets configured successfully!")
    console.log("\nNext steps:")
    console.log("1. Test uploading a file to verify permissions")
    console.log("2. Test accessing a file URL in browser to verify CORS")
    console.log("3. Run sprite migration script when ready")
  } else {
    console.log("\n⚠️  Some buckets failed to configure. Please check errors above.")
    process.exit(1)
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})
