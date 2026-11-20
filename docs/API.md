# Public API v0.1

The **Fantaz Widgetz API** is a constrained visual vocabulary, not a general-purpose framework. It can be consumed as a small TypeScript library plus optional Rust/Tauri adapter. Style consistency takes priority over freedom.

## Fixed geometry

| Item | Fixed appearance |
|---|---|
| Pad | Square 1 px frame, 4 px padding, solid surface; no nested pad |
| Row/column | 4 px gaps; rows align centrally, minimum 18 px |
| Text | Regular system font; normal 12 px / 18 px line, secondary 11 px / 16 px line |
| Icon | 16 × 16 px; trusted bundled vector or local image |
| LED | 6 px round light, faint fixed glow; on/off and color |
| Divider | 1 px line |
| Progress | 3 px rail, value 0–1 |
| Button | Square 1 px frame, fixed 4 px horizontal padding, minimum 20 px height, fixed 12 px icon; 44 px minimum touch target on coarse pointers |

The notification template's desktop size is 284 × 64 logical px. A 1 px frame and 4 px padding leave exactly enough room for two rows, divider, gaps and rail. No arbitrary frame thickness, rounded rectangle, inner spacing, font weight, rich heading, alignment offsets, per-element dimensions, CSS or HTML attributes exist. Host mount dimensions define available space; short text sits at the fixed inset and long text rolls.

## Types

All elements need a unique `id` (letter then up to 63 letters/digits/underscores/hyphens). Common optional `opacity` is integer 1–10: 1=0%, 10=100%, `(n-1)/9` in between. Parent compositing attenuates children. Colors are `#RRGGBB` only.

| Type | Properties beyond id/type/opacity |
|---|---|
| `pad` | `children`, optional `palette` |
| `row`, `column` | `children` |
| `text` | `content`, optional `color`, `role: normal/secondary`, `align: start/center/end`, `wrap`, `overflow: clip/roll` |
| `icon` | `source: {glyph}` or `{image}`, optional `color`, `label` |
| `led` | `state: on/off`, `label`, optional `color` |
| `divider` | no extra properties |
| `progress` | `value: 0..1`, `label`, optional `color` |
| `button` | `action`, accessible `label`, `text` and/or `icon`, optional `color`, `textSize: 11/12/13/14`, `wrap`, `align`, `disabled` |

Glyphs: `app`, `download`, `check`, `fail`, `close`, `info`. Images must be bundled relative PNG/JPEG/WebP/SVG files, or bounded raster data URLs. No arbitrary SVG markup or remote requests. Bundled SVGs are displayed as images, never injected into DOM.

Palette keys: `surface`, `text`, `muted`, `accent`, `success`, `failure`, `warning`, `border`, `divider`. Changing a color does not change shape/geometry. Keep readable foreground/surface contrast when selecting a custom palette.

## Controller

```ts
const view = mount(element);       // empty until update/load
view.update(pad);                  // validates first, keyed reconciliation
view.load({version:1,pad,animations:[]});
view.setText('message', 'Saved');
view.setIcon('app-icon', {image:'./app.png'});
view.setProgress('progress', 0.6);
const unbind = view.onAction(action => hostHandle(action));
const cancel = view.animate({id:'message',property:'x',from:0,to:-60,durationMs:6000});
const xml = saveFTZML(view.design());
const design = parseFTZML(xml);
view.destroy();                    // observers, listeners and animations disposed
```

`animate` supports only `x` (text pixels ±8192), `opacity` (levels 1–10) and `color` (hex). Duration is an integer 100–600000 ms, optional `repeat` boolean, linear interpolation only. One animation per target/property; a new one replaces it. X motion temporarily owns a text track and cancels its auto-roll. Calling the returned cancel restores rolling. Regular updates to identical content preserve DOM nodes and ticker phase. Full design loading deliberately replaces its declared motions.

Rolling uses Web Animations at fixed 24 px/second with a 24 px gap and only runs on real overflow. The complete text remains the accessible label/tooltip. Reduced-motion preference cancels automatic animation and permits manual horizontal/keyboard reading. Parent opacity is native CSS compositing, not an inherited numeric overwrite; a child level 10 cannot undo its parent's attenuation.

The renderer emits action strings; it does not download, browse, open files, delete records or run callbacks named in a template. The host owns all effects. Runtime validation rejects unsupported properties before changing the displayed design, with 64-element/eight-level limits.

## Library 0.2.0: pixel slide switch

`switch` is a fixed compact control: a 34x20 desktop target, 32x16 square
pixel rail and 12x12 stepped thumb. The fixed default palette uses 16-bit-era
RGB565 colors. It has no gradient, rounded-pill skin, layout animation, or size
escape hatch. A coarse pointer increases the target to 44x44, leaving the rail
unchanged. Optional `color` sets the On accent; default is #63dfbd.

Model: `{type:'switch',id:'routing',state:'on',action:'toggle-routing',label:'Routing',disabled:false}`.
FTZML: `<switch id="routing" state="on" action="toggle-routing" label="Routing"/>`.
State is `on` or `off`; action/accessible label are required; disabled/color/
opacity are optional. Native button keyboard behavior plus role=switch and
aria-checked expose state. It emits an action ID without changing state; the
host updates it after its operation succeeds. Disabled prevents actions.
`saveFTZML` and `parseFTZML` preserve the control atomically and reject unknown
fields/invalid states. It is not available in the older 0.1.0 library.

Icons additionally accept `size:16|20` / FTZML `size="20"` as a constrained
compact/large preset; default 16 and button icon geometry remain unchanged.
