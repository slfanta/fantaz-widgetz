# Philosophy

High stylistic freedom causes inconsistency and display mistakes. Fantaz Widgetz deliberately decides most appearance once. App authors supply content rather than reinventing a visual system: exceptionally compact, regular-weight, visually comfortable, almost console-like.

## Predetermined appearance

Keep layout and the supported appearance properties together in FTZML. The
renderer supplies the fixed presentation when mounted. Nesting groups elements
under a pad, row, or column and makes the layout readable in the file.

Square pads and buttons; 1 px frame; 4 px pad and gap. No padding/margin/radius/weight/family API. Shared optional integer-pixel size/position belongs to the Widget base; omit it for standard row/column layout. Normal text 12 px, secondary 11 px, system font only. Button labels alone allow 11–14 px. LED 6 px with a faint fixed glow; icons 16 px; divider 1 px; progress 3 px. Prefer two rows and rolling text to new branding rows or blank space. Default dark blue/purple balance follows the reference floating monitor, with neutral branding. Success/failure has quiet color AND literal state text.

Colors, opacity and bounded linear movement are intentional limited exceptions. The flat on/off switch has only two state colors plus inherited size/position, with no local opacity/motion: a rounded rectangle and a circle form the SVG, with fixed RGB565 fills for the track, hover and circle. No generic style object, CSS classes, raw HTML, arbitrary vector markup or stylesheet hook. Use one outer pad; nested pads are forbidden to avoid accumulated frames/spacing. Bound models to 64 elements/eight layout levels. Compose ten types; forms, tables, menus, rich text, navigation and business logic belong to the host.

## Animation/accessibility

Linear interpolation only. Rolling reveals overflow at constant speed with fixed gap. Manual text x translation temporarily owns movement; cancelling restores rolling. Opacity applies to a whole subtree; solid color endpoints interpolate. Clamp duration and stop replaced/cancelled effects. No JS frame loop. Honor prefers-reduced-motion: static initial frame, full accessible text, manual horizontal/keyboard reading. No flashing/loud glow/focus theft.

## Host boundary

A widget is a view, not a task engine. The host decides a download succeeded/saved or failed and submits that result. Dismissal cannot change task state or retry a video. Buttons emit action IDs only.

The desktop notification adapter reuses one topmost small window and displays one notice at a time. No extra taskbar item, keyboard focus stealing, browser navigation or OS toast. A delivery acknowledgment starts its lifetime only after render and native show succeed. Hover holds remaining time; stale IDs cannot affect another notice. A bounded queue reports pressure instead of silently dropping results.

## Resources

No React/Vue/canvas/chart/icon runtime, remote assets, recurring DOM rebuilds, renderer polling or idle animation. Small DOM, scoped CSS, ResizeObserver and Web Animations only when active. Tauri uses the installed system WebView; this is not zero-memory native drawing or an EXE free of platform-runtime prerequisites. Core Rust has no GUI/runtime dependency.
