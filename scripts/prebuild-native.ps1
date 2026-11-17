[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    # Include the application's build-dependency graph to avoid a second Tauri
    # variant from Cargo feature unification when the final binary is linked.
    # Cargo retains compiler/version/feature fingerprints and static .rlib files.
    $metadataText=& cargo metadata --locked --format-version 1
    if($LASTEXITCODE -ne 0){throw 'Cannot read locked dependency graph'}
    $metadata=$metadataText | ConvertFrom-Json
    $dependencyRoot=Join-Path $metadata.target_directory 'release\deps'
    $tauriPackage=$metadata.packages | Where-Object {$_.name -eq 'tauri'} | Select-Object -First 1
    $sourceRoot=Split-Path -Parent $tauriPackage.manifest_path
    $digest=[System.Security.Cryptography.SHA256]::Create()
    $sourceLines=Get-ChildItem -LiteralPath (Join-Path $sourceRoot 'src') -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName.Substring($sourceRoot.Length)+':'+(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash }
    $sourceHash=[BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes(($sourceLines -join "`n")))).Replace('-','').ToLowerInvariant()
    $baseline=Get-Content -LiteralPath native-runtime.lock.json -Raw | ConvertFrom-Json
    if($tauriPackage.version -ne $baseline.tauriVersion -or $sourceHash -ne $baseline.tauriSourceSha256){throw 'Tauri version/source fingerprint differs from the reviewed native-runtime.lock.json; inspect dependency changes before prebuilding'}
    & cargo build --workspace --lib --release --locked
    if($LASTEXITCODE -ne 0){throw 'Native dependency prebuild failed'}
    $artifacts=Get-ChildItem -LiteralPath $dependencyRoot -Filter '*.rlib' | Where-Object {$_.Name -match '^lib(tauri|tauri_runtime|tauri_runtime_wry|wry|tao)-'} | ForEach-Object { [ordered]@{name=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} }
    if(-not ($artifacts | Where-Object {$_.name -match '^libtauri-'})){throw 'Tauri static Rust archive not found'}
    $report=[ordered]@{profile='release';toolchain=(& rustc -Vv | Out-String).Trim();lockSha256=(Get-FileHash -LiteralPath Cargo.lock -Algorithm SHA256).Hash.ToLowerInvariant();targetDirectory=$metadata.target_directory;tauriVersion=$tauriPackage.version;tauriSourceRoot=$sourceRoot;tauriSourceSha256=$sourceHash;artifacts=@($artifacts)}
    New-Item -ItemType Directory -Path '.runtime' -Force | Out-Null
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath '.runtime\native-prebuild.json' -Encoding UTF8
    Write-Output ('Prebuilt static native dependencies: '+$dependencyRoot)
    Write-Output ('Tauri '+$tauriPackage.version+' source SHA-256: '+$sourceHash)
} finally {Pop-Location}
