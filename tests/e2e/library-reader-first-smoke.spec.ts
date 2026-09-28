import { test, expect } from "@playwright/test";

/**
 * Playwright E2E Smoke Test: Library Reader-First Layout & Sidebar Collapse Contract
 * 
 * Verifies:
 * 1. Library view renders successfully at route `#/library`.
 * 2. Left sidebar (`library-left-sidebar`) is initially visible on desktop viewport.
 * 3. Clicking `toggle-left-sidebar-btn` collapses the sidebar (hides it).
 * 4. `expand-left-sidebar-btn` appears in the right content pane when collapsed.
 * 5. Clicking `expand-left-sidebar-btn` restores the sidebar.
 * 6. Right content pane (`library-right-content-pane`) stays intact throughout.
 * 7. Selecting a document mounts the reader and allows collapse/expand while reading.
 */

test.describe("Library Reader-First Layout & Sidebar Collapse Smoke", () => {
  test.beforeEach(async ({ page }) => {
    // Set a standard desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("1. Library view renders with left sidebar and right content pane on desktop", async ({ page }) => {
    await page.goto("/#/library");

    // Wait for the library container to render
    const leftSidebar = page.getByTestId("library-left-sidebar");
    const rightContentPane = page.getByTestId("library-right-content-pane");

    await expect(leftSidebar).toBeVisible({ timeout: 10000 });
    await expect(rightContentPane).toBeVisible({ timeout: 10000 });

    // Verify presence of toggle button in left sidebar
    const toggleBtn = page.getByTestId("toggle-left-sidebar-btn");
    await expect(toggleBtn).toBeVisible();

    // Verify expand button is NOT visible initially when sidebar is open
    const expandBtn = page.getByTestId("expand-left-sidebar-btn");
    await expect(expandBtn).not.toBeVisible();
  });

  test("2. Sidebar collapses and expands cleanly via toggle buttons", async ({ page }) => {
    await page.goto("/#/library");

    const leftSidebar = page.getByTestId("library-left-sidebar");
    const rightContentPane = page.getByTestId("library-right-content-pane");
    const toggleBtn = page.getByTestId("toggle-left-sidebar-btn");

    await expect(leftSidebar).toBeVisible({ timeout: 10000 });
    await expect(rightContentPane).toBeVisible({ timeout: 10000 });

    // Step 1: Click toggle button to collapse left sidebar
    await toggleBtn.click();

    // Step 2: Left sidebar should be hidden
    await expect(leftSidebar).not.toBeVisible();

    // Step 3: Expand button should become visible on the right content pane
    const expandBtn = page.getByTestId("expand-left-sidebar-btn");
    await expect(expandBtn).toBeVisible({ timeout: 5000 });

    // Step 4: Right content pane remains visible throughout
    await expect(rightContentPane).toBeVisible();

    // Step 5: Click expand button to restore sidebar
    await expandBtn.click();

    // Step 6: Left sidebar should be visible again
    await expect(leftSidebar).toBeVisible({ timeout: 5000 });
    await expect(expandBtn).not.toBeVisible();
  });

  test("3. Selecting a document opens reader and preserves reading state across sidebar toggle", async ({ page }) => {
    await page.goto("/#/library");

    const leftSidebar = page.getByTestId("library-left-sidebar");
    const rightContentPane = page.getByTestId("library-right-content-pane");
    await expect(leftSidebar).toBeVisible({ timeout: 10000 });

    // Find first doc item in the list
    const firstDocItem = page.locator('[data-testid^="doc-item-"]').first();
    const docExists = await firstDocItem.count();

    if (docExists > 0) {
      await expect(firstDocItem).toBeVisible({ timeout: 10000 });
      await firstDocItem.click();

      // Right content pane must contain the mounted reader viewport and reader toolbar
      const readerViewport = page.getByTestId("reader-viewport-container");
      await expect(readerViewport).toBeVisible({ timeout: 10000 });

      const readerSidebarToggle = page.getByTestId("reader-toggle-sidebar-btn");
      await expect(readerSidebarToggle).toBeVisible({ timeout: 5000 });

      // Layout Ratio Verification: Right reader pane must be significantly wider than left sidebar (>= 2.2x)
      const leftBox = await leftSidebar.boundingBox();
      const rightBox = await rightContentPane.boundingBox();
      if (leftBox && rightBox) {
        expect(rightBox.width).toBeGreaterThanOrEqual(leftBox.width * 2.2);
      }

      // Collapse sidebar while reading
      const toggleBtn = page.getByTestId("toggle-left-sidebar-btn");
      await toggleBtn.click();
      await expect(leftSidebar).not.toBeVisible();

      // Reader viewport remains mounted and expands to take up released space
      await expect(readerViewport).toBeVisible();
      const rightBoxExpanded = await rightContentPane.boundingBox();
      if (rightBox && rightBoxExpanded) {
        expect(rightBoxExpanded.width).toBeGreaterThan(rightBox.width);
      }

      // Expand button is available
      const expandBtn = page.getByTestId("expand-left-sidebar-btn");
      await expect(expandBtn).toBeVisible();

      // Expand sidebar again
      await expandBtn.click();
      await expect(leftSidebar).toBeVisible();
      await expect(readerViewport).toBeVisible();
    }
  });

  test("4. Recent reads shelf renders gracefully if present in state", async ({ page }) => {
    await page.goto("/#/library");

    // Optional check: if recent-reads-shelf exists in the DOM, ensure it is rendered cleanly
    const recentShelf = page.getByTestId("recent-reads-shelf");
    const shelfCount = await recentShelf.count();

    if (shelfCount > 0) {
      await expect(recentShelf.first()).toBeVisible();
    }
  });
});
