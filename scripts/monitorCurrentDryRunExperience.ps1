param(
  [Parameter(Mandatory = $true)]
  [string]$LogPath,

  [string]$BackendDir = '',

  [int]$SleepSeconds = 180
)

$ErrorActionPreference = 'Stop'

$effectiveBackendDir = $BackendDir
if ([string]::IsNullOrWhiteSpace($effectiveBackendDir)) {
  $effectiveBackendDir = Join-Path (Split-Path -Parent $PSCommandPath) '..'
}

$resolvedLogPath = (Resolve-Path $LogPath).Path
$resolvedBackendDir = (Resolve-Path $effectiveBackendDir).Path
$nodePath = (Get-Command node).Source
$backfillScript = Join-Path $resolvedBackendDir 'scripts\backfillDryRunExperience.js'
$progressPattern = '\[runner\] Progress: (\d+)/(\d+) scrapers finished\.'

while ($true) {
  $currentProgress = 0
  $totalProgress = 0

  if (Test-Path $resolvedLogPath) {
    $progressMatches = Select-String -Path $resolvedLogPath -Pattern $progressPattern -ErrorAction SilentlyContinue
    if ($progressMatches) {
      $lastProgress = $progressMatches | Select-Object -Last 1
      $currentProgress = [int]$lastProgress.Matches[0].Groups[1].Value
      $totalProgress = [int]$lastProgress.Matches[0].Groups[2].Value
    }
  }

  Write-Output ("[{0}] Starting dry-run experience repair pass at progress {1}/{2}" -f (Get-Date -Format o), $currentProgress, $totalProgress)
  & $nodePath --use-system-ca $backfillScript --file-concurrency=1 --experience-concurrency=1 --progress-every=10
  $exitCode = $LASTEXITCODE
  Write-Output ("[{0}] Repair pass finished with exit code {1}" -f (Get-Date -Format o), $exitCode)

  if ($totalProgress -gt 0 -and $currentProgress -ge $totalProgress) {
    break
  }

  Start-Sleep -Seconds $SleepSeconds
}
