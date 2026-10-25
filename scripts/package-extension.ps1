$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionFolder = Join-Path $projectRoot 'extension'
$outputFile = Join-Path $projectRoot 'public/shake-extension.zip'
Compress-Archive -Path (Join-Path $extensionFolder '*') -DestinationPath $outputFile -Force
Write-Output "Packaged extension: $outputFile"
