# RAX Finance — Daily Backup (PowerShell Wrapper)
#
# Called by Windows Task Scheduler. Loads env vars, runs the Node.js backup
# script, logs output, and writes to Windows Event Log on failure.
#
# Usage (manual):
#   powershell -ExecutionPolicy Bypass -File scripts/backup.ps1

$ErrorActionPreference = "Stop"

# Project root (parent of scripts/)
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# ── Load env files ──

function Load-EnvFile {
    param([string]$FilePath)
    if (-not (Test-Path $FilePath)) { return }
    Get-Content $FilePath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            if (-not [Environment]::GetEnvironmentVariable($key, "Process")) {
                [Environment]::SetEnvironmentVariable($key, $val, "Process")
            }
        }
    }
}

Load-EnvFile (Join-Path $ProjectRoot ".env")
Load-EnvFile (Join-Path $ProjectRoot ".env.local")

# ── Validate ──

if (-not $env:BACKUP_ONEDRIVE_PATH) {
    Write-Error "BACKUP_ONEDRIVE_PATH not set. Add it to .env.local"
    exit 1
}

if (-not $env:DATABASE_URL) {
    Write-Error "DATABASE_URL not set. Add it to .env.local"
    exit 1
}

# ── Create log dir ──

$LogDir = Join-Path $ProjectRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
}

$LogFile = Join-Path $LogDir "backup-$(Get-Date -Format 'yyyy-MM-dd').log"

# ── Run backup ──

Set-Location $ProjectRoot

try {
    $output = node scripts/backup.mjs 2>&1
    $output | Tee-Object -FilePath $LogFile

    if ($LASTEXITCODE -ne 0) {
        throw "Backup script exited with code $LASTEXITCODE"
    }

    # Success — write to Event Log if source exists
    try {
        Write-EventLog -LogName Application -Source "RAX Backup" `
            -EventId 1 -EntryType Information `
            -Message "RAX Finance daily backup completed successfully."
    } catch {
        # Event source may not be registered yet — non-fatal
    }

    # Remove failure marker if it exists
    $FailedFile = Join-Path $ProjectRoot "BACKUP_FAILED.txt"
    if (Test-Path $FailedFile) {
        Remove-Item $FailedFile -Force
    }

} catch {
    $errorMsg = $_.Exception.Message

    # Write failure marker
    $FailedFile = Join-Path $ProjectRoot "BACKUP_FAILED.txt"
    "Backup failed at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n$errorMsg" | Out-File $FailedFile -Encoding utf8

    # Write to Event Log
    try {
        Write-EventLog -LogName Application -Source "RAX Backup" `
            -EventId 2 -EntryType Error `
            -Message "RAX Finance daily backup FAILED: $errorMsg"
    } catch {
        # Event source may not be registered yet — non-fatal
    }

    # Log the error
    "BACKUP FAILED at $(Get-Date): $errorMsg" | Tee-Object -FilePath $LogFile -Append

    Write-Error "Backup failed: $errorMsg"
    exit 1
}
