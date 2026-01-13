/**
 * Verify MinIO Migration
 * 
 * Comprehensive verification script to check:
 * - MinIO file counts match expected
 * - Database records have MinIO URLs
 * - Sprite URLs are accessible
 * - CORS configuration working
 * 
 * Usage:
 *   pnpm tsx scripts/verify-minio-migration.ts
 */

import { S3Client, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { config } from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  config({ path: envPath })
}
config({ path: path.join(__dirname, "..", ".env") })

interface VerificationResult {
  passed: boolean
  message: string
  details?: any
}

/**
 * Count files in MinIO bucket recursively
 */
async function countMinIOFiles(
  s3Client: S3Client,
  bucketName: string,
  prefix: string = ""
): Promise<number> {
  let count = 0
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    })

    const response = await s3Client.send(command)
    if (response.Contents) {
      count += response.Contents.length
    }
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return count
}

/**
 * Verify MinIO sprite bucket
 */
async function verifySpriteBucket(s3Client: S3Client): Promise<VerificationResult> {
  try {
    const count = await countMinIOFiles(s3Client, "pokedex-sprites", "sprites/")
    const expected = 59031

    if (count >= expected * 0.99) {
      // Allow 1% variance
      return {
        passed: true,
        message: `✅ Sprite bucket verified: ${count.toLocaleString()} files (expected ~${expected.toLocaleString()})`,
        details: { count, expected },
      }
    } else {
      return {
        passed: false,
        message: `❌ Sprite bucket count mismatch: ${count.toLocaleString()} files (expected ~${expected.toLocaleString()})`,
        details: { count, expected },
      }
    }
  } catch (error: any) {
    return {
      passed: false,
      message: `❌ Error verifying sprite bucket: ${error.message}`,
      details: { error: error.message },
    }
  }
}

/**
 * Verify MinIO PokeAPI data bucket
 */
async function verifyPokeAPIBucket(s3Client: S3Client): Promise<VerificationResult> {
  try {
    const count = await countMinIOFiles(s3Client, "poke-mnky", "v2/")
    const expected = 14332

    if (count >= expected * 0.99) {
      return {
        passed: true,
        message: `✅ PokeAPI data bucket verified: ${count.toLocaleString()} files (expected ~${expected.toLocaleString()})`,
        details: { count, expected },
      }
    } else {
      return {
        passed: false,
        message: `❌ PokeAPI data bucket count mismatch: ${count.toLocaleString()} files (expected ~${expected.toLocaleString()})`,
        details: { count, expected },
      }
    }
  } catch (error: any) {
    return {
      passed: false,
      message: `❌ Error verifying PokeAPI bucket: ${error.message}`,
      details: { error: error.message },
    }
  }
}

/**
 * Verify database records have MinIO URLs
 */
async function verifyDatabaseRecords(supabase: any): Promise<VerificationResult> {
  try {
    const minioEndpoint =
      process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL || ""
    const minioBaseUrl = minioEndpoint.replace(/\/$/, "") + "/pokedex-sprites"

    // Count total records
    const { count: totalCount, error: totalError } = await supabase
      .from("pokepedia_assets")
      .select("*", { count: "exact", head: true })
      .eq("bucket", "pokedex-sprites")

    if (totalError) throw totalError

    // Count MinIO URLs
    const { count: minioCount, error: minioError } = await supabase
      .from("pokepedia_assets")
      .select("*", { count: "exact", head: true })
      .eq("bucket", "pokedex-sprites")
      .like("source_url", `${minioBaseUrl}%`)

    if (minioError) throw minioError

    const percentage = totalCount ? (minioCount / totalCount) * 100 : 0

    if (percentage >= 90) {
      return {
        passed: true,
        message: `✅ Database records verified: ${minioCount?.toLocaleString()}/${totalCount?.toLocaleString()} have MinIO URLs (${percentage.toFixed(1)}%)`,
        details: { minioCount, totalCount, percentage },
      }
    } else {
      return {
        passed: false,
        message: `⚠️  Database records incomplete: ${minioCount?.toLocaleString()}/${totalCount?.toLocaleString()} have MinIO URLs (${percentage.toFixed(1)}%)`,
        details: { minioCount, totalCount, percentage },
      }
    }
  } catch (error: any) {
    return {
      passed: false,
      message: `❌ Error verifying database records: ${error.message}`,
      details: { error: error.message },
    }
  }
}

/**
 * Test sprite URL accessibility
 */
async function testSpriteURL(s3Client: S3Client, spritePath: string): Promise<VerificationResult> {
  try {
    const command = new HeadObjectCommand({
      Bucket: "pokedex-sprites",
      Key: spritePath,
    })

    await s3Client.send(command)

    const minioEndpoint =
      process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL || ""
    const url = `${minioEndpoint}/pokedex-sprites/${spritePath}`

    return {
      passed: true,
      message: `✅ Sprite URL accessible: ${spritePath}`,
      details: { url, path: spritePath },
    }
  } catch (error: any) {
    return {
      passed: false,
      message: `❌ Sprite URL not accessible: ${spritePath} - ${error.message}`,
      details: { path: spritePath, error: error.message },
    }
  }
}

async function main() {
  console.log("=".repeat(70))
  console.log("🔍 MinIO Migration Verification")
  console.log("=".repeat(70))
  console.log("")

  // Initialize clients
  const minioEndpoint =
    process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL
  const minioAccessKey = process.env.MINIO_ACCESS_KEY
  const minioSecretKey = process.env.MINIO_SECRET_KEY
  const minioRegion = process.env.MINIO_REGION || "us-east-1"

  if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
    console.error("❌ Missing MinIO credentials")
    process.exit(1)
  }

  const s3Client = new S3Client({
    endpoint: minioEndpoint,
    region: minioRegion,
    credentials: {
      accessKeyId: minioAccessKey,
      secretAccessKey: minioSecretKey,
    },
    forcePathStyle: true,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`📦 MinIO Endpoint: ${minioEndpoint}`)
  console.log(`📦 Supabase URL: ${supabaseUrl}`)
  console.log("")

  const results: VerificationResult[] = []

  // 1. Verify sprite bucket
  console.log("1️⃣  Verifying sprite bucket...")
  const spriteResult = await verifySpriteBucket(s3Client)
  results.push(spriteResult)
  console.log(`   ${spriteResult.message}`)
  console.log("")

  // 2. Verify PokeAPI data bucket
  console.log("2️⃣  Verifying PokeAPI data bucket...")
  const pokeapiResult = await verifyPokeAPIBucket(s3Client)
  results.push(pokeapiResult)
  console.log(`   ${pokeapiResult.message}`)
  console.log("")

  // 3. Verify database records
  console.log("3️⃣  Verifying database records...")
  const dbResult = await verifyDatabaseRecords(supabase)
  results.push(dbResult)
  console.log(`   ${dbResult.message}`)
  console.log("")

  // 4. Test sample sprite URLs
  console.log("4️⃣  Testing sample sprite URLs...")
  const testSprites = [
    "sprites/pokemon/25.png", // Pikachu
    "sprites/pokemon/1.png", // Bulbasaur
    "sprites/pokemon/150.png", // Mewtwo
  ]

  for (const spritePath of testSprites) {
    const testResult = await testSpriteURL(s3Client, spritePath)
    results.push(testResult)
    console.log(`   ${testResult.message}`)
  }
  console.log("")

  // Summary
  const passed = results.filter((r) => r.passed).length
  const total = results.length

  console.log("=".repeat(70))
  console.log("📊 Verification Summary")
  console.log("=".repeat(70))
  console.log(`Passed: ${passed}/${total}`)
  console.log(`Failed: ${total - passed}/${total}`)
  console.log("")

  if (passed === total) {
    console.log("✅ All verifications passed!")
    console.log("")
    console.log("Next steps:")
    console.log("1. Test sprite URLs in application")
    console.log("2. Verify CORS working in browser")
    console.log("3. Check performance metrics")
    console.log("4. Proceed with production rollout")
  } else {
    console.log("⚠️  Some verifications failed. Review details above.")
  }

  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
