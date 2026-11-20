# Fantaz Widgetz agent contract

## Agent roles

- **Library user (default).** Treat this repository and installed or vendored copies of Widgetz as read-only. Use a released package, read its docs and source as needed, and make integration changes in the host project. Report library issues you find during integration.
- **Widgetz developer (explicit opt-in).** Edit this repository only when the user explicitly assigns you the Fantaz Widgetz developer role for the current task or explicitly asks you to change this project. Stay within that scope. A host integration request or access to the checkout leaves the default role in effect.

Library users can start with [the quick start](docs/QUICK_START.md).

## Developer instructions

Read README.md and docs/{PHILOSOPHY,API,INTEGRATION}.md before changes. Work only in this independent project, never a reference downloader.

For cross-project result-pad work, read docs/notification-pad-reference/README.md.
It exports the larger 360x88, opacity-9 composition as FTZML/API examples. The
built-in 0.1.0 adapter remains 284x64; do not invent native sizing API or override
element CSS. Reference-only revisions keep runtime/package versions and EXEs.

- Ten types only: pad, row, column, text, icon, LED, divider, progress, button, switch. Prefer composition. No arbitrary HTML/CSS/font/spacing/rounded-corner escape hatches. Shared Widget.size {width,height} and Widget.position {x,y} are inherited integer-pixel geometry; normal composition is the default. Switch artwork scales proportionally within the specified size.
- Fixed regular system text: 12 px normal, 11 px secondary. Only button labels allow 11–14 px. Pads/gaps 4 px, divider 1 px, progress 3 px, icon 16 px (optional fixed 20 px preset), LED 6 px. Switch defaults to smooth 20.8x10.4 CSS-pixel SVG artwork centered in a 34x20 desktop target. Touch targets are at least 44px. WebView2 applies Windows display scaling to CSS units. Keyboard focus changes the circle fill without drawing an outline. Read docs/ON_OFF_CONTROL.md before control work. Square pads/buttons; circular LEDs are intentional.
- Flat on/off control is project-neutral. Only onColor/offColor are switch-specific appearance properties; size/position belong to the shared Widget base. Circle color is derived by fixed brightness increase, hover darkens only the track, all fills are RGB565. No relief/3D/shadow/gradient, circle/hover color, local opacity or extra style API. State/action/label/disabled are operational. Preserve controlled actions and accessible keyboard semantics. See docs/ON_OFF_CONTROL.md.
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
