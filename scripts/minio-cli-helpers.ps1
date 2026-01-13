# MinIO CLI Helper Functions
# Provides convenient PowerShell functions for common MinIO operations

$mcPath = "$env:USERPROFILE\.mc\mc.exe"
$alias = "local"

function Get-MinIOClient {
    if (-not (Test-Path $mcPath)) {
        Write-Host "❌ mc.exe not found. Please install it first." -ForegroundColor Red
        return $null
    }
    return $mcPath
}

function Test-MinIOConnection {
    <#
    .SYNOPSIS
    Tests connection to MinIO server
    #>
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    Write-Host "🔍 Testing MinIO connection..." -ForegroundColor Cyan
    & $mc ls $alias
}

function Get-MinIOBuckets {
    <#
    .SYNOPSIS
    Lists all buckets in MinIO
    #>
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    & $mc ls $alias
}

function Get-MinIOBucketPolicy {
    <#
    .SYNOPSIS
    Gets bucket policy for a specific bucket
    .PARAMETER Bucket
    Name of the bucket
    #>
    param([string]$Bucket)
    
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    & $mc anonymous get-json "$alias/$Bucket"
}

function Set-MinIOBucketPublic {
    <#
    .SYNOPSIS
    Sets a bucket to public read access
    .PARAMETER Bucket
    Name of the bucket
    #>
    param([string]$Bucket)
    
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    Write-Host "🔐 Setting bucket '$Bucket' to public read..." -ForegroundColor Cyan
    & $mc anonymous set download "$alias/$Bucket"
}

function Get-MinIOCORS {
    <#
    .SYNOPSIS
    Gets global CORS configuration
    #>
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    & $mc admin config get $alias api | Select-String "cors_allow_origin"
}

function Set-MinIOCORS {
    <#
    .SYNOPSIS
    Sets global CORS configuration
    .PARAMETER Origins
    Comma-separated list of allowed origins (use "*" for all)
    #>
    param([string]$Origins = "*")
    
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    Write-Host "🌐 Setting CORS allowed origins to: $Origins" -ForegroundColor Cyan
    & $mc admin config set $alias api cors_allow_origin="$Origins"
}

function Upload-ToMinIO {
    <#
    .SYNOPSIS
    Uploads a file to MinIO
    .PARAMETER Bucket
    Name of the bucket
    .PARAMETER LocalPath
    Local file path
    .PARAMETER RemotePath
    Remote object path in bucket
    #>
    param(
        [string]$Bucket,
        [string]$LocalPath,
        [string]$RemotePath
    )
    
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    if (-not (Test-Path $LocalPath)) {
        Write-Host "❌ Local file not found: $LocalPath" -ForegroundColor Red
        return
    }
    
    Write-Host "📤 Uploading $LocalPath to $Bucket/$RemotePath..." -ForegroundColor Cyan
    & $mc cp $LocalPath "$alias/$Bucket/$RemotePath"
}

function Download-FromMinIO {
    <#
    .SYNOPSIS
    Downloads a file from MinIO
    .PARAMETER Bucket
    Name of the bucket
    .PARAMETER RemotePath
    Remote object path in bucket
    .PARAMETER LocalPath
    Local destination path
    #>
    param(
        [string]$Bucket,
        [string]$RemotePath,
        [string]$LocalPath
    )
    
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    Write-Host "📥 Downloading $Bucket/$RemotePath to $LocalPath..." -ForegroundColor Cyan
    & $mc cp "$alias/$Bucket/$RemotePath" $LocalPath
}

function List-MinIOObjects {
    <#
    .SYNOPSIS
    Lists objects in a bucket
    .PARAMETER Bucket
    Name of the bucket
    .PARAMETER Prefix
    Optional prefix to filter objects
    #>
    param(
        [string]$Bucket,
        [string]$Prefix = ""
    )
    
    $mc = Get-MinIOClient
    if (-not $mc) { return }
    
    $path = if ($Prefix) { "$alias/$Bucket/$Prefix" } else { "$alias/$Bucket" }
    & $mc ls -r $path
}

# Export functions
Export-ModuleMember -Function Test-MinIOConnection, Get-MinIOBuckets, Get-MinIOBucketPolicy, Set-MinIOBucketPublic, Get-MinIOCORS, Set-MinIOCORS, Upload-ToMinIO, Download-FromMinIO, List-MinIOObjects

Write-Host "✅ MinIO CLI helpers loaded!" -ForegroundColor Green
Write-Host "Available functions:" -ForegroundColor Cyan
Write-Host "  Test-MinIOConnection" -ForegroundColor Gray
Write-Host "  Get-MinIOBuckets" -ForegroundColor Gray
Write-Host "  Get-MinIOBucketPolicy -Bucket <name>" -ForegroundColor Gray
Write-Host "  Set-MinIOBucketPublic -Bucket <name>" -ForegroundColor Gray
Write-Host "  Get-MinIOCORS" -ForegroundColor Gray
Write-Host "  Set-MinIOCORS -Origins <origins>" -ForegroundColor Gray
Write-Host "  Upload-ToMinIO -Bucket <name> -LocalPath <path> -RemotePath <path>" -ForegroundColor Gray
Write-Host "  Download-FromMinIO -Bucket <name> -RemotePath <path> -LocalPath <path>" -ForegroundColor Gray
Write-Host "  List-MinIOObjects -Bucket <name> [-Prefix <prefix>]" -ForegroundColor Gray
