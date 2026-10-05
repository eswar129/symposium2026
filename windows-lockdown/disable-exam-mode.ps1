$namespace =
    "root\standardcimv2\embedded"

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
                    Enabled = $false
                }

            Write-Host "UNBLOCKED: $key"
        }
    }
    catch {

        Write-Host "FAILED: $key"
    }
}

Write-Host ""
Write-Host "Exam keyboard lockdown disabled."