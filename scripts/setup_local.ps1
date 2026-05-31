param(
    [switch]$InstallMissingTools,
    [switch]$SkipModelPull
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"

function Update-PathFromRegistry {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = @($machinePath, $userPath) -join [IO.Path]::PathSeparator
}

function Test-Command($Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Resolve-Ollama {
    $command = Get-Command ollama -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $localPath = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
    if (Test-Path $localPath) {
        return $localPath
    }

    return $null
}

if (-not (Test-Command node) -or -not (Test-Command npm)) {
    if ($InstallMissingTools) {
        winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-source-agreements --accept-package-agreements
        Update-PathFromRegistry
    } else {
        throw "Node.js/NPM is missing. Re-run with -InstallMissingTools or install Node.js LTS."
    }
}

if (-not (Test-Command node) -or -not (Test-Command npm)) {
    throw "Node.js/NPM is still unavailable in PATH. Open a new terminal and re-run this script."
}

$ollama = Resolve-Ollama
if (-not $ollama) {
    if ($InstallMissingTools) {
        winget install --id Ollama.Ollama --exact --silent --accept-source-agreements --accept-package-agreements
        Update-PathFromRegistry
        $ollama = Resolve-Ollama
    } else {
        throw "Ollama is missing. Re-run with -InstallMissingTools or install Ollama."
    }
}

if (-not $ollama) {
    throw "Ollama is still unavailable. Open a new terminal and re-run this script."
}

if (-not (Test-Path (Join-Path $Backend ".venv\Scripts\python.exe"))) {
    py -3.11 -m venv (Join-Path $Backend ".venv")
}

& (Join-Path $Backend ".venv\Scripts\python.exe") -m pip install -r (Join-Path $Backend "requirements.txt")

if (-not (Test-Path (Join-Path $Backend ".env"))) {
    Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
}

Push-Location $Frontend
try {
    npm install
    npm audit --audit-level=moderate
} finally {
    Pop-Location
}

if (-not (Test-Path (Join-Path $Frontend ".env.local"))) {
    Copy-Item (Join-Path $Frontend ".env.local.example") (Join-Path $Frontend ".env.local")
}

if (-not $SkipModelPull) {
    & $ollama pull llama3.2:3b
}

Write-Host "Local setup complete."
