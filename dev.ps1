$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$backendPython = Join-Path $root 'backend\.venv\Scripts\python.exe'
$frontendPackage = Join-Path $root 'frontend\package.json'

if (-not (Test-Path $backendPython)) {
    throw 'Backend virtual environment is missing. Create backend\.venv and install backend\requirements.txt first.'
}

if (-not (Test-Path $frontendPackage)) {
    throw 'frontend\package.json was not found.'
}

$backendCheck = Start-Process `
    -FilePath $backendPython `
    -ArgumentList '-c', '"import fastapi, uvicorn"' `
    -WorkingDirectory (Join-Path $root 'backend') `
    -WindowStyle Hidden `
    -Wait `
    -PassThru

if ($backendCheck.ExitCode -ne 0) {
    throw 'backend\.venv is invalid or missing dependencies. Recreate it and run: pip install -r backend\requirements.txt'
}

if (-not (Get-Command 'npm.cmd' -ErrorAction SilentlyContinue)) {
    throw 'npm was not found. Install Node.js and reopen the terminal.'
}

if (-not (Test-Path (Join-Path $root 'frontend\node_modules'))) {
    throw 'Frontend dependencies are missing. Run: npm install --prefix frontend'
}

function Stop-ProcessTree {
    param([System.Diagnostics.Process]$Process)

    if ($null -ne $Process -and -not $Process.HasExited) {
        & cmd.exe /c "taskkill /PID $($Process.Id) /T /F >nul 2>&1"
    }
}

$backend = $null
$frontend = $null

try {
    Write-Host 'Starting VinLab development servers...'
    Write-Host 'Backend:  http://localhost:8000'
    Write-Host 'Frontend: http://localhost:5173'
    Write-Host 'Press Ctrl+C to stop both servers.'
    Write-Host ''

    $backend = Start-Process `
        -FilePath $backendPython `
        -ArgumentList '-m', 'uvicorn', 'app.main:app', '--reload' `
        -WorkingDirectory (Join-Path $root 'backend') `
        -NoNewWindow `
        -PassThru

    $frontend = Start-Process `
        -FilePath 'npm.cmd' `
        -ArgumentList 'run', 'dev' `
        -WorkingDirectory (Join-Path $root 'frontend') `
        -NoNewWindow `
        -PassThru

    while (-not $backend.HasExited -and -not $frontend.HasExited) {
        Start-Sleep -Milliseconds 500
        $backend.Refresh()
        $frontend.Refresh()
    }

    if ($backend.HasExited) {
        throw "Backend stopped unexpectedly with exit code $($backend.ExitCode)."
    }

    throw "Frontend stopped unexpectedly with exit code $($frontend.ExitCode)."
}
finally {
    Write-Host ''
    Write-Host 'Stopping development servers...'
    Stop-ProcessTree $frontend
    Stop-ProcessTree $backend
}
