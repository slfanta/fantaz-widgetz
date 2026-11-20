# Changelog

## 0.3.1 - 2026-11-20

- Draw the switch with a rounded SVG track and a true circle. Default artwork is
  16 × 8 CSS pixels, half the previous width and height. The desktop button is
  34 × 20 CSS pixels and touch targets are at least 44 × 44 CSS pixels.
- Fit the SVG proportionally within the inherited size and preserve the rendered
  dimensions of explicitly sized 0.3.0 designs. Update the guide and demo.

## 0.3.0 - 2026-11-20

- Remade the on/off switch as a flat low-resolution RGB565 capsule with a stepped
  brighter circle. Hover darkens only the track. No bevels, shadows or gradients.
- Limited switch-specific appearance to onColor/offColor. Shared exported Widget
  base owns integer-pixel size/position; switch resizing preserves integer scale.
- State/action/label/disabled stay controlled and accessible. FTZML round-trips
  shared geometry and both colors; unsupported extra styling fails atomically.
- Added the project-neutral ON_OFF_CONTROL agent guide and interactive reference.
- Breaking 0.2.0 migration: switch color becomes onColor, local opacity is removed,
  and icon numeric size becomes iconSize to keep inherited size unambiguous.
- Library/demo/native versions aligned. No consuming application was modified.


## Library 0.2.0 - 2026-11-20

- Added a controlled pixel/RGB565-style on/off switch with fixed compact geometry,
  keyboard/accessibility state, disabled protection and inert action IDs.
- FTZML version 1 now saves/loads switch state, action, label, color and disabled.
- Added a fixed 20px icon preset, keeping the default 16px/notification styles.
- Library-only release: native adapter/demo binary and Tauri dependencies are
  unchanged at 0.1.0. Existing 0.1.0 design files remain compatible.
- Library and demo frontend builds plus 22 browser tests passed; no new native
  behavior is claimed. No reference downloader was changed.


## Reference revision — 2026-11-18 (API/runtime stays 0.1.0)

- Added the neutral 360 × 88 result-pad agent reference: success/failure FTZML,
  equivalent API composition, browser preview, host-only CSS and native contract.
- Documented the separate detail row, opacity 9, restrained appearance, native
  lifecycle/platform limits and difference from the unchanged 284 × 64 adapter.
- Runtime/library/native code, dependency graph and released EXE are unchanged.

## 0.1.0 — 2026-11-17

- Independent Fantaz Widgetz API with nine fixed visual types; regular system text, square 1 px frames, 4 px pad/gaps, 3 px rails and restrained LED.
- Project-neutral two-row download saved/failed notification template; fixed 284 × 64 desktop host and 44 px touch controls for embedded mobile layouts.
- Limited solid colors, integer opacity 1–10, text wrapping/rolling, local images/bundled vectors and linear x/opacity/color animation. No font/CSS/HTML/spacing/radius escape hatches.
- FTZML v1 XML parse/save, strict schema/value/resource checks, semantic round trip and three shareable examples. No visual editor or executable template logic.
- Independent Rust FIFO/dedup/delivery/expiry state machine and Tauri 2 adapter; reusable nonactivating topmost no-taskbar bottom-right window, current-ID actions, hold/dismiss and display acknowledgment.
- Locked static Rust native prebuild cache and final-link archive/source checks, project-local build directory and versioned checkpoint script.
- Standalone demo, API/philosophy/FTZML/integration/build/agent docs. Reference downloader projects stay unchanged.
