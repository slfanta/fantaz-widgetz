# Fantaz Widgetz quick start for agents

Your default role is **library user**. Integrate the released package in the
host project and treat Widgetz as read-only. Changes to Fantaz Widgetz itself
require explicit user authorization for the task. [Agent roles](../AGENTS.md)

Use `@fantaz/widgetz` to render a compact pad inside a browser or WebView. In the
host project, install the 0.6.0 package from the GitHub release or your checkout.

```sh
npm install ./fantaz-widgetz-0.6.0.tgz
```

Give the pad a mount element with room for its contents.

```html
<div id="widget" style="width: 220px; height: 56px"></div>
```

Save your design as `monitor.ftzml`, or start from the
[connection monitor example](../public/templates/connection-monitor.ftzml).

```xml
<ftzml version="1">
  <pad id="monitor">
    <row id="status">
      <led id="activity" state="on" label="Downloading"/>
      <text id="message">Downloading</text>
    </row>
    <progress id="download" value="0.77" label="Download progress" color="#ffc840"/>
  </pad>
</ftzml>
```

Read the bundled FTZML as text in your host and pass it to the view.

```ts
import { mount } from '@fantaz/widgetz';

const view = mount(document.querySelector<HTMLElement>('#widget')!);
view.loadFTZML(xmlText);
view.setProgress('download', 0.82);
// Call view.destroy() when the host removes the pad.
```

- **Layout.** Compose one `pad` from rows, columns and controls with unique IDs.
  All widgets support `anchor`, such as `'center'` for a compact floating row.
  Size and offsets use CSS pixels. Widgetz insets the pad frame automatically.
  WebView2 applies Windows display scaling. [API](API.md)
- **Switch.** Set `state` from the host. For custom colors, use `onColor` and
  `offColor`. Widgetz derives the circle and hover fills. [Switch guide](ON_OFF_CONTROL.md)
- **Saved layouts.** Load with `view.loadFTZML(xml)` and save with
  `saveFTZML(view.design())`. [FTZML](FTZML.md)
- **Draggable desktop pads.** In a Tauri 2 window, import `enableWindowDrag`
  from `@fantaz/widgetz/tauri` and call `const stopDragging = enableWindowDrag(element)`
  with the pad's mount element. Add `core:window:allow-start-dragging` to the
  capability for that window. Call `stopDragging()` when removing the pad.
  [Tauri setup](INTEGRATION.md#draggable-tauri-pads)
- **Notifications.** Use `view.update(downloadNotice(result))` for an embedded
  result pad. For a desktop corner window, use the Tauri 2 adapter.
  [Host integration](INTEGRATION.md)
