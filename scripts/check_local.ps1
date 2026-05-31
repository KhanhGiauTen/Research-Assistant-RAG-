param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$StateFile = Join-Path $Root ".local\local-pids.json"

if (Test-Path $StateFile) {
    $state = Get-Content $StateFile | ConvertFrom-Json
    if ($state.backendUrl -match ":(\d+)$") {
        $BackendPort = [int]$Matches[1]
    }
    if ($state.frontendUrl -match ":(\d+)$") {
        $FrontendPort = [int]$Matches[1]
    }
}

$backend = Invoke-RestMethod "http://127.0.0.1:$BackendPort/health" -TimeoutSec 10
$chat = Invoke-RestMethod "http://127.0.0.1:$BackendPort/api/chat/health" -TimeoutSec 20
$frontend = Invoke-WebRequest "http://127.0.0.1:$FrontendPort" -UseBasicParsing -TimeoutSec 10

[PSCustomObject]@{
    BackendStatus = $backend.status
    OllamaModel = $chat.llm.model
    LlmAvailable = $chat.llm.available
    ModelLoaded = $chat.llm.model_loaded
    VectorChunks = $chat.vector_store.total_chunks
    FrontendStatusCode = $frontend.StatusCode
}
