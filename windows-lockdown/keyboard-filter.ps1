$namespace =
    "root\standardcimv2\embedded"

Write-Host ""
Write-Host "======================================"
Write-Host " MPR EXAM KEYBOARD FILTER"
Write-Host "======================================"
Write-Host ""

$provider =
    Get-CimClass `
        -Namespace $namespace `
        -ClassName WEKF_PredefinedKey `
        -ErrorAction SilentlyContinue

if (-not $provider) {

    Write-Host ""
    Write-Host "Keyboard Filter is not available"
    Write-Host "on this Windows edition."
    Write-Host ""

    exit 1
}

$blockedKeys = @(
    "AltTab",
    "WindowsTab",
    "AltF4",
    "ControlAltDelete",
    "ShiftControlEscape"
)

foreach ($key in $blockedKeys) {

    try {

        $existing =
            Get-CimInstance `
                -Namespace $namespace `
                -ClassName WEKF_PredefinedKey `
                -Filter "Id='$key'" `
                -ErrorAction SilentlyContinue

        if ($existing) {

            Set-CimInstance `
                -InputObject $existing `
                -Property @{
                    Enabled = $true
                }
        }
        else {

            New-CimInstance `
                -Namespace $namespace `
                -ClassName WEKF_PredefinedKey `
                -Property @{
                    Id = $key
                    Enabled = $true
                }
        }

        Write-Host "BLOCKED: $key"
    }
    catch {

        Write-Host "FAILED: $key"
        Write-Host $_
    }
}

Write-Host ""
Write-Host "Keyboard Filter configuration completed."