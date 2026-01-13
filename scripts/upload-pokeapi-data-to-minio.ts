/**
 * Upload PokeAPI Data to MinIO
 * 
 * Uploads PokeAPI JSON data from resources/api-data/data/api/ to MinIO bucket (poke-mnky).
 * Preserves directory structure for backup/restore purposes.
 * 
 * Usage:
 *   pnpm tsx scripts/upload-pokeapi-data-to-minio.ts [--dry-run] [--limit=100] [--batch-size=200]
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import { config } from "dotenv"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, "..", ".env.local")
if (fs.existsSync(envPath)) {
  config({ path: envPath })
}
// Also load from .env
config({ path: path.join(__dirname, "..", ".env") })

// Configuration
const API_DATA_DIR = path.join(__dirname, "..", "resources", "api-data", "data", "api")
const BUCKET_NAME = "poke-mnky"
const DEFAULT_BATCH_SIZE = 200 // Larger batches since JSON files are small
const CONCURRENT_UPLOADS = 30 // More concurrent uploads for smaller files

interface UploadStats {
  total: number
  uploaded: number
  skipped: number
  errors: number
  startTime: number
}

/**
 * Upload a single JSON file to MinIO
 */
async function uploadJsonToMinIO(
  s3Client: S3Client,
  filePath: string,
  storagePath: string,
  dryRun: boolean,
  errorLog: string[] = []
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  if (dryRun) {
    console.log(`   [DRY RUN] Would upload: ${storagePath}`)
    return { success: true }
  }

  try {
    const fileBuffer = fs.readFileSync(filePath)

    // Check if file already exists in MinIO
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storagePath,
      })
      await s3Client.send(headCommand)
      
      // File exists - skip
      return { success: true, skipped: true }
    } catch (error: any) {
      // File doesn't exist (404) - proceed with upload
      if (error.name !== "NotFound") {
        throw error
      }
    }

    // Upload to MinIO
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storagePath,
      Body: fileBuffer,
      ContentType: "application/json",
    })

    await s3Client.send(putCommand)

    return { success: true }
  } catch (error: any) {
    const errorMessage = error.message || String(error)
    errorLog.push(`${storagePath}|${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

/**
 * Collect all JSON files recursively
 */
function collectJsonFiles(dir: string, basePath: string = ""): string[] {
  const files: string[] = []
  
  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const relativePath = path.join(basePath, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...collectJsonFiles(fullPath, relativePath))
    } else if (entry.toLowerCase().endsWith(".json")) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Format elapsed time
 */
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

async function main() {
  console.log("=".repeat(70))
  console.log("📦 Upload PokeAPI Data to MinIO")
  console.log("=".repeat(70))
  console.log("")

  // Check if API data directory exists
  if (!fs.existsSync(API_DATA_DIR)) {
    console.error(`❌ API data directory not found: ${API_DATA_DIR}`)
    console.error("")
    console.error("Please ensure PokeAPI data is available at:")
    console.error(`  ${API_DATA_DIR}`)
    console.error("")
    process.exit(1)
  }

  // Initialize MinIO S3 client
  const minioEndpoint =
    process.env.MINIO_ENDPOINT_INTERNAL || process.env.MINIO_ENDPOINT_EXTERNAL
  const minioAccessKey = process.env.MINIO_ACCESS_KEY
  const minioSecretKey = process.env.MINIO_SECRET_KEY
  const minioRegion = process.env.MINIO_REGION || "us-east-1"

  if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
    console.error("❌ Missing MinIO credentials")
    console.error("   Set MINIO_ENDPOINT_INTERNAL, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY")
    process.exit(1)
  }

  const s3Client = new S3Client({
    endpoint: minioEndpoint,
    region: minioRegion,
    credentials: {
      accessKeyId: minioAccessKey,
      secretAccessKey: minioSecretKey,
    },
    forcePathStyle: true, // Required for MinIO
  })

  console.log(`📦 MinIO Endpoint: ${minioEndpoint}`)
  console.log(`📦 Bucket: ${BUCKET_NAME}`)
  console.log("")

  // Parse command line arguments
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const limitArg = args.find((a) => a.startsWith("--limit="))
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined
  const batchSizeArg = args.find((a) => a.startsWith("--batch-size="))
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split("=")[1]) : DEFAULT_BATCH_SIZE

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No files will be uploaded")
    console.log("")
  }

  // Collect JSON files
  console.log("📦 Collecting JSON files...")
  const allFiles = collectJsonFiles(API_DATA_DIR)
  const files = limit ? allFiles.slice(0, limit) : allFiles

  console.log(`📊 Found ${files.length} JSON files${limit ? ` (limited from ${allFiles.length})` : ""}`)
  console.log(`📊 Batch size: ${batchSize} files`)
  console.log(`📊 Concurrent uploads per batch: ${CONCURRENT_UPLOADS}`)
  console.log("")

  const stats: UploadStats = {
    total: files.length,
    uploaded: 0,
    skipped: 0,
    errors: 0,
    startTime: Date.now(),
  }

  // Error log for failed uploads
  const errorLog: string[] = []
  const errorLogPath = path.join(__dirname, "..", "minio-pokeapi-upload-errors.log")

  // Upload in batches with concurrent uploads
  const totalBatches = Math.ceil(files.length / batchSize)
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const progress = ((i / files.length) * 100).toFixed(1)

    console.log(
      `📤 Batch ${batchNumber}/${totalBatches} (${batch.length} files) - Progress: ${progress}%`
    )

    // Process batch with concurrency
    for (let j = 0; j < batch.length; j += CONCURRENT_UPLOADS) {
      const concurrentBatch = batch.slice(j, j + CONCURRENT_UPLOADS)

      const concurrentPromises = concurrentBatch.map(async (filePath) => {
        const relativePath = path.relative(API_DATA_DIR, filePath)
        const storagePath = relativePath.replace(/\\/g, "/")

        const result = await uploadJsonToMinIO(
          s3Client,
          filePath,
          storagePath,
          dryRun,
          errorLog
        )

        if (result.success) {
          if (result.skipped) {
            stats.skipped++
          } else {
            stats.uploaded++
          }
        } else {
          stats.errors++
        }
      })

      await Promise.all(concurrentPromises)
    }

    // Progress update
    const elapsed = Date.now() - stats.startTime
    const rate = stats.uploaded / (elapsed / 1000) // files per second
    const remaining = files.length - i - batch.length
    const estimatedTime = remaining / rate

    console.log(
      `   ✅ Batch complete: ${stats.uploaded} uploaded, ${stats.skipped} skipped, ${stats.errors} errors`
    )
    if (remaining > 0 && rate > 0) {
      console.log(
        `   ⏱️  Rate: ${rate.toFixed(1)} files/sec | Est. remaining: ${formatElapsedTime(estimatedTime * 1000)}`
      )
    }
    console.log("")
  }

  // Summary
  const totalTime = Date.now() - stats.startTime
  console.log("=".repeat(70))
  console.log("📊 Upload Summary")
  console.log("=".repeat(70))
  console.log(`Total files: ${stats.total}`)
  console.log(`Uploaded: ${stats.uploaded}`)
  console.log(`Skipped (already exists): ${stats.skipped}`)
  console.log(`Errors: ${stats.errors}`)
  console.log(`Total time: ${formatElapsedTime(totalTime)}`)
  console.log(`Average rate: ${((stats.uploaded / totalTime) * 1000).toFixed(1)} files/sec`)

  // Write error log if there are errors
  if (errorLog.length > 0 && !dryRun) {
    fs.writeFileSync(errorLogPath, errorLog.join("\n"))
    console.log("")
    console.log(`⚠️  Error log written to: ${errorLogPath}`)
    console.log(`   ${errorLog.length} failed files logged`)
  }

  console.log("")
  console.log("✅ PokeAPI data upload to MinIO complete!")
  console.log("")
  console.log("Next steps:")
  const minioBaseUrl = minioEndpoint.replace(/\/$/, "") + "/" + BUCKET_NAME
  console.log(`1. Data is now available at: ${minioBaseUrl}/api/...`)
  console.log("2. This data can be used for backup/restore purposes")
  console.log("3. Can be used for future syncs or data recovery")
  if (stats.errors > 0) {
    console.log("4. Review error log and retry failed uploads")
  }
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
