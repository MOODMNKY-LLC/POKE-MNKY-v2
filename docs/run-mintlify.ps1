# Mintlify Dev Server Script
# Uses Node.js LTS via nvm or provides instructions

Write-Host "🚀 Starting Mintlify Dev Server..." -ForegroundColor Cyan

# Check if nvm is available
$nvmAvailable = Get-Command nvm -ErrorAction SilentlyContinue

if ($nvmAvailable) {
    Write-Host "✅ NVM detected. Switching to Node.js LTS..." -ForegroundColor Green
    nvm use 20.11.0 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Node.js 20.11.0 not installed. Installing..." -ForegroundColor Yellow
        nvm install 20.11.0
        nvm use 20.11.0
    }
    
    $nodeVersion = node --version
    Write-Host "✅ Using Node.js $nodeVersion" -ForegroundColor Green
    
    Write-Host "`n📚 Starting Mintlify on port 3333..." -ForegroundColor Cyan
    mint dev --port 3333
} else {
    Write-Host "❌ NVM not found. Please install NVM for Windows:" -ForegroundColor Red
    Write-Host "   Download: https://github.com/coreybutler/nvm-windows/releases" -ForegroundColor Yellow
    Write-Host "   Or use: winget install CoreyButler.NVMforWindows" -ForegroundColor Yellow
    Write-Host "`nThen run:" -ForegroundColor Yellow
    Write-Host "   nvm install 20.11.0" -ForegroundColor Cyan
    Write-Host "   nvm use 20.11.0" -ForegroundColor Cyan
    Write-Host "   mint dev --port 3333" -ForegroundColor Cyan
    Write-Host "`nAlternatively, use Docker:" -ForegroundColor Yellow
    Write-Host "   docker run -it --rm -v `$PWD:/docs -p 3333:3333 -w /docs node:20-alpine sh -c 'npm install -g mint && mint dev --port 3333'" -ForegroundColor Cyan
    exit 1
}
