# Fantaz Widgetz agent contract

Read README.md and docs/{PHILOSOPHY,API,INTEGRATION}.md before changes. Work only in this independent project, never a reference downloader.

- Nine types only: pad, row, column, text, icon, LED, divider, progress, button. Prefer composition. No arbitrary HTML/CSS/font/spacing/rounded-corner escape hatches.
- Fixed regular system text: 12 px normal, 11 px secondary. Only button labels allow 11–14 px. Pads/gaps 4 px, divider 1 px, progress 3 px, icon 16 px, LED 6 px. Square pads/buttons; circular LEDs are intentional.
- Opacity integer 1–10 maps `(n-1)/9`, parent compositing multiplies descendants. Validated solid hex colors only.
- Simple linear animation for text x, opacity and color only. One animation per property; clean replacement/cancel. No spring/shake/blink/layout animation. Reduced motion disables automatic motion, preserving full text via manual reading/accessibility.
- Renderer projects state and emits action IDs. No download/file/network business operations in templates. textContent only, no innerHTML. Icons are bundled glyphs/local assets, never remote URL/raw SVG markup.
- Preserve unchanged DOM/ticker phase. ResizeObserver measures text; no JS frame loop or renderer poll. Dispose all observers/animations/listeners.
- Rust core owns bounded FIFO/dedup/current-ID ack/dismiss/hold/expiry; Tauri owns native events/windows. No locks across native calls/await. No idle timer; one reused nonactivating topmost no-taskbar notice window.
- Mobile means embedded rendering. No claim of mobile OS overlay or Linux/macOS certification from Windows tests.
- Test queue pressure/order, stale delivery events, timeout/hover, compact overflow, reduced motion, injection/unknown fields, opacity and teardown. Native fixtures use this demo's isolated profile, never live user downloaders.
- Keep API/docs/validation/versioned EXE/source aligned. Git checkpoints and named local tags. Do not track target/node_modules/dist/profile files.
- Every new version OR revision needs its own commit and named checkpoint tag. Never move/overwrite prior tags or versioned EXEs. Use scripts/checkpoint.ps1 only after validation.
- Tauri is a locked immutable dependency. Read docs/BUILD.md. Prebuild static .rlib dependencies and reuse the stable Cargo cache; never edit dependency registry sources or cargo-clean for appearance work. Final link verifies runtime archives/source fingerprints. Legitimate dependency/toolchain changes need a reviewed new checkpoint.
