# Add Missing Environment Variables to Vercel
# Variables that need to be added: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, NEXT_PUBLIC_SUPABASE_PROJECT_REF, NEXT_PUBLIC_ENABLE_AI_QUERIES, MINIO_SERVER_LOCATION

Write-Host "Adding missing environment variables to Vercel..." -ForegroundColor Cyan
Write-Host ""

# Read values from .env.local
$envContent = Get-Content .env.local -Raw

# Extract values
$googlePrivateKey = ($envContent -match 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="([^"]+)"') | ForEach-Object { $matches[1] }
$supabaseProjectRef = ($envContent -match 'NEXT_PUBLIC_SUPABASE_PROJECT_REF=([^\r\n]+)') | ForEach-Object { $matches[1] } | Select-Object -Last 1
$enableAIQueries = ($envContent -match 'NEXT_PUBLIC_ENABLE_AI_QUERIES=([^\r\n]+)') | ForEach-Object { $matches[1] }
$minioLocation = ($envContent -match 'MINIO_SERVER_LOCATION=([^\r\n]+)') | ForEach-Object { $matches[1] }

Write-Host "Found values:" -ForegroundColor Yellow
Write-Host "  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: $($googlePrivateKey -ne $null ? 'Found' : 'Missing')"
Write-Host "  NEXT_PUBLIC_SUPABASE_PROJECT_REF: $supabaseProjectRef"
Write-Host "  NEXT_PUBLIC_ENABLE_AI_QUERIES: $enableAIQueries"
Write-Host "  MINIO_SERVER_LOCATION: $minioLocation"
Write-Host ""

Write-Host "To add these variables, run:" -ForegroundColor Green
Write-Host ""
Write-Host "# Add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (use the value from .env.local)"
Write-Host 'vercel env add GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY production'
Write-Host ""
Write-Host "# Add NEXT_PUBLIC_SUPABASE_PROJECT_REF"
Write-Host "vercel env add NEXT_PUBLIC_SUPABASE_PROJECT_REF production $supabaseProjectRef"
Write-Host ""
Write-Host "# Add NEXT_PUBLIC_ENABLE_AI_QUERIES"
Write-Host "vercel env add NEXT_PUBLIC_ENABLE_AI_QUERIES production $enableAIQueries"
Write-Host ""
Write-Host "# Add MINIO_SERVER_LOCATION"
Write-Host "vercel env add MINIO_SERVER_LOCATION production $minioLocation"
Write-Host ""

Write-Host "Note: For GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, you'll need to paste the value when prompted." -ForegroundColor Yellow
Write-Host "      Copy it from .env.local (the value between quotes)" -ForegroundColor Yellow
