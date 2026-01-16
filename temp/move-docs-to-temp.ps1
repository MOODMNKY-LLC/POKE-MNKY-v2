# PowerShell script to move all markdown documentation files to temp/ directory
# Excludes README.md and POKE-MNKY-V3-FIRST-PRINCIPLES-REPORT.md

$excludeFiles = @('README.md', 'POKE-MNKY-V3-FIRST-PRINCIPLES-REPORT.md')

Get-ChildItem -Path . -Filter *.md -File | 
    Where-Object { $excludeFiles -notcontains $_.Name } | 
    ForEach-Object {
        Write-Host "Moving: $($_.Name)"
        Move-Item -Path $_.FullName -Destination "temp\" -Force
    }

Write-Host "`nDone! All documentation files moved to temp/ directory."
