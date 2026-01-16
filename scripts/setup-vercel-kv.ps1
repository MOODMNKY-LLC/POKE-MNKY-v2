# Vercel KV Setup Script
# Opens Vercel Dashboard to Storage section for KV database creation

Write-Host "Setting up Vercel KV Database..." -ForegroundColor Cyan
Write-Host ""

# Project details
$projectId = "prj_vaC0p4lYOlmn16tMUMaVnWFB7rhz"
$projectName = "poke-mnky-v2"
$teamId = "team_4VdnVxvnFkQg6uxXYa1mNpsN"

# Vercel Dashboard URL for Storage
$storageUrl = "https://vercel.com/mood-mnkys-projects/poke-mnky-v2/storage"

Write-Host "Opening Vercel Dashboard Storage section..." -ForegroundColor Yellow
Write-Host "URL: $storageUrl" -ForegroundColor Gray
Write-Host ""

# Open browser
Start-Process $storageUrl

Write-Host "Follow these steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Click Create Database button" -ForegroundColor White
Write-Host "2. Select KV (Key-Value Database)" -ForegroundColor White
Write-Host "3. Configure:" -ForegroundColor White
Write-Host "   - Name: poke-mnky-cache" -ForegroundColor Gray
Write-Host "   - Region: Choose closest to users (e.g. us-east-1)" -ForegroundColor Gray
Write-Host "4. Click Create" -ForegroundColor White
Write-Host ""
Write-Host "Vercel automatically adds KV_URL and KV_REST_API_TOKEN environment variables" -ForegroundColor Green
Write-Host ""
Write-Host "After creating, verify with:" -ForegroundColor Yellow
Write-Host '  vercel env ls | Select-String -Pattern KV' -ForegroundColor Gray
Write-Host ""
