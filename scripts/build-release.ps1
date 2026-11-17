[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & (Join-Path $PSScriptRoot 'prebuild-native.ps1')
    $before=Get-Content -LiteralPath '.runtime\native-prebuild.json' -Raw | ConvertFrom-Json
    & npm.cmd run tauri -- build --no-bundle -- --locked
    if($LASTEXITCODE -ne 0){throw 'Release build failed'}
    # The source tree is an immutable dependency, never a place for app edits.
    $digest=[System.Security.Cryptography.SHA256]::Create()
    $sourceLines=Get-ChildItem -LiteralPath (Join-Path $before.tauriSourceRoot 'src') -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Substring($before.tauriSourceRoot.Length)+':'+(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    $after=[BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes(($sourceLines -join "`n")))).Replace('-','').ToLowerInvariant()
    if($after -ne $before.tauriSourceSha256){throw 'Tauri dependency sources changed during app build'}
    $changed=@($before.artifacts | Where-Object { $p=Join-Path (Join-Path $before.targetDirectory 'release\deps') $_.name; -not (Test-Path -LiteralPath $p) -or (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant() -ne $_.sha256 })
    if($changed.Count){throw 'A prebuilt native archive changed during final application build; inspect compiler/features'}
    $afterArchives=@(Get-ChildItem -LiteralPath (Join-Path $before.targetDirectory 'release\deps') -Filter '*.rlib' | Where-Object {$_.Name -match '^lib(tauri|tauri_runtime|tauri_runtime_wry|wry|tao)-'} | Select-Object -ExpandProperty Name)
    $newArchives=@($afterArchives | Where-Object {$_ -notin $before.artifacts.name})
    if($newArchives.Count){throw ('Final app compiled new native variants rather than using the prebuilt graph: '+($newArchives -join ', '))}
    [ordered]@{passed=$true;tauriVersion=$before.tauriVersion;unchangedRuntimeArchives=$before.artifacts.Count;newRuntimeVariants=0;tauriSourceSha256=$after;toolchain=$before.toolchain;lockSha256=$before.lockSha256} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath '.runtime\native-link-verification.json' -Encoding UTF8
    Write-Output 'Final app linked with unchanged prebuilt Tauri/native archives; dependency sources unchanged.'
} finally {Pop-Location}
