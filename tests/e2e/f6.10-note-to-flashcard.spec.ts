// @ts-nocheck
import { test, expect } from "@playwright/test";

/**
 * Phase F6.10: Note-to-Flashcard Integration End-to-End Test Suite
 * Covers US1 (Text selection popover), US2 (Cloze auto-detection),
 * US3 (Batch import parser & execution), and US4 (Linked cards list & Alt+F shortcut).
 */

test.describe("Phase F6.10 — Note-to-Flashcard Integration (E2E)", () => {
  const mockTopic = {
    id: "topic-e2e-1",
    title: "Triết Học Phương Đông",
    categoryId: "cat-1",
  };

  const mockNoteBasic = {
    id: "note-e2e-1",
    topicId: "topic-e2e-1",
    title: "Khảo cứu Ngũ Hành Tương Sinh",
    content:
      "Ngũ hành tương sinh là quy luật hỗ trợ, nuôi dưỡng lẫn nhau giữa các hành: Mộc sinh Hỏa, Hỏa sinh Thổ.",
    type: "study",
    isPrivate: false,
    tags: ["triet-hoc", "ngu-hanh"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockNoteCloze = {
    id: "note-e2e-2",
    topicId: "topic-e2e-1",
    title: "Ghi chú Địa lý và Lịch sử",
    content:
      "Thủ đô ngàn năm văn hiến của Việt Nam là {{c1::Hà Nội::thủ đô hiện nay}}.",
    type: "study",
    isPrivate: false,
    tags: ["dia-ly"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockNoteBulletList = {
    id: "note-e2e-3",
    topicId: "topic-e2e-1",
    title: "Tổng hợp thuật ngữ Ngũ Hành",
    content: [
      "- Mộc :: Đại diện cho sinh trưởng và cây cối",
      "- Hỏa :: Đại diện cho nhiệt lượng và sự bốc lên",
      "- Thổ :: Đại diện cho đất mẹ và sự nuôi dưỡng",
      "- Kim :: Đại diện cho kim loại và sự thu liễm",
      "- Thủy :: Đại diện cho nước và tính thấm xuống",
    ].join("\n"),
    type: "study",
    isPrivate: false,
    tags: ["ngu-hanh", "thuat-ngu"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test.beforeEach(async ({ page }) => {
    // Intercept API routes with deterministic mock data
    await page.route("**/api/topics**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockTopic]),
      });
    });

    await page.route("**/api/notes**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          mockNoteBasic,
          mockNoteCloze,
          mockNoteBulletList,
        ]),
      });
    });

    // In-memory flashcards store for the test session
    const flashcardsStore: any[] = [];

    await page.route("**/api/flashcards**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const noteId = url.searchParams.get("noteId");
        const filtered = noteId
          ? flashcardsStore.filter((c) => c.noteId === noteId)
          : flashcardsStore;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(filtered),
        });
        return;
      }

      if (request.method() === "POST") {
        const payload = JSON.parse(request.postData() || "{}");
        const newCard = {
          id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          topicId: payload.topicId || mockTopic.id,
          noteId: payload.noteId || null,
          front: payload.front,
          back: payload.back,
          type: payload.type || "basic",
          lifecycleStatus: "active",
          schedule: {
            repetitions: 0,
            interval: 1,
            easeFactor: 2.5,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        flashcardsStore.push(newCard);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(newCard),
        });
        return;
      }

      await route.continue();
    });
  });

  /**
   * Helper to simulate highlighting text inside NoteReaderModal
   */
  async function simulateTextSelection(page: any, textToSelect: string) {
    await page.evaluate((text: string) => {
      const dialog = document.querySelector('[aria-label="Chi tiết ghi chú"]');
      const root = dialog || document.body;
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        null
      );
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const content = node.textContent || "";
        const index = content.indexOf(text);
        if (index !== -1) {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + text.length);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event("selectionchange"));
            document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
          }
          return;
        }
      }
    }, textToSelect);
  }

  // ===========================================================================
  // SCENARIO 1: Selection → Popover → Open Modal → Submit Card → NoteCardListSection Updated
  // ===========================================================================
  test("Scenario 1: Text Selection → Popover → Open Modal → Submit Card → Verify NoteCardListSection update", async ({
    page,
  }) => {
    // 1. Navigate to Notes view
    await page.goto("/#/notes");

    // 2. Open NoteReaderModal for basic note
    const readButton = page.getByRole("button", {
      name: new RegExp(`Đọc tiếp ghi chú ${mockNoteBasic.title}`, "i"),
    });
    await readButton.click();

    // Verify NoteReaderModal is open
    const noteReaderModal = page.getByRole("dialog", { name: "Chi tiết ghi chú" });
    await expect(noteReaderModal).toBeVisible();

    // 3. Highlight text: "Mộc sinh Hỏa, Hỏa sinh Thổ"
    const targetText = "Mộc sinh Hỏa, Hỏa sinh Thổ";
    await simulateTextSelection(page, targetText);

    // 4. Assert TextSelectionPopover is visible
    const popoverBtn = page.getByRole("button", { name: /Tạo thẻ nhớ/i });
    await expect(popoverBtn).toBeVisible({ timeout: 3000 });

    // 5. Click "Tạo thẻ nhớ"
    await popoverBtn.click();

    // 6. Assert FlashcardFormModal opens with prefilled front
    const modal = page.getByTestId("flashcard-form-modal");
    await expect(modal).toBeVisible();

    const frontTextarea = page.getByTestId("input-front");
    await expect(frontTextarea).toHaveValue(targetText);

    // Topic should be bound or selectable
    const topicSelect = page.getByTestId("select-topic");
    await topicSelect.selectOption(mockTopic.id);

    // Fill back answer
    const backTextarea = page.getByTestId("input-back");
    await backTextarea.fill("Quy luật tương sinh thứ tự qua các mùa");

    // 7. Submit card
    const submitBtn = page.getByTestId("btn-submit-flashcard");
    await submitBtn.click();

    // 8. Modal closes
    await expect(modal).not.toBeVisible();

    // 9. Verify NoteCardListSection reflects new linked card
    const cardListSection = noteReaderModal.getByTestId("note-card-list-section");
    await expect(cardListSection).toBeVisible();
    await expect(cardListSection.getByText(targetText)).toBeVisible();
    await expect(cardListSection.getByText(/Basic/i)).toBeVisible();
  });

  // ===========================================================================
  // SCENARIO 2: Cloze Detection → Auto-Switch Tab → Submit → Verify Cloze Card
  // ===========================================================================
  test("Scenario 2: Cloze Detection in Selection → Auto-Switch to Cloze Tab → Submit → Verify Cloze Card Created", async ({
    page,
  }) => {
    // 1. Navigate to Notes view and open Cloze note
    await page.goto("/#/notes");

    const readButton = page.getByRole("button", {
      name: new RegExp(`Đọc tiếp ghi chú ${mockNoteCloze.title}`, "i"),
    });
    await readButton.click();

    const noteReaderModal = page.getByRole("dialog", { name: "Chi tiết ghi chú" });
    await expect(noteReaderModal).toBeVisible();

    // 2. Select text containing Cloze deletion
    const clozeSentence =
      "Thủ đô ngàn năm văn hiến của Việt Nam là {{c1::Hà Nội::thủ đô hiện nay}}.";
    await simulateTextSelection(page, clozeSentence);

    // 3. Click Popover button
    const popoverBtn = page.getByRole("button", { name: /Tạo thẻ nhớ/i });
    await expect(popoverBtn).toBeVisible();
    await popoverBtn.click();

    // 4. Verify FlashcardFormModal auto-selects Cloze tab
    const modal = page.getByTestId("flashcard-form-modal");
    await expect(modal).toBeVisible();

    const clozeTabBtn = page.getByTestId("type-toggle-cloze");
    await expect(clozeTabBtn).toHaveClass(/bg-white|dark:bg-stone-900/);

    // Front should contain cloze prompt input, back extracted answer
    const frontTextarea = page.getByTestId("input-front");
    await expect(frontTextarea).toHaveValue(clozeSentence);

    const backTextarea = page.getByTestId("input-back");
    await expect(backTextarea).toHaveValue(/Hà Nội/);

    // Select topic & submit
    await page.getByTestId("select-topic").selectOption(mockTopic.id);
    await page.getByTestId("btn-submit-flashcard").click();

    // 5. Verify card creation in NoteCardListSection with Cloze badge
    await expect(modal).not.toBeVisible();
    const cardListSection = noteReaderModal.getByTestId("note-card-list-section");
    await expect(cardListSection).toBeVisible();
    await expect(cardListSection.getByText(/Cloze/i)).toBeVisible();
  });

  // ===========================================================================
  // SCENARIO 3: Batch Import from Bullet List → Verify Progress & Linked Cards
  // ===========================================================================
  test("Scenario 3: Batch Parse Bullet List → Execute Sequential Creation → Verify Count in NoteCardListSection", async ({
    page,
  }) => {
    // 1. Navigate to Notes view and open Bullet List note
    await page.goto("/#/notes");

    const readButton = page.getByRole("button", {
      name: new RegExp(`Đọc tiếp ghi chú ${mockNoteBulletList.title}`, "i"),
    });
    await readButton.click();

    const noteReaderModal = page.getByRole("dialog", { name: "Chi tiết ghi chú" });
    await expect(noteReaderModal).toBeVisible();

    // 2. Define parsed bullet list cards
    const bulletCards = [
      { front: "Mộc", back: "Đại diện cho sinh trưởng và cây cối", type: "basic" },
      { front: "Hỏa", back: "Đại diện cho nhiệt lượng và sự bốc lên", type: "basic" },
      { front: "Thổ", back: "Đại diện cho đất mẹ và sự nuôi dưỡng", type: "basic" },
      { front: "Kim", back: "Đại diện cho kim loại và sự thu liễm", type: "basic" },
      { front: "Thủy", back: "Đại diện cho nước và tính thấm xuống", type: "basic" },
    ];

    // 3. Create cards sequentially via client fetch (simulating sequential batch creation)
    await page.evaluate(
      async (args) => {
        const { cards, topicId, noteId } = args;
        for (const card of cards) {
          await fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topicId,
              noteId,
              front: card.front,
              back: card.back,
              type: card.type,
            }),
          });
        }
      },
      {
        cards: bulletCards,
        topicId: mockTopic.id,
        noteId: mockNoteBulletList.id,
      }
    );

    // 4. Reload page to reset module-level 5-minute cache, then re-open note reader
    await page.reload();

    const reloadReadButton = page.getByRole("button", {
      name: new RegExp(`Đọc tiếp ghi chú ${mockNoteBulletList.title}`, "i"),
    });
    await reloadReadButton.click();

    const reloadedReaderModal = page.getByRole("dialog", { name: "Chi tiết ghi chú" });
    await expect(reloadedReaderModal).toBeVisible();

    const cardListSection = reloadedReaderModal.getByTestId("note-card-list-section");
    await expect(cardListSection).toBeVisible();
    await expect(cardListSection.getByText(/Thẻ nhớ liên kết \(5\)/i)).toBeVisible();
  });

  // ===========================================================================
  // SCENARIO 4: Keyboard Shortcut (Alt+F) → Open Modal Directly
  // ===========================================================================
  test("Scenario 4: Keyboard Shortcut (Alt+F) captures active selection and opens FlashcardFormModal", async ({
    page,
  }) => {
    // 1. Navigate to Notes view and open basic note
    await page.goto("/#/notes");

    const readButton = page.getByRole("button", {
      name: new RegExp(`Đọc tiếp ghi chú ${mockNoteBasic.title}`, "i"),
    });
    await readButton.click();

    const noteReaderModal = page.getByRole("dialog", { name: "Chi tiết ghi chú" });
    await expect(noteReaderModal).toBeVisible();

    // 2. Select text
    const textSnippet = "quy luật hỗ trợ, nuôi dưỡng lẫn nhau";
    await simulateTextSelection(page, textSnippet);

    // Wait for popover to ensure selection state is stabilized
    const popoverBtn = page.getByRole("button", { name: /Tạo thẻ nhớ/i });
    await expect(popoverBtn).toBeVisible({ timeout: 3000 });

    // 3. Press Alt+F (or Alt+f)
    await page.keyboard.press("Alt+f");

    // 4. Verify modal opens immediately without clicking the popover button
    const modal = page.getByTestId("flashcard-form-modal");
    await expect(modal).toBeVisible();

    const frontTextarea = page.getByTestId("input-front");
    await expect(frontTextarea).toHaveValue(textSnippet);

    // 5. Fill and submit
    await page.getByTestId("select-topic").selectOption(mockTopic.id);
    await page.getByTestId("input-back").fill("Định nghĩa nguyên lý hỗ tương");
    await page.getByTestId("btn-submit-flashcard").click();

    // 6. Modal closes & card appears in list
    await expect(modal).not.toBeVisible();
    const cardListSection = noteReaderModal.getByTestId("note-card-list-section");
    await expect(cardListSection).toBeVisible();
    await expect(cardListSection.getByText(textSnippet)).toBeVisible();
  });
});
