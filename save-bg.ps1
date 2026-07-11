# Run this script to open the assets folder so you can paste/save bg.jpg there
$assetsPath = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Force -Path $assetsPath | Out-Null
Start-Process explorer.exe $assetsPath
Write-Host "Assets folder opened! Save your neon image there as 'bg.jpg' then refresh the browser."
