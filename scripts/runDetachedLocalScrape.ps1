param(
  [string]$RunDir = '',
  [switch]$Parallel,
  [switch]$Sequential,
  [switch]$DryRun,
  [switch]$Live
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-DefaultRunDir {
  param([string]$RunLogsRoot)

  $timestamp = Get-Date -Format 'yyyyMMddTHHmmss'
  return Join-Path $RunLogsRoot "local-scrape-$timestamp-detached"
}

function Write-JsonFile {
  param(
    [string]$Path,
    [object]$Value
  )

  $json = $Value | ConvertTo-Json -Depth 8
  Set-Content -LiteralPath $Path -Value $json -Encoding UTF8
}

$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $currentDir
$repoRoot = Split-Path -Parent $backendDir
$runLogsRoot = Join-Path $repoRoot 'artifacts\run-logs'

$selectedRunDir =
  if ([string]::IsNullOrWhiteSpace($RunDir)) {
    Get-DefaultRunDir -RunLogsRoot $runLogsRoot
  } elseif ([System.IO.Path]::IsPathRooted($RunDir)) {
    $RunDir
  } else {
    Join-Path $repoRoot $RunDir
  }

New-Item -ItemType Directory -Force -Path $selectedRunDir | Out-Null

$stdoutPath = Join-Path $selectedRunDir 'stdout.log'
$stderrPath = Join-Path $selectedRunDir 'stderr.log'
$runnerPidPath = Join-Path $selectedRunDir 'runner.pid'
$launcherPidPath = Join-Path $selectedRunDir 'launcher.pid'
$metadataPath = Join-Path $selectedRunDir 'run-metadata.json'
$exitPath = Join-Path $selectedRunDir 'run-exit.json'

$isParallel = $true
if ($Sequential.IsPresent) {
  $isParallel = $false
} elseif ($Parallel.IsPresent) {
  $isParallel = $true
}

$isDryRun = $true
if ($Live.IsPresent) {
  $isDryRun = $false
} elseif ($DryRun.IsPresent) {
  $isDryRun = $true
}

if (-not $env:SCRAPER_CONCURRENCY) { $env:SCRAPER_CONCURRENCY = '3' }
if (-not $env:SCRAPER_FAILURE_ABORT_THRESHOLD) { $env:SCRAPER_FAILURE_ABORT_THRESHOLD = '1000' }
if (-not $env:WORKDAY_SCRAPER_TIMEOUT_MS) { $env:WORKDAY_SCRAPER_TIMEOUT_MS = '210000' }
if (-not $env:WORKDAY_REQUEST_TIMEOUT_MS) { $env:WORKDAY_REQUEST_TIMEOUT_MS = '20000' }

$runnerArgs = [System.Collections.Generic.List[string]]::new()
$runnerArgs.Add('scraper/runner.js')
if ($isParallel) { $runnerArgs.Add('--parallel') }
if ($isDryRun) { $runnerArgs.Add('--dry-run') }

Set-Content -LiteralPath $launcherPidPath -Value ([string]$PID) -Encoding ASCII
Write-JsonFile -Path $metadataPath -Value @{
  runDir = $selectedRunDir
  startedAt = (Get-Date).ToString('o')
  workingDirectory = $backendDir
  nodeExecutable = 'node'
  runnerArgs = $runnerArgs
  environment = @{
    SCRAPER_CONCURRENCY = $env:SCRAPER_CONCURRENCY
    SCRAPER_FAILURE_ABORT_THRESHOLD = $env:SCRAPER_FAILURE_ABORT_THRESHOLD
    WORKDAY_SCRAPER_TIMEOUT_MS = $env:WORKDAY_SCRAPER_TIMEOUT_MS
    WORKDAY_REQUEST_TIMEOUT_MS = $env:WORKDAY_REQUEST_TIMEOUT_MS
    SCRAPER_ONLY = $env:SCRAPER_ONLY
    SCRAPER_START_AT = $env:SCRAPER_START_AT
    SCRAPER_START_AFTER = $env:SCRAPER_START_AFTER
  }
}

$runner = Start-Process `
  -FilePath 'node' `
  -ArgumentList $runnerArgs.ToArray() `
  -WorkingDirectory $backendDir `
  -RedirectStandardOutput $stdoutPath `
  -RedirectStandardError $stderrPath `
  -WindowStyle Hidden `
  -PassThru

Set-Content -LiteralPath $runnerPidPath -Value ([string]$runner.Id) -Encoding ASCII

$runner.WaitForExit()

Write-JsonFile -Path $exitPath -Value @{
  exitedAt = (Get-Date).ToString('o')
  code = $runner.ExitCode
  signal = $null
}

exit $runner.ExitCode
