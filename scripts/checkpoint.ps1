[CmdletBinding()]
param([string]$Revision='compact-pads-ftzml')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    if($Revision -notmatch '^[a-z0-9-]+$'){throw 'Revision must contain lowercase letters, digits and hyphens'}
    $package=Get-Content -LiteralPath package.json -Raw | ConvertFrom-Json
    $config=Get-Content -LiteralPath src-tauri\tauri.conf.json -Raw | ConvertFrom-Json
    $validation=Get-Content -LiteralPath VALIDATION.json -Raw | ConvertFrom-Json
    if($package.version -ne $config.version -or $validation.version -ne $package.version){throw 'Package/native/validation versions differ'}
    if(-not $validation.passed){throw 'Complete validation before checkpoint'}
    $built=Join-Path $projectRoot 'target\release\fantaz-widgetz-demo.exe'
    if(-not (Test-Path -LiteralPath $built)){throw 'Build the native release first'}
    $tag='fantaz-widgetz-v'+$package.version+'-'+$Revision+'-'+(Get-Date -Format yyyyMMdd)
    $existing=& git tag --list $tag
    if($existing){throw 'Checkpoint tag already exists; make a new version/revision'}
    New-Item -ItemType Directory -Path releases -Force | Out-Null
    $destination=Join-Path $projectRoot ('releases\fantaz-widgetz-demo-'+$package.version+'.exe')
    $hash=(Get-FileHash -LiteralPath $built -Algorithm SHA256).Hash.ToLowerInvariant()
    if(Test-Path -LiteralPath $destination){if((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $hash){throw 'Versioned EXE already exists with different content; bump version'}}else{Copy-Item -LiteralPath $built -Destination $destination}
    $validation | Add-Member -Force NoteProperty binary ('releases/fantaz-widgetz-demo-'+$package.version+'.exe')
    $validation | Add-Member -Force NoteProperty binarySha256 $hash
    $validation | Add-Member -Force NoteProperty checkpointTag $tag
    $validation | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath VALIDATION.json -Encoding UTF8
    & git add .
    if($LASTEXITCODE -ne 0){throw 'Git staging failed'}
    & git commit -m ('Release Fantaz Widgetz '+$package.version+': '+$Revision)
    if($LASTEXITCODE -ne 0){throw 'Git checkpoint commit failed'}
    & git tag -a $tag -m ('Fantaz Widgetz '+$package.version+' validated source, FTZML, docs and demo EXE')
    if($LASTEXITCODE -ne 0){throw 'Git checkpoint tag failed'}
    if((& git status --porcelain)){throw 'Checkpoint left a dirty working tree'}
    Write-Output ('Checkpoint: '+$tag)
    Write-Output ('Demo EXE: '+$destination)
    Write-Output ('SHA-256: '+$hash)
} finally {Pop-Location}
