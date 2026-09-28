// @ts-nocheck
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * SOP Screenshot Capture Spec (Batch: SS-01, SS-02, SS-03, SS-05, SS-06, SS-07)
 * Isolated in-memory browser context, zero real DB modifications.
 * Output directory: /tmp/knowledge-os-sop-screenshots/
 */

const OUTPUT_DIR = "/tmp/knowledge-os-sop-screenshots";

const mockCategories = [
  {
    id: "cat-root-dong-y",
    name: "Đông Y Học",
    slug: "dong-y-hoc",
    type: "dong-y",
    parentId: null,
    isRoot: true,
    displayOrder: 1,
    visibility: "active",
  },
  {
    id: "cat-duoc-hoc",
    name: "Dược Học Cổ Truyền",
    slug: "duoc-hoc-co-truyen",
    type: "dong-y",
    parentId: "cat-root-dong-y",
    isRoot: false,
    displayOrder: 1,
    visibility: "active",
  },
  {
    id: "cat-root-lap-trinh",
    name: "Lập Trình Web",
    slug: "lap-trinh-web",
    type: "lap-trinh",
    parentId: null,
    isRoot: true,
    displayOrder: 2,
    visibility: "active",
  },
];

const mockTopics = [
  {
    id: "topic-dong-y-1",
    title: "Huyệt Đạo Cơ Bản",
    slug: "huyet-dao-co-ban",
    categoryId: "cat-duoc-hoc",
    type: "dong-y",
    description: "Khảo cứu hệ thống kinh lạc và các huyệt vị trọng yếu trên cơ thể.",
    content: "## 1. Tổng quan Kinh Lạc\n\nKinh lạc là đường vận hành của khí huyết.",
    tags: ["kinh-lac", "huyet-vi"],
    visibility: "active",
    studyProgress: {
      status: "in_progress",
      progress: 35,
      timeSpent: 45,
      repetitions: 3,
      easeFactor: 2.5,
      interval: 4,
      lastStudied: new Date().toISOString(),
      nextReview: new Date(Date.now() + 86400000).toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "topic-lap-trinh-1",
    title: "React State Management với Hooks",
    slug: "react-state-management",
    categoryId: "cat-root-lap-trinh",
    type: "lap-trinh",
    description: "Quản lý trạng thái giao diện với useState, useReducer và Context API.",
    content: "## 1. State cơ bản\n\nState là dữ liệu thay đổi theo thời gian.",
    tags: ["react", "frontend"],
    visibility: "active",
    studyProgress: {
      status: "not_started",
      progress: 0,
      timeSpent: 0,
      repetitions: 0,
      easeFactor: 2.5,
      interval: 1,
      lastStudied: null,
      nextReview: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockNotes = [
  {
    id: "note-1",
    topicId: "topic-dong-y-1",
    title: "Định nghĩa Kinh Lạc và Khí Huyết",
    content: "Kinh lạc là hệ thống kênh dẫn khí huyết đi khắp toàn thân nuôi dưỡng tạng phủ.",
    type: "study",
    tags: ["kinh-lac"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockFlashcards = [
  {
    id: "card-1",
    topicId: "topic-dong-y-1",
    noteId: "note-1",
    front: "Kinh lạc có vai trò chính là gì?",
    back: "Vận hành khí huyết nuôi dưỡng toàn thân.",
    type: "basic",
    schedule: {
      repetitions: 2,
      interval: 3,
      easeFactor: 2.5,
      nextReview: new Date(Date.now() - 3600000).toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

test.describe("SOP Screenshot Capture Pilot (SS-01 & SS-02)", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
  });

  test.beforeAll(() => {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // 1. Intercept all backend REST APIs with isolated deterministic mock data
    await page.route("**/api/categories**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockCategories),
      });
    });

    await page.route("**/api/topics**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockTopics),
      });
    });

    await page.route("**/api/notes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNotes),
      });
    });

    await page.route("**/api/flashcards**", async (route) => {
      const url = route.request().url();
      if (url.includes("/reviews")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else if (url.includes("/progress")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalCards: mockFlashcards.length,
            dueToday: mockFlashcards.length,
            masteredCards: 0,
            retentionRate: 85,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockFlashcards),
        });
      }
    });

    await page.route("**/api/resources**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/health**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "healthy", db: "connected" }),
      });
    });

    // 2. Pre-seed local storage with clean versioned keys
    await page.addInitScript(() => {
      const storageState = {
        categories: [
          {
            id: "cat-root-dong-y",
            name: "Đông Y Học",
            slug: "dong-y-hoc",
            type: "dong-y",
            parentId: null,
            isRoot: true,
            displayOrder: 1,
            visibility: "active",
          },
          {
            id: "cat-duoc-hoc",
            name: "Dược Học Cổ Truyền",
            slug: "duoc-hoc-co-truyen",
            type: "dong-y",
            parentId: "cat-root-dong-y",
            isRoot: false,
            displayOrder: 1,
            visibility: "active",
          },
          {
            id: "cat-root-lap-trinh",
            name: "Lập Trình Web",
            slug: "lap-trinh-web",
            type: "lap-trinh",
            parentId: null,
            isRoot: true,
            displayOrder: 2,
            visibility: "active",
          },
        ],
        topics: [
          {
            id: "topic-dong-y-1",
            title: "Huyệt Đạo Cơ Bản",
            slug: "huyet-dao-co-ban",
            categoryId: "cat-duoc-hoc",
            type: "dong-y",
            description: "Khảo cứu hệ thống kinh lạc và các huyệt vị trọng yếu trên cơ thể.",
            content: "## 1. Tổng quan Kinh Lạc\n\nKinh lạc là đường vận hành của khí huyết.",
            tags: ["kinh-lac", "huyet-vi"],
            visibility: "active",
            studyProgress: {
              status: "in_progress",
              progress: 35,
              timeSpent: 45,
              repetitions: 3,
              easeFactor: 2.5,
              interval: 4,
              lastStudied: new Date().toISOString(),
              nextReview: new Date(Date.now() + 86400000).toISOString(),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        notes: [],
        resources: [],
      };
      window.localStorage.setItem("phat_hoc_huyen_hoc_clean_v3", JSON.stringify(storageState));
      window.localStorage.setItem("phat_hoc_huyen_hoc_clean_v3_flashcards", JSON.stringify(storageState.topics.length ? [
        {
          id: "card-1",
          topicId: "topic-dong-y-1",
          noteId: "note-1",
          front: "Kinh lạc có vai trò chính là gì?",
          back: "Vận hành khí huyết nuôi dưỡng toàn thân.",
          type: "basic",
          schedule: {
            repetitions: 2,
            interval: 3,
            easeFactor: 2.5,
            nextReview: new Date(Date.now() - 3600000).toISOString(),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ] : []));
      window.localStorage.setItem("knowledge_os_storage_version", "3");
    });
  });

  test("SS-01: Capture Dashboard Overview with Today Learning Hero", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Wait for Dashboard to hydrate
    const heroCard = page.locator('[data-testid="today-learning-hero"]');
    await expect(heroCard).toBeVisible({ timeout: 10000 });

    // Assert key elements are loaded
    await expect(page.locator("text=Tổng Quan Nghiên Cứu").first()).toBeVisible();
    await expect(page.locator("text=Huyệt Đạo Cơ Bản").first()).toBeVisible();

    // Disable CSS animations for crisp screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    const screenshotPath = path.join(OUTPUT_DIR, "ss-01-dashboard-overview.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10000);
  });

  test("SS-02: Capture Topic Tree and Topic Creation Modal", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Navigate to Topics tab
    const topicsTabBtn = page.locator('button:has-text("Chủ đề học")');
    await expect(topicsTabBtn).toBeVisible({ timeout: 10000 });
    await topicsTabBtn.click();

    // Verify TopicTree view header
    await expect(page.locator("text=Cây Phân Cấp & Quản Lý Chủ Đề")).toBeVisible();

    // Click on "+ Thêm Chủ Đề Mới" button to open TopicFormModal
    const addTopicBtn = page.locator('button:has-text("Thêm Chủ Đề Mới")');
    await expect(addTopicBtn).toBeVisible();
    await addTopicBtn.click();

    // Verify TopicFormModal is open
    const modalHeader = page.locator("h2:has-text('Tạo Chủ Đề Nghiên Cứu Mới')");
    await expect(modalHeader).toBeVisible();

    // Pre-fill fields for a realistic demonstration
    const titleInput = page.locator("#topic-title-input");
    await titleInput.fill("Châm Cứu Thực Hành");

    const descInput = page.locator('textarea[placeholder*="Tóm tắt trọng tâm"]');
    await descInput.fill("Phương pháp châm cứu ứng dụng thực tế theo đường kinh mạch.");

    // Disable CSS animations for crisp screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    const screenshotPath = path.join(OUTPUT_DIR, "ss-02-topic-tree-creation.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10000);
  });

  test("SS-03: Capture Active Learning Session Bar", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Wait for Dashboard to hydrate
    const heroCard = page.locator('[data-testid="today-learning-hero"]');
    await expect(heroCard).toBeVisible({ timeout: 10000 });

    // Click primary study button on hero card
    const startLearningBtn = heroCard.locator('button:has-text("học"), button:has-text("Tiếp tục")').first();
    await expect(startLearningBtn).toBeVisible();
    await startLearningBtn.click();

    // Start timer in StudyTimerModal
    const timerModal = page.locator('div[aria-label="Đồng hồ tập trung nghiên cứu"]');
    if (await timerModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const topicSelect = timerModal.locator('select');
      if (await topicSelect.isVisible().catch(() => false)) {
        await topicSelect.selectOption('topic-dong-y-1');
      }
      const modalStartBtn = timerModal.locator('button:has-text("Bắt đầu học"), button:has-text("Tiếp tục")').first();
      await modalStartBtn.click();
      const closeTimerBtn = timerModal.locator('button[aria-label="Đóng"]');
      await closeTimerBtn.click();
      await expect(timerModal).toBeHidden({ timeout: 5000 });
    }

    // Verify ActiveLearningSessionBar appears
    const sessionBar = page.locator('[data-testid="active-session-bar"]');
    await expect(sessionBar).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Đang học").first()).toBeVisible();
    await expect(page.locator("text=Huyệt Đạo Cơ Bản").first()).toBeVisible();

    // Disable CSS animations for crisp screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    const screenshotPath = path.join(OUTPUT_DIR, "ss-03-active-learning-session.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10000);
  });

  test("SS-05: Capture Flashcard Creation Modal with Cloze Mode", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Navigate to Flashcards tab
    const flashcardsTabBtn = page.locator('button:has-text("Thẻ nhớ (Flashcards)")');
    await expect(flashcardsTabBtn).toBeVisible({ timeout: 10000 });
    await flashcardsTabBtn.click();

    // Open FlashcardFormModal (either via btn-create-card or btn-create-card-empty)
    const createBtn = page.locator('[data-testid="btn-create-card"], [data-testid="btn-create-card-empty"]').first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Verify FlashcardFormModal is open
    const modal = page.locator('[data-testid="flashcard-form-modal"]');
    await expect(modal).toBeVisible();

    // Switch to Cloze type
    const clozeTabBtn = page.locator('[data-testid="type-toggle-cloze"]');
    await expect(clozeTabBtn).toBeVisible();
    await clozeTabBtn.click();

    // Pre-fill Cloze front and back inputs
    const frontInput = page.locator('[data-testid="input-front"]');
    await frontInput.fill("Huyệt {{c1::Hợp Cốc}} nằm ở vùng mu bàn tay giữa ngón trỏ và ngón cái.");

    const backInput = page.locator('[data-testid="input-back"]');
    await backInput.fill("Hợp Cốc");

    // Disable CSS animations for crisp screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    const screenshotPath = path.join(OUTPUT_DIR, "ss-05-flashcard-creation.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10000);
  });

  test("SS-06: Capture Flashcard Review Studio with Rating Action Bar", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Navigate to Flashcards tab
    const flashcardsTabBtn = page.locator('button:has-text("Thẻ nhớ (Flashcards)")');
    await expect(flashcardsTabBtn).toBeVisible({ timeout: 10000 });
    await flashcardsTabBtn.click();

    // Verify Review Studio is active and progress badge is rendered
    const progressBadge = page.locator('[data-testid="queue-progress"]');
    await expect(progressBadge).toBeVisible({ timeout: 5000 });

    // Flip the flashcard by clicking on the card element
    const cardElement = page.locator('[data-testid="flashcard-card"]');
    await expect(cardElement).toBeVisible();
    await cardElement.click();

    // Verify 4 rating action buttons are visible
    const ratingAgain = page.locator('[data-testid="rating-btn-1"]');
    const ratingGood = page.locator('[data-testid="rating-btn-3"]');
    await expect(ratingAgain).toBeVisible({ timeout: 5000 });
    await expect(ratingGood).toBeVisible({ timeout: 5000 });

    // Disable CSS animations for crisp screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    const screenshotPath = path.join(OUTPUT_DIR, "ss-06-flashcard-review-studio.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10000);
  });

  test("SS-07: Capture Session Wrapup and Key Takeaway Modal", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // Wait for Dashboard to hydrate
    const heroCard = page.locator('[data-testid="today-learning-hero"]');
    await expect(heroCard).toBeVisible({ timeout: 10000 });

    // Start learning session
    const startLearningBtn = heroCard.locator('button:has-text("học"), button:has-text("Tiếp tục")').first();
    await expect(startLearningBtn).toBeVisible();
    await startLearningBtn.click();

    // Start timer in StudyTimerModal
    const timerModal = page.locator('div[aria-label="Đồng hồ tập trung nghiên cứu"]');
    if (await timerModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      const topicSelect = timerModal.locator('select');
      if (await topicSelect.isVisible().catch(() => false)) {
        await topicSelect.selectOption('topic-dong-y-1');
      }
      const modalStartBtn = timerModal.locator('button:has-text("Bắt đầu học"), button:has-text("Tiếp tục")').first();
      await modalStartBtn.click();
      const closeTimerBtn = timerModal.locator('button[aria-label="Đóng"]');
      await closeTimerBtn.click();
      await expect(timerModal).toBeHidden({ timeout: 5000 });
    }

    // Wait for ActiveLearningSessionBar to appear
    const sessionBar = page.locator('[data-testid="active-session-bar"]');
    await expect(sessionBar).toBeVisible({ timeout: 5000 });

    // Click "Hoàn tất" button on session bar
    const completeBtn = sessionBar.locator('button[aria-label="Hoàn tất"]');
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await completeBtn.click();

    // Verify SessionWrapupModal is open
    const wrapupModal = page.locator('[data-testid="session-wrapup-modal"]');
    await expect(wrapupModal).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Tổng kết phiên học")).toBeVisible();

    // Pre-fill takeaway input
    const takeawayInput = page.locator('[data-testid="takeaway-input"]');
    await takeawayInput.fill("Đã nắm vững hệ thống 12 đường kinh chính và các huyệt vị quan trọng.");

    // Disable CSS animations for crisp screenshot
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });

    const screenshotPath = path.join(OUTPUT_DIR, "ss-07-wrap-up-takeaway.png");
    await page.screenshot({ path: screenshotPath, fullPage: false });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10000);
  });
});
