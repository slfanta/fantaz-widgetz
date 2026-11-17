# Build and checkpoint contract

## Prebuilt static dependencies

Tauri's Rust libraries already compile to static Rust **`.rlib` archives**, which Cargo links into the final application. Keep this supported path instead of inventing a second linker or treating Rust libraries as a stable C ABI. Rust `.rlib` files are specific to compiler, target, feature graph, profile and flags. A prebuilt `.lib`/`.a` cannot be substituted independently without a stable C interface. Tauri's system WebView and OS dependencies remain platform prerequisites even when its Rust code is statically linked.

This project separates the native adapter from demo/application code. Build in two stages:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prebuild-native.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1
```

The first stage runs `cargo build --workspace --lib --release --locked`. This builds Tauri 2, the adapter and the demo host library using the complete workspace feature/build-dependency graph once into the stable project-local `target/release/deps` cache. It records `.rlib` SHA-256s, compiler details, Cargo.lock and Tauri source hashes in `.runtime/native-prebuild.json`. The final build script checks that the Tauri/Wry/Tao runtime archives and Tauri dependency sources stay unchanged and that no new runtime archive variant appears while linking the app. The project-owned adapter/host may rebuild when edited or when Tauri CLI environment changes; they are not frozen third-party dependencies. Repeating it uses Cargo's normal fingerprints and cache; UI/template edits should rebuild only frontend assets and the app crate.

The reviewed `native-runtime.lock.json` also pins Tauri's version/source fingerprint: prebuild rejects an unexpected dependency source change before compilation. Update it only with an intentional native dependency revision and new validation. Dependencies are locked in Cargo.lock and package-lock.json. Use `npm ci`; `--locked` is mandatory for release/native steps. Do not edit registry Tauri/Wry/Tao sources, Cargo.lock, Rust flags or feature sets to make a UI change. Avoid `cargo clean`, toolchain changes, target-directory changes and profile changes during ordinary widget work. A real toolchain/dependency/feature change legitimately invalidates the corresponding native cache and requires a reviewed dependency checkpoint/revalidation. Static archives are local build artifacts, not portable SDK binaries; do not commit gigabytes of target output.

Unix equivalents are the same two Cargo/Tauri CLI commands; PowerShell scripts are Windows convenience automation. A future consuming project can choose a stable shared Cargo target directory explicitly, but it must use compatible locked dependencies/features/toolchain and verify that configuration. This project does not alter another project's build cache or Tauri sources.

## Versioned checkpoints

Before a release: tests, Clippy, library build, native demo smoke test and final locked release build. Keep package versions, Cargo workspace version and tauri.conf.json aligned; update CHANGELOG.md and VALIDATION.json. Run `scripts/checkpoint.ps1` to copy the final EXE to a new versioned release path, record its hash, commit all source/docs/assets/evidence and create a named version tag. Refuse dirty version conflicts; never overwrite a release/tag silently. Build outputs and test profiles remain ignored. Check git status is clean at the end. Remote push is separate and requires user intent.
