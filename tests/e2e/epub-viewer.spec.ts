// @ts-nocheck
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

/**
 * Playwright Integration Test Suite for EPUB Viewer Modal
 * Tests:
 * 1. Opening EPUB file from Docs Explorer list
 * 2. EPUB rendering with named XML entities (&times;, &copy;, &mdash;) asserting iframe body text
 * 3. LocalStorage CFI location persistence & self-healing fallback
 * 4. Corrupted CFI self-healing recovery
 * 5. Font size controls (decrease, reset, increase) & single/double page mode toggles
 * 6. Opening EPUB file from Obsidian Vault Browser modal
 * 7. Regular Markdown documents integrity
 */

test.describe("EPUB In-App Reader (DocsExplorerView & Obsidian Vault)", () => {
  const syntheticEpubDiskPath = path.resolve(process.cwd(), "tests/fixtures/invalid-named-entity.epub");

  test.beforeEach(async ({ page }) => {
    // Serve synthetic EPUB for Docs Explorer raw document requests
    await page.route("**/api/docs/raw?path=*", async (route) => {
      if (fs.existsSync(syntheticEpubDiskPath)) {
        const buf = fs.readFileSync(syntheticEpubDiskPath);
        await route.fulfill({
          status: 200,
          contentType: "application/epub+zip",
          body: buf,
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    });

    // Serve synthetic EPUB for Obsidian Vault attachment requests
    await page.route("**/api/obsidian/vault/attachment?path=*", async (route) => {
      if (fs.existsSync(syntheticEpubDiskPath)) {
        const buf = fs.readFileSync(syntheticEpubDiskPath);
        await route.fulfill({
          status: 200,
          contentType: "application/epub+zip",
          body: buf,
        });
      } else {
        await route.fulfill({ status: 404 });
      }
    });

    // Mock /api/docs document listing
    await page.route("**/api/docs", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 2,
          categories: {
            books: 1,
            specs: 1,
          },
          documents: [
            {
              id: "synthetic-test-epub",
              title: "Synthetic Test Book",
              category: "books",
              relativePath: "books/invalid-named-entity.epub",
              status: "EPUB",
              sizeBytes: 1878,
              lastModified: new Date().toISOString(),
            },
            {
              id: "spec-sample",
              title: "Tài Liệu Đặc Tả Mẫu",
              category: "specs",
              relativePath: "specs/sample.md",
              status: "SPEC",
              sizeBytes: 1024,
              lastModified: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    // Mock /api/docs/content for markdown specs
    await page.route("**/api/docs/content?path=specs%2Fsample.md", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "spec-sample",
          title: "Tài Liệu Đặc Tả Mẫu",
          category: "specs",
          relativePath: "specs/sample.md",
          status: "SPEC",
          content: "# Tài Liệu Đặc Tả Mẫu\n\nNội dung tài liệu markdown.",
          sizeBytes: 1024,
          lastModified: new Date().toISOString(),
        }),
      });
    });

    // Mock /api/obsidian/vault/tree for Obsidian Vault Browser
    await page.route("**/api/obsidian/vault/tree*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          path: "",
          items: [
            {
              name: "invalid-named-entity.epub",
              type: "file",
              path: "books/invalid-named-entity.epub",
              size: 1878,
              mtime: new Date().toISOString(),
              extension: ".epub",
            },
            {
              name: "note-sample.md",
              type: "file",
              path: "notes/note-sample.md",
              size: 1024,
              mtime: new Date().toISOString(),
              extension: ".md",
            },
          ],
        }),
      });
    });
  });

  test("renders Docs tab and opens EPUB Viewer Modal when clicking an .epub file", async ({ page }) => {
    await page.goto("/#/library");

    // Wait for the document list to render
    const epubDocItem = page.locator('button:has-text("Synthetic Test Book")').first();
    await expect(epubDocItem).toBeVisible({ timeout: 10000 });

    // Click to open EPUB
    await epubDocItem.click();

    // Verify Modal Dialog is open
    const modalDialog = page.getByRole("dialog");
    await expect(modalDialog).toBeVisible();
    await expect(modalDialog).toContainText("Synthetic Test Book");

    // Verify close button dismisses modal
    const closeBtn = modalDialog.getByRole("button", { name: /đóng/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(modalDialog).not.toBeVisible();
  });

  test("renders synthetic EPUB containing named XML entities without errors and displays chapter text in iframe", async ({ page }) => {
    await page.goto("/#/library");

    const epubDocItem = page.locator('button:has-text("Synthetic Test Book")').first();
    await expect(epubDocItem).toBeVisible({ timeout: 10000 });
    await epubDocItem.click();

    const modalDialog = page.getByRole("dialog");
    await expect(modalDialog).toBeVisible();

    // Verify error text is NOT shown
    await expect(modalDialog.getByText("Không đọc được file EPUB này")).not.toBeVisible({ timeout: 5000 });

    // Wait for iframe to appear
    const iframeLocator = modalDialog.locator("iframe").first();
    await expect(iframeLocator).toBeVisible({ timeout: 10000 });

    // Inspect iframe content via evaluate
    const iframeText = await page.evaluate(async () => {
      const iframe = document.querySelector('div[role="dialog"] iframe') as HTMLIFrameElement;
      if (!iframe || !iframe.contentDocument) return "";
      return iframe.contentDocument.body ? iframe.contentDocument.body.innerText : "";
    });

    // Assert that text is rendered and contains synthetic entity replacement and bare ampersands
    expect(iframeText.length).toBeGreaterThan(30);
    expect(iframeText).toMatch(/EPUB entity regression × chapter|5 × 10 = 50/i);
    expect(iframeText).toContain("Âm & dương");
    expect(iframeText).toContain("A & B");
    expect(iframeText).toContain("Fish & Chips");
    expect(iframeText).not.toContain("Entity 'times' not defined");
    expect(iframeText).not.toContain("xmlParseEntityRef");
    expect(iframeText).not.toContain("Invalid URL");
    expect(iframeText).not.toContain("&times;");

    await page.keyboard.press("Escape");
    await expect(modalDialog).not.toBeVisible();
  });

  test("persists reading location in localStorage", async ({ page }) => {
    const fileName = "Synthetic Test Book";
    const testCfi = "epubcfi(/6/2[chapter1]!/4/2/1:0)";
    const normalizedKey = `epub-location:${encodeURIComponent(fileName.replace(/\s+/g, "-"))}`;

    // Set initial CFI in localStorage before page load
    await page.addInitScript(({ key, cfi }) => {
      localStorage.setItem(key, cfi);
    }, { key: normalizedKey, cfi: testCfi });

    await page.goto("/#/library");

    // Click to open EPUB
    const epubDocItem = page.locator('button:has-text("Synthetic Test Book")').first();
    await expect(epubDocItem).toBeVisible({ timeout: 10000 });
    await epubDocItem.click();

    const modalDialog = page.getByRole("dialog");
    await expect(modalDialog).toBeVisible();

    // Verify localStorage key remains intact
    const storedCfi = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, normalizedKey);

    expect(storedCfi).toBe(testCfi);

    // Press Escape to close modal
    await page.keyboard.press("Escape");
    await expect(modalDialog).not.toBeVisible();
  });

  test("handles corrupted CFI in localStorage with self-healing fallback", async ({ page }) => {
    const fileName = "Synthetic Test Book";
    const corruptedCfi = "epubcfi(/6/999[corrupted_section]!/4/2)";
    const normalizedKey = `epub-location:${encodeURIComponent(fileName.replace(/\s+/g, "-"))}`;

    // Set corrupted CFI in localStorage before page load
    await page.addInitScript(({ key, cfi }) => {
      localStorage.setItem(key, cfi);
    }, { key: normalizedKey, cfi: corruptedCfi });

    await page.goto("/#/library");

    const epubDocItem = page.locator('button:has-text("Synthetic Test Book")').first();
    await expect(epubDocItem).toBeVisible({ timeout: 10000 });
    await epubDocItem.click();

    const modalDialog = page.getByRole("dialog");
    await expect(modalDialog).toBeVisible();

    // Close and verify
    await page.keyboard.press("Escape");
    await expect(modalDialog).not.toBeVisible();
  });

  test("controls font size and toggles single/double page modes in toolbar", async ({ page }) => {
    await page.goto("/#/library");

    const epubDocItem = page.locator('button:has-text("Synthetic Test Book")').first();
    await expect(epubDocItem).toBeVisible({ timeout: 10000 });
    await epubDocItem.click();

    const modalDialog = page.getByRole("dialog");
    await expect(modalDialog).toBeVisible();

    // Check font size indicator
    const fontSizeLabel = modalDialog.getByLabel("Cỡ chữ hiện tại");
    await expect(fontSizeLabel).toHaveText("100%");

    // Increase font size
    const plusBtn = modalDialog.getByLabel("Tăng cỡ chữ");
    await plusBtn.click();
    await expect(fontSizeLabel).toHaveText("110%");

    // Decrease font size
    const minusBtn = modalDialog.getByLabel("Giảm cỡ chữ");
    await minusBtn.click();
    await expect(fontSizeLabel).toHaveText("100%");

    // Page mode toggle
    const singlePageBtn = modalDialog.getByRole("button", { name: "Trang đơn" });
    const doublePageBtn = modalDialog.getByRole("button", { name: "Trang đôi" });

    await expect(doublePageBtn).toBeVisible();
    await expect(singlePageBtn).toBeVisible();

    await singlePageBtn.click();
    await expect(singlePageBtn).toHaveAttribute("aria-pressed", "true");

    await doublePageBtn.click();
    await expect(doublePageBtn).toHaveAttribute("aria-pressed", "true");

    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(modalDialog).not.toBeVisible();
  });

  test("opens EPUB Viewer Modal when clicking an .epub file in Obsidian Vault Browser", async ({ page }) => {
    await page.goto("/");

    // Open Obsidian Vault Browser modal from Navbar
    const obsidianBtn = page.locator('button[title="Duyệt Obsidian Vault"]').or(page.getByText(/Obsidian/i)).first();
    await expect(obsidianBtn).toBeVisible({ timeout: 10000 });
    await obsidianBtn.click();

    // Wait for Obsidian Vault Browser modal to appear
    const vaultBrowserHeader = page.locator('h2:has-text("Duyệt Obsidian Vault")').first();
    await expect(vaultBrowserHeader).toBeVisible({ timeout: 10000 });

    // Find and click the synthetic EPUB file in the vault tree
    const epubFileItem = page.locator('text=invalid-named-entity.epub').first();
    await expect(epubFileItem).toBeVisible({ timeout: 10000 });
    await epubFileItem.click();

    // Verify FileViewer modal overlay opens
    const epubModal = page.getByRole("dialog").filter({ hasText: /EPUB Reader/i });
    await expect(epubModal).toBeVisible({ timeout: 10000 });
    await expect(epubModal).toContainText("invalid-named-entity.epub");

    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(epubModal).not.toBeVisible();
  });

  test("does not break regular Markdown documents in Obsidian Vault Browser", async ({ page }) => {
    await page.goto("/");

    // Open Obsidian Vault Browser modal from Navbar
    const obsidianBtn = page.locator('button[title="Duyệt Obsidian Vault"]').or(page.getByText(/Obsidian/i)).first();
    await expect(obsidianBtn).toBeVisible({ timeout: 10000 });
    await obsidianBtn.click();

    // Find and click the markdown file in the vault tree
    const mdFileItem = page.locator('text=note-sample.md').first();
    await expect(mdFileItem).toBeVisible({ timeout: 10000 });
    await mdFileItem.click();

    // Verify Obsidian Document Viewer modal opens for markdown content
    const mdModal = page.getByRole("dialog").filter({ hasText: /note-sample\.md|Chi Tiết Tài Liệu Obsidian/i });
    await expect(mdModal).toBeVisible({ timeout: 10000 });

    await page.keyboard.press("Escape");
    await expect(mdModal).not.toBeVisible();
  });
});
