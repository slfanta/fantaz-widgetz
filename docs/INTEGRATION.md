# Host integration and boundaries

For the larger 360 × 88 result pad with independent title/detail rows and
opacity 9, use the [agent reference bundle](notification-pad-reference/README.md).
It contains saved FTZML designs and API composition, plus the app-owned native
window/lifetime contract. The optional adapter described below remains 284 × 64
in 0.1.0; this reference does not add a size option or change that default.

## In-app content (desktop/mobile)

Build the library (`npm run build:library`), then depend on `@fantaz/widgetz` from this workspace or a package created with `npm pack --workspace @fantaz/widgetz`. Import `@fantaz/widgetz/style.css` once. The host gives a mount element a compact width/height; `mount(element)` creates only the predetermined elements inside it. No React/Vue is required. A larger application may use any UI stack outside the widget.

The renderer works inside a mobile WebView/browser. On coarse pointers controls have a fixed 44 px minimum touch target, so the host must allow a taller pad (at least 88 logical px for the two-row notice); desktop notification dimensions must not be blindly reused for touch layouts. This is in-app content, not an Android/iOS system-wide overlay, background service or mobile OS toast. Native desktop corner adapter code is platform-gated.

## Draggable Tauri pads

In a host-owned Tauri 2 desktop window, bind the helper to the same element
you pass to `mount`.

```ts
import { enableWindowDrag } from '@fantaz/widgetz/tauri';

const stopDragging = enableWindowDrag(element);
// On teardown, call stopDragging() and view.destroy().
```

Add this capability for the floating window, substituting its label for
`floating-pad`.

```json
{"identifier":"floating-pad-drag","windows":["floating-pad"],"permissions":["core:window:allow-start-dragging"]}
```

Dragging the pad body with the primary mouse button hands movement over to the
OS once the pointer travels three CSS pixels. Buttons, switches, and text that
can take focus for manual scrolling keep their usual input behavior. Clicks,
double-clicks and right-clicks keep their usual handlers. The host owns the
window and can save its location using Tauri's window move events.

Use the helper as the drag handler for its region. Remove any existing
JavaScript position loop or `data-tauri-drag-region` attributes from that region.
The helper is inert in a regular browser and has native validation on Windows.

## Tauri 2 desktop notification

Rust host Cargo.toml:

```toml
widgetz-tauri = { path = "C:/projs/fantaz-widgetz/crates/widgetz-tauri" }
```

Register `widgetz_tauri::init(Options { page: "notice.html".into() })` on the Tauri builder. The page must be a bundled relative asset and needs no application state. On macOS, transparent WebViews require `tauri`'s `macos-private-api` feature and `app.macOSPrivateApi: true`; evaluate App Store distribution constraints before adopting it. Windows/Linux do not require that macOS switch, but compositor/always-on-top behavior varies.

Grant only the `fantaz-notice` window these capabilities:

```json
{"identifier":"notice","windows":["fantaz-notice"],"permissions":["core:event:allow-listen","core:event:allow-unlisten","fantaz-widgetz:default"]}
```

Frontend `notice.ts`:

```ts
import {connectNotifications} from '@fantaz/widgetz/tauri';
import '@fantaz/widgetz/style.css';
const connection = await connectNotifications(document.querySelector('#app')!, {
  icon: {image:'./your-app.png'}, opacity:10,
});
// connection.destroy() on host view teardown.
```

Give html/body/#app full dimensions and zero margins; body should be transparent. Set the CSP to local assets and IPC only, as in the demo. `connectNotifications` listens before reading initial state and rejects a stale initial response, preventing a startup-event race. It renders current content and acknowledges it; there is no recurring HTTP/IPC poll. A short bounded retry is used only if native show fails. Individual per-notice lifetime animation runs in the compositor. Hover/focus holds native lifetime; UI dismissal is current-ID bound.

When a host confirms success/failure:

```rust
use widgetz_tauri::{NotificationExt,DownloadResult,Outcome};
app.notify_result(DownloadResult {
    id: "task-42-entry-9-saved".into(),
    outcome: Outcome::Success,
    title: "example.mp4".into(),
    detail: "Saved to Downloads".into(),
    app_name: "Your downloader".into(),
})?;
```

Only a validated saved result should be called success. Fantaz does not check files or change task statuses. Provide a unique stable ID to avoid duplicate results. The bounded queue accepts up to 64 pending notices plus one current notice and remembers 128 recent accepted IDs. A full queue returns an error; retain/retry in host policy. This is in-memory presentation, not durable download history. App shutdown discards queued popups; the host's database remains its authority.

The adapter creates one 284 × 64 logical-pixel undecorated, topmost, nonfocusable, no-taskbar desktop window and reuses it. It places it 12 logical px from the primary monitor work area's bottom-right corner, scales for DPI and clamps against small/negative-coordinate work areas. No native window shadow or second rounded frame. It deliberately avoids live-resize complexity; notification pads are fixed-size. Showing never calls set_focus. Its timer begins after native show and frontend acknowledgment, success 8 seconds/failure 12. Unrendered delivery has a ten-second bound and emits `fantaz-widgetz:delivery-failed` with the result ID; creation errors emit `fantaz-widgetz:host-error`. These are presentation diagnostics, not download failures.

Platform runtime prerequisites remain: Windows WebView2, Linux WebKitGTK, macOS WebKit. Transparent windows/topmost behavior, especially Wayland and mobile, cannot be certified by Windows tests alone. The adapter is a Tauri WebView window, not a low-level native-drawn HWND toolkit or a full general GUI framework.

Windows specifics are confined to the adapter: show uses `SW_SHOWNOACTIVATE`, hide uses the matching native hide verb, and the HWND is marked as a tool window with `WS_EX_APPWINDOW` cleared. Tao may reapply its cached style on show, so the flags are enforced after show too. Commands that position/show/hide run asynchronously to avoid blocking WebView2's UI thread. Do not switch back to a synchronous native-show command or hide through stale cached visibility; these regressions were caught by the standalone native fixture. Tauri/Wry/Tao sources remain unchanged.

## SexBJCam consumption and reusable reference

This repository modifies **no SexBJCam source, extension, downloader or live task**. A consuming integration should replace only its notification presentation/adapter: keep its committed-success/final-failure source events, existing IDs, delivery acknowledgments and task/status boundaries. Supply its icon and palette through Fantaz's limited appearance fields. Preserve widget/main/tray behavior and downloader settings. Use the bundled styles and report any rendering issue that requires a Widgetz change. The user can authorize changes to the shared template under the developer role. [Agent roles](../AGENTS.md)

2026-11-18 status: that consumer integration already exists in SexBJCam desktop
0.10.35 and later. It uses the frontend renderer/template with a separate detail
row and retains its own native queue/window. The neutral reference exports that
composition for other projects; no consuming project is edited by this bundle.

## Checkpoints

Every new version/revision gets a source/docs/validation commit and named local Git tag. Preserve prior tags and versioned EXEs; never move a published checkpoint tag. `scripts/checkpoint.ps1` packages the built versioned EXE and records its hash; use it after checks and update CHANGELOG.md/VALIDATION.json. Generated build/profile files are excluded. Do not push or publish remotely unless requested.
