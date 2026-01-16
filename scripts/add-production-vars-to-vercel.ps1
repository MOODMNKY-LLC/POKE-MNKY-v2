# Add Production Environment Variables to Vercel
# Only production values - no local development variables

Write-Host "🚀 Adding Production Variables to Vercel..." -ForegroundColor Cyan
Write-Host ""

# Production values from server .env
$productionVars = @(
    # Application URLs (All environments)
    @{ Key = "APP_URL"; Value = "https://poke-mnky.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "NEXT_PUBLIC_APP_URL"; Value = "https://poke-mnky.moodmnky.com"; Env = "production,preview,development" },
    
    # Supabase Production (Public URLs to all, secrets to production only)
    @{ Key = "NEXT_PUBLIC_SUPABASE_URL"; Value = "https://chmrszrwlfeqovwxyrmt.supabase.co"; Env = "production,preview,development" },
    @{ Key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTk0MTMsImV4cCI6MjA4Mzc3NTQxM30.z2LyP9rcQF0avvryv-5P3QzIYKCrVIWTnui7zS7Tpy0"; Env = "production,preview,development" },
    @{ Key = "SUPABASE_SERVICE_ROLE_KEY"; Value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNobXJzenJ3bGZlcW92d3h5cm10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE5OTQxMywiZXhwIjoyMDgzNzc1NDEzfQ.uTi9Re3MetIiwgtaS51JIbI1Oay1UCKy5aHmYz1QDHY"; Env = "production" },
    
    # Discord (Keep existing DISCORD_GUILD_ID, add DISCORD_GUILD_IDS)
    @{ Key = "DISCORD_GUILD_IDS"; Value = "1069695816001933332,1190512330556063764"; Env = "production,preview,development" },
    
    # Showdown Production (All environments - public URLs)
    @{ Key = "SHOWDOWN_SERVER_URL"; Value = "https://aab-showdown.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "NEXT_PUBLIC_SHOWDOWN_CLIENT_URL"; Value = "https://aab-play.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "SHOWDOWN_API_KEY"; Value = "5828714b68d1b1251425aba63d28edb164fa3f42e9523fbff8c5979107317750"; Env = "production,preview,development" },
    @{ Key = "SHOWDOWN_PUBLIC_URL"; Value = "https://aab-play.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "SHOWDOWN_COOKIE_DOMAIN"; Value = "moodmnky.com"; Env = "production,preview,development" },
    
    # Loginserver (Production only - secret)
    @{ Key = "LOGINSERVER_PRIVATE_KEY"; Value = "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCgEfZclWrlOPak\nmfDtNeucbiLruc6nw7O4x73pc6ThektlGdk58LYg3MucwaDnTDvH2YfTocQoQnvY\ne4nz0jKoSrhhZpUoJvG9TRv/z6wBajI0hFI2bXUkRdLKrLJmo7hV2dCsXjMXaP6b\naXs9LvpCs238R1/zjha4rrh9M0ayeVv1Od4D/nJfk8em+037pU+Uq/43mpSt+e4g\n3Mva+bivLT6w5n7fMDpafYnhkzjqTWBpTSECGdERmBFzspqcSHUfiAks4OiT/cRy\nD7K4HcCKyzgsxyYu6pu1+nXA5xIsGH4gbMs9hP7xjco7TEqWKrRvDeG3aGiQrPkY\n2xdja8rfAgMBAAECgf85p+eaupt0XgAF85w7m4DS4UGZuHiF3X4p+OIejRU0VFjc\ns0OWUs7UOlZwMpF/RNRQ2PaL65R0l82T6TnbVpRDTSElhBJHcXFsUyNdnL+RfYt7\nHjKw0xHhMQLaawjff2sUsTYSFeZr0gLokSVny0PXgn0JmzsD+cCVTkgLs/LDD71K\nzbHP4BxE9gFq0i62aUF+OmqxI+xC8gzddXdyCi2BCuxCiVKY1w+ZdEKO6rYpPJTR\nsTjaolrQXO82XwcfcRuIm7zMCOpDfEoNRu0ZmGJA2iBLX0bKYO32o3i2nb1qWZXP\nYoF++5als6EXb3KYsZBV7R7QIVDRLB/69Dhh42kCgYEA3eHL2W2PRQ8iRxObKpGK\niIIyG4UXzf/AKoW2HeeKKi7Y5zmDKqDq3uqDoEDzuwQftiY0oVRwv4MC1gmjIw37\nFPn6nAwwwQ8cB+7wqvX2vfnh5y3e5VpwfNkzjwcISalI8CN0PJltq41bwqnE48b0\nMOphbOJlSeBcDWyxm3vd+T0CgYEAuK7+QpjHuHovY44UnEGxYi8/RjlszZ8qYJAG\nVvv/vHGk6nz6PPFO1/LxUWsw7KMftPTRHRrD/trxCxWcsYSU4wLXgzp9lr2z+zXY\niml4/JoS0aALAe6xWcxh4mOFzf/w6oErr1fImIdkrsIXEf5B2pjiFWECid6KpaJZ\nnq2TPksCgYEAlIhzTjppjnFzIOGfHgAQHRILOSD/rodmvRCFub8mXta9nQyDIiZX\nFKMpOj5A6xD3qZgp41YDpDCv1VjePLk/O+ucOJpwiMz0ltr9gXTmmIaPE5NBg4fn\nhaxhN34drjIFAby6M1cCc7VNmCLOCy1Eivpb/egQpkPrW5FH1C43ioECgYAZFUNZ\nPjDaAFZRWim4cz+pSyt32TLK1pRF2ynRRJaePH0ej+zYvBluQQO/gCR770fOJvYD\n0u/NvGTCkaPfhFdIYcltfFM0Vv2L3+tSGTMic7acm/UCxS13OcgNnGC+8sUAxJxv\nSyfmd3UYOyow+mxtSRhjuPJEUWJZTqyHXaHC8wKBgExYfgJ8MsqEupM3No/g2X1h\naVGD/SLnX94Z35KE6lZewzNXiNrma0po1yLDC5eviIObNllpGmRqQfDl4st+wJ5t\nxjtlyeOBeivPB9fSRnIZsdioH4rXwOBSLmdqBE0FB/m7WB3goRVP9d/PGCslXOtr\ntsRF22bUU4niJBJFfpAO\n-----END PRIVATE KEY-----"; Env = "production" },
    
    # MinIO Production (Public URLs to all)
    @{ Key = "MINIO_ENDPOINT_EXTERNAL"; Value = "https://s3-api-data.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "MINIO_CONSOLE_EXTERNAL"; Value = "https://s3-console-data.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "SPRITES_BASE_URL"; Value = "https://s3-api-data.moodmnky.com/pokedex-sprites"; Env = "production,preview,development" },
    @{ Key = "NEXT_PUBLIC_SPRITES_BASE_URL"; Value = "https://s3-api-data.moodmnky.com/pokedex-sprites"; Env = "production,preview,development" },
    
    # PokéAPI Production (All environments - public URLs)
    @{ Key = "POKEAPI_BASE_URL"; Value = "https://pokeapi.co/api/v2"; Env = "production,preview,development" },
    @{ Key = "NEXT_PUBLIC_POKEAPI_BASE_URL"; Value = "https://pokeapi.co/api/v2"; Env = "production,preview,development" }
)

$added = 0
$skipped = 0
$errors = 0

foreach ($var in $productionVars) {
    Write-Host "Processing: $($var.Key)" -ForegroundColor Yellow
    
    $envs = $var.Env -split ","
    
    foreach ($env in $envs) {
        Write-Host "  Adding to $env..." -ForegroundColor Gray
        
        try {
            if ($var.Key -eq "LOGINSERVER_PRIVATE_KEY") {
                # Multi-line value - save to temp file first
                $var.Value | Out-File -FilePath "temp-key.txt" -Encoding utf8 -NoNewline
                Get-Content "temp-key.txt" -Raw | vercel env add $var.Key $env 2>&1 | Out-Null
                Remove-Item "temp-key.txt" -ErrorAction SilentlyContinue
            } else {
                # Single-line value
                echo $var.Value | vercel env add $var.Key $env 2>&1 | Out-Null
            }
            
            Write-Host "    ✅ Added to $env" -ForegroundColor Green
            $added++
        } catch {
            Write-Host "    ⚠️  May already exist or error occurred" -ForegroundColor Yellow
            $skipped++
        }
    }
    Write-Host ""
}

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Added: $added" -ForegroundColor Green
Write-Host "  ⚠️  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "  ❌ Errors: $errors" -ForegroundColor Red
Write-Host ""
