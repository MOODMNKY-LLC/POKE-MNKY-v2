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
    @{ Key = "NEXT_PUBLIC_SUPABASE_ANON_KEY"; Value = "***REMOVED***"; Env = "production,preview,development" },
    @{ Key = "SUPABASE_SERVICE_ROLE_KEY"; Value = "***REMOVED***"; Env = "production" },
    
    # Discord (Keep existing DISCORD_GUILD_ID, add DISCORD_GUILD_IDS)
    @{ Key = "DISCORD_GUILD_IDS"; Value = "1069695816001933332,1190512330556063764"; Env = "production,preview,development" },
    
    # Showdown Production (All environments - public URLs)
    @{ Key = "SHOWDOWN_SERVER_URL"; Value = "https://aab-showdown.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "NEXT_PUBLIC_SHOWDOWN_CLIENT_URL"; Value = "https://aab-play.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "SHOWDOWN_API_KEY"; Value = "***REMOVED***"; Env = "production,preview,development" },
    @{ Key = "SHOWDOWN_PUBLIC_URL"; Value = "https://aab-play.moodmnky.com"; Env = "production,preview,development" },
    @{ Key = "SHOWDOWN_COOKIE_DOMAIN"; Value = "moodmnky.com"; Env = "production,preview,development" },
    
    # Loginserver (Production only - secret)
    @{ Key = "LOGINSERVER_PRIVATE_KEY"; Value = "***REMOVED***"; Env = "production" },
    
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
