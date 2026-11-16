param(
    [string]$ManagedDirectory = $env:CSII_MANAGEDPATH,
    [string]$Compiler = $env:CSC_PATH,
    [string]$PostProcessor = $env:CSII_MODPOSTPROCESSORPATH,
    [string]$UnityModProject = $env:CSII_UNITYMODPROJECTPATH,
    [switch]$CompileOnly
)

$ErrorActionPreference = 'Stop'
if (-not $Compiler) {
    $Compiler = Join-Path $PSScriptRoot '..\..\..\tools\roslyn\tasks\net472\csc.exe'
}
if (-not (Test-Path -LiteralPath $Compiler -PathType Leaf)) {
    throw 'Set CSC_PATH or pass -Compiler with the path to Roslyn csc.exe.'
}
if (-not $ManagedDirectory -or -not (Test-Path -LiteralPath $ManagedDirectory -PathType Container)) {
    throw 'Set CSII_MANAGEDPATH or pass -ManagedDirectory with the game Managed folder.'
}

$assemblies = @(
    'mscorlib', 'System', 'System.Core', 'netstandard', 'Game',
    'Colossal.Core', 'Colossal.IO.AssetDatabase', 'Colossal.Localization', 'Colossal.Logging',
    'Colossal.Mathematics', 'Colossal.UI', 'Colossal.UI.Binding',
    'cohtml.Net', 'Cinemachine', 'Unity.Entities', 'Unity.Mathematics',
    'Unity.InputSystem', 'UnityEngine.CoreModule'
)
$references = foreach ($name in $assemblies) {
    $path = Join-Path $ManagedDirectory ($name + '.dll')
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing assembly $path" }
    $path
}

$build = Join-Path $PSScriptRoot 'build'
$raw = Join-Path $build 'raw'
New-Item -ItemType Directory -Force -Path $raw | Out-Null
$rawDll = Join-Path $raw 'GTPCompass.dll'
$compile = @(
    '/nologo', '/nostdlib+', '/target:library', '/langversion:9.0', '/optimize+',
    '/debug:portable', '/deterministic+', '/warnaserror+', "/out:$rawDll",
    '/resource:Hud.js,GTPCompass.Hud.js'
)
$compile += $references | ForEach-Object { "/reference:$_" }
$compile += Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.cs' -File | ForEach-Object FullName
Push-Location -LiteralPath $PSScriptRoot
try {
    & $Compiler @compile
    if ($LASTEXITCODE -ne 0) { throw 'Compass compilation failed.' }
} finally {
    Pop-Location
}
Write-Output "Compiled $rawDll"
if ($CompileOnly) { return }

if (-not $PostProcessor -or -not (Test-Path -LiteralPath $PostProcessor -PathType Leaf) -or
    -not $UnityModProject -or -not (Test-Path -LiteralPath $UnityModProject -PathType Container)) {
    throw 'Install the CS2 modding toolchain and set CSII_MODPOSTPROCESSORPATH and CSII_UNITYMODPROJECTPATH.'
}
$package = Join-Path $build 'package'
New-Item -ItemType Directory -Force -Path $package | Out-Null
$packageDll = Join-Path $package 'GTPCompass.dll'
Copy-Item -LiteralPath $rawDll -Destination $packageDll -Force
Copy-Item -LiteralPath (Join-Path $raw 'GTPCompass.pdb') -Destination $package -Force
$post = @('PostProcess', $packageDll, '-u', $UnityModProject)
foreach ($reference in $references) { $post += @('-r', $reference) }
$post += @('-p', 'Windows', '-d', '-v')
& $PostProcessor @post *> (Join-Path $build 'postprocess.log')
if ($LASTEXITCODE -ne 0) { throw 'CS2 mod post-processing failed. See build/postprocess.log.' }

$packageDial = Join-Path $package 'CompassDial.png'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Artwork\Compass Dial with Loop.png') -Destination $packageDial -Force
$payload = @($packageDll, (Join-Path $package 'GTPCompass_win_x86_64.dll'), $packageDial)
$styles = @('NauticalChart', 'SurveyorGrid', 'CockpitDisplay', 'MetroTile', 'IndustrialGauge',
    'PixelLcd', 'StealthMinimal', 'OrbitalHologram', 'EnamelEmblem')
foreach ($style in $styles) {
    $file = $style + '.png'
    $art = Join-Path $PSScriptRoot ('Artwork\Compass Styles\' + $file)
    $destination = Join-Path $package $file
    Copy-Item -LiteralPath $art -Destination $destination -Force
    $payload += $destination
}
foreach ($path in $payload) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing processed payload $path" }
}
$zip = Join-Path $build 'GTPCompass-1.0.1-Windows.zip'
Compress-Archive -LiteralPath $payload -DestinationPath $zip -Force
Write-Output "Packaged $zip"
