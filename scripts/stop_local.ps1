$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$StateFile = Join-Path $Root ".local\local-pids.json"

if (-not (Test-Path $StateFile)) {
    Write-Output "No local process state found."
    exit 0
}

function Stop-PortListener($Url) {
    if (-not $Url -or $Url -notmatch ":(\d+)$") {
        return
    }

    $port = [int]$Matches[1]
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        if ($connection.OwningProcess -eq $PID) {
            continue
        }
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

$state = Get-Content $StateFile | ConvertFrom-Json
foreach ($pidValue in @($state.backend, $state.frontend)) {
    if ($pidValue -and $pidValue -ne $PID) {
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
    }
}

Stop-PortListener $state.backendUrl
Stop-PortListener $state.frontendUrl

Remove-Item $StateFile -Force
Write-Output "Stopped local backend/frontend processes."
