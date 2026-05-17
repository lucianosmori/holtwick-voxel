# Ralph-loop runner (PowerShell). Windows-native alternative to loop.sh.
# Defaults: bounded iterations, timebox, Telegram pings on start/end/blocked.
#
# Defaults sized for the holtwick-voxel-nightly scheduled task (2026-05-16):
# 28 iters / 480 min (8h) — fits the P6 + P7 + P8 backlog with comfortable
# overshoot margin. Override per-invocation when running manually:
#   .\loop.ps1                                   # 28 iter, 480-min timebox
#   .\loop.ps1 -MaxIter 10 -TimeboxMin 30
#
# Requires: claude CLI on PATH. Optional: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
# in env (or $env:USERPROFILE\.claude\channels\telegram\.env) for pings.

param(
    [int]$MaxIter = 28,
    [int]$TimeboxMin = 480
)

$ErrorActionPreference = 'Continue'
$Experiment = Split-Path -Leaf (Get-Location)
$Deadline = (Get-Date).AddMinutes($TimeboxMin)

# Force Max OAuth: clear any stale ANTHROPIC_API_KEY so claude.exe uses the
# OAuth session instead of an invalid key. Mirrored from ralph-orchestrator.ps1.
$env:ANTHROPIC_API_KEY = $null
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue

# Load telegram creds from .env if present
$envFile = Join-Path $env:USERPROFILE '.claude\channels\telegram\.env'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.*)$') {
            Set-Item -Path "env:$($Matches[1].Trim())" -Value $Matches[2].Trim()
        }
    }
}
$TgChat = $env:TELEGRAM_CHAT_ID

function Send-Ping {
    param([string]$Msg)
    if (-not $env:TELEGRAM_BOT_TOKEN -or -not $TgChat) { return }
    try {
        Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$($env:TELEGRAM_BOT_TOKEN)/sendMessage" `
            -Body @{ chat_id = $TgChat; text = "[$Experiment] $Msg" } | Out-Null
    } catch { }
}

function Test-Done {
    if (-not (Test-Path status.json)) { return $false }
    return (Select-String -Path status.json -Pattern '"status"\s*:\s*"(graduated|abandoned)"' -Quiet)
}

Send-Ping "loop start - max_iter=$MaxIter, timebox=${TimeboxMin}m"

for ($i = 1; $i -le $MaxIter; $i++) {
    if ((Get-Date) -ge $Deadline) {
        Send-Ping "loop stopped - timebox exhausted at iter $i"
        exit 0
    }
    if (Test-Done) {
        Send-Ping "loop stopped - status.json signals done at iter $i"
        exit 0
    }

    Write-Host "=== iter $i/$MaxIter ==="
    & claude -p "Run one iteration per PROMPT.md. Pick exactly one task from IMPLEMENTATION_PLAN.md - highest priority unfinished item that is NOT annotated with BLOCKED or DEFERRED. Skip BLOCKED/DEFERRED tasks entirely until the user clears the blocker. Complete the picked task, update files, commit on green. Green means: npm run build AND npm run validate:visual AND npm run test:dialog all pass - run them locally before committing and abort the iter if any fails. Push to origin after the commit so the GH Pages deploy fires."
    if ($LASTEXITCODE -ne 0) {
        Send-Ping "iter $i FAILED - see terminal"
        exit 1
    }

    # Post-iter validation gate (P2.0). Belt-and-suspenders: the agent should
    # also run these before committing, but the loop re-runs them so an iter
    # that regressed visuals halts the burn instead of compounding breakage.
    Write-Host "=== iter $i validation gate ==="
    $env:ITER = $i
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Send-Ping "iter $i build FAILED after commit - halting"
        exit 1
    }
    & npm run validate:visual
    if ($LASTEXITCODE -ne 0) {
        Send-Ping "iter $i validate:visual FAILED after commit - halting"
        exit 1
    }
    & npm run test:dialog
    if ($LASTEXITCODE -ne 0) {
        Send-Ping "iter $i test:dialog FAILED after commit - halting"
        exit 1
    }
}

Send-Ping "loop stopped - max_iter=$MaxIter reached"
