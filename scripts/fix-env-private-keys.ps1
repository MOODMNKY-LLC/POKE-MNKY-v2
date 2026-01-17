# Fix multi-line private keys in .env file for Supabase CLI compatibility
# Private keys need to be on a single line with \n escape sequences

$envFile = ".env"
$backupFile = ".env.backup"

# Create backup
Copy-Item $envFile $backupFile -Force
Write-Host "Created backup: $backupFile" -ForegroundColor Green

# Read the file
$content = Get-Content $envFile -Raw

# Fix LOGINSERVER_PRIVATE_KEY
$content = $content -replace '(LOGINSERVER_PRIVATE_KEY=***REMOVED***\n$keyContent\n-----END PRIVATE KEY-----"
}

# Fix GOOGLE_PRIVATE_KEY
$content = $content -replace '(GOOGLE_PRIVATE_KEY=***REMOVED***\n$keyContent\n-----END PRIVATE KEY-----"
}

# Fix GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
$content = $content -replace '(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=***REMOVED***\n$keyContent\n-----END PRIVATE KEY-----"
}

# Write back
$content | Set-Content $envFile -NoNewline

Write-Host "Fixed private keys in .env file" -ForegroundColor Green
Write-Host "Testing with: supabase status" -ForegroundColor Yellow
