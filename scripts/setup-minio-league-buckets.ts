/**
 * Setup MinIO League Buckets - Comprehensive Configuration
 * 
 * Sets up all buckets for league operations based on minio-creative-use-cases.md
 * Uses AWS SDK (S3-compatible) for bucket creation and configuration
 * 
 * Usage:
 *   pnpm tsx scripts/setup-minio-league-buckets.ts [--dry-run]
 */

import { S3Client, CreateBucketCommand, PutBucketPolicyCommand, PutBucketCorsCommand, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false })
const envPath = path.join(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true })
}

// Bucket configurations based on use cases
const BUCKET_CONFIGS = [
  {
    name: "battle-replays",
    description: "Battle Replay Storage & Archive",
    public: false, // Private - authenticated access only
    structure: [
      "season-5/.gitkeep",
      "season-4/.gitkeep",
    ],
  },
  {
    name: "team-exports",
    description: "Team Export/Import Files",
    public: false, // Private - authenticated access only
    structure: [
      "teams/.gitkeep",
      "shared/.gitkeep",
    ],
  },
  {
    name: "league-media",
    description: "League Media Assets (logos, avatars, badges)",
    public: true, // Public read - logos/badges need public access
    structure: [
      "logos/teams/.gitkeep",
      "logos/league/.gitkeep",
      "avatars/coaches/.gitkeep",
      "badges/achievements/.gitkeep",
      "custom-sprites/pokemon/.gitkeep",
    ],
  },
  {
    name: "match-media",
    description: "Match Screenshots & Videos",
    public: false, // Private - authenticated access only
    structure: [
      "screenshots/season-5/.gitkeep",
      "videos/highlights/.gitkeep",
      "evidence/.gitkeep",
    ],
  },
  {
    name: "data-exports",
    description: "Draft Pool & Analytics Exports",
    public: false, // Private - authenticated access only
    structure: [
      "draft-pools/.gitkeep",
      "analytics/.gitkeep",
      "backups/.gitkeep",
    ],
  },
  {
    name: "battle-analytics",
    description: "Battle Statistics & Replay Analysis",
    public: false, // Private - authenticated access only
    structure: [
      "statistics/.gitkeep",
      "replay-analysis/.gitkeep",
    ],
  },
  {
    name: "supabase-backups",
    description: "Supabase Data Backups",
    public: false, // Private - admin only
    structure: [
      "daily/.gitkeep",
      "weekly/.gitkeep",
    ],
  },
  {
    name: "league-docs",
    description: "League Documentation & Assets",
    public: true, // Public read - documentation should be accessible
    structure: [
      "rules/.gitkeep",
      "guides/.gitkeep",
    ],
  },
]

/**
 * Check if bucket exists
 */
async function bucketExists(s3Client: S3Client, bucketName: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
    return true
  } catch {
    return false
  }
}

/**
 * Create bucket if it doesn't exist
 */
async function createBucket(s3Client: S3Client, bucketName: string, dryRun: boolean = false): Promise<boolean> {
  // Check if bucket exists
  const exists = await bucketExists(s3Client, bucketName)
  if (exists) {
    console.log(`   ℹ️  Bucket '${bucketName}' already exists`)
    return true
  }

  if (dryRun) {
    console.log(`   [DRY RUN] Would create bucket '${bucketName}'`)
    return true
  }

  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }))
    console.log(`   ✅ Created bucket '${bucketName}'`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Failed to create bucket '${bucketName}': ${error.message}`)
    return false
  }
}

/**
 * Set bucket policy (public read or private)
 */
async function setBucketPolicy(s3Client: S3Client, bucketName: string, publicRead: boolean, dryRun: boolean = false): Promise<boolean> {
  if (dryRun) {
    console.log(`   [DRY RUN] Would set bucket '${bucketName}' to ${publicRead ? "public read" : "private"}`)
    return true
  }

  try {
    if (publicRead) {
      // Public read policy
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      }
      await s3Client.send(new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      }))
      console.log(`   ✅ Set bucket '${bucketName}' to public read`)
    } else {
      // Private policy (no public access)
      const policy = {
        Version: "2012-10-17",
        Statement: [],
      }
      await s3Client.send(new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      }))
      console.log(`   ✅ Set bucket '${bucketName}' to private`)
    }
    return true
  } catch (error: any) {
    console.error(`   ❌ Failed to set bucket policy: ${error.message}`)
    return false
  }
}

/**
 * Set CORS configuration
 */
async function setCorsConfig(s3Client: S3Client, bucketName: string, dryRun: boolean = false): Promise<boolean> {
  if (dryRun) {
    console.log(`   [DRY RUN] Would set CORS configuration for '${bucketName}'`)
    return true
  }

  try {
    const corsConfig = {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
          MaxAgeSeconds: 3600,
        },
      ],
    }
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig,
    }))
    console.log(`   ✅ Set CORS configuration for '${bucketName}'`)
    return true
  } catch (error: any) {
    console.error(`   ⚠️  Failed to set CORS (non-critical): ${error.message}`)
    return true // Non-critical, continue
  }
}

/**
 * Create folder structure in bucket (using placeholder files)
 */
async function createFolderStructure(s3Client: S3Client, bucketName: string, structure: string[], dryRun: boolean = false): Promise<boolean> {
  if (structure.length === 0) return true

  console.log(`   📁 Creating folder structure...`)
  let allSuccess = true

  for (const folderPath of structure) {
    // Create folder by uploading a placeholder file
    const key = folderPath.replace(/^\//, "")
    
    if (dryRun) {
      console.log(`      [DRY RUN] Would create: ${key}`)
      continue
    }

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: "", // Empty file to create folder structure
        ContentType: "text/plain",
      }))
      console.log(`      ✅ Created: ${key}`)
    } catch (error: any) {
      console.error(`      ❌ Failed to create: ${key} - ${error.message}`)
      allSuccess = false
    }
  }

  return allSuccess
}

/**
 * Configure bucket with all settings
 */
async function configureBucket(
  s3Client: S3Client,
  config: typeof BUCKET_CONFIGS[0],
  dryRun: boolean = false
): Promise<boolean> {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`📦 Configuring: ${config.name}`)
  console.log(`   ${config.description}`)
  console.log("=".repeat(70))

  // Create bucket
  if (!(await createBucket(s3Client, config.name, dryRun))) {
    return false
  }

  // Set bucket policy
  if (!(await setBucketPolicy(s3Client, config.name, config.public, dryRun))) {
    return false
  }

  // Set CORS configuration
  await setCorsConfig(s3Client, config.name, dryRun)

  // Create folder structure
  if (!(await createFolderStructure(s3Client, config.name, config.structure, dryRun))) {
    console.warn(`   ⚠️  Some folders failed to create, but bucket is ready`)
  }

  console.log(`\n   ✅ Bucket '${config.name}' configured successfully!`)
  return true
}

/**
 * Main setup function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  console.log("=".repeat(70))
  console.log("🚀 MinIO League Buckets Setup")
  console.log("=".repeat(70))
  console.log("")
  console.log(`Mode: ${dryRun ? "🔍 DRY RUN (no changes will be made)" : "⚙️  LIVE (changes will be applied)"}`)
  console.log("")

  // Get configuration
  const endpoint = process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY

  console.log("📋 Configuration:")
  console.log(`   Endpoint: ${endpoint || "❌ Not set"}`)
  console.log(`   Access Key: ${accessKey ? "✅ Set" : "❌ Missing"}`)
  console.log(`   Secret Key: ${secretKey ? "✅ Set" : "❌ Missing"}`)
  console.log(`   Buckets to create: ${BUCKET_CONFIGS.length}`)
  console.log("")

  if (!endpoint || !accessKey || !secretKey) {
    console.error("❌ Missing required MinIO credentials")
    console.error("   Please set MINIO_ENDPOINT_INTERNAL, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY")
    process.exit(1)
  }

  // Create S3 client
  const s3Client = new S3Client({
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true, // Required for MinIO
    region: "us-east-1",
    tls: endpoint.startsWith("https"),
  })

  // Test connection
  console.log("🔌 Testing MinIO connection...")
  try {
    const testResult = await s3Client.send(new HeadBucketCommand({ Bucket: "test-connection" }))
    // If we get here, connection works (bucket might not exist, that's OK)
  } catch (error: any) {
    if (error.name === "NotFound" || error.Code === "NoSuchBucket") {
      // This is fine - connection works, bucket just doesn't exist
      console.log("   ✅ Connection successful")
    } else {
      console.error(`   ❌ Connection failed: ${error.message}`)
      process.exit(1)
    }
  }

  // Configure each bucket
  const results: { bucket: string; success: boolean }[] = []
  
  for (const config of BUCKET_CONFIGS) {
    const success = await configureBucket(s3Client, config, dryRun)
    results.push({ bucket: config.name, success })
  }

  // Summary
  console.log("\n" + "=".repeat(70))
  console.log("📊 Setup Summary")
  console.log("=".repeat(70))
  console.log("")

  results.forEach((result) => {
    const config = BUCKET_CONFIGS.find(c => c.name === result.bucket)
    const publicStatus = config?.public ? "🌐 Public" : "🔒 Private"
    console.log(`   ${result.success ? "✅" : "❌"} ${result.bucket.padEnd(25)} ${publicStatus}`)
  })

  const allSuccess = results.every((r) => r.success)
  const successCount = results.filter((r) => r.success).length

  console.log("")
  console.log(`   Configured: ${successCount}/${BUCKET_CONFIGS.length} buckets`)

  if (allSuccess) {
    console.log("\n✅ All buckets configured successfully!")
    console.log("\n📝 Next Steps:")
    console.log("   1. Verify buckets in MinIO console")
    console.log("   2. Test upload/download permissions")
    console.log("   3. Update environment variables if needed")
    console.log("   4. Start using buckets in your application")
    console.log("\n🔗 Bucket URLs:")
    results.forEach((result) => {
      const config = BUCKET_CONFIGS.find(c => c.name === result.bucket)
      if (config?.public && endpoint) {
        const baseUrl = endpoint.replace(/\/$/, "")
        console.log(`   ${config.name}: ${baseUrl}/${config.name}/`)
      }
    })
  } else {
    console.log("\n⚠️  Some buckets failed to configure. Please check errors above.")
    if (!dryRun) {
      process.exit(1)
    }
  }
}

main().catch((error) => {
  console.error("\n❌ Fatal error:", error)
  process.exit(1)
})
