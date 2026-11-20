import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const dragThreshold = 3;
const interactive = 'button, a[href], input, select, textarea, [contenteditable]:not([contenteditable="false"]), [tabindex="0"]';
const bindings = new WeakMap<HTMLElement, () => void>();

/** Allow primary mouse drags on a pad's body to move its Tauri window. */
export function enableWindowDrag(padElement: HTMLElement): () => void {
  if (!isTauri()) return () => {};
  const existing = bindings.get(padElement);
  if (existing) return existing;

  let gesture: { target: Element; pointerId: number; x: number; y: number } | undefined;
  let disposed = false;

  function releaseGesture() {
    const pending = gesture;
    gesture = undefined;
    if (pending?.target.hasPointerCapture(pending.pointerId)) {
      pending.target.releasePointerCapture(pending.pointerId);
    }
  }

  function pointerDown(event: PointerEvent) {
    if (event.defaultPrevented || event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0) return;
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    const control = target.closest(interactive);
    if (control && padElement.contains(control)) return;

    releaseGesture();
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    gesture = { target, pointerId: event.pointerId, x: event.screenX, y: event.screenY };
  }

  function pointerMove(event: PointerEvent) {
    if (gesture?.pointerId !== event.pointerId || !(event.buttons & 1) || !gesture.target.hasPointerCapture(event.pointerId)) return;
    if (Math.hypot(event.screenX - gesture.x, event.screenY - gesture.y) < dragThreshold) return;

    // Windows takes over the gesture at the cursor's current position.
    releaseGesture();
    void getCurrentWindow().startDragging().catch(error => {
      if (!disposed) console.error('Fantaz Widgetz could not start window dragging:', error);
    });
  }

  function pointerEnd(event: PointerEvent) {
    if (gesture?.pointerId === event.pointerId) releaseGesture();
  }

  padElement.addEventListener('pointerdown', pointerDown);
  padElement.addEventListener('pointermove', pointerMove);
  padElement.addEventListener('pointerup', pointerEnd);
  padElement.addEventListener('pointercancel', pointerEnd);
  padElement.addEventListener('lostpointercapture', pointerEnd);

  function stopDragging() {
    if (disposed) return;
    disposed = true;
    releaseGesture();
    padElement.removeEventListener('pointerdown', pointerDown);
    padElement.removeEventListener('pointermove', pointerMove);
    padElement.removeEventListener('pointerup', pointerEnd);
    padElement.removeEventListener('pointercancel', pointerEnd);
    padElement.removeEventListener('lostpointercapture', pointerEnd);
    bindings.delete(padElement);
  }
  bindings.set(padElement, stopDragging);
  return stopDragging;
}
