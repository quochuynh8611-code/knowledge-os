/**
 * Isolated Browser Layout & Coverage Spec for NoteFormModal
 *
 * Reproducible Execution Instructions:
 * 1. Start the isolated Vite harness server on loopback port 5174:
 *      npx vite --host 127.0.0.1 --port 5174 --strictPort
 *    (Harnesses URL: http://127.0.0.1:5174/tests/harness/note-editor-harness.html)
 *
 * 2. Run this spec:
 *    - With Playwright's default installed browser:
 *        npx playwright test tests/e2e/note-editor-layout-harness.spec.ts
 *    - With system Google Chrome (if Playwright browser binaries are not installed):
 *        PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/note-editor-layout-harness.spec.ts
 *    - Optional custom screenshot output directory override:
 *        HARNESS_SCREENSHOT_DIR=./test-results/custom-screenshots npx playwright test tests/e2e/note-editor-layout-harness.spec.ts
 *
 * 3. Stop the Vite harness server cleanly using its PID (or Ctrl+C in its terminal)
 *    without touching port 3000.
 */

import { test, expect, type TestInfo } from '@playwright/test';
import path from 'path';

if (process.env.PLAYWRIGHT_CHANNEL) {
  test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });
}

const HARNESS_URL = 'http://127.0.0.1:5174/tests/harness/note-editor-harness.html';

function resolveScreenshotPath(testInfo: TestInfo, fileName: string): string {
  if (process.env.HARNESS_SCREENSHOT_DIR) {
    return path.join(process.env.HARNESS_SCREENSHOT_DIR, fileName);
  }
  return testInfo.outputPath(fileName);
}

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

test.describe('Note Editor Layout & Focus Mode Isolated Harness', () => {
  test.beforeEach(async ({ page }) => {
    // Hermetic guard: Block all non-harness external network requests
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith('http://127.0.0.1:5174') || url.startsWith('http://localhost:5174')) {
        route.continue();
      } else {
        route.abort('blockedbyclient');
      }
    });
  });

  for (const vp of VIEWPORTS) {
    test(`baseline layout, accordion ARIA panel visibility, and focus mode on ${vp.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(HARNESS_URL, { waitUntil: 'networkidle' });

      const backdrop = page.locator('div[role="dialog"]');
      await expect(backdrop).toBeVisible();

      const modalDialog = page.locator('div[role="dialog"] > form');
      await expect(modalDialog).toBeVisible();

      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();

      const focusButton = page.locator('button[aria-label*="vùng viết"]');
      await expect(focusButton).toBeVisible();

      const saveButton = page.locator('button[type="submit"]');
      await expect(saveButton).toBeVisible();

      // 1. STANDARD MODE MEASUREMENTS & BOUNDS
      const standardModalBox = await modalDialog.boundingBox();
      const standardTextareaBox = await textarea.boundingBox();
      const standardFooterBox = await saveButton.boundingBox();

      expect(standardModalBox).not.toBeNull();
      expect(standardTextareaBox).not.toBeNull();
      expect(standardFooterBox).not.toBeNull();

      // Modal must stay within viewport bounds
      expect(standardModalBox!.x).toBeGreaterThanOrEqual(0);
      expect(standardModalBox!.y).toBeGreaterThanOrEqual(0);
      expect(standardModalBox!.x + standardModalBox!.width).toBeLessThanOrEqual(vp.width + 1);
      expect(standardModalBox!.y + standardModalBox!.height).toBeLessThanOrEqual(vp.height + 1);

      if (vp.width >= 1024) {
        expect(standardModalBox!.width).toBeLessThanOrEqual(1024 + 10);
        expect(standardModalBox!.width).toBeGreaterThanOrEqual(900);
        expect(standardTextareaBox!.height).toBeGreaterThanOrEqual(300);
      } else {
        expect(standardModalBox!.width).toBeLessThanOrEqual(vp.width);
      }

      // Check no horizontal scroll on page body
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width);

      // Verify save button is within viewport
      expect(standardFooterBox!.y + standardFooterBox!.height).toBeLessThanOrEqual(vp.height);

      await page.screenshot({
        path: resolveScreenshotPath(testInfo, `${vp.name}-standard.png`),
        fullPage: false,
      });

      // 2. ACCORDION PANEL VERIFICATION VIA ARIA-CONTROLS (NO CONDITIONAL SKIP)
      const accordionButton = page.locator('button:has-text("Thông tin bổ sung")');
      await expect(accordionButton).toBeVisible();
      await expect(accordionButton).toHaveAttribute('aria-expanded', 'false');

      const panelId = await accordionButton.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();

      const accordionPanel = page.locator(`[id="${panelId}"]`);
      await expect(accordionPanel).toHaveCount(1);
      await expect(accordionPanel).toBeHidden();

      // Open accordion in standard mode and verify panel is visible
      await accordionButton.click();
      await expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
      await expect(accordionPanel).toBeVisible();

      // 3. TOGGLE FOCUS MODE
      await focusButton.click();
      await expect(focusButton).toHaveAttribute('aria-pressed', 'true');

      // Accordion panel must remain mounted (count = 1) but become hidden in Focus mode
      await expect(accordionPanel).toHaveCount(1);
      await expect(accordionPanel).toBeHidden();

      const focusModalBox = await modalDialog.boundingBox();
      const focusTextareaBox = await textarea.boundingBox();
      const focusFooterBox = await saveButton.boundingBox();

      expect(focusModalBox).not.toBeNull();
      expect(focusTextareaBox).not.toBeNull();
      expect(focusFooterBox).not.toBeNull();

      // Modal and footer must remain inside viewport in Focus mode
      expect(focusModalBox!.y).toBeGreaterThanOrEqual(0);
      expect(focusModalBox!.y + focusModalBox!.height).toBeLessThanOrEqual(vp.height + 1);
      expect(focusFooterBox!.y + focusFooterBox!.height).toBeLessThanOrEqual(vp.height);

      // In focus mode, textarea expands to fill available height
      expect(focusTextareaBox!.height).toBeGreaterThan(standardTextareaBox!.height);

      await page.screenshot({
        path: resolveScreenshotPath(testInfo, `${vp.name}-focus.png`),
        fullPage: false,
      });

      // 4. TOGGLE BACK TO STANDARD MODE & VERIFY ACCORDION STATE
      await focusButton.click();
      await expect(focusButton).toHaveAttribute('aria-pressed', 'false');
      await expect(accordionButton).toBeVisible();
      await expect(accordionButton).toHaveAttribute('aria-expanded', 'true');
      await expect(accordionPanel).toBeVisible();

      // Collapse accordion back to initial state and verify textarea height restoration
      await accordionButton.click();
      await expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
      await expect(accordionPanel).toBeHidden();

      const restoredTextareaBox = await textarea.boundingBox();
      expect(restoredTextareaBox!.height).toBeCloseTo(standardTextareaBox!.height, -1);
    });

    test(`long fixture (long title, multiline content, provenance banner, long sourcePath & 10 tags) on ${vp.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${HARNESS_URL}?scenario=long-fixture`, { waitUntil: 'networkidle' });

      const modalDialog = page.locator('div[role="dialog"] > form');
      await expect(modalDialog).toBeVisible();

      const titleInput = page.locator('input[placeholder*="Nhận định"]');
      const textarea = page.locator('textarea');
      const focusButton = page.locator('button[aria-label*="vùng viết"]');
      const saveButton = page.locator('button[type="submit"]');
      const cancelButton = page.locator('button:has-text("Hủy bỏ")');

      // Verify provenance banner is rendered and does not break layout
      await expect(page.locator('text=Nghiên Cứu Chuyên Sâu Về Hiện Tượng Học')).toBeVisible();
      await expect(page.locator('text=Chương 14, Mục 3.2, Trang 412–419')).toBeVisible();

      // Verify metadata summary badges reflect 10 tags and sourcePath
      const accordionButton = page.locator('button:has-text("Thông tin bổ sung")');
      await expect(accordionButton).toContainText('10 thẻ');
      await expect(accordionButton).toContainText('Có tệp nguồn');

      // Verify no horizontal overflow with long title, long provenance, and long content
      const stdScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(stdScrollWidth).toBeLessThanOrEqual(vp.width);

      // Verify modal and footer remain inside viewport in Standard mode
      const stdModalBox = await modalDialog.boundingBox();
      const stdSaveBox = await saveButton.boundingBox();
      expect(stdModalBox!.y).toBeGreaterThanOrEqual(0);
      expect(stdModalBox!.y + stdModalBox!.height).toBeLessThanOrEqual(vp.height + 1);
      expect(stdSaveBox!.y + stdSaveBox!.height).toBeLessThanOrEqual(vp.height);

      // Verify multiline content is scrollable inside textarea
      const scrollMetrics = await textarea.evaluate((el: HTMLTextAreaElement) => {
        const before = el.scrollTop;
        el.scrollTop = 250;
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          before,
          after: el.scrollTop,
        };
      });
      expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
      expect(scrollMetrics.after).toBeGreaterThan(0);

      // Expand accordion with long sourcePath and 10 tags; verify footer stays pinned in viewport
      const panelId = await accordionButton.getAttribute('aria-controls');
      expect(panelId).toBeTruthy();
      const accordionPanel = page.locator(`[id="${panelId}"]`);
      await expect(accordionPanel).toHaveCount(1);

      await accordionButton.click();
      await expect(accordionPanel).toBeVisible();

      const expandedSaveBox = await saveButton.boundingBox();
      const expandedCancelBox = await cancelButton.boundingBox();
      expect(expandedSaveBox!.y + expandedSaveBox!.height).toBeLessThanOrEqual(vp.height);
      expect(expandedCancelBox!.y + expandedCancelBox!.height).toBeLessThanOrEqual(vp.height);

      // Switch to Focus mode with long fixture
      const expectedTitle = await titleInput.inputValue();
      const expectedContent = await textarea.inputValue();

      await focusButton.scrollIntoViewIfNeeded();
      await focusButton.click();
      await expect(focusButton).toHaveAttribute('aria-pressed', 'true');
      await expect(accordionPanel).toBeHidden();

      const focusScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(focusScrollWidth).toBeLessThanOrEqual(vp.width);

      const focusModalBox = await modalDialog.boundingBox();
      const focusSaveBox = await saveButton.boundingBox();
      expect(focusModalBox!.y + focusModalBox!.height).toBeLessThanOrEqual(vp.height + 1);
      expect(focusSaveBox!.y + focusSaveBox!.height).toBeLessThanOrEqual(vp.height);

      // Verify long content remains scrollable in Focus mode and data is preserved
      const focusScrollMetrics = await textarea.evaluate((el: HTMLTextAreaElement) => {
        el.scrollTop = 300;
        return {
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          scrollTop: el.scrollTop,
        };
      });
      expect(focusScrollMetrics.scrollHeight).toBeGreaterThan(focusScrollMetrics.clientHeight);
      expect(focusScrollMetrics.scrollTop).toBeGreaterThan(0);

      await expect(titleInput).toHaveValue(expectedTitle);
      await expect(textarea).toHaveValue(expectedContent);

      await page.screenshot({
        path: resolveScreenshotPath(testInfo, `${vp.name}-long-fixture-focus.png`),
        fullPage: false,
      });

      // Return to Standard mode and verify long sourcePath & tags remain intact
      await focusButton.click();
      await expect(focusButton).toHaveAttribute('aria-pressed', 'false');
      await expect(accordionPanel).toBeVisible();
      const sourceInput = page.locator('input[placeholder*="Đường dẫn tệp Markdown"]');
      await expect(sourceInput).toHaveValue(/husserl-time-consciousness-manuscript-analysis-v3-final\.md$/);
      await expect(accordionPanel.locator('text=hien-tuong-hoc')).toBeVisible();
      await expect(accordionPanel.locator('text=tong-hop-tai-lieu')).toBeVisible();
    });
  }

  test('empty/invalid topic state in focus mode allows returning to standard mode via "Chỉnh sửa thông tin" without data loss', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(`${HARNESS_URL}?scenario=empty-topics`, { waitUntil: 'networkidle' });

    const titleInput = page.locator('input[placeholder*="Nhận định"]');
    const textarea = page.locator('textarea');
    const focusButton = page.locator('button[aria-label*="vùng viết"]');

    await titleInput.fill('Ghi chú khi chưa có chủ đề hợp lệ');
    await textarea.fill('Nội dung ghi chú cần bảo toàn khi bấm Chỉnh sửa thông tin.');

    // Enter Focus mode when no valid topic is selected
    await focusButton.click();
    await expect(focusButton).toHaveAttribute('aria-pressed', 'true');

    // Summary banner must indicate no topic selected and expose "Chỉnh sửa thông tin" button
    await expect(page.locator('text=Chưa chọn chủ đề')).toBeVisible();
    const editInfoButton = page.locator('button:has-text("Chỉnh sửa thông tin")');
    await expect(editInfoButton).toBeVisible();

    // Clicking "Chỉnh sửa thông tin" exits Focus mode back to Standard mode
    await editInfoButton.click();
    await expect(focusButton).toHaveAttribute('aria-pressed', 'false');

    // Topic select dropdown and note type buttons are visible again, and typed draft is intact
    await expect(page.locator('select')).toBeVisible();
    await expect(titleInput).toHaveValue('Ghi chú khi chưa có chủ đề hợp lệ');
    await expect(textarea).toHaveValue('Nội dung ghi chú cần bảo toàn khi bấm Chỉnh sửa thông tin.');
  });
});
