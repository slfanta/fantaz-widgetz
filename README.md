# Fantaz Widgetz

A tiny, style-predetermined widget vocabulary. Compact desktop pads and in-app widgets, with an optional **Tauri 2** corner-notification adapter. No UI component runtime, font choices, rounded panels, or application-specific branding.

For agents reusing the larger result pad from the downloader project, start with
the [360 × 88 notification reference bundle](docs/notification-pad-reference/README.md):
success/failure FTZML, API composition, preview, host contract and integration
guide. This adds reference assets; the 284 × 64 demo/adapter defaults stay intact.

The reference is the compact two-row floating monitor: regular text, a small app icon, restrained LED, faint divider and almost console-like density. This is an independent project; it does not modify or depend on the reference downloader.

## Run

```sh
npm ci
npm run dev             # browser/in-app demo
npm run tauri dev       # native demo + actual corner notifications
npm test
cargo test --workspace
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1
```

Node 22+, Rust stable and the normal [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) are required. Windows uses the installed WebView2 runtime; Linux uses WebKitGTK. Versioned deliverables are in `releases/`.

## Small by design

Nine elements: **pad, row, column, text, icon, LED, divider, progress, button**. A fixed system font, 4 px pad/gap, square 1 px frames, 3 px progress rails, 6 px round LED, 16 px icons and fixed controls. Text wraps or rolls, aligns start/center/end, and accepts a color. Buttons have fixed geometry and may carry text, a bundled vector glyph or local image; only label size (11–14 px), color, wrapping and alignment are adjustable. No `style`, `className`, raw HTML, remote images or font hooks.

Opacity is an integer **1–10**: **1 = 0%**, **10 = 100%**, equal steps `(level - 1) / 9`. Parent opacity composites all descendants; child opacity multiplies it. Use one level on the pad unless deliberately attenuating a child.

```ts
import { mount, downloadNotice } from '@fantaz/widgetz';
import '@fantaz/widgetz/style.css';
const view = mount(document.querySelector('#widget')!);
view.update(downloadNotice({
  id: 'job-42', outcome: 'success', title: 'example-video.mp4',
  detail: 'Saved to Downloads', appName: 'Your app',
}, { icon: { glyph: 'download' }, opacity: 10 }));
view.onAction(action => { if (action === 'dismiss') view.destroy(); });
```

The project-neutral notification template uses two rows. Its desktop host is **284 × 64 logical px**, bottom-right inside the work area, topmost, no taskbar button, no focus stealing, no OS toast. Close `[x]` or timeout dismisses it. Hover/focus holds the timeout. Success lasts 8 seconds; failure 12. One visible pad, bounded FIFO queue, delivery acknowledgment and no idle polling.

FTZML is the XML save/share format: `parseFTZML(xml)` / `saveFTZML(design)`. It contains only this limited vocabulary, palette and simple animations. Three `.ftzml` examples ship in `public/templates/`; no visual editor is included.

| Location | Responsibility |
|---|---|
| `packages/widgetz` | Validated TypeScript model, small DOM renderer, fixed CSS, bounded animation, templates and optional Tauri client |
| `crates/widgetz-core` | Platform-independent Rust result types, queue/delivery/expiry state machine and corner geometry |
| `crates/widgetz-tauri` | Tauri 2 plugin: one native window, work-area placement and event delivery |
| `src` + `src-tauri` | Standalone demonstration, not library API |
| `docs` | Philosophy, API, integration, platform limits and agent rules |

The renderer works in desktop/mobile app content. The native corner window is a **desktop** adapter; Android/iOS system overlays are not implemented. See [integration](docs/INTEGRATION.md), [philosophy](docs/PHILOSOPHY.md), [API](docs/API.md), [FTZML](docs/FTZML.md) and [build/cache rules](docs/BUILD.md).
