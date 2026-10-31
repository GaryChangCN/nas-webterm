const { test, expect } = require('@playwright/test');

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('.nt-status')).toHaveAttribute('data-state', 'connected');
  await expect.poll(() => page.evaluate(() => !!window.term)).toBe(true);
}

test('mobile keyboard button opens and closes focus without helper keys stealing it', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'Touch keyboard UI is mobile-only.');
  await ready(page);
  const keyboard = page.locator('#nt-keyboard');
  const textarea = page.locator('.xterm-helper-textarea');
  await keyboard.click();
  await expect(textarea).toBeFocused();
  await page.locator('.nt-dock-main [data-key="Tab"]').click();
  await expect(textarea).toBeFocused();
  await keyboard.click();
  await expect(textarea).not.toBeFocused();
  await expect(keyboard).toHaveAttribute('aria-pressed', 'false');
});

test('saved font preference survives server settings and page reload', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => localStorage.setItem('nas-webterm.ui.v1', JSON.stringify({ fontSize: 19 })));
  await page.reload();
  await expect(page.locator('.nt-status')).toHaveAttribute('data-state', 'connected');
  await expect.poll(() => page.evaluate(() => window.term?.options.fontSize)).toBe(19);
});
