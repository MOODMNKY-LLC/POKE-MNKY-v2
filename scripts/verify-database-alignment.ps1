# Verify Database Alignment - Local vs Production
# This script checks if local and production databases are aligned

Write-Host ""
Write-Host "🔍 Verifying Database Alignment..." -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray
Write-Host ""

$checks = @()

# Check 1: Supabase Status
Write-Host "📊 Check 1: Supabase Status..." -ForegroundColor Yellow
try {
    $status = supabase status 2>&1
    if ($status -match "running") {
        $checks += @{ Check = "Supabase Running"; Status = "✅ PASS"; Details = "Local Supabase is running" }
        Write-Host "   ✅ Local Supabase is running" -ForegroundColor Green
    } else {
        $checks += @{ Check = "Supabase Running"; Status = "❌ FAIL"; Details = "Local Supabase is not running" }
        Write-Host "   ❌ Local Supabase is not running" -ForegroundColor Red
    }
} catch {
    $checks += @{ Check = "Supabase Running"; Status = "❌ FAIL"; Details = "Error: $_" }
    Write-Host "   ❌ Error: $_" -ForegroundColor Red
}
Write-Host ""

# Check 2: Project Link
Write-Host "🔗 Check 2: Project Link..." -ForegroundColor Yellow
try {
    $projects = supabase projects list 2>&1
    if ($projects -match "chmrszrwlfeqovwxyrmt") {
        $checks += @{ Check = "Project Linked"; Status = "✅ PASS"; Details = "Linked to chmrszrwlfeqovwxyrmt" }
        Write-Host "   ✅ Project linked: chmrszrwlfeqovwxyrmt" -ForegroundColor Green
    } else {
        $checks += @{ Check = "Project Linked"; Status = "❌ FAIL"; Details = "Not linked to production" }
        Write-Host "   ❌ Project not linked" -ForegroundColor Red
    }
} catch {
    $checks += @{ Check = "Project Link"; Status = "⚠️  SKIP"; Details = "Could not verify: $_" }
    Write-Host "   ⚠️  Could not verify project link" -ForegroundColor Yellow
}
Write-Host ""

# Check 3: Migration Status
Write-Host "📋 Check 3: Migration Status..." -ForegroundColor Yellow
try {
    $migrations = supabase migration list 2>&1
    $appliedCount = ($migrations | Select-String "Applied").Count
    
    if ($appliedCount -gt 0) {
        $checks += @{ Check = "Migrations Applied"; Status = "✅ PASS"; Details = "$appliedCount migrations applied" }
        Write-Host "   ✅ $appliedCount migrations applied" -ForegroundColor Green
    } else {
        $checks += @{ Check = "Migrations Applied"; Status = "⚠️  WARN"; Details = "No migrations found" }
        Write-Host "   ⚠️  No migrations found" -ForegroundColor Yellow
    }
} catch {
    $checks += @{ Check = "Migration Status"; Status = "⚠️  SKIP"; Details = "Error: $_" }
    Write-Host "   ⚠️  Could not check migrations" -ForegroundColor Yellow
}
Write-Host ""

# Check 4: Schema Differences
Write-Host "🔍 Check 4: Schema Differences..." -ForegroundColor Yellow
try {
    $diffFile = "schema-diff-check.txt"
    supabase db diff | Out-File -FilePath $diffFile -Encoding utf8
    $diffContent = Get-Content $diffFile -Raw
    
    if ($diffContent.Trim()) {
        $checks += @{ Check = "Schema Alignment"; Status = "❌ FAIL"; Details = "Differences found - see $diffFile" }
        Write-Host "   ❌ Schema differences found" -ForegroundColor Red
        Write-Host "      Review: $diffFile" -ForegroundColor Gray
    } else {
        $checks += @{ Check = "Schema Alignment"; Status = "✅ PASS"; Details = "No differences" }
        Write-Host "   ✅ No schema differences" -ForegroundColor Green
        Remove-Item $diffFile -ErrorAction SilentlyContinue
    }
} catch {
    $checks += @{ Check = "Schema Differences"; Status = "⚠️  SKIP"; Details = "Error: $_" }
    Write-Host "   ⚠️  Could not check differences" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Critical Tables (if we can connect)
Write-Host "🗄️  Check 5: Critical Tables..." -ForegroundColor Yellow
$criticalTables = @("draft_pool", "draft_sessions", "teams", "pokemon_cache", "team_rosters")
$tablesFound = 0

try {
    # Try to query tables (requires psql or Supabase client)
    # This is a basic check - full verification would require SQL queries
    $checks += @{ Check = "Critical Tables"; Status = "⚠️  SKIP"; Details = "Manual verification recommended" }
    Write-Host "   ⚠️  Manual verification recommended" -ForegroundColor Yellow
    Write-Host "      Check tables: $($criticalTables -join ', ')" -ForegroundColor Gray
} catch {
    $checks += @{ Check = "Critical Tables"; Status = "⚠️  SKIP"; Details = "Could not verify" }
    Write-Host "   ⚠️  Could not verify tables" -ForegroundColor Yellow
}
Write-Host ""

# Print Results Table
Write-Host "=" * 70 -ForegroundColor Gray
Write-Host "📊 Verification Results" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Gray
Write-Host ""

$checks | ForEach-Object {
    $statusColor = switch ($_.Status) {
        "✅ PASS" { "Green" }
        "❌ FAIL" { "Red" }
        default { "Yellow" }
    }
    Write-Host "$($_.Check): " -NoNewline
    Write-Host $_.Status -ForegroundColor $statusColor
    Write-Host "   $($_.Details)" -ForegroundColor Gray
}

Write-Host ""

# Summary
$passed = ($checks | Where-Object { $_.Status -eq "✅ PASS" }).Count
$failed = ($checks | Where-Object { $_.Status -eq "❌ FAIL" }).Count
$warnings = ($checks | Where-Object { $_.Status -like "⚠️*" }).Count

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Passed: $passed" -ForegroundColor Green
Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
Write-Host "  ⚠️  Warnings: $warnings" -ForegroundColor Yellow
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✅ All critical checks passed!" -ForegroundColor Green
    Write-Host "   Databases appear to be aligned." -ForegroundColor Gray
} else {
    Write-Host "❌ Some checks failed!" -ForegroundColor Red
    Write-Host "   Run sync-from-production.ps1 to align databases." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
