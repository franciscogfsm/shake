$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionFolder = Join-Path $projectRoot 'extension'
$outputFile = Join-Path $projectRoot 'public/shake-extension.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$archiveStream = [System.IO.File]::Open($outputFile, [System.IO.FileMode]::Create)
$packageArchive = New-Object System.IO.Compression.ZipArchive($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $extensionFolder -Recurse -File | ForEach-Object {
        $entryName = $_.FullName.Substring($extensionFolder.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($packageArchive, $_.FullName, $entryName) | Out-Null
    }
} finally {
    $packageArchive.Dispose()
    $archiveStream.Dispose()
}
Write-Output "Packaged extension: $outputFile"
