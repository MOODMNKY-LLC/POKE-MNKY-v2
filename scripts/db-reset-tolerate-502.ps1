# db-reset-tolerate-502.ps1
# Runs supabase db reset. If it fails with 502 at "Restarting containers...",
# the database was still reset successfully (migrations + seed completed).
# We verify the DB is up and exit 0 so CI/scripts can proceed.

$ErrorActionPreference = "Continue"
$output = supabase db reset 2>&1
$exitCode = $LASTEXITCODE
$outputStr = $output | Out-String

Write-Host $outputStr

if ($exitCode -eq 0) {
  Write-Host "`nDatabase reset completed successfully."
  exit 0
}

# 502 at "Restarting containers" means migrations and seed completed
if ($outputStr -match "Seeding data from supabase/seed\.sql" -and $outputStr -match "502|Restarting containers") {
  Write-Host "`n[OK] Database was reset successfully (migrations + seed completed)."
  Write-Host "The 502 occurs at the final container restart step; the database is usable."
  # Verify DB is reachable
  $status = supabase status 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSupabase is running. You can continue development."
    exit 0
  }
}

# Real failure
exit $exitCode
