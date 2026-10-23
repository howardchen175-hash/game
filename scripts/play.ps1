param([switch]$Stop)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Please install Docker Desktop from https://www.docker.com/products/docker-desktop/ and open it first.'
    }
    docker info --format '{{.ServerVersion}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop is not ready. Open Docker Desktop, wait until it is running, then try again.' }
    docker compose version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose is missing. Update Docker Desktop and try again.' }
    if ($Stop) {
        if (-not (Test-Path '.env.play')) { Write-Host 'There is no local game to stop.'; exit 0 }
        docker compose --project-name cosmic-colony-play --env-file .env.play -f compose.play.yml stop
        if ($LASTEXITCODE -ne 0) { throw 'Could not stop the game. Check Docker Desktop.' }
        Write-Host 'Game stopped. Your accounts and saves are kept.'
        exit 0
    }
    if (-not (Test-Path '.env.play')) {
        function New-RandomHex {
            $bytes = New-Object byte[] 48
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
            return -join ($bytes | ForEach-Object { $_.ToString('x2') })
        }
        $text = "PLAY_DB_PASSWORD=$(New-RandomHex)`nPLAY_AUTH_SECRET=$(New-RandomHex)`n"
        $stream = [System.IO.File]::Open((Join-Path (Get-Location) '.env.play'), [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        try {
            $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($text)
            $stream.Write($bytes, 0, $bytes.Length)
        } finally { $stream.Dispose() }
    }
    Write-Host 'Starting Cosmic Colony. The first run downloads and builds the game; please keep this window open.'
    docker compose --project-name cosmic-colony-play --env-file .env.play -f compose.play.yml up --build --detach --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'Startup failed. Read the Docker error above. Keep .env.play and the Docker data volume; they contain your local game configuration and saves.' }
    try { Start-Process 'http://localhost:8080' } catch { Write-Host 'The browser could not open automatically. Open http://localhost:8080 on this computer.' }
    Write-Host 'Ready! Open http://localhost:8080 if needed. Register an account, create a save, then explore.'
    Write-Host 'You may close this window. To stop the game, run: play.cmd -Stop'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
