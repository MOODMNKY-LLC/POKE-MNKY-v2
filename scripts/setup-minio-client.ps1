# Setup MinIO Client (mc) Configuration
# Configures mc alias for local and external MinIO servers

param(
    [string]$Alias = "local",
    [string]$Endpoint = "",
    [string]$AccessKey = "",
    [string]$SecretKey = ""
)

$mcPath = "$env:USERPROFILE\.mc\mc.exe"

if (-not (Test-Path $mcPath)) {
    Write-Host "❌ mc.exe not found at $mcPath" -ForegroundColor Red
    Write-Host "Please download it first or run the download command" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
$envFile = ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Use provided values or fall back to environment variables
$endpoint = if ($Endpoint) { $Endpoint } else { $env:MINIO_ENDPOINT_INTERNAL }
$accessKey = if ($AccessKey) { $AccessKey } else { $env:MINIO_ACCESS_KEY }
$secretKey = if ($SecretKey) { $SecretKey } else { $env:MINIO_SECRET_KEY }

if (-not $endpoint -or -not $accessKey -or -not $secretKey) {
    Write-Host "❌ Missing required MinIO credentials" -ForegroundColor Red
    Write-Host "Please provide endpoint, accessKey, and secretKey, or set them in .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🔧 Configuring MinIO client alias: $Alias" -ForegroundColor Cyan
Write-Host "   Endpoint: $endpoint" -ForegroundColor Gray
Write-Host "   Access Key: $($accessKey.Substring(0, [Math]::Min(8, $accessKey.Length)))..." -ForegroundColor Gray
Write-Host ""

# Configure alias
& $mcPath alias set $Alias $endpoint $accessKey $secretKey

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Alias '$Alias' configured successfully!" -ForegroundColor Green
    
    # Test connection
    Write-Host "`n🔍 Testing connection..." -ForegroundColor Cyan
    & $mcPath ls $Alias
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Connection test failed. Please check credentials." -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to configure alias" -ForegroundColor Red
    exit 1
}
