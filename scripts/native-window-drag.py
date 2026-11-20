"""Send real mouse input to the isolated demo and measure physical window coordinates."""

import ctypes as c
from ctypes import wintypes as w
import json
import sys
import time

user32 = c.WinDLL('user32', use_last_error=True)
user32.SetThreadDpiAwarenessContext.argtypes = [w.HANDLE]
user32.SetThreadDpiAwarenessContext(c.c_void_p(-4))
user32.GetWindowThreadProcessId.argtypes = [w.HWND, c.POINTER(w.DWORD)]
user32.GetWindowTextW.argtypes = [w.HWND, w.LPWSTR, c.c_int]
user32.GetClassNameW.argtypes = [w.HWND, w.LPWSTR, c.c_int]
user32.GetWindowRect.argtypes = [w.HWND, c.POINTER(w.RECT)]
user32.ClientToScreen.argtypes = [w.HWND, c.POINTER(w.POINT)]
user32.GetCursorPos.argtypes = [c.POINTER(w.POINT)]
user32.SetCursorPos.argtypes = [c.c_int, c.c_int]
user32.WindowFromPoint.argtypes = [w.POINT]
user32.WindowFromPoint.restype = w.HWND
user32.GetAncestor.argtypes = [w.HWND, w.UINT]
user32.GetAncestor.restype = w.HWND
user32.GetDpiForWindow.argtypes = [w.HWND]
user32.SetWindowPos.argtypes = [w.HWND, w.HWND, c.c_int, c.c_int, c.c_int, c.c_int, w.UINT]
user32.IsWindowVisible.argtypes = [w.HWND]
user32.ShowWindowAsync.argtypes = [w.HWND, c.c_int]
user32.SetForegroundWindow.argtypes = [w.HWND]
pid, client_x, client_y = map(int, sys.argv[1:])
demo = None


@c.WINFUNCTYPE(w.BOOL, w.HWND, w.LPARAM)
def find_demo(hwnd, _):
    global demo
    owner = w.DWORD()
    user32.GetWindowThreadProcessId(hwnd, c.byref(owner))
    if owner.value == pid:
        title = c.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, title, len(title))
        if title.value.startswith('Fantaz Widgetz') and title.value.endswith('demo') and user32.IsWindowVisible(hwnd):
            demo = hwnd
            return False
    return True


def position():
    rect = w.RECT()
    assert user32.GetWindowRect(demo, c.byref(rect))
    return [rect.left, rect.top]


def move(x, y):
    assert user32.SetCursorPos(x, y), c.get_last_error()


def describe(hwnd):
    if not hwnd:
        return None
    owner = w.DWORD()
    title, class_name = c.create_unicode_buffer(256), c.create_unicode_buffer(256)
    user32.GetWindowThreadProcessId(hwnd, c.byref(owner))
    user32.GetWindowTextW(hwnd, title, len(title))
    user32.GetClassNameW(hwnd, class_name, len(class_name))
    return hwnd, owner.value, title.value, class_name.value


user32.EnumWindows(find_demo, 0)
assert demo, 'Native demo window was missing'
point = w.POINT(client_x, client_y)
assert user32.ClientToScreen(demo, c.byref(point))
original = w.POINT()
assert user32.GetCursorPos(c.byref(original))
scale = user32.GetDpiForWindow(demo) / 96
below = max(1, round(scale))
handoff = round(8 * scale)
offsets = [handoff + d for d in (20, 50, 90, 130)]
z_order_only = 0x0001 | 0x0002 | 0x0010  # NOSIZE, NOMOVE, NOACTIVATE
user32.ShowWindowAsync(demo, 9)  # SW_RESTORE
user32.SetForegroundWindow(demo)
assert user32.SetWindowPos(demo, c.c_void_p(-1), 0, 0, 0, 0, z_order_only)
try:
    time.sleep(.1)
    hit = user32.WindowFromPoint(point)
    root = user32.GetAncestor(hit, 2)
    root_owner = user32.GetAncestor(hit, 3)
    assert demo in (hit, root, root_owner), (
        f'Demo drag point ({point.x}, {point.y}) returned {describe(hit)}, '
        f'root {describe(root)}, owner {describe(root_owner)}, expected {describe(demo)}; '
        f'position {position()}, scale {scale}'
    )
    move(point.x, point.y)
    time.sleep(.04)
    user32.mouse_event(2, 0, 0, 0, 0)
    try:
        time.sleep(.05)
        start = position()
        move(point.x + below, point.y)
        time.sleep(.08)
        below_threshold = position()
        move(point.x + handoff, point.y)
        time.sleep(.18)
        samples = []
        for offset in offsets:
            move(point.x + offset, point.y)
            time.sleep(.055)
            samples.append(position())
    finally:
        user32.mouse_event(4, 0, 0, 0, 0)
    time.sleep(.06)
    print(json.dumps(dict(scale=scale, startPhysical=start, belowThresholdPhysical=below_threshold,
                          samplesPhysical=samples, expectedDxPhysical=[d - handoff for d in offsets],
                          finalPhysical=position())))
finally:
    move(original.x, original.y)
    user32.SetWindowPos(demo, c.c_void_p(-2), 0, 0, 0, 0, z_order_only)
