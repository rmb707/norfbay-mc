<#
  setup-power.ps1 — keep the Norfbay server up when the laptop lid is closed.

  Sets (on AC / plugged in):
    * Lid close  -> Do nothing        (server keeps running with the lid shut)
    * System sleep -> Never
  Leaves battery behavior alone (lid close still sleeps on battery to save power),
  so unplug = graceful sleep, plugged-in-lid-closed = 24/7 server.

  Run in an ADMIN PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\setup-power.ps1
  Undo:  set the AC lid value back to 1 (sleep) — see the last line, or use Settings.

  NOTE: Docker Desktop must also be set to "Start when you log in"
        (Docker Desktop -> Settings -> General). Containers use restart: unless-stopped,
        so the whole stack self-heals after a reboot + sign-in.
#>

$ErrorActionPreference = 'Stop'
$SUB_BUTTONS = '4f971e89-eebd-4455-a8de-9e59040e7347'  # Power buttons and lid
$LID_ACTION  = '5ca83367-6e45-459f-a27b-476b1d01c936'  # Lid close action
# 0 = Do nothing | 1 = Sleep | 2 = Hibernate | 3 = Shut down

Write-Host "Setting lid-close (plugged in) = Do nothing..." -ForegroundColor Cyan
powercfg -setacvalueindex SCHEME_CURRENT $SUB_BUTTONS $LID_ACTION 0   # AC = do nothing
powercfg -setdcvalueindex SCHEME_CURRENT $SUB_BUTTONS $LID_ACTION 1   # battery = sleep

Write-Host "Disabling system sleep while plugged in..." -ForegroundColor Cyan
powercfg -change -standby-timeout-ac 0   # never sleep on AC

powercfg -setactive SCHEME_CURRENT
Write-Host "Done. Lid-closed + plugged-in now keeps the server online." -ForegroundColor Green
Write-Host "Verify: Settings > System > Power & battery > 'Lid & power button controls'." -ForegroundColor DarkGray
Write-Host "Heads-up: keep the laptop ventilated (not sealed in a bag) when running lid-closed." -ForegroundColor Yellow
