# Cleanup script for port 3000
Write-Host "Checking port 3000..."

# Get processes using port 3000 (excluding system process 0)
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 }
$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique

if ($pids) {
    Write-Host "Found processes on port 3000: $($pids -join ', ')"
    foreach ($pid in $pids) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "Killed process $pid"
        } catch {
            Write-Host "Could not kill process $pid : $_"
        }
    }
} else {
    Write-Host "No user processes found on port 3000"
}

# Remove lock file
$lockFile = ".next\dev\lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    Write-Host "Removed lock file"
} else {
    Write-Host "No lock file found"
}

# Verify port is free
Start-Sleep -Seconds 1
$remaining = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 } | Select-Object -ExpandProperty OwningProcess -Unique

if ($remaining) {
    Write-Host "WARNING: Port 3000 still in use by: $($remaining -join ', ')"
} else {
    Write-Host "SUCCESS: Port 3000 is free - ready to start dev server!"
}
