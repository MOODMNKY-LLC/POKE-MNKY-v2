# Test Poképedia Sync System
# Tests the queue-based sync system end-to-end

$baseUrl = "http://127.0.0.1:54321/functions/v1"
$serviceRoleKey = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

Write-Host "🧪 Testing Poképedia Sync System" -ForegroundColor Cyan
Write-Host ""

# Test 1: Seed with one resource type (types - only 20 items)
Write-Host "1️⃣ Testing pokepedia-seed with 'type' resource..." -ForegroundColor Yellow
$seedBody = @{
    resourceTypes = @("type")
    limit = 20
} | ConvertTo-Json

try {
    $seedResponse = Invoke-RestMethod -Uri "$baseUrl/pokepedia-seed" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        } `
        -Body $seedBody
    
    Write-Host "✅ Seed successful!" -ForegroundColor Green
    Write-Host "   Total enqueued: $($seedResponse.totalEnqueued)" -ForegroundColor Gray
    Write-Host "   Per type: $($seedResponse.perType | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Seed failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 2: Process worker
Write-Host "2️⃣ Testing pokepedia-worker..." -ForegroundColor Yellow
$workerBody = @{
    batchSize = 5
    concurrency = 2
    enqueueSprites = $false
} | ConvertTo-Json

try {
    $workerResponse = Invoke-RestMethod -Uri "$baseUrl/pokepedia-worker" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        } `
        -Body $workerBody
    
    Write-Host "✅ Worker successful!" -ForegroundColor Green
    Write-Host "   Processed: $($workerResponse.processed.Count)" -ForegroundColor Gray
    Write-Host "   Failed: $($workerResponse.failed.Count)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Worker failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Test 3: Verify data in database
Write-Host "3️⃣ Verifying data in database..." -ForegroundColor Yellow
Write-Host "   (Check Supabase Studio or run SQL query)" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Check /admin for Poképedia Sync Status" -ForegroundColor Gray
Write-Host "  2. Verify data in pokeapi_resources table" -ForegroundColor Gray
Write-Host "  3. Run full seed: Seed all resource types" -ForegroundColor Gray
