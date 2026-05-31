param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Backend = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$Logs = Join-Path $Root "logs"
$State = Join-Path $Root ".local"
$StateFile = Join-Path $State "local-pids.json"
New-Item -ItemType Directory -Force -Path $Logs, $State | Out-Null

if (Test-Path $StateFile) {
    & (Join-Path $PSScriptRoot "stop_local.ps1") | Out-Null
}

$nextBuild = Join-Path $Frontend ".next"
if (Test-Path $nextBuild) {
    $resolvedNextBuild = Resolve-Path $nextBuild
    $resolvedFrontend = Resolve-Path $Frontend
    if (-not $resolvedNextBuild.Path.StartsWith($resolvedFrontend.Path, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove unexpected Next.js build path: $resolvedNextBuild"
    }
    for ($attempt = 1; $attempt -le 5; $attempt += 1) {
        try {
            Remove-Item -LiteralPath $resolvedNextBuild.Path -Recurse -Force -ErrorAction Stop
            break
        } catch {
            if ($attempt -eq 5) {
                throw
            }
            Start-Sleep -Seconds 1
        }
    }
}

function Resolve-CommandPath($Name) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }
    return $null
}

function Resolve-Ollama {
    $command = Resolve-CommandPath "ollama"
    if ($command) {
        return $command
    }

    $localPath = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
    if (Test-Path $localPath) {
        return $localPath
    }

    throw "Ollama is not available. Run scripts\setup_local.ps1 -InstallMissingTools."
}

function Test-Http($Url) {
    try {
        Invoke-RestMethod $Url -TimeoutSec 3 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-PortFree($Port) {
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new(
            [System.Net.IPAddress]::Parse("127.0.0.1"),
            $Port
        )
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) {
            $listener.Stop()
        }
    }
}

function Find-FreePort($PreferredPort) {
    $port = $PreferredPort
    while (-not (Test-PortFree $port)) {
        $port += 1
    }
    return $port
}

$BackendPort = Find-FreePort $BackendPort
$FrontendPort = Find-FreePort $FrontendPort

if (-not (Test-Path (Join-Path $Backend ".env"))) {
    Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
}
Set-Content (Join-Path $Frontend ".env.local") "NEXT_PUBLIC_API_URL=http://127.0.0.1:$BackendPort"

$ollama = Resolve-Ollama
if (-not (Test-Http "http://127.0.0.1:11434/api/tags")) {
    Start-Process -FilePath $ollama `
        -ArgumentList "serve" `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $Logs "ollama.out.log") `
        -RedirectStandardError (Join-Path $Logs "ollama.err.log") | Out-Null
    Start-Sleep -Seconds 3
}

$python = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "Backend venv missing. Run scripts\setup_local.ps1 first."
}

$npm = Resolve-CommandPath "npm.cmd"
if (-not $npm) {
    $npm = Resolve-CommandPath "npm"
}
if (-not $npm) {
    throw "npm is not available. Run scripts\setup_local.ps1 -InstallMissingTools."
}

$backendProcess = Start-Process -FilePath $python `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$BackendPort") `
    -WorkingDirectory $Backend `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $Logs "backend.out.log") `
    -RedirectStandardError (Join-Path $Logs "backend.err.log") `
    -PassThru

$frontendProcess = Start-Process -FilePath $npm `
    -ArgumentList @("run", "dev", "--", "--hostname", "127.0.0.1", "--port", "$FrontendPort") `
    -WorkingDirectory $Frontend `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $Logs "frontend.out.log") `
    -RedirectStandardError (Join-Path $Logs "frontend.err.log") `
    -PassThru

@{
    backend = $backendProcess.Id
    frontend = $frontendProcess.Id
    backendUrl = "http://127.0.0.1:$BackendPort"
    frontendUrl = "http://127.0.0.1:$FrontendPort"
} | ConvertTo-Json | Set-Content (Join-Path $State "local-pids.json")

[Console]::Out.WriteLine("Backend:  http://127.0.0.1:$BackendPort")
[Console]::Out.WriteLine("Frontend: http://127.0.0.1:$FrontendPort")
[Console]::Out.WriteLine("Logs:     $Logs")
