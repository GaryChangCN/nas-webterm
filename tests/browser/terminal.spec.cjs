const { test, expect } = require('@playwright/test');

async function hasLine(page, text) {
  return page.evaluate(expected => {
    const buffer = window.term.buffer.active;
    for (let i = Math.max(0, buffer.length - 150); i < buffer.length; i++) {
      if (buffer.getLine(i)?.translateToString(true).trim() === expected) return true;
    }
    return false;
  }, text);
}

test('helper keys reach the real PTY and Ctrl+C interrupts a running process', async ({ page }, info) => {
  test.skip(!!process.env.WEBTERM_PREVIEW || info.project.name !== 'desktop', 'One real-PTY run on desktop; mobile input paths are covered separately.');
  await page.goto('/');
  await expect(page.locator('.nt-status')).toHaveAttribute('data-state', 'connected');

  await page.evaluate(() => window.term.input("printf '\\nWEBTERM_ENTER_OK\\n'", true));
  await page.locator('.nt-dock-main [data-key="Enter"]').click();
  await expect.poll(() => hasLine(page, 'WEBTERM_ENTER_OK')).toBe(true);

  const raw = "stty -echo -icanon min 1 time 0; printf '\\nWEBTERM_RAW_READY\\n'; dd bs=1 count=3 2>/dev/null | od -An -tx1; stty sane; printf '\\nWEBTERM_RAW_DONE\\n'\r";
  await page.evaluate(command => window.term.input(command, true), raw);
  await expect.poll(() => hasLine(page, 'WEBTERM_RAW_READY')).toBe(true);
  await page.locator('[data-key="ArrowUp"]').click();
  await expect.poll(() => hasLine(page, '1b 5b 41')).toBe(true);
  await expect.poll(() => hasLine(page, 'WEBTERM_RAW_DONE')).toBe(true);

  await page.evaluate(() => window.term.input("printf '\\nWEBTERM_CTRL_READY\\n'; sleep 30\r", true));
  await expect.poll(() => hasLine(page, 'WEBTERM_CTRL_READY')).toBe(true);
  await page.locator('#nt-more').click();
  await page.locator('.nt-shortcuts [data-key="c"]').click();
  await page.evaluate(() => window.term.input("printf '\\nWEBTERM_CTRL_OK\\n'\r", true));
  await expect.poll(() => hasLine(page, 'WEBTERM_CTRL_OK')).toBe(true);
});
