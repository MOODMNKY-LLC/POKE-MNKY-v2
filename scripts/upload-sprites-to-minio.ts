/**
 * Upload Sprites to MinIO
 * 
 * Uploads sprites from resources/sprites/sprites/ to MinIO bucket (pokedex-sprites).
 * Preserves directory structure and tracks metadata in pokepedia_assets table.
 * 
 * Usage:
 *   pnpm tsx scripts/upload-sprites-to-minio.ts [--dry-run] [--limit=100] [--batch-size=100]
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
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
const SPRITES_DIR = path.join(__dirname, "..", "resources", "sprites", "sprites")
const BUCKET_NAME = "pokedex-sprites"
const DEFAULT_BATCH_SIZE = 100 // Larger batches since no rate limits
const CONCURRENT_UPLOADS = 20 // Upload files concurrently within each batch

interface UploadStats {
  total: number
  uploaded: number
  skipped: number
  errors: number
  startTime: number
}

/**
 * Calculate file checksum (SHA-256)
 */
function calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash("sha256").update(fileBuffer).digest("hex")
}

/**
 * Get MinIO base URL for source_url
 */
function getMinIOBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SPRITES_BASE_URL ||
    process.env.SPRITES_BASE_URL ||
    process.env.MINIO_ENDPOINT_INTERNAL + "/" + BUCKET_NAME ||
    ""
  )
}

/**
 * Upload a single sprite file to MinIO
 */
async function uploadSpriteToMinIO(
  s3Client: S3Client,
  supabase: any,
  filePath: string,
  storagePath: string,
  dryRun: boolean,
  errorLog: string[] = []
): Promise<{ success: boolean; checksum?: string; error?: string; skipped?: boolean }> {
  if (dryRun) {
    console.log(`   [DRY RUN] Would upload: ${storagePath}`)
    return { success: true }
  }

  try {
    const fileBuffer = fs.readFileSync(filePath)
    const checksum = calculateChecksum(filePath)
    const contentType = getContentType(filePath)

    // Check if file already exists in MinIO
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storagePath,
      })
      await s3Client.send(headCommand)
      
      // File exists - check if checksum matches in database
      const { data: existing } = await supabase
        .from("pokepedia_assets")
        .select("sha256")
        .eq("bucket", BUCKET_NAME)
        .eq("path", storagePath)
        .single()

      // Skip if checksum matches
      if (existing?.sha256 === checksum) {
        return { success: true, checksum, skipped: true }
      }
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
      ContentType: contentType,
    })

    await s3Client.send(putCommand)

    // Construct MinIO URL for source_url
    const minioBaseUrl = getMinIOBaseUrl()
    const sourceUrl = minioBaseUrl
      ? `${minioBaseUrl}/${storagePath}`
      : `https://raw.githubusercontent.com/PokeAPI/sprites/master/${storagePath.replace(/^sprites\//, "")}`

    // Update database record
    const { error: metadataError } = await supabase.from("pokepedia_assets").upsert(
      {
        asset_kind: "sprite",
        bucket: BUCKET_NAME,
        path: storagePath,
        source_url: sourceUrl,
        sha256: checksum,
        bytes: fileBuffer.length,
        content_type: contentType,
      },
      {
        onConflict: "bucket,path",
      }
    )

    if (metadataError) {
      console.warn(`⚠️  Failed to record metadata for ${storagePath}:`, metadataError)
    }

    return { success: true, checksum }
  } catch (error: any) {
    const errorMessage = error.message || String(error)
    errorLog.push(`${storagePath}|${errorMessage}`)
    return { success: false, error: errorMessage }
  }
}

/**
 * Get content type from file extension
 */
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const types: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
  }
  return types[ext] || "application/octet-stream"
}

/**
 * Collect all sprite files recursively
 */
function collectSpriteFiles(dir: string, basePath: string = ""): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const relativePath = path.join(basePath, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...collectSpriteFiles(fullPath, relativePath))
    } else if (/\.(png|jpg|jpeg|gif|svg)$/i.test(entry)) {
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
  console.log("🖼️  Upload Sprites to MinIO")
  console.log("=".repeat(70))
  console.log("")

  // Check if sprites directory exists
  if (!fs.existsSync(SPRITES_DIR)) {
    console.error(`❌ Sprites directory not found: ${SPRITES_DIR}`)
    console.error("")
    console.error("Please ensure sprites are available at:")
    console.error(`  ${SPRITES_DIR}`)
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

  // Initialize Supabase client for database updates
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials")
    console.error("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

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

  // Collect sprite files
  console.log("📦 Collecting sprite files...")
  const allFiles = collectSpriteFiles(SPRITES_DIR)
  const files = limit ? allFiles.slice(0, limit) : allFiles

  console.log(`📊 Found ${files.length} sprite files${limit ? ` (limited from ${allFiles.length})` : ""}`)
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
  const errorLogPath = path.join(__dirname, "..", "minio-sprite-upload-errors.log")

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
    const uploadPromises: Promise<void>[] = []
    for (let j = 0; j < batch.length; j += CONCURRENT_UPLOADS) {
      const concurrentBatch = batch.slice(j, j + CONCURRENT_UPLOADS)

      const concurrentPromises = concurrentBatch.map(async (filePath) => {
        const relativePath = path.relative(SPRITES_DIR, filePath)
        const storagePath = `sprites/${relativePath.replace(/\\/g, "/")}`

        const result = await uploadSpriteToMinIO(
          s3Client,
          supabase,
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

      uploadPromises.push(...concurrentPromises)
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
  console.log("✅ Sprite upload to MinIO complete!")
  console.log("")
  console.log("Next steps:")
  const minioBaseUrl = getMinIOBaseUrl()
  if (minioBaseUrl) {
    console.log(`1. Sprites are now available at: ${minioBaseUrl}/sprites/...`)
  }
  console.log("2. Verify sprites are accessible via browser")
  console.log("3. Test sprite URLs in application")
  if (stats.errors > 0) {
    console.log("4. Review error log and retry failed uploads")
  }
  console.log("")
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
