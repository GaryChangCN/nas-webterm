const { test, expect } = require('@playwright/test');

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('.nt-status')).toHaveAttribute('data-state', 'connected');
  await expect.poll(() => page.evaluate(() => !!window.term && typeof window.term.input === 'function')).toBe(true);
}
async function captureInput(page) {
  await page.evaluate(() => {
    window.__ntTestInputs = [];
    const original = window.term.input.bind(window.term);
    window.term.input = (data, user) => { window.__ntTestInputs.push(data); return original(data, user); };
  });
}

test('responsive layout keeps every common key visible and tappable', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  const size = page.viewportSize();
  const geometry = await page.evaluate(() => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    return {
      header: rect(document.getElementById('nt-header')),
      terminal: rect(document.getElementById('terminal-container')),
      dock: rect(document.getElementById('nt-dock')),
      keys: [...document.querySelectorAll('.nt-dock-main .nt-key')].map(rect),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  expect(geometry.horizontalOverflow).toBe(false);
  expect(geometry.terminal.height).toBeGreaterThan(120);
  expect(geometry.terminal.y).toBeGreaterThanOrEqual(geometry.header.bottom - 1);
  expect(geometry.terminal.bottom).toBeLessThanOrEqual(geometry.dock.y + 1);
  expect(geometry.dock.bottom).toBeLessThanOrEqual(size.height + 1);
  for (const key of geometry.keys) {
    expect(key.x).toBeGreaterThanOrEqual(0);
    expect(key.right).toBeLessThanOrEqual(size.width + 1);
    expect(key.height).toBeGreaterThanOrEqual(43);
    expect(key.width).toBeGreaterThanOrEqual(40);
  }
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/${info.project.name}-terminal.png`, fullPage: true });
});

test('touch buttons send Tab, arrows, Escape, Enter and real Ctrl characters', async ({ page }) => {
  await ready(page);
  await captureInput(page);
  for (const key of ['Tab', 'ShiftTab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape', 'Backspace', 'Enter']) {
    await page.locator(`.nt-dock-main [data-key="${key}"]`).click();
  }
  await page.locator('#nt-ctrl').click();
  await expect(page.locator('#nt-modifier-picker')).toBeVisible();
  await page.locator('#nt-modifier-picker [data-key="c"]').click();
  await expect(page.locator('#nt-ctrl')).toHaveAttribute('aria-pressed', 'false');
  const inputs = await page.evaluate(() => window.__ntTestInputs);
  expect(inputs.slice(0, 9)).toEqual(['\t', '\x1b[Z', '\x1b[A', '\x1b[B', '\x1b[D', '\x1b[C', '\x1b', '\x7f', '\r']);
  expect(inputs.at(-1)).toBe('\x03');
});

test('application cursor mode and Ctrl+arrow are encoded correctly', async ({ page }) => {
  await ready(page);
  await captureInput(page);
  await page.evaluate(() => new Promise(resolve => window.term.write('\x1b[?1h', resolve)));
  await expect.poll(() => page.evaluate(() => window.term.modes.applicationCursorKeysMode)).toBe(true);
  await page.locator('[data-key="ArrowUp"]').click();
  await page.locator('#nt-ctrl').click();
  await page.locator('[data-key="ArrowRight"]').click();
  expect(await page.evaluate(() => window.__ntTestInputs.slice(-2))).toEqual(['\x1bOA', '\x1b[1;5C']);
  await page.evaluate(() => window.term.write('\x1b[?1l'));
});

test('paste preview requires confirmation for multiline input and never persists text', async ({ page }) => {
  await ready(page);
  await page.locator('#nt-paste').click();
  await page.locator('#nt-paste-input').fill('printf example\nprintf second');
  await expect(page.locator('#nt-paste-warning')).toBeVisible();
  await expect(page.locator('#nt-paste-send')).toBeDisabled();
  await expect(page.locator('#nt-paste-run')).toBeDisabled();
  await page.locator('#nt-paste-confirm').check();
  await expect(page.locator('#nt-paste-send')).toBeEnabled();
  await page.locator('#nt-paste-dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('#nt-paste-dialog')).not.toBeVisible();
  expect(await page.locator('#nt-paste-input').inputValue()).toBe('');
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(storage).not.toContain('printf example');
});

test('font sizing is bounded and layout refits after rotation or keyboard-sized viewport', async ({ page }) => {
  await ready(page);
  await page.locator('#nt-more').click();
  const before = await page.evaluate(() => window.term.options.fontSize);
  const increase = page.locator('[data-font="increase"]:visible').first();
  await increase.click();
  expect(await page.evaluate(() => window.term.options.fontSize)).toBe(before + 1);
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 420 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('nt-dock').getBoundingClientRect().bottom))).toBeLessThanOrEqual(viewport.height + 1);
    expect(await page.evaluate(() => document.getElementById('terminal-container').getBoundingClientRect().height)).toBeGreaterThan(50);
  }
});
