# Chrome DevTools MCP Wrapper Script
# Ensures the correct Node.js version is used

# Use nvm's current Node.js installation directly
$nvmNodePath = Join-Path $env:USERPROFILE "scoop\apps\nvm\current\nodejs\nodejs\node.exe"
$nvmNpxPath = Join-Path $env:USERPROFILE "scoop\apps\nvm\current\nodejs\nodejs\npx.cmd"

# Verify nvm Node exists
if (-not (Test-Path $nvmNodePath)) {
    Write-Host "Error: nvm Node.js not found at $nvmNodePath" -ForegroundColor Red
    Write-Host "Please ensure Node.js is installed via nvm" -ForegroundColor Yellow
    exit 1
}

# Verify Node version
$nodeVersion = & $nvmNodePath --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to get Node version" -ForegroundColor Red
    exit 1
}

# Check if version meets requirements (^20.19.0 || ^22.12.0 || >=23)
$versionMatch = $nodeVersion -match "v(\d+)\.(\d+)\.(\d+)"
if ($versionMatch) {
    $major = [int]$matches[1]
    $minor = [int]$matches[2]
    
    $isValid = ($major -eq 20 -and $minor -ge 19) -or 
               ($major -eq 22 -and $minor -ge 12) -or 
               ($major -ge 23)
    
    if (-not $isValid) {
        Write-Host "Error: Node.js $nodeVersion does not meet chrome-devtools-mcp requirements" -ForegroundColor Red
        Write-Host "Required: ^20.19.0 || ^22.12.0 || >=23" -ForegroundColor Yellow
        Write-Host "Current: $nodeVersion" -ForegroundColor Yellow
        Write-Host "Node path: $nvmNodePath" -ForegroundColor Gray
        exit 1
    }
}

# Set PATH to prioritize nvm's Node directory
$nvmNodeDir = Split-Path $nvmNodePath
$env:PATH = "$nvmNodeDir;$env:PATH"

# Run chrome-devtools-mcp with nvm's npx
& $nvmNpxPath -y chrome-devtools-mcp@latest
