# RAX Finance — Setup Scheduled Backup
#
# Run this ONCE as Administrator to register the daily backup task
# in Windows Task Scheduler.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-scheduled-backup.ps1

$ErrorActionPreference = "Stop"

$TaskName = "RAX-Finance-Daily-Backup"
$ScriptPath = Join-Path $PSScriptRoot "backup.ps1"
$Description = "Daily backup of RAX Finance loantool (database + code) to OneDrive"

# ── Register Event Log source (requires admin) ──

try {
    if (-not [System.Diagnostics.EventLog]::SourceExists("RAX Backup")) {
        New-EventLog -LogName Application -Source "RAX Backup"
        Write-Host "Registered event log source: RAX Backup" -ForegroundColor Green
    } else {
        Write-Host "Event log source 'RAX Backup' already exists." -ForegroundColor Gray
    }
} catch {
    Write-Warning "Could not register event log source (requires admin): $_"
    Write-Warning "Event Log alerting will be skipped. File-based alerting still works."
}

# ── Create scheduled task ──

$Trigger = New-ScheduledTaskTrigger -Daily -At "02:00"

$Action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NonInteractive -File `"$ScriptPath`"" `
    -WorkingDirectory $PSScriptRoot

$Settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "Task '$TaskName' already exists. Updating..." -ForegroundColor Yellow
    Set-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Settings $Settings | Out-Null
    Write-Host "Task updated." -ForegroundColor Green
} else {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Description $Description `
        -Trigger $Trigger `
        -Action $Action `
        -Settings $Settings `
        -RunLevel Highest | Out-Null
    Write-Host "Task '$TaskName' created." -ForegroundColor Green
}

Write-Host ""
Write-Host "── Setup Complete ──" -ForegroundColor Green
Write-Host ""
Write-Host "  Task:     $TaskName"
Write-Host "  Schedule: Daily at 02:00"
Write-Host "  Script:   $ScriptPath"
Write-Host ""
Write-Host "Verify with:"
Write-Host "  Get-ScheduledTask -TaskName '$TaskName' | Format-List"
Write-Host ""
Write-Host "Test run:"
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'"
Write-Host ""
