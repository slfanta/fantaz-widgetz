# Fantaz Widgetz on/off control

Library and demo 0.3.1, 2026-11-20 (Asia/Taipei). This is a reusable
Fantaz Widgetz control. It has no dependency on a downloader, routing app,
website, server, registry setting or other project's state.

Read this guide before reusing or changing the control. The implementation is
`packages/widgetz/src/{types,switch,renderer,validate,ftzml}.ts` and `style.css`.
Import the public package and its stylesheet; do not copy its DOM/CSS into a
consumer or add extra theme knobs.

## Appearance contract

The flat switch uses a rounded SVG rectangle and a true circle. The default
track is 16 × 8 CSS pixels with a 6 px circle. The artwork is centered inside
the 34 × 20 desktop button. Off places the circle on the left and On places it
on the right. The keyboard focus ring outlines the button.

There are only two control-specific appearance properties:

| Property | Meaning | Default |
|---|---|---|
| `onColor` | Solid `#RRGGBB` track color when On | `#b54d29` |
| `offColor` | Solid `#RRGGBB` track color when Off | `#42414a` |

`size` and `position` are inherited from the shared `Widget` interface.

The track, hover and circle use RGB565 solid fills with 5 red, 6 green and 5 blue
bits expanded for display. The SVG renderer smooths the edges at the output
resolution. FTZML preserves the supplied hex colors when saving.

The circle always uses the active state's base color with a fixed +66 brightness
increase on each RGB channel, clamped to 255 and quantized again. A channel already
at its maximum cannot brighten further. There is no separate circle/thumb color.
Hover multiplies the base track channels by 0.78 and quantizes again. The circle
keeps exactly the same fill, size and position while hovered. Disabled controls
emit no actions and do not apply hover darkening; they introduce no third palette.

Do not add `color`, `circleColor`, `thumbColor`, `hoverColor`, opacity, radius,
border, shadow, relief, animation, shape or CSS/style options to this switch.
Runtime/API/FTZML validation rejects these fields before changing the view.
An enclosing pad's normal opacity still composites its whole subtree.

## Shared size and position

Every widget inherits the same optional geometry:

```ts
interface Widget {
  id: string;
  size?: { width: number; height: number };
  position?: { x: number; y: number };
}
```

Dimensions are integer CSS pixels from 1 to 4096. Coordinates are integer CSS
pixels within ±8192. Both members of an object are required. Omit geometry to use
normal pad/row/column layout. A supplied `position` places the widget absolutely
in the nearest containing layout's padding box, excluding it from normal flow.
Pads, rows and columns establish that containing block. The host must allow room
and avoid overlapping or clipping positioned widgets. Removing geometry restores
normal layout and clears the previous width/height/offsets.

CSS pixels are logical units. At 100% page zoom, a 16 × 8 CSS pixel SVG covers
about 24 × 12 physical pixels when Windows display scaling is set to 150%.
The WebView applies display scaling. The design stores the same CSS dimensions
across monitors.

An explicit switch size sets the button box and its SVG viewport. The viewport
uses 32/34 of the specified width and 16/20 of the height. The SVG fits that
viewport proportionally so the circle stays round. A specified 34 × 20 box draws
32 × 16 artwork, twice the new default and the same size as that box drew in
0.3.0. Coarse pointers expand the button to at least 44 × 44 CSS pixels while
the SVG keeps its selected dimensions.

Icon artwork uses `iconSize: 16 | 20`, separately from inherited bounding-box
`size`. This avoids giving the common property different meanings on each type.

## State and actions

`id`, `state: 'on' | 'off'`, `action` and accessible `label` are required. Optional
`disabled` prevents input. These are identity/operation/accessibility fields,
not additional styling controls. Use a short action identifier; display visible
labels with an adjacent normal text widget rather than drawing text in the switch.

```ts
import { mount, type Pad } from '@fantaz/widgetz';
import '@fantaz/widgetz/style.css';

let enabled = false;
const view = mount(document.querySelector<HTMLElement>('#widget')!);
const render = (): Pad => ({
  type: 'pad', id: 'settings', children: [{
    type: 'row', id: 'feature-row', children: [
      { type: 'text', id: 'feature-label', content: 'Feature' },
      {
        type: 'switch', id: 'feature', action: 'toggle-feature',
        label: 'Feature enabled', state: enabled ? 'on' : 'off',
        onColor: '#b54d29', offColor: '#42414a',
      },
    ],
  }],
});
view.update(render());
view.onAction(action => {
  if (action !== 'toggle-feature') return;
  enabled = !enabled; // For a real operation, update after the host confirms it.
  view.update(render());
});
// view.destroy() when the host unmounts.
```

Click, Space and Enter emit the same action. The renderer does not change its own
state, call host services or claim an operation succeeded. The host owns state
and updates after success; on rejection it keeps the previous state. For an async
operation, the host may render `disabled: true` until it completes. Rendering the
same ID preserves its button/artwork DOM and focus. No timer or animation is
needed for the control.

## FTZML

The same public model saves/loads as FTZML v1. Both state colors and geometry
round-trip without loss. `width`/`height` map to inherited `size`; `x`/`y` map to
inherited `position`. Omit them for the recommended normal layout/default size.

```xml
<switch id="feature" state="off" action="toggle-feature" label="Feature enabled"
        onColor="#b54d29" offColor="#42414a"/>
```

An explicitly positioned 2× example is:

```xml
<switch id="feature" state="on" action="toggle-feature" label="Feature enabled"
        width="34" height="20" x="80" y="8"
        onColor="#b54d29" offColor="#42414a"/>
```

The interactive reference is [on-off-control/preview.html](on-off-control/preview.html).
Run `npm run dev` and open `/docs/on-off-control/preview.html`. It uses the real
library, normal-size On/Off examples, independent state colors and shared geometry.
The bundled design is `public/templates/pixel-switch.ftzml`.

## Agent maintenance and migration

0.3.0 replaces the short-lived 0.2.0 beveled square switch. Replace its `color`
with `onColor`; set `offColor` if wanted. Switch-local `opacity` is removed. Move
an intentional whole-composition opacity to its containing pad. Icon numeric
`size: 20` / `size="20"` becomes `iconSize: 20` / `iconSize="20"`; `size` now has
one inherited width/height meaning. Unsupported legacy fields fail explicitly.

Keep docs, exported types, runtime validation, FTZML and rendering in agreement.
Verify both states, track-only hover, brightness/RGB565 fills, smooth SVG geometry,
proportional scaling, shared position/size roundtrip/reset, click/keyboard/disabled,
strict unknown-field rejection and unchanged-DOM behavior. Run package/frontend
builds and the existing integration checks. Publish only a new version/checkpoint;
preserve prior packages and EXEs. The native notification adapter remains separate
and needs no switch-specific business API.
