import { expect, test } from '@playwright/test';

test('window drag waits for a gesture, leaves clicks alone and can be unbound mid-gesture', async ({ page }) => {
  await page.goto('/');
  const hint = page.locator('[data-ftz-id="hint"] .fw-run');
  const toggle = page.getByRole('switch', { name: 'Example control enabled' });
  await expect(hint).toBeVisible();
  await page.evaluate(async () => {
    const tauriEntry = '/packages/widgetz/src/tauri.ts';
    const { enableWindowDrag } = await import(tauriEntry);
    const host = document.querySelector<HTMLElement>('#app')!;
    const commands: string[] = [];
    const clicks: string[] = [];
    for (const type of ['dblclick', 'contextmenu']) {
      document.querySelector('[data-ftz-id="hint"]')!.addEventListener(type, () => clicks.push(type));
    }
    const browserCleanup = enableWindowDrag(host);
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        metadata: { currentWindow: { label: 'main' } },
        invoke(command: string) { commands.push(command); return Promise.resolve(); },
      },
      dragTest: { commands, clicks, bind: () => enableWindowDrag(host), browserCleanup },
    });
  });

  const commands = () => page.evaluate(() => (window as any).dragTest.commands);
  const box = (await hint.boundingBox())!;
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y);
  await page.mouse.up();
  expect(await commands()).toEqual([]);

  await page.evaluate(() => {
    const fixture = (window as any).dragTest;
    fixture.browserCleanup();
    fixture.stop = fixture.bind();
    if (fixture.bind() !== fixture.stop) throw new Error('Duplicate drag binding');
  });
  await hint.dblclick();
  await hint.click({ button: 'right' });
  expect(await page.evaluate(() => (window as any).dragTest.clicks)).toEqual(['dblclick', 'contextmenu']);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(await commands()).toEqual([]);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 2, y);
  expect(await commands()).toEqual([]);
  await page.mouse.move(x + 12, y, { steps: 4 });
  await page.mouse.move(x + 42, y, { steps: 4 });
  await page.mouse.up();
  expect(await commands()).toEqual(['plugin:window|start_dragging']);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.evaluate(() => (window as any).dragTest.stop());
  await page.mouse.move(x + 30, y);
  await page.mouse.up();
  expect(await commands()).toEqual(['plugin:window|start_dragging']);
});
