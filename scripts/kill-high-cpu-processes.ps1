# Kill high-CPU Node.js processes
# Usage: .\scripts\kill-high-cpu-processes.ps1

Write-Host "🔍 Checking for high-CPU Node.js processes..." -ForegroundColor Cyan

$highCpuProcs = Get-Process node -ErrorAction SilentlyContinue | Where-Object {$_.CPU -gt 1000}

if ($highCpuProcs) {
    Write-Host "`n⚠️  Found $($highCpuProcs.Count) high-CPU processes:" -ForegroundColor Yellow
    $highCpuProcs | Format-Table Id, CPU, @{Name='Memory(MB)';Expression={[math]::Round($_.WorkingSet/1MB,2)}}, StartTime -AutoSize
    
    Write-Host "`nKilling processes..." -ForegroundColor Yellow
    $highCpuProcs | ForEach-Object {
        try {
            Stop-Process -Id $_.Id -Force
            Write-Host "  ✅ Killed process $($_.Id)" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Could not kill process $($_.Id): $_" -ForegroundColor Yellow
        }
    }
    Write-Host "`n✅ Done!" -ForegroundColor Green
} else {
    Write-Host "✅ No high-CPU processes found" -ForegroundColor Green
}

Write-Host "`n📊 Remaining Node.js processes:" -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Select-Object Id, CPU, @{Name='Memory(MB)';Expression={[math]::Round($_.WorkingSet/1MB,2)}} | Format-Table -AutoSize
