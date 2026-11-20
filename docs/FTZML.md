# FTZML v1

**Fantaz Widgetz Markup Language** is the deliberately small XML save/share format for Fantaz designs. Extension `.ftzml`, UTF-8, versioned root. No visual editor is included. Parse and serialize are implemented, not just a proposed format.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ftzml version="1">
  <pad id="notice" opacity="10">
    <row id="heading">
      <icon id="app" glyph="app"/>
      <text id="result" color="#83e6ae">Download saved</text>
      <button id="close" action="dismiss" label="Dismiss" text="[x]" textSize="11"/>
    </row>
    <divider id="line"/>
    <row id="body">
      <led id="state" state="on" label="Saved" color="#83e6ae"/>
      <text id="name" role="secondary" overflow="roll">example.mp4</text>
    </row>
    <progress id="progress" label="Progress" value="1"/>
  </pad>
</ftzml>
```

One optional `<palette>` alongside the single outer `<pad>` accepts the nine [API palette keys](API.md). Palette attributes apply to that pad. Ten element names match the API; structural elements contain children, `<text>` contains only literal text and all other elements are empty. Icon sources flatten to `glyph="download"` or `image="./app.png"`. Button icon sources use the same attributes. Numbers and booleans are explicit (`true`/`false`); opacity must be an integer 1–10. Button `textSize` is the only label-size option. `disabled` is supported.

Optional sibling animation elements:

```xml
<animate target="name" property="x" from="0" to="-60" ms="6000" repeat="false"/>
<animate target="state" property="color" from="#e6c36a" to="#83e6ae" ms="2000"/>
<animate target="notice" property="opacity" from="10" to="8" ms="4000"/>
```

Each target must exist. One animation per target/property, at most 16. All animation is linear. No easing curves, layout motion, event handlers, script, external include, variable evaluation or downloaded resource. Runtime content binding is explicit `view.setText(id,value)` etc.; an action is an inert identifier that the host handles. Save a template with sample text or replace it from the host; FTZML does not execute interpolation expressions.

`parseFTZML(text)` returns a validated `{version:1,pad,animations?}`. `saveFTZML(design)` emits deterministic indented XML with entity escaping. Text, Unicode, newlines, local image references, opacity and animation survive a semantic round trip; comments/attribute order/insignificant formatting are not preserved. Empty optional fields may be omitted. The format stores design, not playback position, button handlers, download state history, window coordinates or queued notifications.

Validation rejects malformed XML, DTD/custom entities, processing instructions other than a leading XML 1.0 UTF-8 declaration, namespaces, unknown tags/attributes, duplicate IDs, duplicate motion properties, nested pads, out-of-range values and models over 64 nodes/eight levels. File size limit is 256 KiB. Built-in XML entities and escaped literal text are allowed. Parse first; replace the visible view only after validation succeeds.

Examples are in `public/templates/`: `download-result.ftzml`, `connection-monitor.ftzml`, `linear-animation.ftzml`. Sharing these files does not grant file/network permissions or modify any host project. Keep v1 constrained; do not add silent CSS/HTML fallbacks for unsupported options.

Library 0.2.0 adds a serializable pixel slide control:

```xml
<switch id="routing" state="off" action="toggle-routing" label="Enable routing" disabled="false" color="#63dfbd"/>
```

It is empty-element syntax, state on/off; action, label required; opacity, color
and disabled optional. The host owns state/action effects. Icon size="20" is
also supported (only 16 or 20; omitted remains 16). Existing FTZML version 1
files remain compatible. 0.1.0 parsers reject the new fields/types explicitly.
