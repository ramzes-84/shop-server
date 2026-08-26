<#
    Builds the PrestaShop module zip for upload through the back office.

    This file must stay ASCII-only: Windows PowerShell 5.1 reads a .ps1
    without a BOM as ANSI, so non-ASCII characters break parsing.

    Entry names are built by hand with '/' separators. Both Compress-Archive
    and ZipFile.CreateFromDirectory on .NET Framework write '\' instead, which
    PHP does not read as a directory structure, so PrestaShop rejects the
    archive with "this file is not a module archive".
#>

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'prestashop\shopserver'
$destination = Join-Path $root 'prestashop\shopserver.zip'
$moduleName = Split-Path $source -Leaf

foreach ($required in @('shopserver.php', 'views\js\backend.js', 'views\js\front.js')) {
    if (-not (Test-Path (Join-Path $source $required))) {
        throw "Missing $required - run 'npm run build:client' first"
    }
}

if (Test-Path $destination) {
    Remove-Item $destination -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::Open($destination, 'Create')

try {
    $prefixLength = $source.Length + 1

    foreach ($file in Get-ChildItem -Path $source -Recurse -File) {
        $relative = $file.FullName.Substring($prefixLength).Replace('\', '/')

        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            "$moduleName/$relative",
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally {
    $archive.Dispose()
}

Write-Output "Packed: $destination"
