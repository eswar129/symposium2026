Write-Host ""
Write-Host "MPR EXAM - ENABLE LOCKDOWN"
Write-Host ""

$script =
    Join-Path `
        $PSScriptRoot `
        "keyboard-filter.ps1"

& $script

Write-Host ""
Write-Host "Lockdown configuration finished."