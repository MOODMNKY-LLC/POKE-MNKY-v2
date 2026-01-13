# MinIO Configuration Manager
# Handles import/export of MinIO server configuration

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("export", "import", "verify")]
    [string]$Action = "verify",
    
    [Parameter(Mandatory=$false)]
    [string]$ConfigFile = "",
    
    [Parameter(Mandatory=$false)]
    [string]$Alias = "local"
)

$mcPath = "$env:USERPROFILE\.mc\mc.exe"

if (-not (Test-Path $mcPath)) {
    Write-Host "❌ mc.exe not found at $mcPath" -ForegroundColor Red
    exit 1
}

function Export-MinIOConfig {
    param([string]$Alias, [string]$OutputFile)
    
    Write-Host "📤 Exporting MinIO configuration..." -ForegroundColor Cyan
    Write-Host "   Alias: $Alias" -ForegroundColor Gray
    Write-Host "   Output: $OutputFile" -ForegroundColor Gray
    Write-Host ""
    
    # Export all configuration
    & $mcPath admin config export $Alias | Out-File -FilePath $OutputFile -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Configuration exported successfully!" -ForegroundColor Green
        Write-Host "   File: $OutputFile" -ForegroundColor Gray
        
        # Show key settings
        Write-Host "`n📋 Key Settings:" -ForegroundColor Cyan
        Get-Content $OutputFile | Select-String -Pattern "cors_allow_origin|site name|region" | ForEach-Object {
            Write-Host "   $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Failed to export configuration" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Import-MinIOConfig {
    param([string]$Alias, [string]$ConfigFile)
    
    if (-not (Test-Path $ConfigFile)) {
        Write-Host "❌ Config file not found: $ConfigFile" -ForegroundColor Red
        return $false
    }
    
    Write-Host "📥 Importing MinIO configuration..." -ForegroundColor Cyan
    Write-Host "   Alias: $Alias" -ForegroundColor Gray
    Write-Host "   Config File: $ConfigFile" -ForegroundColor Gray
    Write-Host ""
    
    # Show what will be imported
    Write-Host "📋 Configuration Preview:" -ForegroundColor Yellow
    Get-Content $ConfigFile | Select-String -Pattern "cors_allow_origin|site name|region" | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Confirm before importing
    $confirm = Read-Host "⚠️  This will update the MinIO server configuration. Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "❌ Import cancelled" -ForegroundColor Yellow
        return $false
    }
    
    # Import configuration
    Get-Content $ConfigFile | & $mcPath admin config import $Alias
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Configuration imported successfully!" -ForegroundColor Green
        Write-Host "`n💡 Note: Some settings may require server restart to take effect" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to import configuration" -ForegroundColor Red
        return $false
    }
    
    return $true
}

function Verify-MinIOConfig {
    param([string]$Alias)
    
    Write-Host "🔍 Verifying MinIO Configuration" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Gray
    Write-Host ""
    
    # Check connection
    Write-Host "1. Connection Test:" -ForegroundColor Yellow
    & $mcPath ls $Alias | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Connected successfully" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Connection failed" -ForegroundColor Red
        return
    }
    Write-Host ""
    
    # List buckets
    Write-Host "2. Buckets:" -ForegroundColor Yellow
    $buckets = & $mcPath ls $Alias
    $bucketCount = ($buckets | Measure-Object).Count
    Write-Host "   ✅ Found $bucketCount bucket(s)" -ForegroundColor Green
    $buckets | ForEach-Object {
        $name = ($_ -split '\s+')[-1] -replace '/$', ''
        Write-Host "      - $name" -ForegroundColor Gray
    }
    Write-Host ""
    
    # Check CORS
    Write-Host "3. Global CORS Configuration:" -ForegroundColor Yellow
    $corsConfig = & $mcPath admin config get $Alias api | Select-String "cors_allow_origin"
    if ($corsConfig) {
        Write-Host "   ✅ CORS configured: $corsConfig" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  CORS not found in config" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # Check bucket policies
    Write-Host "4. Bucket Policies:" -ForegroundColor Yellow
    $targetBuckets = @("pokedex-sprites", "poke-mnky")
    foreach ($bucket in $targetBuckets) {
        $policy = & $mcPath anonymous get-json "$Alias/$bucket" 2>$null
        if ($policy) {
            $policyObj = $policy | ConvertFrom-Json
            $hasPublicRead = $policyObj.Statement | Where-Object {
                $_.Effect -eq "Allow" -and 
                ($_.Principal.AWS -contains "*" -or $_.Principal -eq "*") -and
                $_.Action -contains "s3:GetObject"
            }
            if ($hasPublicRead) {
                Write-Host "   ✅ $bucket : Public read enabled" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  $bucket : Public read not configured" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️  $bucket : No policy found" -ForegroundColor Yellow
        }
    }
    Write-Host ""
    
    # Check site/region config
    Write-Host "5. Site/Region Configuration:" -ForegroundColor Yellow
    $siteConfig = & $mcPath admin config get $Alias site 2>$null
    if ($siteConfig) {
        Write-Host "   Site Config:" -ForegroundColor Gray
        $siteConfig | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
    } else {
        Write-Host "   ℹ️  No site configuration found" -ForegroundColor Gray
    }
    Write-Host ""
    
    Write-Host ("=" * 70) -ForegroundColor Gray
    Write-Host "✅ Verification Complete" -ForegroundColor Green
}

# Main execution
switch ($Action) {
    "export" {
        if (-not $ConfigFile) {
            $timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
            $ConfigFile = "temp\minio-server-config-$timestamp.conf"
        }
        Export-MinIOConfig -Alias $Alias -OutputFile $ConfigFile
    }
    "import" {
        if (-not $ConfigFile) {
            Write-Host "❌ ConfigFile parameter required for import" -ForegroundColor Red
            exit 1
        }
        Import-MinIOConfig -Alias $Alias -ConfigFile $ConfigFile
    }
    "verify" {
        Verify-MinIOConfig -Alias $Alias
    }
    default {
        Write-Host "Usage: .\minio-config-manager.ps1 -Action <export|import|verify> [-ConfigFile <path>] [-Alias <alias>]" -ForegroundColor Yellow
    }
}
